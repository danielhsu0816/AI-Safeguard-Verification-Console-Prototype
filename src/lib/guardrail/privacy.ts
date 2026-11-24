// A conservative identifier screen, not a de-identification certification.
export function hasSensitiveIdentifiers(text: string): boolean {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
    || /\b\d{3}-\d{2}-\d{4}\b/.test(text)
    || /\b(?:MRN|medical record number|patient name|date of birth|DOB)\s*[:=]\s*\S+/i.test(text)
    || /(?:\+1[ -]?)?(?:\(\d{3}\)|\b\d{3})[ -]\d{3}[ -]\d{4}\b/.test(text);
}

export function assertSyntheticInput(text: string) {
  if (hasSensitiveIdentifiers(text)) throw new Error("Potential personal identifiers detected. Use fictional, synthetic data only.");
}