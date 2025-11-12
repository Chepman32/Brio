/**
 * Localization utility for calendar text
 * Supports English and Russian locales
 */

export type Locale = 'en' | 'ru';

interface Translations {
  day: string;
  weekdays: string[];
  weekdaysShort: string[];
  months: string[];
  monthsShort: string[];
}

const translations: Record<Locale, Translations> = {
  en: {
    day: 'Day',
    weekdays: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    monthsShort: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
  },
  ru: {
    day: 'День',
    weekdays: [
      'Понедельник',
      'Вторник',
      'Среда',
      'Четверг',
      'Пятница',
      'Суббота',
      'Воскресенье',
    ],
    weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    months: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
    monthsShort: [
      'Янв',
      'Фев',
      'Мар',
      'Апр',
      'Май',
      'Июн',
      'Июл',
      'Авг',
      'Сен',
      'Окт',
      'Ноя',
      'Дек',
    ],
  },
};

// Default locale
let currentLocale: Locale = 'ru';

/**
 * Set the current locale
 * @param locale - The locale to set ('en' or 'ru')
 */
export const setLocale = (locale: Locale): void => {
  currentLocale = locale;
};

/**
 * Get the current locale
 * @returns The current locale
 */
export const getLocale = (): Locale => {
  return currentLocale;
};

/**
 * Get translations for the current locale
 * @returns Translations object
 */
export const getTranslations = (): Translations => {
  return translations[currentLocale];
};

/**
 * Get the word for "Day" in the current locale
 * @returns Translated "Day" text
 */
export const getDayText = (): string => {
  return translations[currentLocale].day;
};

/**
 * Get weekday names in the current locale
 * @param short - Whether to return short names
 * @returns Array of weekday names
 */
export const getWeekdays = (short: boolean = false): string[] => {
  return short
    ? translations[currentLocale].weekdaysShort
    : translations[currentLocale].weekdays;
};

/**
 * Get month names in the current locale
 * @param short - Whether to return short names
 * @returns Array of month names
 */
export const getMonths = (short: boolean = false): string[] => {
  return short
    ? translations[currentLocale].monthsShort
    : translations[currentLocale].months;
};

/**
 * Format a date header for day view
 * @param date - The date to format
 * @returns Formatted string like "День: Среда, 13 ноября"
 */
export const formatDayHeader = (date: Date): string => {
  const locale = currentLocale === 'ru' ? 'ru-RU' : 'en-US';
  const weekday = date.toLocaleDateString(locale, { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString(locale, { month: 'long' });

  // Capitalize first letter
  const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  return `${getDayText()}: ${weekdayCapitalized}, ${day} ${month}`;
};

/**
 * Format a month and year for month view
 * @param date - The date to format
 * @returns Formatted string like "Ноябрь 2025"
 */
export const formatMonthYear = (date: Date): string => {
  const locale = currentLocale === 'ru' ? 'ru-RU' : 'en-US';
  return date.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
};
