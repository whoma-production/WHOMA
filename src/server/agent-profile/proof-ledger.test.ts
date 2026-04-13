import { describe, expect, it } from "vitest";

import { PRODUCT_EVENT_NAMES } from "@/server/product-events";

import { mapProductEventToPublicProofLedgerEntry } from "./service";

describe("mapProductEventToPublicProofLedgerEntry", () => {
  it("maps historic transaction events as logged signals", () => {
    const entry = mapProductEventToPublicProofLedgerEntry({
      id: "evt_1",
      eventName: PRODUCT_EVENT_NAMES.transactionLogged,
      source: "/agent/profile/edit",
      metadata: {
        postcodeDistrict: "SW1A",
        propertyType: "Flat",
        completionMonth: "2026-03"
      },
      createdAt: new Date("2026-04-13T08:00:00.000Z")
    });

    expect(entry).not.toBeNull();
    expect(entry?.title).toBe("Historic transaction logged");
    expect(entry?.statusLabel).toBe("Logged signal");
    expect(entry?.sourceLabel).toBe("Agent profile workspace");
    expect(entry?.detail).toContain("Area: SW1A");
    expect(entry?.detail).toContain("Property: Flat");
  });

  it("maps verification completion as a verified milestone", () => {
    const entry = mapProductEventToPublicProofLedgerEntry({
      id: "evt_2",
      eventName: PRODUCT_EVENT_NAMES.verificationCompleted,
      source: "/agent/onboarding",
      metadata: {},
      createdAt: new Date("2026-04-13T09:00:00.000Z")
    });

    expect(entry).not.toBeNull();
    expect(entry?.title).toBe("Verification milestone completed");
    expect(entry?.statusLabel).toBe("Verified milestone");
    expect(entry?.sourceLabel).toBe("Agent onboarding");
  });

  it("returns null for unsupported events", () => {
    const entry = mapProductEventToPublicProofLedgerEntry({
      id: "evt_3",
      eventName: "unknown_event_name",
      source: null,
      metadata: null,
      createdAt: new Date("2026-04-13T10:00:00.000Z")
    });

    expect(entry).toBeNull();
  });
});
