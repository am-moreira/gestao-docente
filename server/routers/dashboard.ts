import type { TaskCategory } from "@prisma/client";
import { z } from "zod";
import { getDb, getTeacherWithDetails, listTeachersWithDetails } from "../db";
import { calculateAbsencePercentage, calculateMetricDeltas, calculateTaskStats, calculateTopAbsenceRanking, groupPendingTeachers, scheduleHoursForMonth, scheduleHoursForYear, taskCategories } from "../dashboardMetrics";
import { assertSegmentAccess, resolveSegmentScope } from "../permissions";
import { protectedProcedure, router } from "../_core/trpc";

function monthRange(month: string) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return { start: new Date(Date.UTC(year, monthIndex, 1)), end: new Date(Date.UTC(year, monthIndex, lastDay, 23, 59, 59)), year, monthIndex, lastDay };
}
function previousMonth(month: string) { const [year, monthNumber] = month.split("-").map(Number); const previous = new Date(year, monthNumber - 2, 1); return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`; }
type PeriodView = "month" | "year";
type DashboardPeriod = ReturnType<typeof monthRange> & { view: PeriodView };
function periodRange(month: string, view: PeriodView): DashboardPeriod {
  if (view === "month") return { ...monthRange(month), view };
  const year = Number(month.slice(0, 4));
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31, 23, 59, 59)), year, monthIndex: 0, lastDay: 31, view };
}
function previousPeriodRange(month: string, view: PeriodView) {
  return view === "year" ? periodRange(`${Number(month.slice(0, 4)) - 1}-01`, "year") : periodRange(previousMonth(month), "month");
}
function scheduleHoursForPeriod(schedules: { weekday: string; classHours: string }[], period: DashboardPeriod) {
  return period.view === "year" ? scheduleHoursForYear(schedules, period.year) : scheduleHoursForMonth(schedules, period.year, period.monthIndex, period.lastDay);
}
function emptyTaskStats() { return Object.fromEntries(taskCategories.map(category => [category, { yes: 0, no: 0 }])) as Record<(typeof taskCategories)[number], { yes: number; no: number }>; }
function emptySummary() { return { metrics: { totalClasses: 0, uncoveredClasses: 0, uncoveredPercentage: 0, absences: 0 }, comparison: { totalClasses: 0, uncoveredClasses: 0, uncoveredPercentage: 0, absences: 0 }, teacher: null, ranking: [], taskStats: emptyTaskStats() }; }

export const dashboardRouter = router({
  summary: protectedProcedure.input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), period: z.enum(["month", "year"]).default("month"), teacherId: z.number().int().positive().optional(), segmentId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return emptySummary();
    const activeSegmentId = resolveSegmentScope(ctx.user, input.segmentId);
    const visibleTeachers = await listTeachersWithDetails(activeSegmentId);
    const visibleIds = visibleTeachers.map(teacher => teacher.id);
    let selectedIds = visibleIds;
    let selectedTeacher = null;
    if (input.teacherId) {
      selectedTeacher = await getTeacherWithDetails(input.teacherId);
      if (!selectedTeacher) throw new Error("Professor não encontrado.");
      assertSegmentAccess(ctx.user, selectedTeacher.segmentId);
      if (activeSegmentId !== undefined && selectedTeacher.segmentId !== activeSegmentId) throw new Error("O professor selecionado não pertence ao segmento filtrado.");
      selectedIds = [input.teacherId];
    }
    if (!selectedIds.length) return { ...emptySummary(), teacher: selectedTeacher };
    const range = periodRange(input.month, input.period);
    const previousRange = previousPeriodRange(input.month, input.period);
    const [schedules, absences, previousAbsences, tasks, allAbsences] = await Promise.all([
      db.teacherSchedule.findMany({ where: { teacherId: { in: selectedIds } }, select: { teacherId: true, weekday: true, classHours: true } }),
      db.absenceRecord.findMany({ where: { teacherId: { in: selectedIds }, absenceDate: { gte: range.start, lte: range.end } }, select: { teacherId: true, uncoveredHours: true } }),
      db.absenceRecord.findMany({ where: { teacherId: { in: selectedIds }, absenceDate: { gte: previousRange.start, lte: previousRange.end } }, select: { teacherId: true, uncoveredHours: true } }),
      db.taskRecord.findMany({ where: { teacherId: { in: selectedIds }, taskDate: { gte: range.start, lte: range.end } }, select: { category: true, completed: true } }),
      db.absenceRecord.findMany({ where: { teacherId: { in: visibleIds }, absenceDate: { gte: range.start, lte: range.end } }, select: { teacherId: true } }),
    ]);
    const scheduleRows = schedules.map(schedule => ({ ...schedule, classHours: schedule.classHours.toString() }));
    const taskStats = calculateTaskStats(tasks);
    const ranking = calculateTopAbsenceRanking(visibleTeachers, allAbsences);
    const totalClasses = scheduleHoursForPeriod(scheduleRows, range);
    const uncoveredClasses = absences.reduce((total, item) => total + Number(item.uncoveredHours), 0);
    const metrics = { totalClasses, uncoveredClasses, uncoveredPercentage: calculateAbsencePercentage(totalClasses, uncoveredClasses), absences: absences.length };
    const previousTotalClasses = scheduleHoursForPeriod(scheduleRows, previousRange);
    const previousUncoveredClasses = previousAbsences.reduce((total, item) => total + Number(item.uncoveredHours), 0);
    const previousMetrics = { totalClasses: previousTotalClasses, uncoveredClasses: previousUncoveredClasses, uncoveredPercentage: calculateAbsencePercentage(previousTotalClasses, previousUncoveredClasses), absences: previousAbsences.length };
    return { metrics, comparison: calculateMetricDeltas(metrics, previousMetrics), teacher: selectedTeacher, ranking, taskStats };
  }),

  taskPendencies: protectedProcedure.input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), period: z.enum(["month", "year"]).default("month"), category: z.enum(taskCategories), teacherId: z.number().int().positive().optional(), segmentId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const activeSegmentId = resolveSegmentScope(ctx.user, input.segmentId);
    const visibleTeachers = await listTeachersWithDetails(activeSegmentId);
    const visibleIds = visibleTeachers.map(teacher => teacher.id);
    if (input.teacherId) {
      const selectedTeacher = await getTeacherWithDetails(input.teacherId);
      if (!selectedTeacher) throw new Error("Professor não encontrado.");
      assertSegmentAccess(ctx.user, selectedTeacher.segmentId);
      if (activeSegmentId !== undefined && selectedTeacher.segmentId !== activeSegmentId) throw new Error("O professor selecionado não pertence ao segmento filtrado.");
    }
    const selectedIds = input.teacherId ? [input.teacherId] : visibleIds;
    if (!selectedIds.length) return [];
    const range = periodRange(input.month, input.period);
    const rows = await db.taskRecord.findMany({
      where: { teacherId: { in: selectedIds }, category: input.category as TaskCategory, completed: false, taskDate: { gte: range.start, lte: range.end } },
      include: { teacher: true }, orderBy: { taskDate: "desc" },
    });
    return groupPendingTeachers(rows.map(row => ({ teacherId: row.teacherId, name: row.teacher.name, discipline: row.teacher.discipline, segmentName: visibleTeachers.find(item => item.id === row.teacherId)?.segmentName || "Segmento", taskDate: row.taskDate.toISOString().slice(0, 10) })));
  }),
});
