import { describe, expect, it } from "vitest";
import { isBundleStale } from "@/lib/offline/bundle-utils";

describe("offline bundle", () => {
  it("detects bundle older than 7 days as stale", () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(isBundleStale(old)).toBe(true);
  });

  it("treats fresh bundle as not stale", () => {
    const recent = new Date().toISOString();
    expect(isBundleStale(recent)).toBe(false);
  });
});
