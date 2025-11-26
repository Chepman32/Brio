import { TaskType } from '../types';

export interface DayVibeResult {
  vibe: string;
  gradientColors: string[];
}

// Day base colors
const DAY_COLORS: Record<number, string> = {
  1: '#6B7280', // Monday - graphite grey
  2: '#71717A', // Tuesday - steel grey
  3: '#64748B', // Wednesday - slate grey
  4: '#52525B', // Thursday - charcoal grey
  5: '#A8A29E', // Friday - silver grey
  6: '#D6C9B8', // Saturday - sand beige
  0: '#E5E7EB', // Sunday - pearl grey
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  Work: '#2563EB', // cobalt blue
  Personal: '#4F46E5', // indigo
  Family: '#F43F5E', // rose
  Health: '#10B981', // emerald
  Fitness: '#22C55E', // green
  Nutrition: '#84CC16', // lime
  Study: '#9333EA', // purple
  Reading: '#8B5CF6', // violet
  Finance: '#F59E0B', // gold
  Shopping: '#14B8A6', // teal
  Housework: '#84CC16', // sage
  'Home Maintenance': '#65A30D', // olive
  'Car / Vehicle': '#0EA5E9', // azure
  Documents: '#991B1B', // burgundy
  Meetings: '#1D4ED8', // royal blue
  Calls: '#0284C7', // sky blue
  Email: '#475569', // steel blue
  'Project A': '#2563EB', // cobalt blue
  'Project B': '#06B6D4', // cerulean
  'Long-term Goals': '#F59E0B', // amber
  'Daily Routines': '#14B8A6', // turquoise
  'Travel / Trips': '#06B6D4', // cyan
  Hobbies: '#EC4899', // pink
  Creative: '#D946EF', // magenta
  'Courses / Learning': '#7C3AED', // grape
  'Career & Growth': '#10B981', // emerald
  'Networking / Contacts': '#14B8A6', // turquoise
  'Mindfulness / Mental Health': '#5EEAD4', // seafoam
  'Sleep / Schedule': '#1E3A8A', // midnight
  'Day Planning': '#F59E0B', // saffron
  'Week Planning': '#F59E0B', // amber
  'Month Planning': '#78716C', // sepia
  Legal: '#DC2626', // crimson
  'Banking / Payments': '#F59E0B', // gold
  'Subscriptions / Renewals': '#CA8A04', // mustard
  'Tech / Devices': '#06B6D4', // electric cyan
  'Cleaning / Organization': '#6EE7B7', // mint
  Pets: '#F97316', // pumpkin
  'Gifts / Events': '#FB7185', // coral
  'Online Orders / Deliveries': '#22D3EE', // aqua
  'Notes / Ideas': '#FDE047', // lemon
  'Side Projects': '#22D3EE', // aqua
  'Content / Social Media': '#E879F9', // fuchsia
  'Languages / Practice': '#C084FC', // lavender
  'Music / Instruments': '#A855F7', // plum
  'Sports / Games to Watch': '#EF4444', // scarlet
  'Medical / Doctors / Tests': '#DC2626', // red
  'Car Service / Insurance / Taxes': '#1E40AF', // navy
  'Entertainment / Movies / Series': '#A855F7', // neon purple
  'Important but Not Urgent': '#64748B', // slate blue
};

