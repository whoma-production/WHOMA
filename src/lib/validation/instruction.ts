import { z } from "zod";

import { extractPostcodeDistrict } from "@/lib/postcode";
import { validateBidWindowHours } from "@/lib/instruction-status";

export const propertyTypes = [
  "FLAT",
  "TERRACED",
  "SEMI_DETACHED",
  "DETACHED",
  "BUNGALOW",
  "OTHER"
] as const;

export const targetTimelines = ["ASAP", "FOUR_TO_EIGHT_WEEKS", "FLEXIBLE"] as const;

export const createPropertySchema = z.object({
  addressLine1: z.string().trim().min(3).max(120),
  city: z.string().trim().min(2).max(80),
  postcode: z
    .string()
    .trim()
    .min(5)
    .max(10)
    .refine((value) => extractPostcodeDistrict(value) !== null, "Enter a valid UK postcode."),
  propertyType: z.enum(propertyTypes),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(20).optional(),
  shortDescription: z.string().trim().min(20).max(500),
  photos: z.array(z.string().url()).max(20).default([])
});

export const createInstructionSchema = z
  .object({
    property: createPropertySchema,
    sellerGoals: z.string().trim().min(30).max(5000),
    targetTimeline: z.enum(targetTimelines),
    bidWindowStartAt: z.coerce.date(),
    bidWindowEndAt: z.coerce.date(),
    bidWindowHours: z.number().int().min(24).max(48),
    mustHaves: z.array(z.string().trim().min(1).max(120)).max(10).default([])
  })
  .superRefine((value, ctx) => {
    const result = validateBidWindowHours(value.bidWindowStartAt, value.bidWindowEndAt, 24, 48);

    if (!result.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bidWindowEndAt"],
        message: result.reason
      });
    }

    const actualHours = (value.bidWindowEndAt.getTime() - value.bidWindowStartAt.getTime()) / (1000 * 60 * 60);
    if (Math.round(actualHours) !== value.bidWindowHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bidWindowHours"],
        message: "Bid window hours must match the selected start and end time."
      });
    }
  });

export type CreateInstructionInput = z.infer<typeof createInstructionSchema>;
