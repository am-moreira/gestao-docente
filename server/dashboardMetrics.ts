export const taskCategories = ["notas", "material", "reuniao", "capacitacao", "evento"] as const;
export type TaskCategory = (typeof taskCategories)[number];

export function scheduleHoursForMonth(schedules: { weekday: string; classHours: string }[], year: number, monthIndex: number, lastDay: number) {
  const weekdays = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  return schedules.reduce((total, schedule) => {
    let occurrences = 0;
    for (let day = 1; day <= lastDay; day += 1) {
      if (weekdays[new Date(year, monthIndex, day, 12).getDay()] === schedule.weekday) occurrences += 1;
    }
    return total + Number(schedule.classHours) * occurrences;
  }, 0);
}

export function scheduleHoursForYear(schedules: { weekday: string; classHours: string }[], year: number) {
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return scheduleHoursForMonth(schedules, year, monthIndex, lastDay);
  }).reduce((total, value) => total + value, 0);
}

export function calculateAbsencePercentage(totalClasses: number, uncoveredClasses: number) {
  return totalClasses ? (uncoveredClasses / totalClasses) * 100 : 0;
}

export function calculateMetricDeltas(current: { totalClasses: number; uncoveredClasses: number; uncoveredPercentage: number; absences: number }, previous: { totalClasses: number; uncoveredClasses: number; uncoveredPercentage: number; absences: number }) {
  return {
    totalClasses: current.totalClasses - previous.totalClasses,
    uncoveredClasses: current.uncoveredClasses - previous.uncoveredClasses,
    uncoveredPercentage: current.uncoveredPercentage - previous.uncoveredPercentage,
    absences: current.absences - previous.absences,
  };
}

export function calculateTaskStats(tasks: { category: TaskCategory; completed: boolean }[]) {
  const stats = Object.fromEntries(taskCategories.map(category => [category, { yes: 0, no: 0 }])) as Record<TaskCategory, { yes: number; no: number }>;
  tasks.forEach(task => { task.completed ? stats[task.category].yes += 1 : stats[task.category].no += 1; });
  return stats;
}

export function calculateTopAbsenceRanking(teachers: { id: number; name: string }[], absences: { teacherId: number }[], limit = 6) {
  const counts = absences.reduce<Record<number, number>>((acc, item) => ({ ...acc, [item.teacherId]: (acc[item.teacherId] ?? 0) + 1 }), {});
  return teachers.map(teacher => ({ teacherId: teacher.id, name: teacher.name, absences: counts[teacher.id] ?? 0 })).filter(item => item.absences > 0).sort((a, b) => b.absences - a.absences || a.name.localeCompare(b.name)).slice(0, limit);
}

export function groupPendingTeachers(rows: { teacherId: number; name: string; discipline: string; segmentName: string; taskDate: string }[]) {
  const grouped = new Map<number, { teacherId: number; name: string; discipline: string; segmentName: string; pendingCount: number; dates: string[] }>();
  rows.forEach(row => {
    const existing = grouped.get(row.teacherId);
    if (existing) {
      existing.pendingCount += 1;
      existing.dates.push(row.taskDate);
      return;
    }
    grouped.set(row.teacherId, { teacherId: row.teacherId, name: row.name, discipline: row.discipline, segmentName: row.segmentName, pendingCount: 1, dates: [row.taskDate] });
  });
  return Array.from(grouped.values());
}
