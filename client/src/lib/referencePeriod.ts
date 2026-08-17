export const DEFAULT_REFERENCE_MONTH = new Date().toISOString().slice(0, 7);
export type ReferencePeriodView = "month" | "year";

export function referencePeriodViewFromSearch(search: string): ReferencePeriodView {
  return new URLSearchParams(search).get("period") === "year" ? "year" : "month";
}

export function isReferenceMonth(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function normalizeReferenceMonth(value: string | null | undefined, fallback = DEFAULT_REFERENCE_MONTH) {
  return isReferenceMonth(value) ? value : fallback;
}

export function formatReferenceMonth(value: string | null | undefined) {
  const month = normalizeReferenceMonth(value);
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1, 12));
}