// Day-specific vibes by category
const DAY_VIBES: Record<number, Record<string, string>> = {
  1: {
    // Monday
    Work: 'kickoff grind',
    Personal: 'reset self-care',
    Family: 'weekday check-ins',
    Health: 'health reset',
    Fitness: 'fresh start training',
    Nutrition: 'plan & prep',
    Study: 'study kickoff',
    Reading: 'new chapter',
    Finance: 'budget kickoff',
    Shopping: 'list & plan',
    Housework: 'reset home',
    'Home Maintenance': 'maintenance brief',
    'Car / Vehicle': 'commute tune',
    Documents: 'doc kickoff',
    Meetings: 'meeting sprint',
    Calls: 'kickoff calls',
    Email: 'inbox reset',
    'Project A': 'sprint start',
    'Project B': 'sprint start',
    'Long-term Goals': 'goal reset',
    'Daily Routines': 'routine reset',
    'Travel / Trips': 'plan & book',
    Hobbies: 'hobby kick',
    Creative: 'concept spark',
    'Courses / Learning': 'lesson reset',
    'Career & Growth': 'growth reset',
    'Networking / Contacts': 'outreach start',
    'Mindfulness / Mental Health': 'calm reset',
    'Sleep / Schedule': 'sleep reset',
    'Day Planning': 'plan today',
    'Week Planning': 'week kickoff',
    'Month Planning': 'month setup',
    Legal: 'legal prep',
    'Banking / Payments': 'payment plan',
    'Subscriptions / Renewals': 'renew plan',
    'Tech / Devices': 'tech reset',
    'Cleaning / Organization': 'organize reset',
    Pets: 'pet routine',
    'Gifts / Events': 'plan gifts',
    'Online Orders / Deliveries': 'track & plan',
    'Notes / Ideas': 'idea dump',
    'Side Projects': 'side start',
    'Content / Social Media': 'content plan',
    'Languages / Practice': 'vocab reset',
    'Music / Instruments': 'practice reset',
    'Sports / Games to Watch': 'schedule matches',
    'Medical / Doctors / Tests': 'medical prep',
    'Car Service / Insurance / Taxes': 'service plan',
    'Entertainment / Movies / Series': 'queue setup',
    'Important but Not Urgent': 'strategic start',
  },
  2: {
    // Tuesday
    Work: 'busy hustling',
    Personal: 'steady life admin',
    Family: 'touch-base & plan',
    Health: 'routine care',
    Fitness: 'steady sweat',
    Nutrition: 'steady meals',
    Study: 'steady study',
    Reading: 'steady pages',
    Finance: 'steady accounts',
    Shopping: 'steady errands',
    Housework: 'weekday chores',
    'Home Maintenance': 'scheduled checks',
    'Car / Vehicle': 'steady car admin',
    Documents: 'steady paperwork',
    Meetings: 'meeting hustle',
    Calls: 'follow-up calls',
    Email: 'steady replies',
    'Project A': 'steady sprint',
    'Project B': 'steady sprint',
    'Long-term Goals': 'steady progress',
    'Daily Routines': 'steady routine',
    'Travel / Trips': 'itinerary polish',
    Hobbies: 'steady craft',
    Creative: 'steady create',
    'Courses / Learning': 'steady lesson',
    'Career & Growth': 'steady steps',
    'Networking / Contacts': 'steady outreach',
    'Mindfulness / Mental Health': 'steady calm',
    'Sleep / Schedule': 'steady sleep',
    'Day Planning': 'tune today',
    'Week Planning': 'early week tune',
    'Month Planning': 'early month tune',
    Legal: 'steady legal',
    'Banking / Payments': 'steady payments',
    'Subscriptions / Renewals': 'steady renewals',
    'Tech / Devices': 'steady updates',
    'Cleaning / Organization': 'midweek organize',
    Pets: 'walks & care',
    'Gifts / Events': 'shortlist',
    'Online Orders / Deliveries': 'track steady',
    'Notes / Ideas': 'steady notes',
    'Side Projects': 'steady build',
    'Content / Social Media': 'steady content',
    'Languages / Practice': 'steady practice',
    'Music / Instruments': 'steady practice',
    'Sports / Games to Watch': 'midweek fixtures',
    'Medical / Doctors / Tests': 'steady medical',
    'Car Service / Insurance / Taxes': 'docs & quotes',
    'Entertainment / Movies / Series': 'midweek watch',
    'Important but Not Urgent': 'steady stride',
  },
  3: {
    // Wednesday
    Work: 'midweek push',
    Personal: 'midweek balance',
    Family: 'midweek family pulse',
    Health: 'midweek wellness',
    Fitness: 'midweek session',
    Nutrition: 'midweek plan',
    Study: 'midweek focus',
    Reading: 'midweek read',
    Finance: 'midweek ledger',
    Shopping: 'midweek stock',
    Housework: 'midweek tidy',
    'Home Maintenance': 'midweek fix',
    'Car / Vehicle': 'midweek car check',
    Documents: 'midweek forms',
    Meetings: 'midweek sync',
    Calls: 'midweek calls',
    Email: 'midweek clear',
    'Project A': 'mid-sprint push',
    'Project B': 'mid-sprint push',
    'Long-term Goals': 'midweek review',
    'Daily Routines': 'midweek routine',
    'Travel / Trips': 'midweek prep',
    Hobbies: 'midweek craft',
    Creative: 'midweek make',
    'Courses / Learning': 'midweek lesson',
    'Career & Growth': 'midweek growth',
    'Networking / Contacts': 'midweek touch',
    'Mindfulness / Mental Health': 'midweek pause',
    'Sleep / Schedule': 'midweek tune',
    'Day Planning': 'midweek plan',
    'Week Planning': 'midweek adjust',
    'Month Planning': 'mid-month check',
    Legal: 'midweek legal',
    'Banking / Payments': 'midweek payments',
    'Subscriptions / Renewals': 'midweek renewals',
    'Tech / Devices': 'midweek updates',
    'Cleaning / Organization': 'workspace tidy',
    Pets: 'midweek care',
    'Gifts / Events': 'midweek compare',
    'Online Orders / Deliveries': 'midweek track',
    'Notes / Ideas': 'midweek notes',
    'Side Projects': 'midweek push',
    'Content / Social Media': 'midweek content',
    'Languages / Practice': 'midweek practice',
    'Music / Instruments': 'midweek session',
    'Sports / Games to Watch': 'midweek watch',
    'Medical / Doctors / Tests': 'midweek appointment',
    'Car Service / Insurance / Taxes': 'midweek service',
    'Entertainment / Movies / Series': 'midweek episode',
    'Important but Not Urgent': 'midweek stride',
  },
  4: {
    // Thursday
    Work: 'ramp-up sprint',
    Personal: 'tidy-up tasks',
    Family: 'dinner-plan rhythm',
    Health: 'steady care',
    Fitness: 'ramped workout',
    Nutrition: 'grocery tune',
    Study: 'revision ramp',
    Reading: 'evening pages',
    Finance: 'ramp-up billing',
    Shopping: 'Thursday run',
    Housework: 'pre-weekend tidy',
    'Home Maintenance': 'prep & parts',
    'Car / Vehicle': 'fuel & service',
    Documents: 'doc review',
    Meetings: 'pre-wrap sync',
    Calls: 'catch-up calls',
    Email: 'follow-ups',
    'Project A': 'ramp checkpoints',
    'Project B': 'ramp checkpoints',
    'Long-term Goals': 'ramp goals',
    'Daily Routines': 'tune routine',
    'Travel / Trips': 'packing ramp',
    Hobbies: 'warm-up hobby',
    Creative: 'polish session',
    'Courses / Learning': 'recap lesson',
    'Career & Growth': 'ramp growth',
    'Networking / Contacts': 'warm leads',
    'Mindfulness / Mental Health': 'breathing room',
    'Sleep / Schedule': 'circadian tune',
    'Day Planning': 'sharpen today',
    'Week Planning': 'pre-wrap adjust',
    'Month Planning': 'month tune',
    Legal: 'legal review',
    'Banking / Payments': 'payment ramp',
    'Subscriptions / Renewals': 'renew check',
    'Tech / Devices': 'device tune',
    'Cleaning / Organization': 'pre-weekend tidy',
    Pets: 'groom & prep',
    'Gifts / Events': 'order & confirm',
    'Online Orders / Deliveries': 'confirm & receive',
    'Notes / Ideas': 'polish notes',
    'Side Projects': 'polish sprint',
    'Content / Social Media': 'schedule content',
    'Languages / Practice': 'speak & drill',
    'Music / Instruments': 'polish session',
    'Sports / Games to Watch': 'pre-weekend fixtures',
    'Medical / Doctors / Tests': 'prep & tests',
    'Car Service / Insurance / Taxes': 'confirm & book',
    'Entertainment / Movies / Series': 'pre-weekend picks',
    'Important but Not Urgent': 'polish stride',
  },
  5: {
    // Friday
    Work: 'wrap-up flow',
    Personal: 'soft wrap',
    Family: 'family wind-down',
    Health: 'health wrap',
    Fitness: 'pre-weekend move',
    Nutrition: 'clean plate wrap',
    Study: 'review wrap',
    Reading: 'wind-down reading',
    Finance: 'payout wrap',
    Shopping: 'pre-weekend pickup',
    Housework: 'quick sweep',
    'Home Maintenance': 'small fixes',
    'Car / Vehicle': 'quick car wrap',
    Documents: 'file & wrap',
    Meetings: 'final sync',
    Calls: 'sign-off calls',
    Email: 'sign-offs',
    'Project A': 'sprint wrap',
    'Project B': 'sprint wrap',
    'Long-term Goals': 'weekly review',
    'Daily Routines': 'routine wrap',
    'Travel / Trips': 'pre-depart wrap',
    Hobbies: 'casual hobby',
    Creative: 'final touches',
    'Courses / Learning': 'weekly review',
    'Career & Growth': 'review growth',
    'Networking / Contacts': 'week-end follow-ups',
    'Mindfulness / Mental Health': 'gentle wrap',
    'Sleep / Schedule': 'week wrap sleep',
    'Day Planning': 'tidy today',
    'Week Planning': 'week review',
    'Month Planning': 'month review',
    Legal: 'legal wrap',
    'Banking / Payments': 'payday wrap',
    'Subscriptions / Renewals': 'renew wrap',
    'Tech / Devices': 'sign-off updates',
    'Cleaning / Organization': 'quick declutter',
    Pets: 'weekend vet prep',
    'Gifts / Events': 'pack & deliver',
    'Online Orders / Deliveries': 'pickup wrap',
    'Notes / Ideas': 'weekly notes',
    'Side Projects': 'weekly ship',
    'Content / Social Media': 'publish & wrap',
    'Languages / Practice': 'weekly review',
    'Music / Instruments': 'weekly session',
    'Sports / Games to Watch': 'match night',
    'Medical / Doctors / Tests': 'appointment wrap',
    'Car Service / Insurance / Taxes': 'pickup & wrap',
    'Entertainment / Movies / Series': 'Friday night picks',
    'Important but Not Urgent': 'weekly checkpoint',
  },
  6: {
    // Saturday
    Work: 'weekend spillover',
    Personal: 'easy weekend',
    Family: 'family time',
    Health: 'weekend wellness',
    Fitness: 'weekend long run',
    Nutrition: 'weekend cooking',
    Study: 'weekend deep read',
    Reading: 'weekend reading',
    Finance: 'light review',
    Shopping: 'weekend haul',
    Housework: 'weekend reset',
    'Home Maintenance': 'weekend repair',
    'Car / Vehicle': 'weekend car care',
    Documents: 'light docs',
    Meetings: 'rare meet',
    Calls: 'weekend call-backs',
    Email: 'light inbox',
    'Project A': 'weekend spill',
    'Project B': 'weekend spill',
    'Long-term Goals': 'weekend reflect',
    'Daily Routines': 'weekend routine',
    'Travel / Trips': 'travel roam',
    Hobbies: 'weekend hobby',
    Creative: 'weekend create',
    'Courses / Learning': 'weekend lesson',
    'Career & Growth': 'weekend reflection',
    'Networking / Contacts': 'casual catchups',
    'Mindfulness / Mental Health': 'weekend calm',
    'Sleep / Schedule': 'weekend ease',
    'Day Planning': 'weekend today',
    'Week Planning': 'light plan',
    'Month Planning': 'weekend month plan',
    Legal: 'light legal',
    'Banking / Payments': 'weekend finance',
    'Subscriptions / Renewals': 'weekend renewals',
    'Tech / Devices': 'weekend maintenance',
    'Cleaning / Organization': 'weekend reset',
    Pets: 'weekend play',
    'Gifts / Events': 'weekend events',
    'Online Orders / Deliveries': 'weekend pickup',
    'Notes / Ideas': 'weekend ideas',
    'Side Projects': 'weekend build',
    'Content / Social Media': 'weekend content',
    'Languages / Practice': 'weekend practice',
    'Music / Instruments': 'weekend jam',
    'Sports / Games to Watch': 'weekend games',
    'Medical / Doctors / Tests': 'light care',
    'Car Service / Insurance / Taxes': 'weekend service',
    'Entertainment / Movies / Series': 'weekend watch',
    'Important but Not Urgent': 'weekend stride',
  },
  0: {
    // Sunday
    Work: 'quiet prep',
    Personal: 'gentle reset',
    Family: 'home circle',
    Health: 'slow care',
    Fitness: 'recovery & stretch',
    Nutrition: 'calm meals',
    Study: 'plan & preview',
    Reading: 'slow reading',
    Finance: 'plan budgets',
    Shopping: 'calm restock',
    Housework: 'soft maintain',
    'Home Maintenance': 'inspect & plan',
    'Car / Vehicle': 'prep for week',
    Documents: 'plan documents',
    Meetings: 'plan meets',
    Calls: 'plan calls',
    Email: 'plan inbox',
    'Project A': 'roadmap prep',
    'Project B': 'roadmap prep',
    'Long-term Goals': 'strategy prep',
    'Daily Routines': 'soft routine',
    'Travel / Trips': 'return & reset',
    Hobbies: 'slow craft',
    Creative: 'sketch & plan',
    'Courses / Learning': 'plan curriculum',
    'Career & Growth': 'plan growth',
    'Networking / Contacts': 'plan outreach',
    'Mindfulness / Mental Health': 'deep reset',
    'Sleep / Schedule': 'prep sleep',
    'Day Planning': 'Sunday plan',
    'Week Planning': 'full reset plan',
    'Month Planning': 'next-month prep',
    Legal: 'plan legal',
    'Banking / Payments': 'budget prep',
    'Subscriptions / Renewals': 'next cycle plan',
    'Tech / Devices': 'plan tech',
    'Cleaning / Organization': 'gentle tidy',
    Pets: 'calm care',
    'Gifts / Events': 'send & thank',
    'Online Orders / Deliveries': 'returns & plan',
    'Notes / Ideas': 'organize ideas',
    'Side Projects': 'plan side',
    'Content / Social Media': 'plan content',
    'Languages / Practice': 'plan practice',
    'Music / Instruments': 'slow practice',
    'Sports / Games to Watch': 'review & prep',
    'Medical / Doctors / Tests': 'plan care',
    'Car Service / Insurance / Taxes': 'next-cycle plan',
    'Entertainment / Movies / Series': 'slow watch',
    'Important but Not Urgent': 'reflect & plan',
  },
};

