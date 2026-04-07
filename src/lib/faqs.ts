export interface PublicFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface PublicFaqCategory {
  id: string;
  title: string;
  items: readonly PublicFaqItem[];
}

export const PUBLIC_FAQ_CATEGORIES: readonly PublicFaqCategory[] = [
  {
    id: "general",
    title: "General",
    items: [
      {
        id: "what-is-whoma",
        question: "What is WHOMA?",
        answer:
          "WHOMA gives independent estate agents one trusted profile link to share. It brings identity checks, clear professional detail, and structured collaboration into one place."
      },
      {
        id: "who-is-whoma-for",
        question: "Who is WHOMA for?",
        answer:
          "WHOMA is built for independent estate agents who want to look credible from the first click. If you value quality referrals, cleaner introductions, and a stronger public profile, it is made for you."
      },
      {
        id: "is-whoma-a-comparison-marketplace",
        question: "Is WHOMA a marketplace for comparing agents?",
        answer:
          "No. WHOMA is not a price-comparison website. The focus is profile quality and trust first, with collaboration and seller access opened carefully."
      }
    ]
  },
  {
    id: "agent-profiles-and-verification",
    title: "Agent profiles and verification",
    items: [
      {
        id: "what-makes-profile-different",
        question:
          "What makes a WHOMA profile different from an agency bio page?",
        answer:
          "An agency bio is usually marketing copy. A WHOMA profile is structured and easier to evaluate: service areas, specialties, experience, readiness, and verification in one shareable page."
      },
      {
        id: "how-verification-works",
        question: "How does profile verification work?",
        answer:
          "After you complete your core profile, WHOMA reviews identity and profile details. Once checks pass, your profile can be shown as verified and public."
      },
      {
        id: "what-profile-readiness-means",
        question: "What does profile readiness mean?",
        answer:
          "Profile readiness is your completion score. It shows what is done and what still needs attention before you publish and share with confidence."
      }
    ]
  },
  {
    id: "sharing-and-visibility",
    title: "Sharing and visibility",
    items: [
      {
        id: "can-i-share-my-profile",
        question:
          "Can I share my WHOMA profile with clients, referrers, or collaborators?",
        answer:
          "Yes. Sharing is a core part of WHOMA. You can send your profile to clients, referrers, and collaborators as your professional link."
      },
      {
        id: "why-profile-sharing-matters",
        question: "Why is profile sharing important on WHOMA?",
        answer:
          "One clear profile reduces back-and-forth. People can quickly understand who you are, where you work, and how you collaborate."
      }
    ]
  },
  {
    id: "collaboration-and-seller-access",
    title: "Collaboration and seller access",
    items: [
      {
        id: "what-collaboration-means",
        question: "What does collaboration mean on WHOMA?",
        answer:
          "On WHOMA, collaboration means structured conversations and responses once profile trust is in place. It is designed to make fit, timing, and expectations clearer for everyone."
      },
      {
        id: "when-seller-access-opens",
        question: "When does seller access open?",
        answer:
          "Seller access opens selectively as verified agent supply and moderation depth grow. This keeps quality high while the network expands."
      },
      {
        id: "can-homeowners-join-today",
        question: "Can homeowners join WHOMA today?",
        answer:
          "Homeowner access is currently selective. WHOMA is prioritising agent quality and trusted profile depth first."
      }
    ]
  },
  {
    id: "sign-in-and-access",
    title: "Sign-in and access",
    items: [
      {
        id: "how-do-i-sign-in-to-whoma",
        question: "How do I sign in to WHOMA?",
        answer:
          "Go to sign in and continue with Google, Apple, or a secure email link."
      },
      {
        id: "do-i-need-approval-to-access-whoma",
        question: "Do I need approval to access WHOMA?",
        answer:
          "You can sign in first. Access to some areas may still be reviewed so profile quality and trust standards stay high."
      }
    ]
  },
  {
    id: "support-and-trust",
    title: "Support and trust",
    items: [
      {
        id: "how-public-profiles-are-decided",
        question: "How do you decide which profiles are public?",
        answer:
          "Profiles become public when required checks are complete and the profile meets publication standards. The same quality bar is applied across the directory."
      },
      {
        id: "are-example-profiles-real",
        question: "Are the example profiles and proof records real?",
        answer:
          "Some examples are clearly marked as samples so the platform stays easy to explore. Live verified profiles are shown as they pass review."
      },
      {
        id: "how-can-i-contact-whoma",
        question: "How can I contact WHOMA?",
        answer:
          "Email support@whoma.co.uk or use the contact form, and the team will route your enquiry quickly."
      }
    ]
  }
] as const;

const faqItemsById = new Map(
  PUBLIC_FAQ_CATEGORIES.flatMap((category) =>
    category.items.map((item) => [item.id, item] as const)
  )
);

function pickFaqItems(ids: readonly string[]): PublicFaqItem[] {
  return ids
    .map((id) => faqItemsById.get(id))
    .filter((item): item is PublicFaqItem => Boolean(item));
}

export function getHomepageFaqPreview(limit = 5): PublicFaqItem[] {
  return pickFaqItems([
    "what-is-whoma",
    "who-is-whoma-for",
    "how-verification-works",
    "can-i-share-my-profile",
    "how-do-i-sign-in-to-whoma"
  ]).slice(0, limit);
}

export function getContactFaqPreview(): PublicFaqItem[] {
  return pickFaqItems([
    "how-do-i-sign-in-to-whoma",
    "do-i-need-approval-to-access-whoma",
    "how-can-i-contact-whoma"
  ]);
}
