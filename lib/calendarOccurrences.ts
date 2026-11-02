import type { Requirement } from "./types";

/** Expand only dates explicitly represented by source-backed deadline models.
 * Event-based, variable and one-time deadlines are deliberately omitted. */
export function calendarOccurrences(requirement: Requirement, year: number): Date[] {
  const out: Date[] = [];
  const add = (month: number, day: number) => {
    if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) return;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) out.push(d);
  };
  switch (requirement.deadlineKind) {
    case "fixed_annual":
      if (requirement.deadlineMonth && requirement.deadlineDay) add(requirement.deadlineMonth, requirement.deadlineDay);
      break;
    case "fixed_dates":
      requirement.deadlineDates?.forEach(({ month, day }) => add(month, day));
      break;
    case "monthly_day":
      if (requirement.deadlineDayOfMonth) for (let m = 1; m <= 12; m++) add(m, requirement.deadlineDayOfMonth);
      break;
    case "quarter_offset":
      if (requirement.deadlineQuarterOffsetDays != null) {
        for (const qEnd of [new Date(year, 3, 0), new Date(year, 6, 0), new Date(year, 9, 0), new Date(year + 1, 0, 0)]) {
          const d = new Date(qEnd.getFullYear(), qEnd.getMonth(), qEnd.getDate() + requirement.deadlineQuarterOffsetDays);
          if (d.getFullYear() === year) out.push(d);
        }
        // Last year's fourth quarter may have a deadline this January.
        const prev = new Date(year, 0, requirement.deadlineQuarterOffsetDays);
        if (prev.getFullYear() === year && requirement.deadlineQuarterOffsetDays > 0) out.push(prev);
      }
      break;
    case "window":
      // Only the closing date is treated as the deadline; beginning of the window is not a due date.
      if (requirement.deadlineWindow) add(requirement.deadlineWindow.endMonth, requirement.deadlineWindow.endDay);
      break;
    default: break;
  }
  return [...new Map(out.map(d => [d.getTime(), d])).values()].sort((a,b)=>a.getTime()-b.getTime());
}
