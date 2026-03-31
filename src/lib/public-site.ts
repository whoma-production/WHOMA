function readEnvValue(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export interface PublicSiteConfig {
  brandName: string;
  companyLegalName: string;
  logoSubtitle: string;
  supportEmail: string;
  supportResponseWindow: string;
  betaStatusLabel: string;
}

export const PUBLIC_AGENT_CTA_HREF = "/sign-up?role=AGENT";
export const PUBLIC_AGENT_DIRECTORY_HREF = "/agents";
export const PUBLIC_REQUESTS_PILOT_HREF = "/requests";

export function getPublicSiteConfig(): PublicSiteConfig {
  return {
    brandName: readEnvValue(process.env.NEXT_PUBLIC_APP_NAME, "WHOMA"),
    companyLegalName: readEnvValue(
      process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME,
      "WHOMA"
    ),
    logoSubtitle: readEnvValue(
      process.env.NEXT_PUBLIC_LOGO_SUBTITLE,
      "Verified identity for estate agents"
    ),
    supportEmail: readEnvValue(
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
      "support@whoma.co.uk"
    ),
    supportResponseWindow: readEnvValue(
      process.env.NEXT_PUBLIC_SUPPORT_RESPONSE_WINDOW,
      "3 business days"
    ),
    betaStatusLabel: readEnvValue(
      process.env.NEXT_PUBLIC_BETA_STATUS_LABEL,
      "Phase 1 verified-profile pilot"
    )
  };
}

export function getSupportMailto(email: string): string {
  return `mailto:${email}`;
}
