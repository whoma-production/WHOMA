import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentOnboardingStepper } from "./agent-onboarding-stepper";

vi.mock("@/lib/supabase/browser", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "test-token" } }
      })
    }
  })
}));

const defaultValues = {
  fullName: "",
  workEmail: "agent@example.com",
  phone: "",
  agencyName: "",
  jobTitle: "",
  yearsExperience: "",
  bio: "",
  serviceAreas: "",
  specialties: "",
  achievements: "",
  languages: "",
  feePreference: "",
  transactionBand: "",
  collaborationPreference: "",
  responseTimeMinutes: ""
};

function renderStepper(overrides: Partial<typeof defaultValues> = {}) {
  return render(
    <AgentOnboardingStepper
      userId="user-onboarding-test"
      draftSourceKey="manual"
      resumeMode="heuristic"
      formValues={{ ...defaultValues, ...overrides }}
      resumeConfidence={{}}
      hasResumeSuggestions={false}
      workEmailVerified={false}
      initialVerificationSent={false}
      agentCodePreview="TESTAGENT"
      notice={null}
      uploadResumeAction={vi.fn()}
      clearResumeSuggestionsAction={vi.fn()}
      sendWorkEmailVerificationCodeAction={vi.fn()}
      confirmWorkEmailVerificationCodeAction={vi.fn()}
      submitAgentOnboardingAction={vi.fn()}
    />
  );
}

describe("AgentOnboardingStepper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear()
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps confirmation inputs visible while the user types", () => {
    renderStepper();

    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const fullNameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(fullNameInput, { target: { value: "Jane Agent" } });

    expect(screen.getByLabelText(/full name/i)).toBeVisible();
    expect(screen.getByDisplayValue("Jane Agent")).toBeVisible();
  });

  it("uses property category and fee split wording in the quick interview", () => {
    renderStepper({
      fullName: "Jane Agent",
      agencyName: "Example Estates",
      jobTitle: "Senior Agent",
      yearsExperience: "8",
      serviceAreas: "SW1A",
      specialties: "Residential"
    });

    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "+44 20 7946 0000" }
    });
    fireEvent.click(screen.getByRole("button", { name: /save details/i }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(
      screen.getByText(/which property category do you usually handle/i)
    ).toBeVisible();
    expect(screen.getByRole("option", { name: "Residential" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(
      screen.getByText(/are you open to fee split deals with other agents/i)
    ).toBeVisible();
  });
});
