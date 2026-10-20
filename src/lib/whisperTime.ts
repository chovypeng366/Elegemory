const DAY_MS = 86_400_000;
const WORKDAY_OFFSET_MS = 5 * 3_600_000;

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function workdayKeyFor(date: Date = new Date()): string {
  return localDateKey(new Date(date.getTime() - WORKDAY_OFFSET_MS));
}

export function previousWorkdayKeyFor(date: Date = new Date()): string {
  return localDateKey(
    new Date(date.getTime() - WORKDAY_OFFSET_MS - DAY_MS),
  );
}

export function isLateNight(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 1 && hour < 5;
}
