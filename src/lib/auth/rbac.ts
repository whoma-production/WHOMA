export const appRoles = ["HOMEOWNER", "AGENT", "ADMIN"] as const;
export type AppRole = (typeof appRoles)[number];

export type AppAction =
  | "instruction:create"
  | "instruction:view:marketplace"
  | "proposal:submit"
  | "proposal:review"
  | "proposal:award"
  | "thread:view"
  | "thread:message"
  | "admin:verify-agent";

const permissionMatrix: Record<AppRole, readonly AppAction[]> = {
  HOMEOWNER: ["instruction:create", "proposal:review", "proposal:award", "thread:view", "thread:message"],
  AGENT: ["instruction:view:marketplace", "proposal:submit", "thread:view", "thread:message"],
  ADMIN: [
    "instruction:create",
    "instruction:view:marketplace",
    "proposal:submit",
    "proposal:review",
    "proposal:award",
    "thread:view",
    "thread:message",
    "admin:verify-agent"
  ]
};

export function can(role: AppRole, action: AppAction): boolean {
  return permissionMatrix[role].includes(action);
}

export function assertCan(role: AppRole, action: AppAction): void {
  if (!can(role, action)) {
    throw new Error(`Forbidden: ${role} cannot perform ${action}`);
  }
}
