import { CheckCircle2, Circle, CircleDot } from "lucide-react";

import {
  getAgentActivationChecklist,
  getAgentActivationState,
  type AgentActivationProfileSnapshot
} from "@/lib/agent-activation";

interface ActivationChecklistProps {
  profile: AgentActivationProfileSnapshot | null | undefined;
  title?: string;
  description?: string;
}

function StepIcon({
  done,
  current
}: {
  done: boolean;
  current: boolean;
}): JSX.Element {
  if (done) {
    return (
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-state-success"
        aria-hidden="true"
      />
    );
  }

  if (current) {
    return (
      <CircleDot
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent"
        aria-hidden="true"
      />
    );
  }

  return (
    <Circle
      className="mt-0.5 h-4 w-4 shrink-0 text-text-muted"
      aria-hidden="true"
    />
  );
}

export function ActivationChecklist({
  profile,
  title = "Profile checklist",
  description = "Complete the steps required for public visibility on WHOMA."
}: ActivationChecklistProps): JSX.Element {
  const checklist = getAgentActivationChecklist(profile);
  const state = getAgentActivationState(profile);
  const completedCount = checklist.filter((item) => item.done).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-text-strong">{title}</h3>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>

      <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
          Progress
        </p>
        <p className="mt-1 text-2xl font-semibold text-text-strong">
          {completedCount}/5 complete
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Profile completeness: {state.profileCompleteness}%
        </p>
      </div>

      <ul className="space-y-2">
        {checklist.map((item) => (
          <li
            key={item.key}
            className="rounded-md border border-line bg-surface-1 px-3 py-3"
          >
            <div className="flex items-start gap-3">
              <StepIcon done={item.done} current={item.current} />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-text-strong">
                    {item.title}
                  </p>
                  <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
                    {item.done ? "Done" : item.current ? "Current" : "Next"}
                  </span>
                </div>
                <p className="text-sm text-text-muted">{item.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
