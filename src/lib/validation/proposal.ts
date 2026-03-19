import { z } from "zod";

export const proposalFeeModels = ["FIXED", "PERCENT", "HYBRID", "SUCCESS_BANDS"] as const;
export const proposalCurrencies = ["GBP"] as const;
export const proposalStatuses = ["SUBMITTED", "SHORTLISTED", "REJECTED", "ACCEPTED"] as const;

export const proposalInclusions = [
  "PROFESSIONAL_PHOTOGRAPHY",
  "FLOORPLAN",
  "PORTAL_LISTINGS",
  "HOSTED_VIEWINGS",
  "ACCOMPANIED_VIEWINGS",
  "SALES_PROGRESSION_SUPPORT",
  "EPC_ASSISTANCE"
] as const;

export const proposalInclusionLabels: Record<(typeof proposalInclusions)[number], string> = {
  PROFESSIONAL_PHOTOGRAPHY: "Professional photography",
  FLOORPLAN: "Floorplan",
  PORTAL_LISTINGS: "Portal listings (Rightmove/Zoopla/OTM)",
  HOSTED_VIEWINGS: "Hosted viewings",
  ACCOMPANIED_VIEWINGS: "Accompanied viewings",
  SALES_PROGRESSION_SUPPORT: "Sales progression support",
  EPC_ASSISTANCE: "EPC assistance"
};

export const proposalSubmissionSchema = z
  .object({
    instructionId: z.string().min(1),
    feeModel: z.enum(proposalFeeModels),
    feeValue: z.number().positive(),
    currency: z.enum(proposalCurrencies).default("GBP"),
    inclusions: z.array(z.enum(proposalInclusions)).min(1, "Select at least one inclusion."),
    marketingPlan: z
      .string()
      .trim()
      .min(40, "Explain the marketing approach in at least 40 characters.")
      .max(2000),
    timelineDays: z.number().int().min(1).max(365),
    cancellationTerms: z.string().trim().min(20).max(2000)
  })
  .superRefine((value, ctx) => {
    if (value.feeModel === "PERCENT" && value.feeValue > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["feeValue"],
        message: "Percentage fee should be expressed as a percentage value (e.g. 1.2)."
      });
    }

    if ((value.feeModel === "FIXED" || value.feeModel === "HYBRID") && value.feeValue < 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["feeValue"],
        message: "Fixed or hybrid fees should be a realistic GBP amount."
      });
    }
  });

export type ProposalSubmissionInput = z.infer<typeof proposalSubmissionSchema>;
