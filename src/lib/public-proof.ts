export interface PublicFeatureItem {
  title: string;
  description: string;
}

export interface PublicJourneyStep {
  title: string;
  description: string;
  status: "Available now" | "Selective access";
}

export interface PublicProfileField {
  label: string;
  value: string;
}

export interface PublicSampleOffer {
  agent: string;
  summary: string;
  timeline: string;
  badge: string;
}

export const PUBLIC_WHY_AGENTS_JOIN: readonly PublicFeatureItem[] = [
  {
    title: "Stand on your own",
    description:
      "A WHOMA profile makes your own track record, working style, and local strength easier to share."
  },
  {
    title: "Show substance, not claims",
    description:
      "Bring structured professional detail, service areas, and specialties into one public record."
  },
  {
    title: "Open better collaboration",
    description:
      "Use a stronger profile to support introductions, referrals, and invited opportunities."
  }
] as const;

export const PUBLIC_PROOF_MODULES: readonly PublicFeatureItem[] = [
  {
    title: "Verified identity",
    description:
      "A verified email route, profile details, and a clear public record establish who is behind the profile."
  },
  {
    title: "Profile depth",
    description:
      "Structured specialties, service areas, and professional detail make the profile easier to evaluate."
  },
  {
    title: "Public reputation",
    description:
      "A shareable profile makes specialisms, service areas, and professional standing easy to read."
  },
  {
    title: "Structured collaboration",
    description:
      "When collaboration opens, responses follow a clear format so quality and fit are easier to judge."
  }
] as const;

export const PUBLIC_AGENT_JOURNEY: readonly PublicJourneyStep[] = [
  {
    title: "Build profile",
    description:
      "Create a professional profile with the details someone needs to understand how you work.",
    status: "Available now"
  },
  {
    title: "Add profile depth",
    description:
      "Bring service detail, specialties, and professional context into the record.",
    status: "Available now"
  },
  {
    title: "Share profile",
    description:
      "Use one public page in introductions, referrals, and agent-side conversations.",
    status: "Available now"
  },
  {
    title: "Receive interest",
    description:
      "Open the right collaboration opportunities once a stronger professional record is in place.",
    status: "Selective access"
  }
] as const;

export const PUBLIC_AGENT_PROOF_LOOP = PUBLIC_AGENT_JOURNEY;

export const PUBLIC_SAMPLE_PROFILE_VIEW = {
  eyebrow: "Sample completed profile",
  title: "One profile, ready to share",
  summary:
    "A WHOMA profile should feel useful in a referral, an introduction, or a collaboration conversation before anything else happens.",
  fields: [
    { label: "Service areas", value: "London, SW1A, W1" },
    { label: "Specialties", value: "Local pricing, chain management, viewings" },
    { label: "Verification", value: "Admin verified" },
    { label: "Published", value: "Visible on public directory" },
    { label: "Profile readiness", value: "92% complete" },
    { label: "Status", value: "Ready to share" }
  ] satisfies readonly PublicProfileField[]
} as const;

export const PUBLIC_COLLABORATION_FLOW = {
  eyebrow: "How it works",
  title: "Collaboration becomes clearer once the profile is in place.",
  summary:
    "WHOMA keeps the next step structured so introductions, responses, and communication are easier to follow.",
  steps: [
    {
      title: "Profile shared",
      description:
        "The agent shares a verified public profile before any collaboration begins."
    },
    {
      title: "Structured response",
      description:
        "The homeowner reviews a consistent response format covering service fit, timing, and collaboration clarity."
    },
    {
      title: "Shortlist opened",
      description:
        "Once the shortlist is clear, the conversation can move forward with better context."
    }
  ] satisfies readonly PublicFeatureItem[]
} as const;

export const PUBLIC_SAMPLE_COMPARISON = {
  eyebrow: "Illustrative workflow",
  title: "A homeowner reviews three structured responses and opens a shortlist.",
  summary:
    "WHOMA keeps response formats consistent so fit, timing, and trust are easier to read.",
  offers: [
    {
      agent: "A. Morgan",
      summary: "Local strategy fit",
      timeline: "21 days",
      badge: "Selected"
    },
    {
      agent: "Reed & Co",
      summary: "Chain management plan",
      timeline: "28 days",
      badge: "Shortlisted"
    },
    {
      agent: "North Row",
      summary: "Progress reporting structure",
      timeline: "30 days",
      badge: "Reviewed"
    }
  ] satisfies readonly PublicSampleOffer[]
} as const;
