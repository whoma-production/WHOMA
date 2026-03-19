import type { UserRole } from "@prisma/client";

const pageRoutePolicies = [
  { prefix: "/homeowner", policy: "HOMEOWNER" as const },
  { prefix: "/agent", policy: "AGENT" as const },
  { prefix: "/admin", policy: "ADMIN" as const },
  { prefix: "/messages", policy: "AUTHENTICATED" as const },
  { prefix: "/onboarding/role", policy: "AUTHENTICATED" as const }
] as const;

type PageRoutePolicy = (typeof pageRoutePolicies)[number]["policy"];

export function getPageRoutePolicy(pathname: string): PageRoutePolicy | null {
  for (const routePolicy of pageRoutePolicies) {
    if (pathname === routePolicy.prefix || pathname.startsWith(`${routePolicy.prefix}/`)) {
      return routePolicy.policy;
    }
  }

  return null;
}

export function canAccessPagePath(role: UserRole, pathname: string): boolean {
  const policy = getPageRoutePolicy(pathname);

  if (!policy || policy === "AUTHENTICATED") {
    return true;
  }

  return role === policy;
}

export function defaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "HOMEOWNER":
      return "/homeowner/instructions";
    case "AGENT":
      return "/agent/marketplace";
    case "ADMIN":
      return "/admin/agents";
  }
}

export function normalizeRedirectPath(candidate: string | undefined | null): string | null {
  if (!candidate) {
    return null;
  }

  if (!candidate.startsWith("/")) {
    return null;
  }

  if (candidate.startsWith("//")) {
    return null;
  }

  return candidate;
}

export function getAuthErrorMessage(code: string | null | undefined): string | null {
  switch (code) {
    case undefined:
    case null:
    case "":
      return null;
    case "forbidden":
      return "You do not have permission to access that page with your current role.";
    case "OAuthAccountNotLinked":
      return "This email is linked to a different sign-in method. Use the original provider.";
    case "AccessDenied":
      return "Sign-in was denied. Please try again or use a different Google account.";
    case "Configuration":
      return "Google sign-in is not configured yet. Add OAuth credentials to continue.";
    case "Callback":
      return "Google sign-in failed during callback. Please try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
