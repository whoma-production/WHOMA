import {
  canAccessPagePath,
  defaultRouteForRole,
  getAuthErrorMessage,
  getPageRoutePolicy,
  normalizeRedirectPath
} from "./session";

describe("page route policy", () => {
  it("maps protected page prefixes to policies", () => {
    expect(getPageRoutePolicy("/homeowner/instructions/new")).toBe("HOMEOWNER");
    expect(getPageRoutePolicy("/agent/marketplace")).toBe("AGENT");
    expect(getPageRoutePolicy("/admin/agents")).toBe("ADMIN");
    expect(getPageRoutePolicy("/messages")).toBe("AUTHENTICATED");
    expect(getPageRoutePolicy("/onboarding/role")).toBe("AUTHENTICATED");
    expect(getPageRoutePolicy("/")).toBeNull();
  });

  it("enforces role-based page access", () => {
    expect(canAccessPagePath("HOMEOWNER", "/homeowner/instructions")).toBe(true);
    expect(canAccessPagePath("AGENT", "/homeowner/instructions")).toBe(false);
    expect(canAccessPagePath("AGENT", "/agent/marketplace")).toBe(true);
    expect(canAccessPagePath("ADMIN", "/messages")).toBe(true);
  });

  it("normalizes redirect paths safely", () => {
    expect(normalizeRedirectPath("/agent/marketplace")).toBe("/agent/marketplace");
    expect(normalizeRedirectPath("https://evil.example")).toBeNull();
    expect(normalizeRedirectPath("//evil.example")).toBeNull();
  });

  it("provides a default route for each role", () => {
    expect(defaultRouteForRole("HOMEOWNER")).toBe("/homeowner/instructions");
    expect(defaultRouteForRole("AGENT")).toBe("/agent/marketplace");
    expect(defaultRouteForRole("ADMIN")).toBe("/admin/agents");
  });
});

describe("auth error messages", () => {
  it("maps known auth errors to user-friendly messages", () => {
    expect(getAuthErrorMessage("forbidden")).toMatch(/permission/i);
    expect(getAuthErrorMessage("Configuration")).toMatch(/configured/i);
    expect(getAuthErrorMessage("OAuthAccountNotLinked")).toMatch(/different sign-in method/i);
  });

  it("returns null for empty error codes and generic text for unknown codes", () => {
    expect(getAuthErrorMessage(undefined)).toBeNull();
    expect(getAuthErrorMessage("")).toBeNull();
    expect(getAuthErrorMessage("UnknownError")).toMatch(/sign-in failed/i);
  });
});
