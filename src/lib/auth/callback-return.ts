import { normalizeRedirectPath } from "@/lib/auth/session";

type SearchParamValue = string | string[] | undefined;

type SearchParamShape = Record<string, SearchParamValue> | URLSearchParams;

function readFirstString(value: SearchParamValue): string | null {
  if (Array.isArray(value)) {
    return readFirstString(value[0]);
  }

  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function readParam(
  searchParams: SearchParamShape,
  key: string
): string | null {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key);
  }

  return readFirstString(searchParams[key]);
}

export function hasSupabaseAuthReturnParams(
  searchParams: SearchParamShape | null | undefined
): boolean {
  if (!searchParams) {
    return false;
  }

  return Boolean(
    readParam(searchParams, "code") ||
      readParam(searchParams, "token_hash") ||
      readParam(searchParams, "error") ||
      readParam(searchParams, "error_description")
  );
}

export function buildSupabaseAuthCallbackPath(
  searchParams: SearchParamShape,
  options?: { fallbackNextPath?: string | null }
): string {
  const params = new URLSearchParams();

  const code = readParam(searchParams, "code");
  const tokenHash = readParam(searchParams, "token_hash");
  const type = readParam(searchParams, "type");
  const error = readParam(searchParams, "error");
  const errorDescription = readParam(searchParams, "error_description");
  const nextPath =
    normalizeRedirectPath(readParam(searchParams, "next")) ??
    normalizeRedirectPath(options?.fallbackNextPath ?? null);

  if (code) {
    params.set("code", code);
  }

  if (tokenHash) {
    params.set("token_hash", tokenHash);
  }

  if (type) {
    params.set("type", type);
  }

  if (error) {
    params.set("error", error);
  }

  if (errorDescription) {
    params.set("error_description", errorDescription);
  }

  if (nextPath) {
    params.set("next", nextPath);
  }

  const query = params.toString();
  return query.length > 0 ? `/auth/callback?${query}` : "/auth/callback";
}
