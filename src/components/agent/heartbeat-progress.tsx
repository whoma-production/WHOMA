import { CheckCircle2, CircleDot } from "lucide-react";

import {
  getAgentHeartbeatChecklist,
  type AgentHeartbeatProgressState
} from "@/lib/agent-heartbeat";

interface HeartbeatProgressProps {
  state: AgentHeartbeatProgressState;
  title?: string;
  description?: string;
}

export function HeartbeatProgress({
  state,
  title = "Product heartbeat",
  description = "These milestones map to WHOMA's Phase 1 behaviour metrics."
}: HeartbeatProgressProps): JSX.Element {
  const checklist = getAgentHeartbeatChecklist(state);
  const completedCount = checklist.filter((item) => item.done).length;
  const currentKey = checklist.find((item) => !item.done)?.key ?? null;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text-strong">{title}</h3>
        <p className="text-sm text-text-muted">{description}</p>
      </div>

      <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
          Progress
        </p>
        <p className="mt-1 text-2xl font-semibold text-text-strong">
          {completedCount}/5 milestones complete
        </p>
      </div>

      <ul className="space-y-2">
        {checklist.map((item) => {
          const isCurrent = !item.done && item.key === currentKey;
          return (
            <li
              key={item.key}
              className="rounded-md border border-line bg-surface-1 px-3 py-3"
            >
              <div className="flex items-start gap-3">
                {item.done ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-state-success"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleDot
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent"
                    aria-hidden="true"
                  />
                )}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-text-strong">
                      {item.title}
                    </p>
                    <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      {item.done ? "Done" : isCurrent ? "Current" : "Next"}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">{item.description}</p>
                  <p className="text-sm font-semibold text-text-strong">
                    {item.value}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
