export const instructionStatuses = [
  "DRAFT",
  "LIVE",
  "CLOSED",
  "SHORTLIST",
  "AWARDED"
] as const;

export type InstructionStatus = (typeof instructionStatuses)[number];

const allowedTransitions: Record<InstructionStatus, readonly InstructionStatus[]> = {
  DRAFT: ["LIVE"],
  LIVE: ["CLOSED", "SHORTLIST", "AWARDED"],
  CLOSED: ["SHORTLIST", "AWARDED"],
  SHORTLIST: ["AWARDED"],
  AWARDED: []
};

export function canTransitionInstructionStatus(
  from: InstructionStatus,
  to: InstructionStatus
): boolean {
  return allowedTransitions[from].includes(to);
}

export function deriveBidWindowPhase(
  startAt: Date,
  endAt: Date,
  now: Date = new Date()
): "PRELIVE" | "LIVE" | "ENDED" {
  if (now < startAt) {
    return "PRELIVE";
  }

  if (now >= endAt) {
    return "ENDED";
  }

  return "LIVE";
}

export function validateBidWindowHours(
  startAt: Date,
  endAt: Date,
  minHours: number,
  maxHours: number
): { ok: true } | { ok: false; reason: string } {
  if (endAt <= startAt) {
    return { ok: false, reason: "Bid window must end after it starts." };
  }

  const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);

  if (durationHours < minHours || durationHours > maxHours) {
    return {
      ok: false,
      reason: `Bid window must be between ${minHours} and ${maxHours} hours.`
    };
  }

  return { ok: true };
}
