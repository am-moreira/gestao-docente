export const calendarItemTypes = ["holiday", "event"] as const;

export function calendarMonthRange(month: string) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59)),
  };
}

export function isCalendarItemVisible(itemSegmentId: number | null, activeSegmentId?: number) {
  return activeSegmentId === undefined || itemSegmentId === null || itemSegmentId === activeSegmentId;
}
