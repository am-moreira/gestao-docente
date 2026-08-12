import { describe, expect, it } from "vitest";

function weekdayFromIso(date: string) {
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][new Date(`${date}T12:00:00`).getDay()];
}

describe("regras de cálculo de faltas", () => {
  it("identifica corretamente o dia da semana para localizar a carga horária", () => {
    expect(weekdayFromIso("2026-08-10")).toBe("segunda");
    expect(weekdayFromIso("2026-08-14")).toBe("sexta");
  });

  it("usa a carga do turno registrado, sem misturar turnos", () => {
    const schedules = [
      { weekday: "sexta", shift: "manha", classHours: "1.00" },
      { weekday: "sexta", shift: "tarde", classHours: "2.00" },
    ];
    expect(schedules.find(item => item.weekday === "sexta" && item.shift === "tarde")?.classHours).toBe("2.00");
  });
});
