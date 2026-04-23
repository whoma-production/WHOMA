import { z } from "zod";

import { extractPostcodeDistrict, normalizeUkPostcode } from "@/lib/postcode";

export const pastDealRoleValues = [
  "sole_agent",
  "joint_agent",
  "referral"
] as const;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const addPastDealSchema = z
  .object({
    propertyAddress: z.string().trim().min(5).max(240),
    propertyPostcode: z
      .string()
      .trim()
      .min(5)
      .max(10)
      .transform((value) => normalizeUkPostcode(value))
      .refine(
        (value) => extractPostcodeDistrict(value) !== null,
        "Enter a valid UK postcode."
      ),
    completionDate: z.string().trim().regex(isoDatePattern, "Select a valid completion date."),
    role: z.enum(pastDealRoleValues),
    salePrice: z.number().positive().max(1_000_000_000).nullable().optional(),
    sellerName: z.string().trim().max(120).nullable().optional(),
    sellerEmail: z.string().trim().toLowerCase().email().max(320).nullable().optional()
  })
  .superRefine((value, ctx) => {
    const parsedDate = new Date(`${value.completionDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completionDate"],
        message: "Select a valid completion date."
      });
    }
  });

export const confirmPastDealSchema = z
  .object({
    token: z.string().uuid("Invalid verification token."),
    confirmed: z.boolean(),
    sellerComment: z.string().trim().max(2000).nullable().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.confirmed && !(value.sellerComment ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sellerComment"],
        message: "Tell us what is incorrect."
      });
    }
  });

export type AddPastDealInput = z.infer<typeof addPastDealSchema>;
export type ConfirmPastDealInput = z.infer<typeof confirmPastDealSchema>;
