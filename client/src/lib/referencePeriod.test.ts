import { describe, expect, it } from "vitest";
import { formatReferenceMonth, isReferenceMonth, normalizeReferenceMonth, referencePeriodViewFromSearch } from "./referencePeriod";

describe("período de referência", () => {
  it("aceita somente meses válidos no formato YYYY-MM", () => {
    expect(isReferenceMonth("2026-08")).toBe(true);
    expect(isReferenceMonth("2026-13")).toBe(false);
    expect(isReferenceMonth("")).toBe(false);
  });

  it("normaliza valores ausentes ou inválidos antes de formatar", () => {
    expect(normalizeReferenceMonth("", "2026-08")).toBe("2026-08");
    expect(normalizeReferenceMonth("2026-05", "2026-08")).toBe("2026-05");
    expect(formatReferenceMonth("")).toMatch(/^agosto de 2026$/i);
  });

  it("mantém a visão mensal quando o parâmetro period da URL for inválido", () => {
    expect(referencePeriodViewFromSearch("?period=year")).toBe("year");
    expect(referencePeriodViewFromSearch("?period=foo")).toBe("month");
    expect(referencePeriodViewFromSearch("?from_webdev=1")).toBe("month");
  });
});
