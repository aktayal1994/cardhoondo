"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

export interface IntroValues {
  name: string;
  pincode: string;
  phone_number: string;
}

interface IntroStepProps {
  onContinue: (values: IntroValues) => void;
}

/** Exactly 10 digits, starts with 6-9 (real Indian mobile numbering), and
 * rejects all-same-digit input (e.g. "9999999999") as obvious junk/test
 * entry -- mirrors the server-side check in
 * web/app/api/recommend/route.ts's isValidPhoneNumber(). */
function isValidPhoneNumber(phone: string): boolean {
  if (!/^[6-9]\d{9}$/.test(phone)) return false;
  if (/^(\d)\1{9}$/.test(phone)) return false;
  return true;
}

/**
 * A short "getting to know you" step ahead of the categorized questionnaire
 * (see docs/questionnaire.md's "Intro" section) -- not counted as one of the
 * 11 real questions. All three fields are optional, so "Continue" is never
 * blocked by an empty form; it's only blocked by an actively invalid phone
 * number (a non-empty value that fails validation), never by an empty one.
 */
export default function IntroStep({ onContinue }: IntroStepProps) {
  const [name, setName] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  const phoneDigitsOnly = phone.replace(/\D/g, "");
  const phoneError = phoneTouched && phoneDigitsOnly.length > 0 && !isValidPhoneNumber(phoneDigitsOnly);
  const canContinue = phoneDigitsOnly.length === 0 || isValidPhoneNumber(phoneDigitsOnly);

  function handleContinue() {
    if (!canContinue) return;
    onContinue({ name: name.trim(), pincode: pincode.trim(), phone_number: phoneDigitsOnly });
  }

  return (
    <div className="animate-fade-up mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50">
          <UserRound className="h-4.5 w-4.5 text-navy-700" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Before we start, a quick intro</h2>
          <p className="mt-1 text-sm text-ink-soft">
            All optional — this just helps us address you properly, and reach out if you'd like a hand later.
          </p>
        </div>
      </div>

      <div className="mt-6 ml-12 space-y-4">
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
            className="w-full rounded-xl border border-border bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-navy-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="intro-pincode" className="mb-1.5 block text-sm font-medium text-ink">
            Pincode <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input
            id="intro-pincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit pincode"
            className="w-full rounded-xl border border-border bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-navy-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="intro-phone" className="mb-1.5 block text-sm font-medium text-ink">
            Phone number <span className="font-normal text-ink-faint">(optional — only if you'd like us to follow up)</span>
          </label>
          <input
            id="intro-phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            onBlur={() => setPhoneTouched(true)}
            placeholder="10-digit mobile number"
            aria-invalid={phoneError}
            className={`w-full rounded-xl border bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
              phoneError ? "border-negative" : "border-border focus:border-navy-500"
            }`}
          />
          {phoneError && (
            <p className="mt-1.5 text-sm text-negative">
              Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 ml-12">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="rounded-full bg-accent-gold px-8 py-3.5 text-base font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
