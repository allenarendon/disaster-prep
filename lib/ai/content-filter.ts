const BANNED_PATTERNS = [
  /\d+\s*mg\b/i,
  /\btake\s+\d+\s+tablets?\b/i,
  /guaranteed\s+cure/i,
  /100%\s+safe/i,
  /definitely\s+won'?t\b/i,
];

export function containsBannedContent(text: string): boolean {
  return BANNED_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateGuidanceContent(
  summary: string,
  actionItems: string[]
): boolean {
  const allText = [summary, ...actionItems].join(" ");
  if (containsBannedContent(allText)) return false;
  if (actionItems.length === 0) return false;
  if (summary.trim().length < 10) return false;
  return true;
}

const PROFANITY_PATTERNS = [/\b(fuck|shit|asshole|putangina|gago)\b/i];

export function isObviouslyAbusive(message: string): boolean {
  return PROFANITY_PATTERNS.some((p) => p.test(message));
}

export function isAmbiguousContent(message: string): boolean {
  const suspicious = [/http:\/\//i, /www\./i, /click here/i];
  return suspicious.some((p) => p.test(message));
}
