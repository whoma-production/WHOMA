import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

const prisma = new PrismaClient();

const pilotBlueprints = [
  {
    fullName: "Amina Patel",
    agencyName: "Cityline Estates",
    jobTitle: "Senior Sales Negotiator",
    yearsExperience: 11,
    serviceAreas: ["SW1A", "SE1"],
    specialties: ["Prime sales", "Family homes"],
    achievements: ["Top branch negotiator 2025", "Trusted local adviser"],
    languages: ["English", "Gujarati"],
    verificationStatus: "VERIFIED",
    profileStatus: "PUBLISHED"
  },
  {
    fullName: "Oliver Hughes",
    agencyName: "North Quay Property",
    jobTitle: "Valuation and Listings Lead",
    yearsExperience: 9,
    serviceAreas: ["E14", "E1"],
    specialties: ["Valuations", "New instructions"],
    achievements: ["Consistent valuation accuracy", "High instruction conversion"],
    languages: ["English"],
    verificationStatus: "VERIFIED",
    profileStatus: "PUBLISHED"
  },
  {
    fullName: "Grace Thompson",
    agencyName: "Harbor & Heath",
    jobTitle: "Sales Manager",
    yearsExperience: 13,
    serviceAreas: ["N1", "N5"],
    specialties: ["Family homes", "Chain management"],
    achievements: ["Led top-performing sales team", "Fast average progression"],
    languages: ["English", "Spanish"],
    verificationStatus: "VERIFIED",
    profileStatus: "PUBLISHED"
  },
  {
    fullName: "Leo Morgan",
    agencyName: "Parkside Residential",
    jobTitle: "Instruction Specialist",
    yearsExperience: 7,
    serviceAreas: ["SW3", "SW10"],
    specialties: ["Prime sales", "Marketing strategy"],
    achievements: ["High quality vendor feedback"],
    languages: ["English"],
    verificationStatus: "PENDING",
    profileStatus: "PUBLISHED"
  },
  {
    fullName: "Isabella Reed",
    agencyName: "Kingsbridge Homes",
    jobTitle: "Sales Negotiator",
    yearsExperience: 6,
    serviceAreas: ["SE22", "SE23"],
    specialties: ["First-time buyers", "Family homes"],
    achievements: ["Strong viewing-to-offer ratio"],
    languages: ["English", "French"],
    verificationStatus: "PENDING",
    profileStatus: "PUBLISHED"
  },
  {
    fullName: "Noah Bennett",
    agencyName: "Westway Property Co",
    jobTitle: "Senior Negotiator",
    yearsExperience: 10,
    serviceAreas: ["W8", "W11"],
    specialties: ["Prime sales", "Vendor communications"],
    achievements: ["Top fee retention in branch"],
    languages: ["English"],
    verificationStatus: "PENDING",
    profileStatus: "PUBLISHED"
  },
  {
    fullName: "Maya Khan",
    agencyName: "Elmbridge Realty",
    jobTitle: "Sales Negotiator",
    yearsExperience: 5,
    serviceAreas: ["CR0", "SM1"],
    specialties: ["Family homes", "Local market guidance"],
    achievements: [],
    languages: [],
    verificationStatus: "PENDING",
    profileStatus: "DRAFT"
  },
  {
    fullName: "Ethan Clarke",
    agencyName: "Anchor Lane Estates",
    jobTitle: "Agent Partner",
    yearsExperience: 4,
    serviceAreas: ["B1", "B15"],
    specialties: ["Valuations", "Instruction setup"],
    achievements: [],
    languages: [],
    verificationStatus: "UNVERIFIED",
    profileStatus: "DRAFT"
  }
];

function buildBio(fullName, agencyName, specialties) {
  return `${fullName} helps homeowners build confidence with structured pricing advice, transparent communication, and execution discipline. Focused specialties include ${specialties.join(", ")} through ${agencyName}.`;
}

export async function seedPhase1PilotAgents() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for pilot seeding.");
  }

  const now = new Date();
  const seeded = [];

  for (const [index, blueprint] of pilotBlueprints.entries()) {
    const rank = String(index + 1).padStart(2, "0");
    const email = `pilot.agent${rank}@whoma.local`;
    const profileSlug = `pilot-agent-${rank}`;
    const bio = buildBio(blueprint.fullName, blueprint.agencyName, blueprint.specialties);
    const profileCompleteness = blueprint.profileStatus === "PUBLISHED" ? 100 : 60;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: blueprint.fullName,
        role: "AGENT"
      },
      update: {
        name: blueprint.fullName,
        role: "AGENT"
      }
    });

    await prisma.agentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        agencyName: blueprint.agencyName,
        jobTitle: blueprint.jobTitle,
        phone: `+44 20 7000 ${rank}${rank}`,
        workEmail: email,
        bio,
        yearsExperience: blueprint.yearsExperience,
        serviceAreas: blueprint.serviceAreas,
        specialties: blueprint.specialties,
        achievements: blueprint.achievements,
        languages: blueprint.languages,
        profileSlug,
        profileStatus: blueprint.profileStatus,
        profileCompleteness,
        verificationStatus: blueprint.verificationStatus,
        onboardingCompletedAt: now,
        publishedAt: blueprint.profileStatus === "PUBLISHED" ? now : null
      },
      update: {
        agencyName: blueprint.agencyName,
        jobTitle: blueprint.jobTitle,
        phone: `+44 20 7000 ${rank}${rank}`,
        workEmail: email,
        bio,
        yearsExperience: blueprint.yearsExperience,
        serviceAreas: blueprint.serviceAreas,
        specialties: blueprint.specialties,
        achievements: blueprint.achievements,
        languages: blueprint.languages,
        profileSlug,
        profileStatus: blueprint.profileStatus,
        profileCompleteness,
        verificationStatus: blueprint.verificationStatus,
        onboardingCompletedAt: now,
        publishedAt: blueprint.profileStatus === "PUBLISHED" ? now : null
      }
    });

    seeded.push({
      email,
      fullName: blueprint.fullName,
      profileStatus: blueprint.profileStatus,
      verificationStatus: blueprint.verificationStatus,
      slug: profileSlug
    });
  }

  return {
    total: seeded.length,
    seeded
  };
}

async function main() {
  try {
    const result = await seedPhase1PilotAgents();
    console.log(`Seeded or updated ${result.total} pilot real estate agents.`);
    for (const entry of result.seeded) {
      console.log(
        `- ${entry.fullName} (${entry.email}) -> ${entry.profileStatus}/${entry.verificationStatus} [/agents/${entry.slug}]`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Pilot seeding failed:", error);
    process.exit(1);
  });
}
