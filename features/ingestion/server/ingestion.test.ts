import { describe, expect, it } from "vitest";
import { mapCapAreasToLocationRefs } from "@/features/ingestion/server/area-mapper";
import {
  bulletinIdFromCap,
  inferHazardType,
  inferSeverity,
  parseCapAlertXml,
  parseCapFeedEntries,
} from "@/features/ingestion/server/cap-parser";
import {
  buildPhivolcsRawText,
  inferPhivolcsHazardType,
  inferPhivolcsSeverity,
  parsePhivolcsBulletinHtml,
  parsePhivolcsListEntries,
  phivolcsBulletinId,
} from "@/features/ingestion/server/phivolcs-bulletin-parser";
import { mapVolcanoCodeToLocationRefs } from "@/features/ingestion/server/volcano-area-mapper";

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

const SAMPLE_PHIVOLCS_LIST = `
  <a href="/bulletin/activity-mvo?bid=14622&lang=en" target="_blank">
    <p style="font-weight:bold">Mayon Volcano Summary of 24Hr Observation 12 July 2026 12:00 AM</p>
  </a>
  <a href="/bulletin/activity-tvo?bid=14619&lang=en" target="_blank">
    <p style="font-weight:bold">Taal Volcano Summary of 24Hr Observation 12 July 2026 12:00 AM</p>
  </a>`;

const SAMPLE_PHIVOLCS_BULLETIN = `
  <input type="hidden" value="2026-07-12" id="bdate" />
  <p class="p-title">MAYON VOLCANO</p>
  <p class="txt-status">(Intensified Unrest / Magmatic Unrest)</p>
  <div class="circle">3</div>
  <tr><td><b>Eruption</b></td><td><p class="bold txtleft newfont">Lava effusion w/ lava flow</p></td></tr>
  <p class="title1 bold txtcenter">RECOMMENDATION/COMMENT</p>
  <table>
  <ul class="ul-bawal"><li>Entry into 6-kilometer radius Permanent Danger Zone (PDZ)</li></ul>
  <ul><li>Rockfalls or landslides or avalanches</li><li>Lahars during heavy and prolonged rainfall</li></ul>
  <tr><td colspan="2"><b>Location of Mayon Volcano:</b> Province of Albay</td></tr>
  </table>`;

describe("phivolcs bulletin parser", () => {
  it("extracts English bulletin links from LAVA list page", () => {
    const entries = parsePhivolcsListEntries(SAMPLE_PHIVOLCS_LIST);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.volcanoCode).toBe("mvo");
    expect(entries[0]?.detailPath).toContain("lang=en");
  });

  it("parses bulletin HTML fields and builds stable ids", () => {
    const entry = {
      volcanoCode: "mvo",
      bulletinId: "14622",
      title: "Mayon Volcano Summary of 24Hr Observation 12 July 2026 12:00 AM",
      detailPath: "/bulletin/activity-mvo?bid=14622&lang=en",
    };
    const parsed = parsePhivolcsBulletinHtml(SAMPLE_PHIVOLCS_BULLETIN, entry);
    expect(parsed?.alertLevel).toBe(3);
    expect(parsed?.bulletinDate).toBe("2026-07-12");
    expect(parsed?.parameters[0]?.name).toBe("Eruption");
    expect(phivolcsBulletinId("mvo")).toBe("phivolcs-mvo");
  });

  it("infers landslide hazard and alert-level severity", () => {
    const entry = {
      volcanoCode: "mvo",
      bulletinId: "14622",
      title: "Mayon Volcano Summary",
      detailPath: "/bulletin/activity-mvo?bid=14622&lang=en",
    };
    const parsed = parsePhivolcsBulletinHtml(SAMPLE_PHIVOLCS_BULLETIN, entry);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(inferPhivolcsHazardType(parsed)).toBe("LANDSLIDE");
    expect(inferPhivolcsSeverity(parsed.alertLevel)).toBe(3);
    expect(buildPhivolcsRawText(parsed)).toContain("Alert Level 3");
    expect(buildPhivolcsRawText(parsed)).toContain("Province of Albay");
  });
});

describe("volcano area mapper", () => {
  it("maps Mayon to Albay and Taal to multiple provinces", () => {
    const mayon = mapVolcanoCodeToLocationRefs("mvo");
    expect(mayon.some((r) => r.province === "Albay")).toBe(true);

    const taal = mapVolcanoCodeToLocationRefs("tvo");
    expect(taal.map((r) => r.province).sort()).toEqual(
      ["Batangas", "Cavite", "Laguna"].sort()
    );
  });
});
