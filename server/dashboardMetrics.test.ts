import { describe, expect, it } from "vitest";
import { calculateAbsencePercentage, calculateMetricDeltas, calculateTaskStats, calculateTopAbsenceRanking, groupPendingTeachers, scheduleHoursForMonth, scheduleHoursForYear } from "./dashboardMetrics";

describe("métricas do dashboard", () => {
  it("soma a carga prevista pelas ocorrências do dia da semana no mês", () => {
    expect(scheduleHoursForMonth([{ weekday: "segunda", classHours: "2.00" }], 2026, 7, 31)).toBe(10);
  });

  it("agrega a carga semanal em todos os meses do ano", () => {
    const schedules = [{ weekday: "segunda", classHours: "2.00" }, { weekday: "sexta", classHours: "1.00" }];
    const monthlyTotal = Array.from({ length: 12 }, (_, monthIndex) => scheduleHoursForMonth(schedules, 2026, monthIndex, new Date(2026, monthIndex + 1, 0).getDate())).reduce((total, value) => total + value, 0);
    expect(scheduleHoursForYear(schedules, 2026)).toBe(monthlyTotal);
  });

  it("calcula o percentual de carga sem professor sem dividir por zero", () => {
    expect(calculateAbsencePercentage(40, 5)).toBe(12.5);
    expect(calculateAbsencePercentage(0, 5)).toBe(0);
  });

  it("calcula a variação dos indicadores frente ao mês anterior", () => {
    expect(calculateMetricDeltas(
      { totalClasses: 84, uncoveredClasses: 4, uncoveredPercentage: 4.76, absences: 2 },
      { totalClasses: 80, uncoveredClasses: 6, uncoveredPercentage: 7.5, absences: 3 },
    )).toEqual({ totalClasses: 4, uncoveredClasses: -2, uncoveredPercentage: -2.74, absences: -1 });
  });

  it("agrega respostas sim e não separadamente por categoria", () => {
    const result = calculateTaskStats([{ category: "notas", completed: true }, { category: "notas", completed: false }, { category: "evento", completed: true }]);
    expect(result.notas).toEqual({ yes: 1, no: 1 });
    expect(result.evento).toEqual({ yes: 1, no: 0 });
    expect(result.material).toEqual({ yes: 0, no: 0 });
  });

  it("ordena o ranking de faltas e limita o resultado a seis professores", () => {
    const teachers = ["Ana", "Bruno", "Caio", "Dora", "Eva", "Fábio", "Gabi"].map((name, index) => ({ id: index + 1, name }));
    const absences = [1, 1, 1, 2, 2, 3, 4, 5, 6, 7].map(teacherId => ({ teacherId }));
    const result = calculateTopAbsenceRanking(teachers, absences);
    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({ name: "Ana", absences: 3 });
    expect(result.at(-1)?.name).toBe("Fábio");
  });

  it("agrupa pendências recorrentes do mesmo professor para o detalhamento", () => {
    expect(groupPendingTeachers([
      { teacherId: 1, name: "Ana", discipline: "Matemática", segmentName: "Anos Finais", taskDate: "2026-08-12" },
      { teacherId: 1, name: "Ana", discipline: "Matemática", segmentName: "Anos Finais", taskDate: "2026-08-05" },
      { teacherId: 2, name: "Bruno", discipline: "História", segmentName: "Anos Finais", taskDate: "2026-08-10" },
    ])).toEqual([
      { teacherId: 1, name: "Ana", discipline: "Matemática", segmentName: "Anos Finais", pendingCount: 2, dates: ["2026-08-12", "2026-08-05"] },
      { teacherId: 2, name: "Bruno", discipline: "História", segmentName: "Anos Finais", pendingCount: 1, dates: ["2026-08-10"] },
    ]);
  });
});
