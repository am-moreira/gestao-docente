import { TRPCError } from "@trpc/server";
import type { Shift, TaskCategory, Weekday } from "@prisma/client";
import { z } from "zod";
import { ensureDefaultSegments, getDb, getTeacherWithDetails, listTeachersWithDetails } from "../db";
import { assertActiveTeacher, assertSegmentAccess, getViewerSegmentId, resolveSegmentScope } from "../permissions";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const weekdayValues = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;
const shiftValues = ["manha", "tarde", "noite"] as const;
const taskValues = ["notas", "material", "reuniao", "capacitacao", "evento"] as const;
const dateFromIso = (value: string) => new Date(`${value}T12:00:00.000Z`);
const isoDate = (value: Date) => value.toISOString().slice(0, 10);

const teacherInput = z.object({
  name: z.string().trim().min(3).max(160),
  discipline: z.string().trim().min(2).max(120),
  segmentId: z.number().int().positive(),
  assignments: z.array(z.object({ grade: z.string().trim().min(1).max(60), classGroup: z.string().trim().min(1).max(60) })).min(1),
  schedules: z.array(z.object({ weekday: z.enum(weekdayValues), shift: z.enum(shiftValues), classHours: z.number().positive().max(12) })).min(1),
});

async function assertTeacherAccess(user: { role: "admin" | "user" | "responsavel"; segmentId: number | null }, teacherId: number) {
  const teacher = await getTeacherWithDetails(teacherId);
  if (!teacher) throw new TRPCError({ code: "NOT_FOUND", message: "Professor não encontrado." });
  assertSegmentAccess(user, teacher.segmentId);
  return teacher;
}

