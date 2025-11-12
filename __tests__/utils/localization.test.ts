import {
  setLocale,
  getLocale,
  getDayText,
  getWeekdays,
  getMonths,
  formatDayHeader,
  formatMonthYear,
  getTranslations,
} from '../../src/utils/localization';

describe('localization', () => {
  beforeEach(() => {
    // Reset to default locale before each test
    setLocale('ru');
  });

  describe('setLocale and getLocale', () => {
    it('should set and get locale', () => {
      setLocale('en');
      expect(getLocale()).toBe('en');

      setLocale('ru');
      expect(getLocale()).toBe('ru');
    });

    it('should default to Russian locale', () => {
      expect(getLocale()).toBe('ru');
    });
  });

  describe('getDayText', () => {
    it('should return "День" for Russian locale', () => {
      setLocale('ru');
      expect(getDayText()).toBe('День');
    });

    it('should return "Day" for English locale', () => {
      setLocale('en');
      expect(getDayText()).toBe('Day');
    });
  });

  describe('getWeekdays', () => {
    it('should return Russian weekday names', () => {
      setLocale('ru');
      const weekdays = getWeekdays();
      expect(weekdays).toHaveLength(7);
      expect(weekdays[0]).toBe('Понедельник');
      expect(weekdays[6]).toBe('Воскресенье');
    });

    it('should return English weekday names', () => {
      setLocale('en');
      const weekdays = getWeekdays();
      expect(weekdays).toHaveLength(7);
      expect(weekdays[0]).toBe('Monday');
      expect(weekdays[6]).toBe('Sunday');
    });

    it('should return short weekday names when requested', () => {
      setLocale('ru');
      const weekdays = getWeekdays(true);
      expect(weekdays).toHaveLength(7);
      expect(weekdays[0]).toBe('Пн');
      expect(weekdays[6]).toBe('Вс');
    });

    it('should return short English weekday names', () => {
      setLocale('en');
      const weekdays = getWeekdays(true);
      expect(weekdays[0]).toBe('Mon');
      expect(weekdays[6]).toBe('Sun');
    });
  });

  describe('getMonths', () => {
    it('should return Russian month names', () => {
      setLocale('ru');
      const months = getMonths();
      expect(months).toHaveLength(12);
      expect(months[0]).toBe('Январь');
      expect(months[11]).toBe('Декабрь');
    });

    it('should return English month names', () => {
      setLocale('en');
      const months = getMonths();
      expect(months).toHaveLength(12);
      expect(months[0]).toBe('January');
      expect(months[11]).toBe('December');
    });

    it('should return short month names when requested', () => {
      setLocale('ru');
      const months = getMonths(true);
      expect(months).toHaveLength(12);
      expect(months[0]).toBe('Янв');
      expect(months[11]).toBe('Дек');
    });
  });

  describe('formatDayHeader', () => {
    it('should format date header in Russian', () => {
      setLocale('ru');
      const date = new Date(2025, 10, 13); // November 13, 2025 (Wednesday)
      const formatted = formatDayHeader(date);
      expect(formatted).toContain('День:');
      expect(formatted).toContain('13');
    });

    it('should format date header in English', () => {
      setLocale('en');
      const date = new Date(2025, 10, 13);
      const formatted = formatDayHeader(date);
      expect(formatted).toContain('Day:');
      expect(formatted).toContain('13');
    });

    it('should capitalize first letter of weekday', () => {
      setLocale('ru');
      const date = new Date(2025, 10, 13);
      const formatted = formatDayHeader(date);
      // Should start with capital letter after "День: "
      const weekdayPart = formatted.split(': ')[1];
      expect(weekdayPart.charAt(0)).toBe(weekdayPart.charAt(0).toUpperCase());
    });

    it('should handle different dates correctly', () => {
      setLocale('ru');
      const date1 = new Date(2025, 0, 1); // January 1
      const date2 = new Date(2025, 11, 31); // December 31

      const formatted1 = formatDayHeader(date1);
      const formatted2 = formatDayHeader(date2);

      expect(formatted1).toContain('1');
      expect(formatted2).toContain('31');
    });
  });

  describe('formatMonthYear', () => {
    it('should format month and year in Russian', () => {
      setLocale('ru');
      const date = new Date(2025, 10, 13); // November 2025
      const formatted = formatMonthYear(date);
      expect(formatted).toContain('2025');
    });

    it('should format month and year in English', () => {
      setLocale('en');
      const date = new Date(2025, 10, 13);
      const formatted = formatMonthYear(date);
      expect(formatted).toContain('November');
      expect(formatted).toContain('2025');
    });

    it('should handle different months correctly', () => {
      setLocale('en');
      const jan = new Date(2025, 0, 1);
      const dec = new Date(2025, 11, 31);

      expect(formatMonthYear(jan)).toContain('January');
      expect(formatMonthYear(dec)).toContain('December');
    });
  });

  describe('getTranslations', () => {
    it('should return Russian translations', () => {
      setLocale('ru');
      const translations = getTranslations();
      expect(translations.day).toBe('День');
      expect(translations.weekdays).toHaveLength(7);
      expect(translations.months).toHaveLength(12);
    });

    it('should return English translations', () => {
      setLocale('en');
      const translations = getTranslations();
      expect(translations.day).toBe('Day');
      expect(translations.weekdays).toHaveLength(7);
      expect(translations.months).toHaveLength(12);
    });
  });
});
