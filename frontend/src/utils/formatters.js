export function formatEnumLabel(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatCurrencyNzd(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatCompactCurrencyNzd(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

export function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

export function formatDaysLabel(days) {
  return `${days} day${days === 1 ? "" : "s"}`;
}
