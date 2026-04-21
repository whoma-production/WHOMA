import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/server/analytics";
import { PRODUCT_EVENT_NAMES } from "@/server/product-events";

export const supportInquiryCategorySchema = z.enum([
  "ACCOUNT_ACCESS",
  "ONBOARDING",
  "VERIFICATION",
  "SELLER_ACCESS",
  "PARTNERSHIP",
  "COMPLAINT",
  "BETA_WAITLIST",
  "GENERAL"
]);

export const supportInquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.string().trim().max(80).optional(),
  category: supportInquiryCategorySchema,
  message: z.string().trim().min(12).max(4000),
  pagePath: z.string().trim().max(280).optional(),
  source: z.string().trim().max(80).optional()
});

export type SupportInquiryInput = z.infer<typeof supportInquirySchema>;

async function sendSupportInquiryNotification(
  input: SupportInquiryInput,
  inquiryId: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@whoma.co.uk";

  if (!apiKey || !fromEmail) {
    return;
  }

  const subject = `WHOMA support enquiry: ${input.category
    .toLowerCase()
    .replace(/_/g, " ")}`;

  const lines = [
    `Support enquiry ID: ${inquiryId}`,
    `Category: ${input.category}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Role: ${input.role ?? "Not provided"}`,
    `Page: ${input.pagePath ?? "Unknown"}`,
    "",
    input.message
  ];

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [supportEmail],
        reply_to: input.email,
        subject,
        text: lines.join("\n")
      })
    });
  } catch (error) {
    console.warn("[support-inquiry] notification_failed", {
      inquiryId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function createSupportInquiry(
  input: SupportInquiryInput
): Promise<{ id: string }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const parsed = supportInquirySchema.parse(input);
  const inquiry = await prisma.supportInquiry.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role ?? null,
      category: parsed.category,
      message: parsed.message,
      pagePath: parsed.pagePath ?? null,
      source: parsed.source ?? null
    },
    select: {
      id: true
    }
  });

  await Promise.all([
    trackEvent(
      PRODUCT_EVENT_NAMES.supportInquirySubmitted,
      {
        inquiryId: inquiry.id,
        category: parsed.category,
        role: parsed.role ?? null
      },
      {
        actorId: null,
        actorRole: null,
        subjectUserId: null,
        source: parsed.source ?? "/contact"
      }
    ),
    sendSupportInquiryNotification(parsed, inquiry.id)
  ]);

  return { id: inquiry.id };
}
