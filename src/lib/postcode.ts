const normalizedWhitespace = /\s+/g;

export function normalizeUkPostcode(postcode: string): string {
  return postcode.trim().toUpperCase().replace(normalizedWhitespace, " ");
}

export function extractPostcodeDistrict(postcode: string): string | null {
  const normalized = normalizeUkPostcode(postcode);
  const outward = normalized.split(" ")[0];

  if (!outward) {
    return null;
  }

  const districtMatch = outward.match(/^[A-Z]{1,2}\d[A-Z\d]?/);
  return districtMatch?.[0] ?? null;
}
