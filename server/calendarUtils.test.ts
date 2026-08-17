import { describe, expect, it } from "vitest";
import { calendarMonthRange, isCalendarItemVisible } from "./calendarUtils";

describe("calendário escolar", () => {
  it("define o intervalo completo do mês selecionado", () => {
    const range = calendarMonthRange("2026-02");
    expect(range.start.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(range.end.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("mantém eventos globais e do próprio segmento visíveis ao responsável", () => {
    expect(isCalendarItemVisible(null, 2)).toBe(true);
    expect(isCalendarItemVisible(2, 2)).toBe(true);
    expect(isCalendarItemVisible(3, 2)).toBe(false);
    expect(isCalendarItemVisible(3)).toBe(true);
  });
});
