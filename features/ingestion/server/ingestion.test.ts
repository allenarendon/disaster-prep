import { describe, expect, it } from "vitest";
import { mapCapAreasToLocationRefs } from "@/features/ingestion/server/area-mapper";
import {
  bulletinIdFromCap,
  inferHazardType,
  inferSeverity,
  parseCapAlertXml,
  parseCapFeedEntries,
} from "@/features/ingestion/server/cap-parser";

const SAMPLE_CAP = `<?xml version="1.0"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>aa4a7bb1-e8d9-43f9-97a8-0488f2e10490</identifier>
  <sent>2026-07-12T17:55:13+08:00</sent>
  <info>
    <event>General Flood Advisory (Moderate)</event>
    <expires>2026-07-13T05:55:13+08:00</expires>
    <headline>General Flood Advisory</headline>
    <description>Under present weather conditions, Southwest Monsoon affecting Luzon.</description>
    <instruction>Take necessary precautionary measures.</instruction>
    <parameter><valueName>layer:Google:Region:0.1</valueName><value>NCR (National Capital Region)</value></parameter>
    <area><areaDesc>Metro Manila</areaDesc></area>
  </info>
</alert>`;

describe("cap parser", () => {
  it("parses CAP alert fields from official XML", () => {
    const parsed = parseCapAlertXml(SAMPLE_CAP, "GFA #5 - NCR (National Capital Region)");
    expect(parsed?.identifier).toBe("aa4a7bb1-e8d9-43f9-97a8-0488f2e10490");
    expect(parsed?.description).toContain("Southwest Monsoon");
    expect(parsed?.isFinal).toBe(false);
  });

  it("infers flood hazard type and moderate severity", () => {
    expect(inferHazardType("General Flood Advisory (Moderate)", "GFA #5")).toBe("FLOOD");
    expect(inferSeverity("General Flood Advisory (Moderate)", "GFA #5")).toBe(3);
  });

  it("infers typhoon signal severity from title", () => {
    expect(
      inferHazardType(
        "Tropical Cyclone Warning",
        "Tropical Cyclone Warning : Typhoon Inday (BAVI) Signal #1"
      )
    ).toBe("TYPHOON");
    expect(
      inferSeverity(
        "Tropical Cyclone Warning",
        "Tropical Cyclone Warning : Typhoon Inday (BAVI) Signal #1"
      )
    ).toBe(1);
  });

  it("builds stable bulletin ids", () => {
    expect(bulletinIdFromCap("abc-123")).toBe("pagasa-cap-abc-123");
  });
});

describe("area mapper", () => {
  it("maps Metro Manila CAP areas to NCR province-level coverage", () => {
    const refs = mapCapAreasToLocationRefs({
      areaDescriptions: ["Metro Manila"],
      regionParameter: "NCR (National Capital Region)",
      feedTitle: "GFA #5 - NCR (National Capital Region)",
    });
    expect(refs.some((r) => r.province === "Metro Manila" && r.region === "NCR")).toBe(
      true
    );
  });
});

describe("cap feed parser", () => {
  it("extracts CAP links from atom feed entries", () => {
    const atom = `
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>urn:uuid:test</id>
          <title>GFA #5 - NCR (National Capital Region)</title>
          <updated>2026-07-12T17:55:13+08:00</updated>
          <link type="application/cap+xml" href="https://example.com/test.cap"/>
        </entry>
      </feed>`;
    const entries = parseCapFeedEntries(atom);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capUrl).toBe("https://example.com/test.cap");
  });
});
