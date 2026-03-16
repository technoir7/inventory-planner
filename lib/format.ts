export function formatNumber(value: number, maximumFractionDigits = 2) {
  const min = value % 1 === 0 ? 0 : Math.min(2, maximumFractionDigits);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: min
  }).format(value);
}

export function formatNullableNumber(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${formatNumber(value)}${suffix}`;
}
