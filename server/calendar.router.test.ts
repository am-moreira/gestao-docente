import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createCalendarItem = vi.fn();
const updateCalendarItem = vi.fn();
const removeCalendarItem = vi.fn();

vi.mock("./db", () => ({
  getDb: async () => ({
    schoolCalendarItem: { create: createCalendarItem, update: updateCalendarItem, delete: removeCalendarItem },
    segment: { findUnique: vi.fn() },
  }),
}));

import { calendarRouter } from "./routers/calendar";

const responsibleContext = {
  user: { id: 2, role: "responsavel", segmentId: 1 },
} as unknown as TrpcContext;

const adminContext = {
  user: { id: 1, role: "admin", segmentId: null },
} as unknown as TrpcContext;

describe("autorização do calendário escolar", () => {
  beforeEach(() => {
    createCalendarItem.mockResolvedValue({ id: 42 });
    updateCalendarItem.mockResolvedValue({ id: 42 });
    removeCalendarItem.mockResolvedValue({ id: 42 });
  });

  it("bloqueia criação, edição e exclusão para responsáveis de segmento", async () => {
    const caller = calendarRouter.createCaller(responsibleContext);
    const payload = { title: "Conselho de classe", eventDate: "2026-08-20", type: "event" as const, description: null, segmentId: null };

    await expect(caller.create(payload)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.update({ id: 1, ...payload })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.remove({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite que o administrador cadastre, edite e remova itens", async () => {
    const caller = calendarRouter.createCaller(adminContext);
    const payload = { title: "Conselho de classe", eventDate: "2026-08-20", type: "event" as const, description: null, segmentId: null };

    await expect(caller.create(payload)).resolves.toEqual({ id: 42 });
    await expect(caller.update({ id: 42, ...payload })).resolves.toEqual({ success: true });
    await expect(caller.remove({ id: 42 })).resolves.toEqual({ success: true });
    expect(createCalendarItem).toHaveBeenCalledOnce();
    expect(updateCalendarItem).toHaveBeenCalledOnce();
    expect(removeCalendarItem).toHaveBeenCalledOnce();
  });
});
