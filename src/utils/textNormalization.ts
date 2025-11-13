/**
 * Text normalization utilities for pattern matching
 */

// Common English stopwords to remove
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'to',
  'for',
  'of',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'up',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
]);

/**
 * Normalize task title for pattern matching
 * - Lowercase
 * - Trim whitespace
 * - Remove stopwords
 * - Collapse multiple spaces
 * - Remove special characters except spaces
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .split(/\s+/)
    .filter(word => word.length > 0 && !STOPWORDS.has(word))
    .join(' ')
    .trim();
}

/**
 * Generate trigrams from a string for fuzzy matching
 */
export function generateTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>();
  const normalized = text.toLowerCase().replace(/\s+/g, '');

  if (normalized.length < 3) {
    trigrams.add(normalized);
    return trigrams;
  }

  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.substring(i, i + 3));
  }

  return trigrams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
export function jaccardSimilarity(
  set1: Set<string>,
  set2: Set<string>,
): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calculate similarity between two titles using trigram Jaccard
 */
export function calculateTitleSimilarity(
  title1: string,
  title2: string,
): number {
  const trigrams1 = generateTrigrams(normalizeTitle(title1));
  const trigrams2 = generateTrigrams(normalizeTitle(title2));
  return jaccardSimilarity(trigrams1, trigrams2);
}

/**
 * Generate a stable hash for a normalized title
 */
export function hashTitle(normalizedTitle: string): string {
  let hash = 0;
  for (let i = 0; i < normalizedTitle.length; i++) {
    const char = normalizedTitle.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract day-of-week from title if mentioned
 * Returns -1 if no day found
 */
export function extractDayFromTitle(title: string): number {
  const lower = title.toLowerCase();
  const days = [
    { names: ['sunday', 'sun'], dow: 0 },
    { names: ['monday', 'mon'], dow: 1 },
    { names: ['tuesday', 'tue', 'tues'], dow: 2 },
    { names: ['wednesday', 'wed'], dow: 3 },
    { names: ['thursday', 'thu', 'thur', 'thurs'], dow: 4 },
    { names: ['friday', 'fri'], dow: 5 },
    { names: ['saturday', 'sat'], dow: 6 },
  ];

  for (const day of days) {
    for (const name of day.names) {
      if (lower.includes(name)) {
        return day.dow;
      }
    }
  }

  return -1;
}

/**
 * Get day name from day-of-week number
 */
export function getDayName(dow: number): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[dow] || 'Unknown';
}

/**
 * Get short day name from day-of-week number
 */
export function getShortDayName(dow: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dow] || 'Unknown';
}
