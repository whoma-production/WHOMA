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
          "WHOMA is the professional layer for independent estate agents. It helps agents build stronger public profiles, verify identity, and open structured collaboration."
      },
      {
        id: "who-is-whoma-for",
        question: "Who is WHOMA for?",
        answer:
          "WHOMA is built first for independent estate agents who want clearer professional standing, stronger profile quality, and a better way to support referrals and collaboration."
      },
      {
        id: "is-whoma-a-comparison-marketplace",
        question: "Is WHOMA a marketplace for comparing agents?",
        answer:
          "No. WHOMA is not a fee-comparison portal. It starts with verified identity, profile depth, and structured collaboration, with seller access opened selectively."
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
          "A WHOMA profile is structured to make professional standing easier to read. It brings service areas, specialties, profile depth, and verification into one shareable profile."
      },
      {
        id: "how-verification-works",
        question: "How does profile verification work?",
        answer:
          "WHOMA checks identity and profile detail before a profile is treated as verified and public. Verification is used to protect trust and profile quality."
      },
      {
        id: "what-profile-readiness-means",
        question: "What does profile readiness mean?",
        answer:
          "Profile readiness is a completion signal showing how close a profile is to publication quality. It helps agents see what to finish before sharing at scale."
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
          "Yes. WHOMA is built for profile sharing so agents can send one trusted public profile in referrals, introductions, and collaboration conversations."
      },
      {
        id: "why-profile-sharing-matters",
        question: "Why is profile sharing important on WHOMA?",
        answer:
          "Profile sharing turns professional identity into a portable asset. It helps people review standing, service fit, and collaboration readiness in one place."
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
          "Collaboration means structured introductions and responses once a strong profile is in place, so fit, timing, and trust are easier to judge."
      },
      {
        id: "when-seller-access-opens",
        question: "When does seller access open?",
        answer:
          "Seller access opens selectively as profile quality, moderation, and matching depth meet the required standard."
      },
      {
        id: "can-homeowners-join-today",
        question: "Can homeowners join WHOMA today?",
        answer:
          "Seller access is available selectively. WHOMA currently prioritises agent quality, profile depth, and structured collaboration."
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
          "Use the public sign-in flow and continue with Google, Apple, or a secure email link."
      },
      {
        id: "do-i-need-approval-to-access-whoma",
        question: "Do I need approval to access WHOMA?",
        answer:
          "You can authenticate first, then access is applied by account status. This keeps sign-in simple while maintaining profile quality and trust controls."
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
          "Public visibility depends on identity checks and profile review. WHOMA prioritises clear standards before directory visibility."
      },
      {
        id: "are-example-profiles-real",
        question: "Are the example profiles and proof records real?",
        answer:
          "Some public examples are illustrative and clearly labelled, while live verified profiles are shown as they pass review."
      },
      {
        id: "how-can-i-contact-whoma",
        question: "How can I contact WHOMA?",
        answer:
          "Contact WHOMA through support@whoma.co.uk or the support form on the Contact page."
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
