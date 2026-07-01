import { describe, expect, it } from "vitest";
import { verifyLguAdmin } from "@/lib/auth/lgu-admin";

describe("verifyLguAdmin", () => {
  it("rejects unauthenticated PATCH requests", () => {
    const request = new Request("http://localhost/api/evac-centers/1/status", {
      method: "PATCH",
    });
    expect(verifyLguAdmin(request)).toBe(false);
  });

  it("accepts valid admin key header", () => {
    process.env.LGU_ADMIN_API_KEY = "test-key";
    const request = new Request("http://localhost/api/evac-centers/1/status", {
      method: "PATCH",
      headers: { "x-lgu-admin-key": "test-key" },
    });
    expect(verifyLguAdmin(request)).toBe(true);
    delete process.env.LGU_ADMIN_API_KEY;
  });
});
