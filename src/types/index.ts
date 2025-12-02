// Task types
export interface TaskType {
  _id: string;
  title: string;
  notes?: string;
  dueDate: Date;
  dueTime?: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  icon?: string;
  recurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  snoozedUntil?: Date;
}

export interface TaskInput {
  title: string;
  notes?: string;
  dueDate: Date;
  dueTime?: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  icon?: string;
  recurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
}

// Achievement types
export interface AchievementType {
  _id: string;
  type: 'streak' | 'milestone' | 'special';
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  target: number;
  iconName: string;
}

// UserStats types
export interface UserStatsType {
  _id: string;
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  lastActiveDate: Date;
  dailyCompletionPattern: { [hour: string]: number };
  weeklyCompletionPattern: { [day: string]: number };
}

// Settings types
export interface SettingsType {
  _id: string;
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  defaultReminderTime: number;
  onboardingCompleted: boolean;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Planner: undefined;
  Achievements: undefined;
  Settings: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  History: undefined;
};

// Component prop types
export interface TaskCardProps {
  task: TaskType;
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onPress: (taskId: string) => void;
  onLongPress: (taskId: string) => void;
}

export interface FABProps {
  onPress: () => void;
}

export interface TaskListViewProps {
  tasks: TaskType[];
  onTaskComplete: (taskId: string) => void;
  onTaskSnooze: (taskId: string) => void;
  onTaskPress: (taskId: string) => void;
  onReorder: (taskIds: string[]) => void;
}

export interface CalendarViewProps {
  mode: 'day' | 'week' | 'month';
  selectedDate: Date;
  tasks: TaskType[];
  onDateSelect: (date: Date) => void;
  onModeChange: (mode: 'day' | 'week' | 'month') => void;
  onCreateTask?: (date: Date) => void;
}

export interface TaskCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: TaskInput) => void;
  editTask?: TaskType;
  defaultDate?: Date;
}

export interface TaskDetailModalProps {
  visible: boolean;
  task: TaskType | null;
  onClose: () => void;
  onEdit: (task: TaskType) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  completeLabel?: string;
}

// Service interfaces
export interface SmartPlanningServiceInterface {
  analyzeCompletionPatterns(): void;
  suggestTaskTime(task: TaskInput): Promise<Date>;
  updateUserStats(completedTask: TaskType): void;
  getOptimalSchedulingTime(): number;
}

export interface AchievementServiceInterface {
  checkAchievements(): AchievementType[];
  updateStreak(): void;
  unlockAchievement(achievementId: string): void;
  getProgress(achievementId: string): number;
}

export interface NotificationServiceInterface {
  scheduleNotification(task: TaskType): Promise<void>;
  cancelNotification(taskId: string): Promise<void>;
  updateNotification(task: TaskType): Promise<void>;
  requestPermissions(): Promise<boolean>;
}

// Re-export RT types
export * from './notification-rt.types';

// Re-export recurring suggestion types
export * from './recurring-suggestion.types';

// Re-export NLP types
export * from './nlp.types';

// Re-export priority types
export * from './priority.types';

// Re-export pattern types
export * from './pattern.types';
