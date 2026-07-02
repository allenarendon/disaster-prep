import { z } from "zod";

export const languageCodeSchema = z.enum(["tl", "ceb", "en"]);

export const locationRefSchema = z.object({
  barangayCode: z.string().min(1),
  barangayName: z.string().min(1),
  cityMunicipality: z.string().min(1),
  province: z.string().min(1),
  region: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const hazardBulletinSchema = z.object({
  id: z.string(),
  source: z.enum(["PAGASA", "PHIVOLCS", "OCD", "MANUAL_ADMIN"]),
  hazardType: z.enum([
    "TYPHOON",
    "FLOOD",
    "STORM_SURGE",
    "LANDSLIDE",
    "EARTHQUAKE",
  ]),
  issuedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  affectedAreas: z.array(locationRefSchema),
  severity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  rawText: z.string(),
});

export const guidanceRequestSchema = z.object({
  location: locationRefSchema,
  language: languageCodeSchema,
  requestedAt: z.string().datetime(),
});

export const guidancePhaseSchema = z.enum([
  "NOW",
  "NEXT_24H",
  "DURING_IMPACT",
  "AFTERMATH",
]);

export const guidanceResponseSchema = z.object({
  bulletinId: z.string(),
  generatedAt: z.string().datetime(),
  language: languageCodeSchema,
  phase: guidancePhaseSchema,
  summary: z.string(),
  actionItems: z.array(z.string()),
  sourceAttribution: z.string(),
  isFallback: z.boolean(),
  hazardType: z
    .enum(["TYPHOON", "FLOOD", "STORM_SURGE", "LANDSLIDE", "EARTHQUAKE"])
    .optional(),
  severity: z.number().optional(),
});

export const evacStatusSchema = z.enum(["OPEN", "FULL", "CLOSED", "UNKNOWN"]);

export const evacuationCenterSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: locationRefSchema,
  lat: z.number(),
  lng: z.number(),
  capacity: z.number().optional(),
  status: evacStatusSchema,
  statusUpdatedAt: z.string().datetime(),
  statusSource: z.enum(["LGU_ADMIN", "COMMUNITY_REPORT", "DEFAULT_UNKNOWN"]),
  reportCount: z.number(),
  distanceKm: z.number().optional(),
  isStale: z.boolean().optional(),
  conflictNote: z.string().optional(),
  isMock: z.boolean().optional(),
});

export const communityReportInputSchema = z
  .object({
    type: z.enum(["EVAC_STATUS", "ROAD_CONDITION", "OTHER_HAZARD"]),
    targetEvacCenterId: z.string().optional(),
    location: locationRefSchema,
    message: z.string().max(280),
    reportedStatus: evacStatusSchema.optional(),
    submittedAt: z.string().datetime(),
    clientHash: z.string().min(8),
  })
  .superRefine((data, ctx) => {
    if (data.type === "EVAC_STATUS") {
      if (!data.targetEvacCenterId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "targetEvacCenterId is required for EVAC_STATUS reports",
          path: ["targetEvacCenterId"],
        });
      }
      if (!data.reportedStatus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "reportedStatus is required for EVAC_STATUS reports",
          path: ["reportedStatus"],
        });
      }
    }
  });

export const evacStatusUpdateSchema = z.object({
  status: evacStatusSchema,
  updatedBy: z.string().min(1),
});

export const shareRequestSchema = z.object({
  guidanceResponseId: z.string(),
  summary: z.string().optional(),
  locationName: z.string().optional(),
});

export const bulletinsQuerySchema = z.object({
  barangayCode: z.string().optional(),
  province: z.string().optional(),
  region: z.string().optional(),
});

export const locationsSearchQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(20),
});

export const locationsNearestQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const locationSearchMatchSchema = locationRefSchema.extend({
  knownEvacCenter: z.boolean(),
});

export const hotlinesQuerySchema = z.object({
  barangayCode: z.string().trim().min(1),
});

export const evacCentersQuerySchema = z
  .object({
    barangayCode: z.string().trim().min(1).optional(),
    locationBarangayCode: z.string().trim().min(1).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    const hasBarangay = Boolean(data.barangayCode);
    const hasLatLng = data.lat !== undefined && data.lng !== undefined;

    if (!hasBarangay && !hasLatLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either barangayCode or both lat and lng",
        path: ["barangayCode"],
      });
      return;
    }

    if (hasBarangay && (data.lat !== undefined || data.lng !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either barangayCode or lat/lng, not both",
        path: ["barangayCode"],
      });
      return;
    }

    if (data.radiusKm !== undefined && !hasLatLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "radiusKm can only be used with lat and lng",
        path: ["radiusKm"],
      });
    }
  });

export const offlineHazardKeySchema = z.enum([
  "TYPHOON",
  "FLOOD",
  "STORM_SURGE",
  "LANDSLIDE",
]);

export const offlineBundleSchema = z.object({
  bundleVersion: z.string(),
  generatedAt: z.string().datetime(),
  validForRegion: z.string(),
  staticChecklists: z.record(languageCodeSchema, z.array(z.string())),
  hazardSpecificGuidance: z.record(
    offlineHazardKeySchema,
    z.record(languageCodeSchema, z.array(z.string()))
  ),
  lastKnownEvacCenters: z.array(evacuationCenterSchema),
});

export const aiGuidanceOutputSchema = z.object({
  summary: z.string(),
  actionItems: z.array(z.string()).min(1).max(8),
});
