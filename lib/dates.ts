const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function startOfDay(value: Date) {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(value: Date, days: number) {
  return new Date(startOfDay(value).getTime() + days * DAY_IN_MS);
}

export function diffInDays(start: Date, end: Date) {
  return Math.ceil((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_IN_MS);
}

export function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}
