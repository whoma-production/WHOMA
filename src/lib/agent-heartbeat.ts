import { MIN_AGENT_PUBLISH_COMPLETENESS } from "@/lib/agent-activation";

export interface AgentHeartbeatProgressState {
  profileCompleteness: number;
  historicDealsLogged: number;
  liveDealsAdded: number;
  profileLinksShared: number;
  interactionsReceived: number;
}

export interface AgentHeartbeatChecklistItem {
  key:
    | "profileCompleteness"
    | "historicDealsLogged"
    | "liveDealsAdded"
    | "profileLinksShared"
    | "interactionsReceived";
  title: string;
  description: string;
  value: string;
  done: boolean;
}

export function getAgentHeartbeatChecklist(
  state: AgentHeartbeatProgressState
): AgentHeartbeatChecklistItem[] {
  return [
    {
      key: "profileCompleteness",
      title: "Profile complete %",
      description:
        "Reach publish-ready quality so your profile can confidently be shared.",
      value: `${state.profileCompleteness}%`,
      done: state.profileCompleteness >= MIN_AGENT_PUBLISH_COMPLETENESS
    },
    {
      key: "historicDealsLogged",
      title: "Historic deals logged",
      description:
        "Log at least one historic transaction to show track record depth.",
      value: `${state.historicDealsLogged}`,
      done: state.historicDealsLogged >= 1
    },
    {
      key: "liveDealsAdded",
      title: "Live deal added",
      description:
        "Log one active collaboration opportunity to show current market activity.",
      value: `${state.liveDealsAdded}`,
      done: state.liveDealsAdded >= 1
    },
    {
      key: "profileLinksShared",
      title: "Profile link shared",
      description:
        "Share your profile link at least once so your WHOMA identity starts circulating.",
      value: `${state.profileLinksShared}`,
      done: state.profileLinksShared >= 1
    },
    {
      key: "interactionsReceived",
      title: "First enquiry received",
      description:
        "Receive your first incoming interaction to validate collaboration liquidity.",
      value: `${state.interactionsReceived}`,
      done: state.interactionsReceived >= 1
    }
  ];
}
