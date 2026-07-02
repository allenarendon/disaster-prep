import { describe, expect, it } from "vitest";
import {
  isPhilippinesCoordinate,
  resolveMapCenter,
} from "@/lib/data/geo";

describe("coordinate helpers", () => {
  it("validates coordinates within the Philippines bounding box", () => {
    expect(isPhilippinesCoordinate(14.5946, 121.0391)).toBe(true);
    expect(isPhilippinesCoordinate(40, 0)).toBe(false);
  });

  it("prefers evacuation center coordinates when barangay coords drift too far", () => {
    const center = resolveMapCenter(
      { lat: 16.17, lng: 120.7802 },
      [{ lat: 10.3161, lng: 123.8867 }]
    );

    expect(center.lat).toBeCloseTo(10.3161, 4);
    expect(center.lng).toBeCloseTo(123.8867, 4);
  });

  it("keeps barangay coordinates when they align with listed centers", () => {
    const center = resolveMapCenter(
      { lat: 14.5946, lng: 121.0391 },
      [{ lat: 14.5845, lng: 121.0421 }]
    );

    expect(center.lat).toBeCloseTo(14.5946, 4);
    expect(center.lng).toBeCloseTo(121.0391, 4);
  });
});
