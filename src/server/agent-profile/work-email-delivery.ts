export type WorkEmailDeliveryInput = {
  workEmail: string;
  verificationCode: string;
  expiresAt: Date;
};

export class WorkEmailDeliveryError extends Error {
  readonly code: "DELIVERY_NOT_CONFIGURED" | "DELIVERY_FAILED";
  readonly details?: unknown;

  constructor(
    code: "DELIVERY_NOT_CONFIGURED" | "DELIVERY_FAILED",
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "WorkEmailDeliveryError";
    this.code = code;
    this.details = details;
  }
}

function getResendConfig(): { apiKey: string; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !fromEmail) {
    throw new WorkEmailDeliveryError(
      "DELIVERY_NOT_CONFIGURED",
      "Work-email verification delivery is not configured."
    );
  }

  return { apiKey, fromEmail };
}

export async function sendWorkEmailVerificationCodeEmail(
  input: WorkEmailDeliveryInput
): Promise<void> {
  const { apiKey, fromEmail } = getResendConfig();

  const expiresAtText = input.expiresAt.toUTCString();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.workEmail],
      subject: "WHOMA work email verification code",
      text: `Your WHOMA verification code is ${input.verificationCode}. It expires at ${expiresAtText}.`,
      html: `<p>Your WHOMA verification code is <strong>${input.verificationCode}</strong>.</p><p>It expires at <strong>${expiresAtText}</strong>.</p>`
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

  throw new WorkEmailDeliveryError(
    "DELIVERY_FAILED",
    "Work-email verification delivery failed.",
    { status: response.status, details }
  );
}
