export function isBundleStale(generatedAt: string): boolean {
  const ageMs = Date.now() - new Date(generatedAt).getTime();
  return ageMs > 7 * 24 * 60 * 60 * 1000;
}
