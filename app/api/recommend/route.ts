import { NextRequest, NextResponse } from "next/server";
import { type QuestionnaireAnswers } from "../../../lib/scoring/questionnaireWeights";
import { runRecommendation } from "../../../lib/scoring/runRecommendation";
import { newClaimToken, hashClaimToken } from "../../../lib/auth/claimToken";
import { derivePersona } from "../../../lib/persona/derivePersona";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";
import { isValidPhoneNumber } from "../../../lib/validation";
import { isAcceptedNoticeVersion } from "../../../lib/consent";

interface RecommendRequestBody {
  answers: QuestionnaireAnswers;
  top_n?: number;
  utm?: Record<string, string>;
  /** v3 intro step, ahead of the categorized questionnaire -- all optional.
   * See docs/questionnaire.md's "Intro" section. */
  name?: string;
  pincode?: string;
  phone_number?: string;
  /** Version of the consent notice the person agreed to (lib/consent.ts).
   * Required whenever contact details are sent. */
  consent_notice_version?: string;
}

/** Keep only the five known campaign labels, as short strings. */
function cleanUtm(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string" && v) out[k] = v.slice(0, 100);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * POST /api/recommend -- ports scripts/recommend.py's CLI into a live
 * endpoint. Takes a questionnaire submission, persists it, runs the same
 * structural-filter + scoring + ranking logic against data pulled from
 * Supabase, persists the result, and returns the shortlist.
 *
 * Does NOT call the write-up LLM -- that's a separate call (/api/writeup)
 * so a client can show the shortlist immediately and stream the narrative
 * in afterward, matching the frontend prototype's "thinking bridge" ->
 * results flow (see CLAUDE.md's "Frontend — Questionnaire & Results
 * Prototype" section).
 */
export async function POST(req: NextRequest) {
  let body: RecommendRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "Missing 'answers' object" }, { status: 400 });
  }

  if (body.phone_number && !isValidPhoneNumber(body.phone_number)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  // Contact details are only accepted together with a recognised consent
  // notice version -- no consent, no personal data stored.
  if (body.phone_number && !isAcceptedNoticeVersion(body.consent_notice_version)) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Respondent identity (name/pincode/phone_number) -- see
  // docs/questionnaire.md's "Respondent storage" section. Upserted by
  // phone_number so the same person submitting again over time updates
  // their row rather than creating a duplicate identity. Fully optional --
  // an anonymous submission (no phone_number) just gets no respondent_id.
  let respondentId: string | null = null;
  if (body.phone_number) {
    const { data: respondent, error: respondentErr } = await supabase
      .from("respondents")
      .upsert(
        {
          phone_number: body.phone_number,
          name: body.name ?? null,
          pincode: body.pincode ?? null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "phone_number" },
      )
      .select("id")
      .single();
    if (respondentErr) {
      return NextResponse.json({ error: "Failed to save respondent", detail: respondentErr.message }, { status: 500 });
    }
    respondentId = respondent.id;

    // Record the consent (server clock, recognised version). Unique per
    // (respondent, version, source), so a results-page refresh is a no-op.
    // Fail closed: if the record can't be written we don't proceed.
    const { error: consentErr } = await supabase
      .from("consent_records")
      .upsert(
        { respondent_id: respondentId, notice_version: body.consent_notice_version, source: "questionnaire" },
        { onConflict: "respondent_id,notice_version,source", ignoreDuplicates: true },
      );
    if (consentErr) {
      return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
    }
  }

  const claimToken = newClaimToken();
  const { data: responseRow, error: insertErr } = await supabase
    .from("questionnaire_responses")
    .insert({
      answers: body.answers,
      respondent_id: respondentId,
      utm: cleanUtm(body.utm),
      // Only the hash is stored; the token itself goes back to the submitter once
      // (in the response below) and is what lets them later save this search.
      claim_token_hash: hashClaimToken(claimToken),
    })
    .select("id")
    .single();
  if (insertErr) {
    return NextResponse.json({ error: "Failed to save questionnaire response", detail: insertErr.message }, { status: 500 });
  }

  const output = await runRecommendation(body.answers, body.top_n ?? 3);

  const { data: resultRow, error: resultErr } = await supabase
    .from("recommendation_results")
    .insert({ questionnaire_response_id: responseRow.id, shortlist: output })
    .select("id")
    .single();
  if (resultErr) {
    return NextResponse.json({ error: "Failed to save recommendation result", detail: resultErr.message }, { status: 500 });
  }

  return NextResponse.json({
    questionnaire_response_id: responseRow.id,
    recommendation_result_id: resultRow.id,
    // Shown once; kept by the browser so a signed-in user can save this search.
    claim_token: claimToken,
    persona: derivePersona(body.answers),
    ...output,
  });
}
