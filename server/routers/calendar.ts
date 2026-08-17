import type { SchoolCalendarItemType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { calendarItemTypes, calendarMonthRange } from "../calendarUtils";
import { getDb } from "../db";
import { resolveSegmentScope } from "../permissions";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const dateFromIso = (value: string) => new Date(`${value}T12:00:00.000Z`);
const calendarInput = z.object({
  title: z.string().trim().min(3).max(160),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(calendarItemTypes),
  description: z.string().trim().max(600).optional().nullable(),
  segmentId: z.number().int().positive().optional().nullable(),
});

async function assertSegmentExists(segmentId: number | null | undefined) {
  if (!segmentId) return;
  const db = await getDb();
  const segment = db ? await db.segment.findUnique({ where: { id: segmentId }, select: { id: true } }) : null;
  if (!segment) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um segmento válido." });
}

export const calendarRouter = router({
  list: protectedProcedure.input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), segmentId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const activeSegmentId = resolveSegmentScope(ctx.user, input.segmentId);
    const range = calendarMonthRange(input.month);
    const items = await db.schoolCalendarItem.findMany({
      where: {
        eventDate: { gte: range.start, lte: range.end },
        ...(activeSegmentId === undefined ? {} : { OR: [{ segmentId: null }, { segmentId: activeSegmentId }] }),
      },
      include: { segment: true },
      orderBy: [{ eventDate: "asc" }, { title: "asc" }],
    });
    return items.map(item => ({ id: item.id, title: item.title, eventDate: isoDate(item.eventDate), type: item.type, description: item.description, segmentId: item.segmentId, segmentName: item.segment?.name ?? "Todos os segmentos" }));
  }),

  create: adminProcedure.input(calendarInput).mutation(async ({ ctx, input }) => {
    await assertSegmentExists(input.segmentId);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    const item = await db.schoolCalendarItem.create({ data: { ...input, eventDate: dateFromIso(input.eventDate), type: input.type as SchoolCalendarItemType, description: input.description?.trim() || null, createdByUserId: ctx.user.id } });
    return { id: item.id };
  }),

  update: adminProcedure.input(calendarInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await assertSegmentExists(input.segmentId);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    await db.schoolCalendarItem.update({ where: { id: input.id }, data: { ...input, eventDate: dateFromIso(input.eventDate), type: input.type as SchoolCalendarItemType, description: input.description?.trim() || null } });
    return { success: true };
  }),

  remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    await db.schoolCalendarItem.delete({ where: { id: input.id } });
    return { success: true };
  }),
});
