/**
 * Date helper utilities for recurring task suggestions
 */

/**
 * Get ISO week string (e.g., "2025-W46")
 */
export function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Get day-of-week (0=Sun, 6=Sat)
 */
export function getDayOfWeek(date: Date): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Get time bin (0..47 for 30-minute intervals)
 */
export function getTimeBin(date: Date, binSizeMinutes: number = 30): number {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return Math.floor((hours * 60 + minutes) / binSizeMinutes);
}

/**
 * Convert bin to time string (e.g., "17:00")
 */
export function binToTimeString(
  bin: number,
  binSizeMinutes: number = 30,
): string {
  const totalMinutes = bin * binSizeMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Get next date with specific day-of-week
 */
export function getNextDateWithDow(
  targetDow: number,
  fromDate: Date = new Date(),
): Date {
  const result = new Date(fromDate);
  result.setHours(0, 0, 0, 0);

  const currentDow = result.getDay();
  let daysToAdd = targetDow - currentDow;

  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}

/**
 * Convert date and bin to timestamp
 */
export function dateAndBinToTimestamp(
  date: Date,
  bin: number,
  binSizeMinutes: number = 30,
): number {
  const result = new Date(date);
  const totalMinutes = bin * binSizeMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  result.setHours(hours, minutes, 0, 0);
  return result.getTime();
}

/**
 * Calculate gap in days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.abs(
    Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

/**
 * Calculate weeks between two dates
 */
export function weeksBetween(date1: Date, date2: Date): number {
  return daysBetween(date1, date2) / 7;
}

/**
 * Check if date is within quiet hours
 */
export function isInQuietHours(
  date: Date,
  quietStart?: number,
  quietEnd?: number,
): boolean {
  if (quietStart === undefined || quietEnd === undefined) {
    return false;
  }

  const bin = getTimeBin(date);

  if (quietStart < quietEnd) {
    return bin >= quietStart && bin < quietEnd;
  } else {
    // Quiet hours span midnight
    return bin >= quietStart || bin < quietEnd;
  }
}

/**
 * Shift time to after quiet hours on same day
 */
export function shiftAfterQuietHours(
  timestamp: number,
  quietStart?: number,
  quietEnd?: number,
  binSizeMinutes: number = 30,
): number {
  if (quietStart === undefined || quietEnd === undefined) {
    return timestamp;
  }

  const date = new Date(timestamp);

  if (!isInQuietHours(date, quietStart, quietEnd)) {
    return timestamp;
  }

  // Move to end of quiet hours
  const totalMinutes = quietEnd * binSizeMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  date.setHours(hours, minutes, 0, 0);

  // If this crosses midnight, drop this cycle
  if (date.getDate() !== new Date(timestamp).getDate()) {
    return -1; // Signal to drop
  }

  return date.getTime();
}
