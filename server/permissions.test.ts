import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertActiveTeacher, assertSegmentAccess, getViewerSegmentId, resolveSegmentScope } from "./permissions";

describe("isolamento por segmento", () => {
  it("permite que o administrador veja todos os segmentos", () => {
    expect(getViewerSegmentId({ role: "admin", segmentId: null })).toBeUndefined();
    expect(() => assertSegmentAccess({ role: "admin", segmentId: null }, 4)).not.toThrow();
  });

  it("mantém o responsável restrito ao segmento associado", () => {
    expect(getViewerSegmentId({ role: "responsavel", segmentId: 2 })).toBe(2);
    expect(() => assertSegmentAccess({ role: "responsavel", segmentId: 2 }, 2)).not.toThrow();
  });

  it("bloqueia o responsável ao acessar outro segmento", () => {
    expect(() => assertSegmentAccess({ role: "responsavel", segmentId: 2 }, 3)).toThrow(TRPCError);
  });

  it("bloqueia um usuário não vinculado a um segmento", () => {
    expect(() => getViewerSegmentId({ role: "user", segmentId: null })).toThrow(TRPCError);
  });

  it("permite ao administrador escolher qualquer segmento ou a visão consolidada", () => {
    expect(resolveSegmentScope({ role: "admin", segmentId: null }, 3)).toBe(3);
    expect(resolveSegmentScope({ role: "admin", segmentId: null })).toBeUndefined();
  });

  it("mantém o filtro do responsável fixo em seu próprio segmento", () => {
    expect(resolveSegmentScope({ role: "responsavel", segmentId: 2 })).toBe(2);
    expect(resolveSegmentScope({ role: "responsavel", segmentId: 2 }, 2)).toBe(2);
    expect(() => resolveSegmentScope({ role: "responsavel", segmentId: 2 }, 4)).toThrow(TRPCError);
  });

  it("bloqueia novos lançamentos para professores demitidos", () => {
    expect(() => assertActiveTeacher({ active: false })).toThrow(TRPCError);
    expect(() => assertActiveTeacher({ active: true })).not.toThrow();
  });
});
