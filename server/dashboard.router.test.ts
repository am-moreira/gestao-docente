import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  teacherSchedule: { findMany: vi.fn() },
  absenceRecord: { findMany: vi.fn() },
  taskRecord: { findMany: vi.fn() },
};

const teachers = [{
  id: 1,
  name: "Ana Martins",
  discipline: "Matemática",
  segmentId: 1,
  segmentName: "Anos Finais",
  active: true,
  assignments: [],
  schedules: [],
}];

vi.mock("./db", () => ({
  getDb: async () => db,
  getTeacherWithDetails: async () => teachers[0],
  listTeachersWithDetails: async () => teachers,
}));

import { dashboardRouter } from "./routers/dashboard";

const adminContext = { user: { id: 1, role: "admin", segmentId: null } } as unknown as TrpcContext;

describe("período anual do dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.teacherSchedule.findMany.mockResolvedValue([{ teacherId: 1, weekday: "segunda", classHours: { toString: () => "2.00" } }]);
    db.absenceRecord.findMany
      .mockResolvedValueOnce([{ teacherId: 1, uncoveredHours: { toString: () => "2.00" } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ teacherId: 1 }]);
    db.taskRecord.findMany.mockResolvedValue([{ category: "notas", completed: false }]);
  });

  it("agrega o ano selecionado e compara com o ano anterior", async () => {
    const caller = dashboardRouter.createCaller(adminContext);
    const result = await caller.summary({ month: "2026-08", period: "year" });

    expect(result.metrics.totalClasses).toBeGreaterThan(100);
    expect(result.metrics.uncoveredClasses).toBe(2);
    expect(result.metrics.absences).toBe(1);
    expect(result.taskStats.notas).toEqual({ yes: 0, no: 1 });
    expect(result.ranking).toEqual([{ teacherId: 1, name: "Ana Martins", absences: 1 }]);
    expect(db.absenceRecord.findMany).toHaveBeenCalledTimes(3);
  });

  it("lista pendências de todo o ano selecionado", async () => {
    db.taskRecord.findMany.mockResolvedValueOnce([{ teacherId: 1, taskDate: new Date("2026-05-10T12:00:00Z"), teacher: { name: "Ana Martins", discipline: "Matemática" } }]);
    const caller = dashboardRouter.createCaller(adminContext);

    await expect(caller.taskPendencies({ month: "2026-08", period: "year", category: "notas" })).resolves.toEqual([
      { teacherId: 1, name: "Ana Martins", discipline: "Matemática", segmentName: "Anos Finais", pendingCount: 1, dates: ["2026-05-10"] },
    ]);
  });
});
