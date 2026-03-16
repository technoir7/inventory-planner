export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

export function formatNullableNumber(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${formatNumber(value)}${suffix}`;
}
