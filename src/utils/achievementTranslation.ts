/**
 * Helper functions to translate achievement names and descriptions
 */

/**
 * Translate achievement name
 * @param achievementName The achievement name (English name from DB)
 * @param t Translation function from useLocalization
 * @returns Translated achievement name
 */
export const translateAchievementName = (
  achievementName: string,
  t: (key: string) => string,
): string => {
  const nameKey = `achievements.names.${achievementName}`;
  const translated = t(nameKey);
  // If translation not found, return original name
  return translated === nameKey ? achievementName : translated;
};

/**
 * Translate achievement description
 * @param achievementName The achievement name (used as key)
 * @param t Translation function from useLocalization
 * @returns Translated achievement description
 */
export const translateAchievementDescription = (
  achievementName: string,
  t: (key: string) => string,
): string => {
  const descKey = `achievements.descriptions.${achievementName}`;
  const translated = t(descKey);
  // If translation not found, return empty string (no fallback description)
  return translated === descKey ? '' : translated;
};
