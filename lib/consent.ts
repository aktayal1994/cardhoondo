/**
 * Consent notice versioning.
 *
 * The version below identifies the exact text of the consent notice a person
 * agreed to (components/ConsentNotice.tsx + the Privacy Policy / Terms it
 * links to, web/content/legal/*.md). Servers store it in `consent_records`
 * and only accept versions listed here, so a client can't invent one.
 *
 * WHEN TO BUMP: any change to what data we collect, why, who it is shared
 * with, or how long it is kept -- i.e. any change that would need people to
 * agree again. Add the new version to the front of ACCEPTED_NOTICE_VERSIONS,
 * point CURRENT_NOTICE_VERSION at it, and keep old versions accepted only for
 * as long as sessions started under them can still be in flight.
 */
export const CURRENT_NOTICE_VERSION = "2026-09-26.v1";

export const ACCEPTED_NOTICE_VERSIONS: readonly string[] = [CURRENT_NOTICE_VERSION];

export function isAcceptedNoticeVersion(v: unknown): v is string {
  return typeof v === "string" && ACCEPTED_NOTICE_VERSIONS.includes(v);
}

export type ConsentSource = "questionnaire" | "quotation";
