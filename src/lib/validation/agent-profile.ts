import { z } from "zod";

const postcodeDistrictPattern = /^[A-Za-z]{1,2}\d[A-Za-z\d]?$/;
const verificationCodePattern = /^\d{6}$/;

const listItemSchema = z.string().trim().min(1).max(80);
const responseTimeOptions = [15, 60, 180, 480, 1440] as const;

export const agentFeePreferenceValues = [
  "FIXED_FEE",
  "PERCENTAGE",
  "HYBRID",
  "CASE_BY_CASE"
] as const;

export const agentTransactionBandValues = [
  "UNDER_250K",
  "FROM_250K_TO_500K",
  "FROM_500K_TO_1M",
  "FROM_1M_TO_2M",
  "OVER_2M"
] as const;

export const collaborationPreferenceValues = [
  "JV_OR_REFERRALS",
  "REFERRALS_ONLY",
  "SELECTIVE",
  "NOT_OPEN"
] as const;

export const agentFeePreferenceOptions = [
  { value: "FIXED_FEE", label: "Fixed fee" },
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "CASE_BY_CASE", label: "Case by case" }
] as const;

export const agentTransactionBandOptions = [
  { value: "UNDER_250K", label: "Residential" },
  { value: "FROM_250K_TO_500K", label: "Commercial" },
  { value: "FROM_500K_TO_1M", label: "Luxury" },
  { value: "FROM_1M_TO_2M", label: "New homes" }
] as const;

export const collaborationPreferenceOptions = [
  { value: "JV_OR_REFERRALS", label: "Open to fee split deals" },
  { value: "REFERRALS_ONLY", label: "Referrals only" },
  { value: "SELECTIVE", label: "Selective / case by case" },
  { value: "NOT_OPEN", label: "Not currently looking" }
] as const;

export const responseTimeOptionsWithLabels = [
  { value: 15, label: "Within 15 minutes" },
  { value: 60, label: "Within 1 hour" },
  { value: 180, label: "Within 3 hours" },
  { value: 480, label: "Within 8 hours" },
  { value: 1440, label: "Within 24 hours" }
] as const;

const serviceAreaSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    postcodeDistrictPattern,
    "Use postcode district format such as SW1A or SE1."
  );

export function parseCsvList(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function optionalEnumValue<T extends readonly [string, ...string[]]>(
  values: T
) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0
        ? undefined
        : value,
    z.enum(values).optional()
  );
}

const optionalResponseTimeSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return undefined;
    }

    return value;
  },
  z.coerce
    .number()
    .int()
    .refine(
      (value) =>
        responseTimeOptions.includes(
          value as (typeof responseTimeOptions)[number]
        ),
      {
        message: "Choose one of the available response-time options."
      }
    )
    .optional()
);

export function isAcceptedWorkEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return false;
  }

  return normalized.slice(atIndex + 1).includes(".");
}

const workEmailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .refine(isAcceptedWorkEmail, "Enter a valid email address.");

const professionalListSchema = z.array(listItemSchema).max(12);
const serviceAreaListSchema = z.array(serviceAreaSchema).min(1).max(12);

export const agentOnboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  workEmail: workEmailSchema,
  phone: z.string().trim().min(8).max(32),
  agencyName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(2).max(120),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  bio: z.string().trim().min(40).max(3000),
  serviceAreas: serviceAreaListSchema.transform(dedupe),
  specialties: professionalListSchema.min(1).transform(dedupe),
  achievements: professionalListSchema.max(10).transform(dedupe).optional(),
  languages: professionalListSchema.max(10).transform(dedupe).optional(),
  feePreference: optionalEnumValue(agentFeePreferenceValues),
  transactionBand: optionalEnumValue(agentTransactionBandValues),
  collaborationPreference: optionalEnumValue(collaborationPreferenceValues),
  responseTimeMinutes: optionalResponseTimeSchema
});

export const agentProfileDraftSchema = z.object({
  agencyName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(2).max(120),
  workEmail: workEmailSchema,
  phone: z.string().trim().min(8).max(32),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  bio: z.string().trim().max(3000).optional(),
  serviceAreas: serviceAreaListSchema.transform(dedupe),
  specialties: professionalListSchema.min(1).transform(dedupe),
  achievements: professionalListSchema.max(10).transform(dedupe),
  languages: professionalListSchema.max(10).transform(dedupe),
  feePreference: optionalEnumValue(agentFeePreferenceValues),
  transactionBand: optionalEnumValue(agentTransactionBandValues),
  collaborationPreference: optionalEnumValue(collaborationPreferenceValues),
  responseTimeMinutes: optionalResponseTimeSchema
});

export const agentProfilePublishSchema = agentProfileDraftSchema.superRefine(
  (value, ctx) => {
    if (!value.yearsExperience && value.yearsExperience !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["yearsExperience"],
        message: "Years of experience is required before publishing."
      });
    }

    if (!value.bio || value.bio.trim().length < 80) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bio"],
        message:
          "Add at least 80 characters to your professional summary before publishing."
      });
    }

    if (value.specialties.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specialties"],
        message: "Add at least two specialties before publishing."
      });
    }
  }
);

export const agentWorkEmailVerificationSendSchema = z.object({
  workEmail: workEmailSchema
});

export const agentWorkEmailVerificationConfirmSchema = z.object({
  workEmail: workEmailSchema,
  verificationCode: z
    .string()
    .trim()
    .regex(verificationCodePattern, "Enter the 6-digit verification code.")
});

export type AgentOnboardingInput = z.infer<typeof agentOnboardingSchema>;
export type AgentProfileDraftInput = z.infer<typeof agentProfileDraftSchema>;
export type AgentProfilePublishInput = z.infer<
  typeof agentProfilePublishSchema
>;
export type AgentWorkEmailVerificationSendInput = z.infer<
  typeof agentWorkEmailVerificationSendSchema
>;
export type AgentWorkEmailVerificationConfirmInput = z.infer<
  typeof agentWorkEmailVerificationConfirmSchema
>;
