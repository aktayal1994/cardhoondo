"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { isValidPhoneNumber, isValidPincode } from "../lib/validation";
import { CURRENT_NOTICE_VERSION } from "../lib/consent";
import ConsentNotice from "./ConsentNotice";

export interface IntroValues {
  name: string;
  pincode: string;
  phone_number: string;
  /** Version of the consent notice the person agreed to (lib/consent.ts).
   * Absent on sessions saved before the notice existed -- those must re-agree. */
  consent_notice_version: string;
}

type Contact = Pick<IntroValues, "name" | "pincode" | "phone_number">;

interface IntroStepProps {
  initialValues?: IntroValues;
  /** Details a signed-in person gave on an earlier saved search. Shown as a
   * one-tap confirmation instead of the empty form (they can still change them). */
  savedContact?: Contact;
  onContinue: (values: IntroValues) => void;
}

function maskPhone(phone: string): string {
  return phone.length >= 4 ? `${"•".repeat(phone.length - 4)}${phone.slice(-4)}` : phone;
}

/**
 * Step 4 of 4, the LAST step before /results (see
 * app/questionnaire/intro/page.tsx and docs/questionnaire.md's "Intro"
 * section) -- moved from first to last so the higher-friction ask (contact
 * details) comes after someone has already invested in the 11 questions,
 * not before they've seen any value. Not counted as one of the 11 scored
 * questions, but still mandatory rather than optional per explicit
 * direction: a real name/phone/pincode on every submission is worth more
 * than a slightly lower completion rate, since the human-handoff step
 * (WhatsApp/call outreach) depends on it.
 */
export default function IntroStep({ initialValues, savedContact, onContinue }: IntroStepProps) {
  const [name, setName] = useState(initialValues?.name ?? savedContact?.name ?? "");
  const [pincode, setPincode] = useState(initialValues?.pincode ?? savedContact?.pincode ?? "");
  const [phone, setPhone] = useState(initialValues?.phone_number ?? savedContact?.phone_number ?? "");
  const [touched, setTouched] = useState(false);
  const [changing, setChanging] = useState(false);
  const confirmOnly = Boolean(savedContact) && !changing;

  const nameError = touched && name.trim().length === 0;
  const pincodeError = touched && !isValidPincode(pincode);
  const phoneError = touched && !isValidPhoneNumber(phone);
  const canContinue = name.trim().length > 0 && isValidPincode(pincode) && isValidPhoneNumber(phone);

  function handleContinue() {
    setTouched(true);
    if (!canContinue) return;
    onContinue({ name: name.trim(), pincode, phone_number: phone, consent_notice_version: CURRENT_NOTICE_VERSION });
  }

  return (
    <div className="animate-fade-up-blur mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-charcoal-800/70">
          <UserRound className="h-4.5 w-4.5 text-accent-rust-soft" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">
            {confirmOnly ? "Welcome back — same details?" : "Almost there — a few details"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            We use these to tailor your shortlist to your city and to get back to you about it.
          </p>
        </div>
      </div>

      {confirmOnly && (
        <div className="mt-6 ml-12 rounded-xl border border-border bg-paper-raised px-4 py-3 text-sm">
          <p className="font-medium text-ink">{name}</p>
          <p className="mt-0.5 text-ink-soft">
            Pincode {pincode} · Phone {maskPhone(phone)}
          </p>
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="mt-2 text-xs font-semibold text-accent-rust-soft underline underline-offset-2 hover:text-ink"
          >
            Change details
          </button>
        </div>
      )}

      <div className={`mt-6 ml-12 space-y-4 ${confirmOnly ? "hidden" : ""}`}>
        <div>
          <label htmlFor="intro-name" className="mb-1.5 block text-sm font-medium text-ink">
            What should we call you?
          </label>
          <input
            id="intro-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-invalid={nameError}
            className={`w-full rounded-xl border bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
              nameError ? "border-negative" : "border-border transition focus:border-accent-rust/70 focus:shadow-glow-sm"
            }`}
          />
          {nameError && <p className="mt-1.5 text-sm text-negative">Enter your name.</p>}
        </div>

        <div>
          <label htmlFor="intro-pincode" className="mb-1.5 block text-sm font-medium text-ink">
            Pincode
          </label>
          <input
            id="intro-pincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit pincode"
            aria-invalid={pincodeError}
            className={`w-full rounded-xl border bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
              pincodeError ? "border-negative" : "border-border transition focus:border-accent-rust/70 focus:shadow-glow-sm"
            }`}
          />
          {pincodeError ? (
            <p className="mt-1.5 text-sm text-negative">Enter a valid 6-digit pincode.</p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-faint">Used to tailor your recommendation to your city.</p>
          )}
        </div>

        <div>
          <label htmlFor="intro-phone" className="mb-1.5 block text-sm font-medium text-ink">
            Phone number
          </label>
          <input
            id="intro-phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            aria-invalid={phoneError}
            className={`w-full rounded-xl border bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
              phoneError ? "border-negative" : "border-border transition focus:border-accent-rust/70 focus:shadow-glow-sm"
            }`}
          />
          {phoneError ? (
            <p className="mt-1.5 text-sm text-negative">
              Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-faint">
              Name and phone are used to get in touch about your recommendations, and to ask for your feedback so we
              can improve CarDhoondo.
            </p>
          )}
        </div>
      </div>

      <ConsentNotice className="mt-6 ml-12" />

      <div className="mt-5 ml-12">
        <button
          type="button"
          onClick={handleContinue}
          className="rounded-full bg-accent-rust px-8 py-3.5 text-base font-semibold text-stage shadow-glow-sm transition hover:brightness-110 active:scale-[0.98]"
        >
          Agree and continue
        </button>
      </div>
    </div>
  );
}