/**
 * Analyzes tasks for a given day and determines the day's character/vibe
 * Uses day-specific and category-specific presets for unique vibes
 */
export const analyzeDayVibe = (
  tasks: TaskType[],
  date: Date = new Date(),
  t?: (key: string) => string,
): DayVibeResult => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayBaseColor = DAY_COLORS[dayOfWeek];

  // No tasks - free day
  if (tasks.length === 0) {
    return {
      vibe: t ? t('dayVibes.freeDay') : 'Free day',
      gradientColors: [dayBaseColor, '#FFFFFF'],
    };
  }

  // Count tasks by category
  const categoryCounts: Record<string, number> = {};
  tasks.forEach(task => {
    const category = task.category || 'Personal';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  // Find dominant category
  let dominantCategory = 'Personal';
  let maxCount = 0;
  Object.entries(categoryCounts).forEach(([category, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantCategory = category;
    }
  });

  // Get day-specific vibe for the dominant category
  const dayVibes = DAY_VIBES[dayOfWeek];
  const vibe = dayVibes[dominantCategory] || (t ? t('dayVibes.ordinaryDay') : 'Ordinary day');

  // Get category color
  const categoryColor = CATEGORY_COLORS[dominantCategory] || '#6366F1';

  return {
    vibe,
    gradientColors: [categoryColor, dayBaseColor],
  };
};
