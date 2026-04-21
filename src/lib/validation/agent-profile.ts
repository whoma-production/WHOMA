import { z } from "zod";

const postcodeDistrictPattern = /^[A-Za-z]{1,2}\d[A-Za-z\d]?$/;
const verificationCodePattern = /^\d{6}$/;

const listItemSchema = z.string().trim().min(1).max(80);

const serviceAreaSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(postcodeDistrictPattern, "Use postcode district format such as SW1A or SE1.");

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
  specialties: professionalListSchema.min(1).transform(dedupe)
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
  languages: professionalListSchema.max(10).transform(dedupe)
});

export const agentProfilePublishSchema = agentProfileDraftSchema.superRefine((value, ctx) => {
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
      message: "Add at least 80 characters to your professional summary before publishing."
    });
  }

  if (value.specialties.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["specialties"],
      message: "Add at least two specialties before publishing."
    });
  }
});

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
export type AgentProfilePublishInput = z.infer<typeof agentProfilePublishSchema>;
export type AgentWorkEmailVerificationSendInput = z.infer<typeof agentWorkEmailVerificationSendSchema>;
export type AgentWorkEmailVerificationConfirmInput = z.infer<typeof agentWorkEmailVerificationConfirmSchema>;