export const academicRouter = router({
  bootstrap: protectedProcedure.query(async () => { await ensureDefaultSegments(); return { success: true }; }),

  listSegments: protectedProcedure.query(async () => {
    await ensureDefaultSegments();
    const db = await getDb();
    return db ? db.segment.findMany({ orderBy: { name: "asc" } }) : [];
  }),

  listTeachers: protectedProcedure.input(z.object({ segmentId: z.number().int().positive().optional(), includeInactive: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
    return listTeachersWithDetails(resolveSegmentScope(ctx.user, input?.segmentId), ctx.user.role === "admin" && input?.includeInactive === true);
  }),

  getTeacher: protectedProcedure.input(z.object({ teacherId: z.number().int().positive() })).query(async ({ ctx, input }) => assertTeacherAccess(ctx.user, input.teacherId)),

  createTeacher: adminProcedure.input(teacherInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    const segment = await db.segment.findUnique({ where: { id: input.segmentId }, select: { id: true } });
    if (!segment) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um segmento válido." });
    const created = await db.teacher.create({
      data: {
        name: input.name,
        discipline: input.discipline,
        segmentId: input.segmentId,
        assignments: { create: input.assignments },
        schedules: { create: input.schedules.map(item => ({ weekday: item.weekday as Weekday, shift: item.shift as Shift, classHours: item.classHours })) },
      },
    });
    return { teacherId: created.id };
  }),

  updateTeacher: adminProcedure.input(teacherInput.extend({ teacherId: z.number().int().positive(), active: z.boolean().default(true) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    await db.teacher.update({
      where: { id: input.teacherId },
      data: {
        name: input.name, discipline: input.discipline, segmentId: input.segmentId, active: input.active,
        assignments: { deleteMany: {}, create: input.assignments },
        schedules: { deleteMany: {}, create: input.schedules.map(item => ({ weekday: item.weekday as Weekday, shift: item.shift as Shift, classHours: item.classHours })) },
      },
    });
    return { success: true };
  }),

  setTeacherDismissed: adminProcedure.input(z.object({ teacherId: z.number().int().positive(), dismissed: z.boolean() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    await db.teacher.update({ where: { id: input.teacherId }, data: { active: !input.dismissed } });
    return { success: true, dismissed: input.dismissed };
  }),

  listUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const users = await db.user.findMany({ include: { segment: true }, orderBy: { name: "asc" } });
    return users.map(user => ({ id: user.id, name: user.name, email: user.email, role: user.role, segmentId: user.segmentId, segmentName: user.segment?.name ?? null }));
  }),

  updateUserAccess: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "user", "responsavel"]), segmentId: z.number().int().positive().nullable() })).mutation(async ({ input }) => {
    if (input.role === "responsavel" && !input.segmentId) throw new TRPCError({ code: "BAD_REQUEST", message: "Um responsável deve ser vinculado a um segmento." });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    await db.user.update({ where: { id: input.userId }, data: { role: input.role, segmentId: input.role === "admin" ? null : input.segmentId } });
    return { success: true };
  }),

  listAbsences: protectedProcedure.input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), teacherId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const visible = await listTeachersWithDetails(getViewerSegmentId(ctx.user));
    if (input.teacherId) assertActiveTeacher(await assertTeacherAccess(ctx.user, input.teacherId));
    const selectedIds = input.teacherId ? [input.teacherId] : visible.map(teacher => teacher.id);
    if (!selectedIds.length) return [];
    const start = dateFromIso(`${input.month}-01`);
    const end = new Date(Date.UTC(Number(input.month.slice(0, 4)), Number(input.month.slice(5, 7)), 0, 23, 59, 59));
    const records = await db.absenceRecord.findMany({ where: { teacherId: { in: selectedIds }, absenceDate: { gte: start, lte: end } }, include: { teacher: true }, orderBy: { absenceDate: "desc" } });
    return records.map(record => ({ id: record.id, absenceDate: isoDate(record.absenceDate), shift: record.shift, uncoveredHours: record.uncoveredHours, teacherId: record.teacherId, teacherName: record.teacher.name }));
  }),

  recordAbsence: protectedProcedure.input(z.object({ teacherId: z.number().int().positive(), absenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), shift: z.enum(shiftValues) })).mutation(async ({ ctx, input }) => {
    const teacher = await assertTeacherAccess(ctx.user, input.teacherId);
    assertActiveTeacher(teacher);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    const sundayBased = new Date(`${input.absenceDate}T12:00:00`).getDay();
    const weekday = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][sundayBased];
    const schedule = teacher.schedules.find(item => item.weekday === weekday && item.shift === input.shift);
    if (!schedule) throw new TRPCError({ code: "BAD_REQUEST", message: "O professor não possui carga horária cadastrada neste dia e turno." });
    await db.absenceRecord.create({ data: { teacherId: input.teacherId, absenceDate: dateFromIso(input.absenceDate), shift: input.shift as Shift, uncoveredHours: schedule.classHours as any, createdByUserId: ctx.user.id } });
    return { success: true, uncoveredHours: Number(schedule.classHours) };
  }),

  listTasks: protectedProcedure.input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), teacherId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const visible = await listTeachersWithDetails(getViewerSegmentId(ctx.user));
    if (input.teacherId) assertActiveTeacher(await assertTeacherAccess(ctx.user, input.teacherId));
    const selectedIds = input.teacherId ? [input.teacherId] : visible.map(teacher => teacher.id);
    if (!selectedIds.length) return [];
    const start = dateFromIso(`${input.month}-01`);
    const end = new Date(Date.UTC(Number(input.month.slice(0, 4)), Number(input.month.slice(5, 7)), 0, 23, 59, 59));
    const records = await db.taskRecord.findMany({ where: { teacherId: { in: selectedIds }, taskDate: { gte: start, lte: end } }, include: { teacher: true }, orderBy: { taskDate: "desc" } });
    return records.map(record => ({ id: record.id, taskDate: isoDate(record.taskDate), category: record.category, completed: record.completed, teacherId: record.teacherId, teacherName: record.teacher.name }));
  }),

  recordTask: protectedProcedure.input(z.object({ teacherId: z.number().int().positive(), taskDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category: z.enum(taskValues), completed: z.boolean() })).mutation(async ({ ctx, input }) => {
    assertActiveTeacher(await assertTeacherAccess(ctx.user, input.teacherId));
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    const taskDate = dateFromIso(input.taskDate);
    await db.taskRecord.upsert({
      where: { teacherId_taskDate_category: { teacherId: input.teacherId, taskDate, category: input.category as TaskCategory } },
      create: { ...input, taskDate, category: input.category as TaskCategory, createdByUserId: ctx.user.id },
      update: { completed: input.completed, createdByUserId: ctx.user.id },
    });
    return { success: true };
  }),
});
