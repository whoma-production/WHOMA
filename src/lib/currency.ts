const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2
});

export function formatGBP(value: number): string {
  return gbpFormatter.format(value);
}

export function formatGBPRange(minValue: number, maxValue: number): string {
  return `${formatGBP(minValue)} - ${formatGBP(maxValue)}`;
}
