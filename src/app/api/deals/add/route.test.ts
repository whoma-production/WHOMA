import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, createDealMock, updateDealMock, sendVerificationEmailMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    createDealMock: vi.fn(),
    updateDealMock: vi.fn(),
    sendVerificationEmailMock: vi.fn()
  }));

vi.mock("@/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pastDeal: {
      create: createDealMock,
      update: updateDealMock
    }
  }
}));

vi.mock("@/lib/email/verification", () => ({
  sendVerificationEmail: sendVerificationEmailMock
}));

import { POST } from "@/app/api/deals/add/route";

function createDeal(overrides: Record<string, unknown> = {}) {
  return {
    id: "deal_1",
    agentId: "user_1",
    agentName: "Jane Agent",
    agentEmail: "jane@example.com",
    propertyAddress: "12 Example Road",
    propertyPostcode: "SW1A 1AA",
    salePrice: 45000000,
    completionDate: new Date("2025-02-14T00:00:00.000Z"),
    role: "buyers_agent",
    sellerEmail: null,
    sellerName: null,
    verificationStatus: "unverified",
    verificationToken: "11111111-1111-4111-8111-111111111111",
    verificationSentAt: null,
    verifiedAt: null,
    sellerComment: null,
    createdAt: new Date("2026-04-28T10:00:00.000Z"),
    ...overrides
  };
}

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/deals/add", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  authMock.mockReset();
  createDealMock.mockReset();
  updateDealMock.mockReset();
  sendVerificationEmailMock.mockReset();

  authMock.mockResolvedValue({
    user: {
      id: "user_1",
      email: "jane@example.com",
      name: "Jane Agent",
      role: "AGENT"
    }
  });
});

describe("/api/deals/add", () => {
  it("creates a past deal using the updated role vocabulary", async () => {
    const createdDeal = createDeal();
    createDealMock.mockResolvedValue(createdDeal);

    const response = await POST(
      createRequest({
        propertyAddress: "12 Example Road",
        propertyPostcode: "SW1A 1AA",
        completionDate: "2025-02-14",
        role: "buyers_agent",
        salePrice: 450000,
        sellerName: null,
        sellerEmail: null
      })
    );

    const body = (await response.json()) as {
      ok: boolean;
      data: { deal: { role: string; completionDate: string | null } };
    };

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.deal.role).toBe("buyers_agent");
    expect(body.data.deal.completionDate).toBe("2025-02-14");
    expect(createDealMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: "user_1",
        role: "buyers_agent",
        salePrice: 45000000
      })
    });
  });

  it("rejects the removed referral role before persistence", async () => {
    const response = await POST(
      createRequest({
        propertyAddress: "12 Example Road",
        propertyPostcode: "SW1A 1AA",
        completionDate: "2025-02-14",
        role: "referral",
        salePrice: null,
        sellerName: null,
        sellerEmail: null
      })
    );

    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string };
    };

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(createDealMock).not.toHaveBeenCalled();
  });

  it("does not fail the saved deal when verification email delivery fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const createdDeal = createDeal({
      sellerEmail: "seller@example.com",
      sellerName: "Sam Seller"
    });
    createDealMock.mockResolvedValue(createdDeal);
    sendVerificationEmailMock.mockRejectedValue(new Error("delivery failed"));

    try {
      const response = await POST(
        createRequest({
          propertyAddress: "12 Example Road",
          propertyPostcode: "SW1A 1AA",
          completionDate: "2025-02-14",
          role: "multi_agent",
          salePrice: 450000,
          sellerName: "Sam Seller",
          sellerEmail: "seller@example.com"
        })
      );

      const body = (await response.json()) as {
        ok: boolean;
        data: { verificationRequested: boolean; verificationWarning: string | null };
      };

      expect(response.status).toBe(201);
      expect(body.ok).toBe(true);
      expect(body.data.verificationRequested).toBe(false);
      expect(body.data.verificationWarning).toMatch(/Deal added/i);
      expect(updateDealMock).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Past deal verification request failed",
        expect.any(Error)
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
