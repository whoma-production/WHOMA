type UpstashCommandArgument = string | number;

type UpstashConfig = {
  restUrl: string;
  token: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveUpstashConfig(): UpstashConfig | null {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!restUrl || !token) {
    return null;
  }

  return {
    restUrl: restUrl.replace(/\/+$/, ""),
    token
  };
}

export function isUpstashConfigured(): boolean {
  return resolveUpstashConfig() !== null;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Upstash returned a non-JSON response.");
  }
}

async function requestUpstash(
  pathSuffix: string,
  body: unknown
): Promise<unknown> {
  const config = resolveUpstashConfig();

  if (!config) {
    throw new Error("Upstash Redis is not configured.");
  }

  const response = await fetch(`${config.restUrl}${pathSuffix}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : `Upstash request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export async function runUpstashCommand(
  command: UpstashCommandArgument[]
): Promise<unknown> {
  const payload = await requestUpstash("", {
    command: command.map((part) => String(part))
  });

  if (!isRecord(payload)) {
    throw new Error("Unexpected Upstash command response.");
  }

  if (typeof payload.error === "string" && payload.error.length > 0) {
    throw new Error(payload.error);
  }

  return payload.result ?? null;
}

export async function runUpstashPipeline(
  commands: UpstashCommandArgument[][]
): Promise<unknown[]> {
  const payload = await requestUpstash(
    "/pipeline",
    commands.map((command) => command.map((part) => String(part)))
  );

  if (!Array.isArray(payload)) {
    throw new Error("Unexpected Upstash pipeline response.");
  }

  return payload.map((item) => {
    if (!isRecord(item)) {
      throw new Error("Unexpected Upstash pipeline item.");
    }

    if (typeof item.error === "string" && item.error.length > 0) {
      throw new Error(item.error);
    }

    return item.result ?? null;
  });
}
