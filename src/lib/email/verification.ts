type SellerVerificationEmailInput = {
  sellerEmail: string;
  sellerName: string | null;
  agentName: string;
  propertyAddress: string;
  verificationToken: string;
};

type AgentVerificationOutcomeEmailInput = {
  agentEmail: string;
  agentName: string;
  propertyAddress: string;
  completionDate: string | null;
  sellerComment: string | null;
  confirmed: boolean;
};

export class DealVerificationEmailError extends Error {
  readonly code: "DELIVERY_NOT_CONFIGURED" | "DELIVERY_FAILED";
  readonly details?: unknown;

  constructor(
    code: "DELIVERY_NOT_CONFIGURED" | "DELIVERY_FAILED",
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "DealVerificationEmailError";
    this.code = code;
    this.details = details;
  }
}

const BRAND_FROM_EMAIL = "WHOMA <support@whoma.co.uk>";
const BRAND_VERIFY_URL = "https://www.whoma.co.uk";

function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new DealVerificationEmailError(
      "DELIVERY_NOT_CONFIGURED",
      "Deal verification delivery is not configured."
    );
  }

  return apiKey;
}

function formatCompletionDate(completionDate: string | null): string {
  if (!completionDate) {
    return "Not provided";
  }

  const parsed = new Date(`${completionDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "Europe/London"
  }).format(parsed);
}

async function sendEmail(payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = getResendApiKey();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: BRAND_FROM_EMAIL,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html
    })
  });

  if (response.ok) {
    return;
  }

  let details: unknown = undefined;
  try {
    details = await response.json();
  } catch {
    details = await response.text().catch(() => undefined);
  }

  throw new DealVerificationEmailError(
    "DELIVERY_FAILED",
    "Deal verification email delivery failed.",
    {
      status: response.status,
      details
    }
  );
}

export async function sendVerificationEmail(
  input: SellerVerificationEmailInput
): Promise<void> {
  const safeSellerName = input.sellerName?.trim() || "there";
  const encodedToken = encodeURIComponent(input.verificationToken);
  const confirmUrl = `${BRAND_VERIFY_URL}/verify/${encodedToken}?confirmed=true`;
  const disputeUrl = `${BRAND_VERIFY_URL}/verify/${encodedToken}?confirmed=false`;

  const subject = `${safeSellerName}, did ${input.agentName} sell your property at ${input.propertyAddress}?`;
  const text = [
    "WHOMA is a platform that helps independent estate agents build verified professional profiles.",
    "",
    `${input.agentName} has added your property at ${input.propertyAddress} to their WHOMA profile as a past sale.`,
    "",
    "If this is correct, click below to confirm — it only takes 10 seconds.",
    `Yes, confirm this sale: ${confirmUrl}`,
    `This is incorrect: ${disputeUrl}`,
    "",
    "You received this because your email was provided by an estate agent.",
    "Questions? Reply to this email."
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:620px;margin:24px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <div style="background:#18181b;padding:24px;">
          <p style="margin:0;color:#e4e4e7;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">WHOMA</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#f4f4f5;">Past sale confirmation request</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
            WHOMA is a platform that helps independent estate agents build verified professional profiles.
          </p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
            <strong>${input.agentName}</strong> has added your property at <strong>${input.propertyAddress}</strong> to their WHOMA profile as a past sale.
          </p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
            If this is correct, click below to confirm — it only takes 10 seconds.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:12px;margin:0 0 20px;">
            <a href="${confirmUrl}" style="display:inline-block;padding:12px 16px;background:#2d6a5a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Yes, confirm this sale</a>
            <a href="${disputeUrl}" style="display:inline-block;padding:12px 16px;background:#ffffff;color:#1f2937;text-decoration:none;border:1px solid #cbd5e1;border-radius:8px;font-weight:600;">This is incorrect</a>
          </div>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
            You received this because your email was provided by an estate agent. Questions? Reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: input.sellerEmail,
    subject,
    text,
    html
  });
}

export async function sendAgentVerificationOutcomeEmail(
  input: AgentVerificationOutcomeEmailInput
): Promise<void> {
  const statusLabel = input.confirmed ? "confirmed" : "marked incorrect";
  const completionDate = formatCompletionDate(input.completionDate);
  const safeComment = input.sellerComment?.trim() || "No comment was provided.";

  const subject = `WHOMA verification update: ${input.propertyAddress}`;
  const text = [
    `Hi ${input.agentName},`,
    "",
    `A seller has ${statusLabel} your past deal at ${input.propertyAddress}.`,
    `Completion date: ${completionDate}.`,
    "",
    `Seller comment: ${safeComment}`,
    "",
    "You can review your profile evidence in WHOMA.",
    `${BRAND_VERIFY_URL}/agent/deals`
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:620px;margin:24px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <div style="background:#18181b;padding:24px;">
          <p style="margin:0;color:#e4e4e7;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">WHOMA</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#f4f4f5;">Past deal verification update</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hi ${input.agentName},</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
            A seller has <strong>${statusLabel}</strong> your past deal at <strong>${input.propertyAddress}</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
            Completion date: <strong>${completionDate}</strong>
          </p>
          <div style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 16px;">
            <p style="margin:0;font-size:14px;line-height:1.5;color:#334155;">
              Seller comment: ${safeComment}
            </p>
          </div>
          <a href="${BRAND_VERIFY_URL}/agent/deals" style="display:inline-block;padding:12px 16px;background:#2d6a5a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Review your past deals</a>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: input.agentEmail,
    subject,
    text,
    html
  });
}
