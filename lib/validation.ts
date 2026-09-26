/** No OTP verification exists anywhere in this app, so this is the real
 * backstop against garbage phone numbers on every lead-capturing endpoint,
 * not just a UX nicety -- client-side copy can always be bypassed by hitting
 * the API directly. Exactly 10 digits, starts with 6-9 (real Indian mobile
 * numbering), rejects all-same-digit ("9999999999") and a full ascending/
 * descending run ("9876543210", "6789012345" with wraparound) -- the two
 * patterns anyone typing a throwaway number reaches for first. Still only a
 * cheap filter, not a guarantee: it cannot catch a real-looking but simply
 * wrong or disconnected number.
 *
 * Single source of truth for both /api/recommend and /api/quotation (and
 * their client-side mirrors, IntroStep.tsx and the quotation form) -- this
 * used to be duplicated inline in route.ts before the quotation flow needed
 * the same check a second time. */
export function isValidPhoneNumber(phone: string): boolean {
  if (!/^[6-9]\d{9}$/.test(phone)) return false;
  if (/^(\d)\1{9}$/.test(phone)) return false;
  if (isSequentialRun(phone)) return false;
  return true;
}

function isSequentialRun(digits: string): boolean {
  let ascending = true;
  let descending = true;
  for (let i = 1; i < digits.length; i++) {
    const prev = Number(digits[i - 1]);
    const curr = Number(digits[i]);
    if (((curr - prev + 10) % 10) !== 1) ascending = false;
    if (((prev - curr + 10) % 10) !== 1) descending = false;
  }
  return ascending || descending;
}

export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}
