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
      title: "Contact channel verified",
      description:
        "Confirm the 6-digit code so WHOMA can route trust and publish actions securely.",
      done: state.workEmailVerified,
      current: false
    },
    {
      key: "onboardingCompleted",
      title: "Profile draft created",
      description:
        "Save your core professional details so the profile draft is generated.",
      done: state.onboardingCompleted,
      current: false
    },
    {
      key: "profileReadyForPublish",
      title: `Core details confirmed (${MIN_AGENT_PUBLISH_COMPLETENESS}%+)`,
      description: `Current readiness is ${state.profileCompleteness}%. Add enough structured depth to clear publish threshold.`,
      done: state.profileReadyForPublish,
      current: false
    },
    {
      key: "profilePublished",
      title: "Public profile live",
      description:
        "Publish your profile to activate your public WHOMA identity.",
      done: state.profilePublished,
      current: false
    },
    {
      key: "adminVerified",
      title: "Verification completed",
      description:
        "Review completion unlocks directory visibility and verified trust markers.",
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
