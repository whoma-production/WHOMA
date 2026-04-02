export interface PublicProofStep {
  title: string;
  description: string;
  status: "Live now" | "Controlled pilot";
}

export interface PublicSampleOffer {
  agent: string;
  fee: string;
  timeline: string;
  badge: string;
}

export const PUBLIC_AGENT_PROOF_LOOP: readonly PublicProofStep[] = [
  {
    title: "Verify your business email",
    description:
      "Start with a named work inbox so identity and profile claims can be anchored to a real professional account.",
    status: "Live now"
  },
  {
    title: "Publish a structured profile",
    description:
      "Show service areas, specialties, achievements, and a public profile URL you can share outside your agency site.",
    status: "Live now"
  },
  {
    title: "Log accepted outcomes",
    description:
      "Accepted offers, shortlisted decisions, and response timing begin to build the historic activity layer on WHOMA.",
    status: "Live now"
  },
  {
    title: "Appear in live collaboration opportunities",
    description:
      "Structured seller requests and proposal workflows create the next proof layer once active collaboration is under way.",
    status: "Controlled pilot"
  },
  {
    title: "Share your public proof link",
    description:
      "Use your verified public profile in pitches, introductions, and pilot conversations as a portable reputation page.",
    status: "Live now"
  },
  {
    title: "Receive collaboration interest",
    description:
      "Direct access remains tightly controlled, but the pilot is designed to turn verified profile depth into real collaboration enquiry.",
    status: "Controlled pilot"
  }
] as const;

export const PUBLIC_SAMPLE_COMPARISON = {
  eyebrow: "Sample completed comparison",
  title:
    "A seller sees three structured offers, shortlists two, and chooses one.",
  summary:
    "This is the proof loop the public MVP needs to make tangible before scale: structured comparison, shortlist discipline, and one clear collaboration outcome.",
  offers: [
    {
      agent: "A. Morgan",
      fee: "1.1% fee",
      timeline: "21 days",
      badge: "Chosen"
    },
    {
      agent: "Reed & Co",
      fee: "GBP 2,250 fixed",
      timeline: "28 days",
      badge: "Shortlisted"
    },
    {
      agent: "North Row",
      fee: "Hybrid fee",
      timeline: "30 days",
      badge: "Compared"
    }
  ] satisfies readonly PublicSampleOffer[]
} as const;

export const PUBLIC_FALLBACK_AGENT_PROOF = {
  label: "Seeded proof example",
  name: "Featured verified profile",
  role: "Independent estate agent",
  agency: "Illustrative pilot example",
  serviceAreas: ["London", "SW1A", "W1"],
  specialties: ["Local pricing", "Chain management", "Accompanied viewings"],
  profileCompleteness: 92,
  historicTransactionsLogged: 4,
  liveCollaborationListings: 2,
  shortlistedOffers: 3
} as const;
