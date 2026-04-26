import { expect, test } from "@playwright/test";

const MOCK_ANSWER =
  "Seller disputes mark a past deal as disputed, so it does not appear as verified.";

test("support widget renders a mocked assistant response through the chat send path", async ({
  page
}) => {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const body = [
      { type: "start" },
      { type: "start-step" },
      { type: "text-start", id: "mock-text-1" },
      { type: "text-delta", id: "mock-text-1", delta: MOCK_ANSWER },
      { type: "text-end", id: "mock-text-1" },
      { type: "finish-step", finishReason: "stop", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
      { type: "finish", finishReason: "stop", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
    ]
      .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
      .join("");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body
    });
  });

  await page.goto("/");

  await page.getByRole("button", { name: /open support chat/i }).click();

  const panel = page.locator("section.support-chat-panel-enter");
  await expect(panel).toBeVisible();

  const textarea = panel.getByPlaceholder("Ask a question...");
  await textarea.fill("What happens if a seller disputes a past deal?");
  await textarea.press("Enter");

  await expect(panel.getByText("What happens if a seller disputes a past deal?")).toBeVisible();
  await expect(panel.getByText(MOCK_ANSWER)).toBeVisible();
});
