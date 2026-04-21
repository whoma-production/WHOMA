import { chromium } from "playwright";

const base = "https://whoma-web-production.up.railway.app";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${base}/sign-in?next=%2Fhomeowner%2Finstructions`, {
  waitUntil: "networkidle"
});

const responsePromise = page.waitForResponse((resp) =>
  resp.url().includes("/api/auth/callback/preview")
);

await page.getByRole("button", { name: "Preview as Homeowner" }).click();

const resp = await responsePromise;
const headers = await resp.allHeaders();

console.log("status", resp.status());
console.log("location", headers.location ?? "<none>");
console.log("set-cookie", headers["set-cookie"] ? "present" : "missing");

await page.waitForTimeout(1500);
const cookies = await context.cookies(base);
console.log("cookies", cookies.map((c) => c.name).join(","));
console.log("url_after_click", page.url());

await page.goto(`${base}/homeowner/instructions`, { waitUntil: "networkidle" });
console.log("url_after_manual_nav", page.url());

await browser.close();
