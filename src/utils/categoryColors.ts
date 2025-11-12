/**
 * Category color mapping utility
 * Maps task categories to their corresponding color codes
 */

export const CATEGORY_COLORS: Record<string, string> = {
  // Primary categories
  Work: '#6B9EFF',
  Health: '#7BC67E',
  Fitness: '#7BC67E',
  Nutrition: '#7BC67E',
  Meetings: '#FF9F6B',
  Calls: '#FF9F6B',

  // Secondary categories
  Personal: '#A78BFA',
  Family: '#F472B6',
  Study: '#FBBF24',
  Reading: '#FBBF24',
  Finance: '#34D399',
  Shopping: '#60A5FA',
  Housework: '#EC4899',
  'Home Maintenance': '#EC4899',
  'Car / Vehicle': '#8B5CF6',
  Documents: '#F59E0B',
  Email: '#FF9F6B',
  'Project A': '#3B82F6',
  'Project B': '#10B981',
  'Long-term Goals': '#6366F1',
  'Daily Routines': '#14B8A6',
  'Travel / Trips': '#F97316',
  Hobbies: '#EC4899',
  Creative: '#A855F7',
  'Courses / Learning': '#FBBF24',
  'Career & Growth': '#6B9EFF',
  'Networking / Contacts': '#FF9F6B',
  'Mindfulness / Mental Health': '#7BC67E',
  'Sleep / Schedule': '#A78BFA',
  'Day Planning': '#6366F1',
  'Week Planning': '#6366F1',
  'Month Planning': '#6366F1',
  Legal: '#DC2626',
  'Banking / Payments': '#34D399',
  'Subscriptions / Renewals': '#F59E0B',
  'Tech / Devices': '#3B82F6',
  'Cleaning / Organization': '#EC4899',
  Pets: '#F472B6',
  'Gifts / Events': '#F472B6',
  'Online Orders / Deliveries': '#60A5FA',
  'Notes / Ideas': '#FBBF24',
  'Side Projects': '#8B5CF6',
  'Content / Social Media': '#EC4899',
  'Languages / Practice': '#FBBF24',
  'Music / Instruments': '#A855F7',
  'Sports / Games to Watch': '#7BC67E',
  'Medical / Doctors / Tests': '#7BC67E',
  'Car Service / Insurance / Taxes': '#8B5CF6',
  'Entertainment / Movies / Series': '#F472B6',
  'Important but Not Urgent': '#6366F1',

  // Default fallback
  default: '#6366F1',
};

/**
 * Get the color for a given category
 * @param category - The task category name
 * @returns The hex color code for the category
 */
export const getCategoryColor = (category?: string): string => {
  if (!category) {
    return CATEGORY_COLORS.default;
  }

  // Try exact match first
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }

  // Try case-insensitive match
  const categoryLower = category.toLowerCase();
  const matchedKey = Object.keys(CATEGORY_COLORS).find(
    key => key.toLowerCase() === categoryLower,
  );

  if (matchedKey) {
    return CATEGORY_COLORS[matchedKey];
  }

  // Return default color if no match found
  return CATEGORY_COLORS.default;
};

/**
 * Get all available category colors
 * @returns Object mapping categories to colors
 */
export const getAllCategoryColors = (): Record<string, string> => {
  return { ...CATEGORY_COLORS };
};

/**
 * Check if a category has a defined color
 * @param category - The task category name
 * @returns True if the category has a defined color
 */
export const hasCategoryColor = (category?: string): boolean => {
  if (!category) return false;

  const categoryLower = category.toLowerCase();
  return Object.keys(CATEGORY_COLORS).some(
    key => key.toLowerCase() === categoryLower,
  );
};
