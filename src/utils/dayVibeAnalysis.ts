import { TaskType } from '../types';

export interface DayVibeResult {
  vibe: string;
  gradientColors: string[];
}

/**
 * Analyzes tasks for a given day and determines the day's character/vibe
 * Returns a descriptive vibe text and matching gradient colors
 */
export const analyzeDayVibe = (tasks: TaskType[]): DayVibeResult => {
  // No tasks - free day
  if (tasks.length === 0) {
    return {
      vibe: 'Свободный день',
      gradientColors: ['#A78BFA', '#FFFFFF'], // Purple to white
    };
  }

  // Define category groups
  const workCategories = [
    'Work',
    'Meetings',
    'Calls',
    'Email',
    'Project A',
    'Project B',
    'Career & Growth',
    'Networking / Contacts',
  ];

  const healthCategories = [
    'Health',
    'Fitness',
    'Nutrition',
    'Mindfulness / Mental Health',
    'Sleep / Schedule',
    'Medical / Doctors / Tests',
  ];

  const relaxCategories = [
    'Personal',
    'Shopping',
    'Entertainment / Movies / Series',
    'Hobbies',
    'Creative',
    'Travel / Trips',
    'Reading',
  ];

  // Count tasks by category type
  const workCount = tasks.filter(t =>
    workCategories.includes(t.category || ''),
  ).length;

  const healthCount = tasks.filter(t =>
    healthCategories.includes(t.category || ''),
  ).length;

  const relaxCount = tasks.filter(t =>
    relaxCategories.includes(t.category || ''),
  ).length;

  // Determine vibe based on dominant category and task count
  if (workCount > tasks.length * 0.6) {
    return {
      vibe: 'Рабочая суета',
      gradientColors: ['#6B9EFF', '#FFFFFF'], // Blue to white
    };
  }

  if (healthCount > tasks.length * 0.5) {
    return {
      vibe: 'День здоровья',
      gradientColors: ['#7BC67E', '#FFFFFF'], // Green to white
    };
  }

  if (relaxCount > tasks.length * 0.5) {
    return {
      vibe: 'Спокойный день',
      gradientColors: ['#60A5FA', '#FFFFFF'], // Light blue to white
    };
  }

  if (tasks.length > 5) {
    return {
      vibe: 'Насыщенный день',
      gradientColors: ['#FF9F6B', '#FFFFFF'], // Orange to white
    };
  }

  // Default for mixed or few tasks
  return {
    vibe: 'Обычный день',
    gradientColors: ['#A78BFA', '#FFFFFF'], // Purple to white
  };
};
