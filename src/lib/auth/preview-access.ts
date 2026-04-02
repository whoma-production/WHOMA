export function isPreviewAccessEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  enablePreviewAuth: string | undefined = process.env.ENABLE_PREVIEW_AUTH
): boolean {
  return nodeEnv !== "production" && enablePreviewAuth !== "false";
}
