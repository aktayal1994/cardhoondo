"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

export interface IntroValues {
  name: string;
  pincode: string;
  phone_number: string;
}

interface IntroStepProps {
  initialValues?: IntroValues;
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

function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}

/**
 * Step 1 of 4 (see app/questionnaire/intro/page.tsx and docs/questionnaire.md's
 * "Intro" section) -- not counted as one of the 11 scored questions, but now
 * mandatory rather than optional per explicit direction: a real name/phone/
 * pincode on every submission is worth more than a slightly lower completion
 * rate, since the human-handoff step (WhatsApp/call outreach) depends on it.
 */
export default function IntroStep({ initialValues, onContinue }: IntroStepProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [pincode, setPincode] = useState(initialValues?.pincode ?? "");
  const [phone, setPhone] = useState(initialValues?.phone_number ?? "");
  const [touched, setTouched] = useState(false);

  const nameError = touched && name.trim().length === 0;
  const pincodeError = touched && !isValidPincode(pincode);
  const phoneError = touched && !isValidPhoneNumber(phone);
  const canContinue = name.trim().length > 0 && isValidPincode(pincode) && isValidPhoneNumber(phone);

  function handleContinue() {
    setTouched(true);
    if (!canContinue) return;
    onContinue({ name: name.trim(), pincode, phone_number: phone });
  }

  return (
    <div className="animate-fade-up mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50">
          <UserRound className="h-4.5 w-4.5 text-navy-700" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Let's start with a few details</h2>
          <p className="mt-1 text-sm text-ink-soft">
            So we can address you properly and reach out with your shortlist if you'd like a hand.
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
            aria-invalid={nameError}
            className={`w-full rounded-xl border bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
              nameError ? "border-negative" : "border-border focus:border-navy-500"
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
              pincodeError ? "border-negative" : "border-border focus:border-navy-500"
            }`}
          />
          {pincodeError && <p className="mt-1.5 text-sm text-negative">Enter a valid 6-digit pincode.</p>}
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
          className="rounded-full bg-accent-gold px-8 py-3.5 text-base font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
