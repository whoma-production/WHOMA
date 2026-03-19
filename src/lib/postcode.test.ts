import { extractPostcodeDistrict, normalizeUkPostcode } from "@/lib/postcode";

describe("UK postcode helpers", () => {
  it("normalizes spacing and case", () => {
    expect(normalizeUkPostcode(" sw1a  1aa ")).toBe("SW1A 1AA");
  });

  it("extracts postcode district for filtering", () => {
    expect(extractPostcodeDistrict("SW1A 1AA")).toBe("SW1A");
    expect(extractPostcodeDistrict("M1 1AE")).toBe("M1");
  });
});
