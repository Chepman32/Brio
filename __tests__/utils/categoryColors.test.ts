import {
  getCategoryColor,
  CATEGORY_COLORS,
  hasCategoryColor,
  getAllCategoryColors,
} from '../../src/utils/categoryColors';

describe('categoryColors', () => {
  describe('getCategoryColor', () => {
    it('should return correct color for Work category', () => {
      expect(getCategoryColor('Work')).toBe('#6B9EFF');
    });

    it('should return correct color for Health category', () => {
      expect(getCategoryColor('Health')).toBe('#7BC67E');
    });

    it('should return correct color for Meetings category', () => {
      expect(getCategoryColor('Meetings')).toBe('#FF9F6B');
    });

    it('should return default color for undefined category', () => {
      expect(getCategoryColor(undefined)).toBe(CATEGORY_COLORS.default);
    });

    it('should return default color for unknown category', () => {
      expect(getCategoryColor('UnknownCategory')).toBe(CATEGORY_COLORS.default);
    });

    it('should handle case-insensitive matching', () => {
      expect(getCategoryColor('work')).toBe('#6B9EFF');
      expect(getCategoryColor('WORK')).toBe('#6B9EFF');
      expect(getCategoryColor('WoRk')).toBe('#6B9EFF');
    });

    it('should handle categories with spaces', () => {
      expect(getCategoryColor('Home Maintenance')).toBe('#EC4899');
      expect(getCategoryColor('Car / Vehicle')).toBe('#8B5CF6');
    });

    it('should return correct colors for all primary categories', () => {
      expect(getCategoryColor('Work')).toBe('#6B9EFF');
      expect(getCategoryColor('Health')).toBe('#7BC67E');
      expect(getCategoryColor('Fitness')).toBe('#7BC67E');
      expect(getCategoryColor('Nutrition')).toBe('#7BC67E');
      expect(getCategoryColor('Meetings')).toBe('#FF9F6B');
      expect(getCategoryColor('Calls')).toBe('#FF9F6B');
    });

    it('should return correct colors for secondary categories', () => {
      expect(getCategoryColor('Personal')).toBe('#A78BFA');
      expect(getCategoryColor('Family')).toBe('#F472B6');
      expect(getCategoryColor('Study')).toBe('#FBBF24');
      expect(getCategoryColor('Finance')).toBe('#34D399');
    });
  });

  describe('hasCategoryColor', () => {
    it('should return true for defined categories', () => {
      expect(hasCategoryColor('Work')).toBe(true);
      expect(hasCategoryColor('Health')).toBe(true);
      expect(hasCategoryColor('Meetings')).toBe(true);
    });

    it('should return false for undefined category', () => {
      expect(hasCategoryColor(undefined)).toBe(false);
    });

    it('should return false for unknown category', () => {
      expect(hasCategoryColor('UnknownCategory')).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      expect(hasCategoryColor('work')).toBe(true);
      expect(hasCategoryColor('HEALTH')).toBe(true);
    });
  });

  describe('getAllCategoryColors', () => {
    it('should return all category colors', () => {
      const colors = getAllCategoryColors();
      expect(colors).toHaveProperty('Work');
      expect(colors).toHaveProperty('Health');
      expect(colors).toHaveProperty('default');
    });

    it('should return a copy of the colors object', () => {
      const colors1 = getAllCategoryColors();
      const colors2 = getAllCategoryColors();
      expect(colors1).not.toBe(colors2);
      expect(colors1).toEqual(colors2);
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('should have default color defined', () => {
      expect(CATEGORY_COLORS.default).toBeDefined();
      expect(CATEGORY_COLORS.default).toBe('#6366F1');
    });

    it('should have all primary categories defined', () => {
      expect(CATEGORY_COLORS.Work).toBeDefined();
      expect(CATEGORY_COLORS.Health).toBeDefined();
      expect(CATEGORY_COLORS.Meetings).toBeDefined();
    });

    it('should have valid hex color codes', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      Object.values(CATEGORY_COLORS).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });
});
