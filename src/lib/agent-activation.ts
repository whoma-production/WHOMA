export const MIN_AGENT_PUBLISH_COMPLETENESS = 70;

export interface AgentActivationProfileSnapshot {
  workEmailVerifiedAt?: Date | null;
  onboardingCompletedAt?: Date | null;
  profileCompleteness?: number | null;
  profileStatus?: string | null;
  verificationStatus?: string | null;
}

export interface AgentActivationState {
  workEmailVerified: boolean;
  onboardingCompleted: boolean;
  profileReadyForPublish: boolean;
  profilePublished: boolean;
  adminVerified: boolean;
  profileCompleteness: number;
}

export interface AgentActivationChecklistItem {
  key:
    | "workEmailVerified"
    | "onboardingCompleted"
    | "profileReadyForPublish"
    | "profilePublished"
    | "adminVerified";
  title: string;
  description: string;
  done: boolean;
  current: boolean;
}

export function getAgentActivationState(
  profile: AgentActivationProfileSnapshot | null | undefined
): AgentActivationState {
  const profileCompleteness = Math.max(
    0,
    Math.round(profile?.profileCompleteness ?? 0)
  );

  return {
    workEmailVerified: Boolean(profile?.workEmailVerifiedAt),
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
    profileReadyForPublish:
      profileCompleteness >= MIN_AGENT_PUBLISH_COMPLETENESS,
    profilePublished: profile?.profileStatus === "PUBLISHED",
    adminVerified: profile?.verificationStatus === "VERIFIED",
    profileCompleteness
  };
}

export function getAgentActivationChecklist(
  profile: AgentActivationProfileSnapshot | null | undefined
): AgentActivationChecklistItem[] {
  const state = getAgentActivationState(profile);

  const items: AgentActivationChecklistItem[] = [
    {
      key: "workEmailVerified",
      title: "Work email verified",
      description:
        "Use your business inbox and confirm the 6-digit code to unlock the rest of onboarding.",
      done: state.workEmailVerified,
      current: false
    },
    {
      key: "onboardingCompleted",
      title: "Onboarding completed",
      description:
        "Save your core WHOMA profile details so your professional baseline is stored server-side.",
      done: state.onboardingCompleted,
      current: false
    },
    {
      key: "profileReadyForPublish",
      title: `Profile ready for publish (${MIN_AGENT_PUBLISH_COMPLETENESS}%+)`,
      description: `Your current completeness is ${state.profileCompleteness}%. Add enough structured detail to become publish-ready.`,
      done: state.profileReadyForPublish,
      current: false
    },
    {
      key: "profilePublished",
      title: "Profile published",
      description:
        "Publish your profile so it becomes eligible for public visibility once verification is approved.",
      done: state.profilePublished,
      current: false
    },
    {
      key: "adminVerified",
      title: "Admin verified",
      description:
        "A manual trust review unlocks your public directory visibility and verification badge.",
      done: state.adminVerified,
      current: false
    }
  ];

  const currentItem = items.find((item) => !item.done);
  if (currentItem) {
    currentItem.current = true;
  }

  return items;
}
