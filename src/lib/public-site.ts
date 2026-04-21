function readEnvValue(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function readBooleanEnvValue(value: string | undefined, fallback: boolean): boolean {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export interface PublicSiteConfig {
  brandName: string;
  logoSubtitle: string;
  supportEmail: string;
  supportCoverage: string;
  pilotSummary: string;
  showPhase2Preview: boolean;
}

export const PUBLIC_AGENT_CTA_HREF = "/sign-up?role=AGENT";
export const PUBLIC_AGENT_DIRECTORY_HREF = "/agents";
export const PUBLIC_FAQS_HREF = "/faqs";
export const PUBLIC_SUPPORT_HREF = "/contact";
export const PUBLIC_REQUESTS_PILOT_HREF = "/requests";
export const PUBLIC_COLLABORATION_PILOT_HREF = PUBLIC_SUPPORT_HREF;

export function getPublicSiteConfig(): PublicSiteConfig {
  return {
    brandName: readEnvValue(process.env.NEXT_PUBLIC_APP_NAME, "WHOMA"),
    logoSubtitle: "Where Home Owners Meet Agents",
    supportEmail: readEnvValue(
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
      "support@whoma.co.uk"
    ),
    supportCoverage: readEnvValue(
      process.env.NEXT_PUBLIC_SUPPORT_COVERAGE,
      "Support is handled through a monitored email inbox."
    ),
    pilotSummary: readEnvValue(
      process.env.NEXT_PUBLIC_PILOT_SUMMARY,
      "WHOMA helps independent estate agents build verified transaction identity: trusted profiles, structured proof, and measurable collaboration readiness."
    ),
    showPhase2Preview: readBooleanEnvValue(
      process.env.NEXT_PUBLIC_SHOW_PHASE2_PREVIEW,
      false
    )
  };
}

export function getSupportMailto(email: string): string {
  return `mailto:${email}`;
}
