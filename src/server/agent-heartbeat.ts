import type { AgentHeartbeatProgressState } from "@/lib/agent-heartbeat";
import { getAgentHeartbeatEventCounts } from "@/server/product-events";

export async function getAgentHeartbeatProgressState(
  userId: string,
  profileCompleteness: number
): Promise<AgentHeartbeatProgressState> {
  const counts = await getAgentHeartbeatEventCounts(userId);

  return {
    profileCompleteness,
    historicDealsLogged: counts.transactionLogged,
    liveDealsAdded: counts.listingCreated,
    profileLinksShared: counts.profileLinkShared,
    interactionsReceived: counts.interactionReceived
  };
}
