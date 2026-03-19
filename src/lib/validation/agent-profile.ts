import { z } from "zod";

const postcodeDistrictPattern = /^[A-Za-z]{1,2}\d[A-Za-z\d]?$/;

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

const professionalListSchema = z.array(listItemSchema).max(12);
const serviceAreaListSchema = z.array(serviceAreaSchema).min(1).max(12);

export const agentOnboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  workEmail: z.string().trim().email().max(320),
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
  workEmail: z.string().trim().email().max(320),
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

export type AgentOnboardingInput = z.infer<typeof agentOnboardingSchema>;
export type AgentProfileDraftInput = z.infer<typeof agentProfileDraftSchema>;
export type AgentProfilePublishInput = z.infer<typeof agentProfilePublishSchema>;
