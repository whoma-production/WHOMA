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
  supportCoverage: string;
  betaStatusLabel: string;
  pilotSummary: string;
  operatingRegion: string;
}

export const PUBLIC_AGENT_CTA_HREF = "/sign-up?role=AGENT";
export const PUBLIC_AGENT_DIRECTORY_HREF = "/agents";
export const PUBLIC_REQUESTS_PILOT_HREF = "/requests";
export const PUBLIC_COLLABORATION_PILOT_HREF = "/contact";

export function getPublicSiteConfig(): PublicSiteConfig {
  return {
    brandName: readEnvValue(process.env.NEXT_PUBLIC_APP_NAME, "WHOMA"),
    companyLegalName: readEnvValue(
      process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME,
      "WHOMA"
    ),
    logoSubtitle: "Where homeowners meet estate agents",
    supportEmail: readEnvValue(
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
      "support@whoma.co.uk"
    ),
    supportResponseWindow: readEnvValue(
      process.env.NEXT_PUBLIC_SUPPORT_RESPONSE_WINDOW,
      "2 business days"
    ),
    supportCoverage: readEnvValue(
      process.env.NEXT_PUBLIC_SUPPORT_COVERAGE,
      "Support is handled through a monitored email inbox."
    ),
    betaStatusLabel: readEnvValue(
      process.env.NEXT_PUBLIC_BETA_STATUS_LABEL,
      "Access by invitation"
    ),
    pilotSummary: readEnvValue(
      process.env.NEXT_PUBLIC_PILOT_SUMMARY,
      "WHOMA helps independent estate agents build a verified profile, present professional substance clearly, and open the right collaboration opportunities."
    ),
    operatingRegion: readEnvValue(
      process.env.NEXT_PUBLIC_OPERATING_REGION,
      "United Kingdom"
    )
  };
}

export function getSupportMailto(email: string): string {
  return `mailto:${email}`;
}
