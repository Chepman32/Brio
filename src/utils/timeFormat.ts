import { getSettings } from '../database/operations';

export type TimeFormat = '12h' | '24h' | 'auto';

/**
 * Get the device's time format preference
 */
export const getDeviceTimeFormat = (): '12h' | '24h' => {
  // In React Native, we can check the locale to determine 12h vs 24h
  // For now, we'll default to 24h, but this can be enhanced with react-native-localize
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const testDate = new Date(2024, 0, 1, 13, 0);
  const formatted = testDate.toLocaleTimeString(locale, {
    hour: 'numeric',
    hour12: undefined,
  });

  // If the formatted time contains 'PM' or 'AM', it's 12h format
  return /am|pm/i.test(formatted) ? '12h' : '24h';
};

/**
 * Get the current time format setting
 */
export const getTimeFormat = (): '12h' | '24h' => {
  try {
    const settings = getSettings();
    const format = settings.timeFormat || 'auto';

    if (format === 'auto') {
      return getDeviceTimeFormat();
    }

    return format;
  } catch {
    return getDeviceTimeFormat();
  }
};

/**
 * Format time with explicit format
 */
export const formatTimeWithFormat = (
  date: Date,
  format: '12h' | '24h',
): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (format === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Format time according to user preference
 */
export const formatTime = (date: Date): string => {
  const format = getTimeFormat();
  return formatTimeWithFormat(date, format);
};

/**
 * Format time range with explicit format
 */
export const formatTimeRangeWithFormat = (
  startTime: Date,
  endTime: Date,
  format: '12h' | '24h',
): string => {
  return `${formatTimeWithFormat(startTime, format)} – ${formatTimeWithFormat(
    endTime,
    format,
  )}`;
};

/**
 * Format time range according to user preference
 */
export const formatTimeRange = (startTime: Date, endTime: Date): string => {
  const format = getTimeFormat();
  return formatTimeRangeWithFormat(startTime, endTime, format);
};

/**
 * Format hour label with explicit format
 */
export const formatHourLabelWithFormat = (
  hour: number,
  format: '12h' | '24h',
): string => {
  if (format === '12h') {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  }

  return `${hour}:00`;
};

/**
 * Format hour label for calendar view
 */
export const formatHourLabel = (hour: number): string => {
  const format = getTimeFormat();
  return formatHourLabelWithFormat(hour, format);
};
