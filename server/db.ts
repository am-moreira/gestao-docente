import { PrismaClient, type Prisma, type User, type UserRole } from "@prisma/client";
import { ENV } from "./_core/env";

let _db: PrismaClient | null = null;

function getPrismaDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;
  const parsed = new URL(databaseUrl);
  if (parsed.hostname.endsWith("tidbcloud.com") && !parsed.searchParams.has("sslaccept")) {
    parsed.searchParams.set("sslaccept", "strict");
  }
  return parsed.toString();
}

export type InsertUser = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: UserRole;
  lastSignedIn?: Date;
};

type TeacherWithDetails = {
  id: number;
  name: string;
  discipline: string;
  segmentId: number;
  segmentName: string;
  active: boolean;
  assignments: { id: number; teacherId: number; grade: string; classGroup: string }[];
  schedules: { id: number; teacherId: number; weekday: string; shift: string; classHours: Prisma.Decimal }[];
};

export async function getDb() {
  const databaseUrl = getPrismaDatabaseUrl();
  if (!_db && databaseUrl) {
    _db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: ["error"] });
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : undefined);
  await db.user.upsert({
    where: { openId: user.openId },
    create: {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: role ?? "user",
      lastSignedIn: user.lastSignedIn ?? new Date(),
    },
    update: {
      ...(user.name !== undefined ? { name: user.name } : {}),
      ...(user.email !== undefined ? { email: user.email } : {}),
      ...(user.loginMethod !== undefined ? { loginMethod: user.loginMethod } : {}),
      ...(role !== undefined ? { role } : {}),
      lastSignedIn: user.lastSignedIn ?? new Date(),
    },
  });
}

export async function getOrCreateLocalAdmin() {
  const localOpenId = "local-development-admin";
  await upsertUser({ openId: localOpenId, name: process.env.LOCAL_ADMIN_NAME ?? "Administrador Local", email: process.env.LOCAL_ADMIN_EMAIL ?? "admin@local.test", loginMethod: "local-development", role: "admin" });
  return getUserByOpenId(localOpenId);
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.user.findUnique({ where: { openId } })) ?? undefined;
}

const DEFAULT_SEGMENTS = ["Infantil", "Anos Iniciais", "Anos Finais", "Médio"];

export async function ensureDefaultSegments() {
  const db = await getDb();
  if (!db) return;
  await db.segment.createMany({ data: DEFAULT_SEGMENTS.map(name => ({ name })), skipDuplicates: true });
}

function normalizeTeacher(teacher: any): TeacherWithDetails {
  return {
    id: teacher.id,
    name: teacher.name,
    discipline: teacher.discipline,
    segmentId: teacher.segmentId,
    segmentName: teacher.segment.name,
    active: teacher.active,
    assignments: teacher.assignments,
    schedules: teacher.schedules,
  };
}

export async function listTeachersWithDetails(segmentId?: number, includeInactive = false): Promise<TeacherWithDetails[]> {
  const db = await getDb();
  if (!db) return [];
  const records = await db.teacher.findMany({
    where: { ...(segmentId ? { segmentId } : {}), ...(includeInactive ? {} : { active: true }) },
    include: { segment: true, assignments: true, schedules: true },
    orderBy: { name: "asc" },
  });
  return records.map(normalizeTeacher);
}

export async function getTeacherWithDetails(teacherId: number): Promise<TeacherWithDetails | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const teacher = await db.teacher.findUnique({ where: { id: teacherId }, include: { segment: true, assignments: true, schedules: true } });
  return teacher ? normalizeTeacher(teacher) : undefined;
}
