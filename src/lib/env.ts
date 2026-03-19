import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  CHAT_UNLOCK_RULE: z.enum(["SHORTLIST_OR_AWARD", "AWARD_ONLY"]),
  BID_WINDOW_MIN_HOURS: z.coerce.number().int().positive(),
  BID_WINDOW_MAX_HOURS: z.coerce.number().int().positive()
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.enum(["true", "false"])
});

export function parseServerEnv(env: NodeJS.ProcessEnv): z.infer<typeof serverEnvSchema> {
  return serverEnvSchema.parse(env);
}

export function parseClientEnv(env: NodeJS.ProcessEnv): z.infer<typeof clientEnvSchema> {
  return clientEnvSchema.parse(env);
}
