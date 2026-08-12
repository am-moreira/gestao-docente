/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type { AbsenceRecord, Segment, TaskRecord, Teacher, TeacherAssignment, TeacherSchedule, User } from "@prisma/client";
export { Shift, TaskCategory, UserRole, Weekday } from "@prisma/client";
export * from "./_core/errors";
