export interface PublicFeatureItem {
  title: string;
  description: string;
}

export interface PublicJourneyStep {
  title: string;
  description: string;
  status: "Available now" | "Selective access" | "Rolling out";
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

export interface PublicRoadmapStep {
  title: string;
  description: string;
}

export interface PublicExampleAgentProfile {
  name: string;
  agency: string;
  areas: string;
  specialties: string;
  readiness: string;
  verification: string;
}

export interface PublicExampleTransactionHistory {
  agent: string;
  summary: string;
  highlights: string[];
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
    title: "Verified identity baseline",
    description:
      "Every profile starts with identity checks and structured profile data so the person behind the profile is clear."
  },
  {
    title: "Verified transaction records",
    description:
      "Historic transaction activity is logged in structured form, then attached to profile trust context."
  },
  {
    title: "Third-party evidence checks",
    description:
      "WHOMA verification can include external evidence review so trust is not based on self-claims alone."
  },
  {
    title: "Liquidity and engagement thresholds",
    description:
      "Profile trust is reinforced by live activity signals such as collaboration momentum and engagement quality."
  }
] as const;

export const PUBLIC_AGENT_JOURNEY: readonly PublicJourneyStep[] = [
  {
    title: "Profile draft created",
    description:
      "The agent builds a structured profile with role, areas, specialties, and professional summary.",
    status: "Available now"
  },
  {
    title: "Historic transactions logged",
    description:
      "Historic transaction records are added in a consistent format to create verifiable proof context.",
    status: "Rolling out"
  },
  {
    title: "Evidence review completed",
    description:
      "Claims can be checked against supporting evidence and verification controls before wider trust visibility.",
    status: "Selective access"
  },
  {
    title: "Live activity logged",
    description:
      "Current transaction and collaboration activity is logged so profile trust stays current, not static.",
    status: "Rolling out"
  },
  {
    title: "Liquidity and engagement threshold met",
    description:
      "Visibility strength is informed by activity quality and engagement momentum, not profile copy alone.",
    status: "Selective access"
  },
  {
    title: "Shareable WHOMA identity live",
    description:
      "The verified profile remains the public trust layer agents can share across referrals and introductions.",
    status: "Selective access"
  }
] as const;

export const PUBLIC_AGENT_PROOF_LOOP = PUBLIC_AGENT_JOURNEY;

export const PUBLIC_SAMPLE_PROFILE_VIEW = {
  eyebrow: "Sample completed profile",
  title: "One profile, ready to share",
  summary:
    "A WHOMA profile is the public layer of the proof system: identity, structured track record, and readiness in one shareable asset.",
  fields: [
    { label: "Service areas", value: "London, SW1A, W1" },
    { label: "Specialties", value: "Local pricing, chain management, viewings" },
    { label: "Verification", value: "Verified by WHOMA" },
    { label: "Published", value: "Visible on public directory" },
    { label: "Profile readiness", value: "92% complete" },
    { label: "Status", value: "Ready to share" }
  ] satisfies readonly PublicProfileField[]
} as const;

export const PUBLIC_COLLABORATION_FLOW = {
  eyebrow: "Phase 2 preview (selective access)",
  title: "Future-state collaboration stays gated behind Phase 1 proof.",
  summary:
    "This is not the default user journey today. Seller-side collaboration remains secondary until the proof loop has stronger live coverage.",
  steps: [
    {
      title: "Verified profile baseline",
      description:
        "The public trust layer starts with verified identity and structured profile depth."
    },
    {
      title: "Proof thresholds met",
      description:
        "Historic logs, live activity, and engagement quality should be visible before collaboration routes scale."
    },
    {
      title: "Managed collaboration access",
      description:
        "Shortlist and message routes remain managed so trust and quality standards stay high."
    }
  ] satisfies readonly PublicFeatureItem[]
} as const;

export const PUBLIC_SAMPLE_COMPARISON = {
  eyebrow: "Illustrative Phase 2 preview",
  title: "Example shortlist view (not the primary Phase 1 path).",
  summary:
    "Shown for roadmap clarity only. WHOMA currently prioritises verified identity and proof-loop quality before broad seller flow expansion.",
  offers: [
    {
      agent: "A. Morgan",
      summary: "Local strategy fit",
      timeline: "21 days",
      badge: "Illustrative selected"
    },
    {
      agent: "Reed & Co",
      summary: "Chain management plan",
      timeline: "28 days",
      badge: "Illustrative shortlisted"
    },
    {
      agent: "North Row",
      summary: "Progress reporting structure",
      timeline: "30 days",
      badge: "Illustrative reviewed"
    }
  ] satisfies readonly PublicSampleOffer[]
} as const;

export const PUBLIC_PHASE_SEQUENCE: readonly PublicRoadmapStep[] = [
  {
    title: "1) Verified identity first",
    description:
      "Every agent starts with verified identity and a structured profile that can be shared publicly."
  },
  {
    title: "2) Collaboration liquidity second",
    description:
      "WHOMA then tracks real collaboration momentum through live activity, liquidity, and engagement thresholds."
  },
  {
    title: "3) Structured tendering after proof",
    description:
      "Once identity and proof thresholds are met, structured tendering expands with clearer confidence."
  }
] as const;

export const PUBLIC_EXAMPLE_AGENT_PROFILES: readonly PublicExampleAgentProfile[] = [
  {
    name: "A. Morgan",
    agency: "North Row Estates",
    areas: "SW1A, W1, SE1",
    specialties: "Chain management, family homes",
    readiness: "92%",
    verification: "Verified by WHOMA"
  },
  {
    name: "Reed & Co",
    agency: "Reed & Co",
    areas: "N1, N5, E8",
    specialties: "Instruction strategy, viewings",
    readiness: "90%",
    verification: "Verified by WHOMA"
  },
  {
    name: "L. Patel",
    agency: "Harbour Lane",
    areas: "E14, SE10, E1",
    specialties: "Waterfront homes, relocation",
    readiness: "88%",
    verification: "Verified by WHOMA"
  },
  {
    name: "J. Whitmore",
    agency: "Whitmore Independent",
    areas: "W2, W9, NW8",
    specialties: "Premium flats, chain progression",
    readiness: "91%",
    verification: "Verified by WHOMA"
  },
  {
    name: "S. Ahmed",
    agency: "Bridge Court",
    areas: "CR0, BR1, SE20",
    specialties: "First-time sellers, valuation prep",
    readiness: "87%",
    verification: "Verified by WHOMA"
  },
  {
    name: "M. Davies",
    agency: "Davenport Homes",
    areas: "SW18, SW11, SW19",
    specialties: "Family relocations, negotiation",
    readiness: "89%",
    verification: "Verified by WHOMA"
  }
] as const;

export const PUBLIC_EXAMPLE_TRANSACTION_HISTORIES: readonly PublicExampleTransactionHistory[] = [
  {
    agent: "A. Morgan · North Row Estates",
    summary: "Verified transaction history snapshot (illustrative)",
    highlights: [
      "12 historic completions logged (last 18 months)",
      "Median time to exchange: 29 days",
      "Service areas: SW1A, SE1, W1"
    ]
  },
  {
    agent: "Reed & Co",
    summary: "Verified transaction history snapshot (illustrative)",
    highlights: [
      "9 historic completions logged (last 12 months)",
      "4 live collaboration opportunities opened",
      "Structured updates sent across every active instruction"
    ]
  }
] as const;
