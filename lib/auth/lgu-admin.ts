export function verifyLguAdmin(request: {
  headers: { get(name: string): string | null };
}): boolean {
  const apiKey = process.env.LGU_ADMIN_API_KEY;
  if (!apiKey) {
    return false;
  }
  const header = request.headers.get("x-lgu-admin-key");
  return header === apiKey;
}
