import { useState, useEffect, useCallback } from 'react';
import { getSettings } from '../database/operations';
import { getDeviceTimeFormat } from '../utils/timeFormat';
import {
  formatTimeWithFormat,
  formatTimeRangeWithFormat,
  formatHourLabelWithFormat,
} from '../utils/timeFormat';

export const useTimeFormat = () => {
  const [format, setFormat] = useState<'12h' | '24h'>(() => {
    try {
      const settings = getSettings();
      const timeFormat = settings.timeFormat || 'auto';
      return timeFormat === 'auto' ? getDeviceTimeFormat() : timeFormat;
    } catch {
      return getDeviceTimeFormat();
    }
  });

  const refreshFormat = useCallback(() => {
    try {
      const settings = getSettings();
      const timeFormat = settings.timeFormat || 'auto';
      const newFormat =
        timeFormat === 'auto' ? getDeviceTimeFormat() : timeFormat;
      setFormat(newFormat);
    } catch {
      setFormat(getDeviceTimeFormat());
    }
  }, []);

  useEffect(() => {
    // Refresh on mount
    refreshFormat();

    // Set up an interval to check for changes (every second)
    const interval = setInterval(refreshFormat, 1000);

    return () => clearInterval(interval);
  }, [refreshFormat]);

  const formatTime = useCallback(
    (date?: Date) => formatTimeWithFormat(date, format),
    [format],
  );

  const formatTimeRange = useCallback(
    (startTime?: Date, endTime?: Date) =>
      formatTimeRangeWithFormat(startTime, endTime, format),
    [format],
  );

  const formatHourLabel = useCallback(
    (hour: number) => formatHourLabelWithFormat(hour, format),
    [format],
  );

  const is24Hour = format === '24h';

  return {
    format,
    formatTime,
    formatTimeRange,
    formatHourLabel,
    is24Hour,
    refreshFormat,
  };
};
