import type { User } from "@prisma/client";
import { TRPCError } from "@trpc/server";

type Viewer = Pick<User, "role" | "segmentId">;

export function getViewerSegmentId(viewer: Viewer) {
  if (viewer.role === "admin") return undefined;
  if (!viewer.segmentId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seu usuário ainda não está vinculado a um segmento escolar.",
    });
  }
  return viewer.segmentId;
}

export function assertSegmentAccess(viewer: Viewer, resourceSegmentId: number) {
  const viewerSegmentId = getViewerSegmentId(viewer);
  if (viewerSegmentId !== undefined && viewerSegmentId !== resourceSegmentId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para acessar dados de outro segmento.",
    });
  }
}

export function resolveSegmentScope(viewer: Viewer, requestedSegmentId?: number) {
  const viewerSegmentId = getViewerSegmentId(viewer);
  if (viewerSegmentId !== undefined) {
    if (requestedSegmentId !== undefined && requestedSegmentId !== viewerSegmentId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Você só pode consultar dados do seu próprio segmento.",
      });
    }
    return viewerSegmentId;
  }
  return requestedSegmentId;
}

export function assertActiveTeacher(teacher: { active: boolean }) {
  if (!teacher.active) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Este professor está marcado como demitido e não pode receber novos lançamentos.",
    });
  }
}
