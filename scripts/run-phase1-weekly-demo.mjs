import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { seedPhase1PilotAgents } from "./seed-phase1-pilot-agents.mjs";

function runStep(label, command, args, env = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env }
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}`);
  }
}

function buildDevCommand(baseUrl) {
  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = parsed.port || "3012";
  return `npm run dev -- --hostname ${host} --port ${port}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for weekly demo automation.");
  }

  console.log("==> Seeding pilot real estate agents");
  const seeded = await seedPhase1PilotAgents();
  console.log(`Seed complete: ${seeded.total} agents ready.`);

  runStep(
    "DB-backed Phase 1 service test",
    "npx",
    ["vitest", "run", "src/server/agent-profile/phase1-flow.test.ts"],
    { RUN_DB_TESTS: "true" }
  );

  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3012";
  const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? buildDevCommand(baseUrl);

  runStep(
    "Playwright onboarding -> publish -> verification flow",
    "npx",
    ["playwright", "test", "tests/e2e/phase1-agent-flow.spec.ts", "--project=chromium"],
    {
      PLAYWRIGHT_BASE_URL: baseUrl,
      PLAYWRIGHT_WEB_SERVER_COMMAND: webServerCommand
    }
  );

  console.log("\nWeekly demo prep complete.");
  console.log(`- Public directory: ${baseUrl}/agents`);
  console.log(`- Admin verification queue: ${baseUrl}/admin/agents`);
  console.log(`- Agent onboarding start: ${baseUrl}/agent/onboarding`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Weekly demo script failed:", error);
    process.exit(1);
  });
}
