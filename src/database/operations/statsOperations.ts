import { getRealm } from '../realm';
import { UserStats } from '../schemas';
import { BSON } from 'realm';

const STATS_ID = 'user_stats';

export const initializeStats = (): void => {
  const realm = getRealm();
  const existingStats = realm.objectForPrimaryKey<UserStats>(
    'UserStats',
    STATS_ID,
  );

  if (existingStats) {
    return; // Already initialized
  }

  realm.write(() => {
    realm.create<UserStats>('UserStats', {
      _id: STATS_ID,
      currentStreak: 0,
      longestStreak: 0,
      totalTasksCompleted: 0,
      lastActiveDate: new Date(),
      dailyCompletionPattern: '{}',
      weeklyCompletionPattern: '{}',
    });
  });
};

export const getStats = (): UserStats => {
  const realm = getRealm();
  const stats = realm.objectForPrimaryKey<UserStats>('UserStats', STATS_ID);

  if (!stats) {
    throw new Error('UserStats not initialized');
  }

  return stats;
};

export const updateStreak = (): void => {
  const realm = getRealm();
  const stats = realm.objectForPrimaryKey<UserStats>('UserStats', STATS_ID);

  if (!stats) {
    throw new Error('UserStats not initialized');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = new Date(stats.lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor(
    (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
  );

  realm.write(() => {
    if (daysDiff === 0) {
      // Same day, no change
      return;
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }
    } else {
      // Streak broken, reset
      stats.currentStreak = 1;
    }
    stats.lastActiveDate = new Date();
  });
};

export const incrementTasksCompleted = (): void => {
  const realm = getRealm();
  const stats = realm.objectForPrimaryKey<UserStats>('UserStats', STATS_ID);

  if (!stats) {
    throw new Error('UserStats not initialized');
  }

  realm.write(() => {
    stats.totalTasksCompleted += 1;
  });
};

export const updateCompletionPattern = (completedAt: Date): void => {
  const realm = getRealm();
  const stats = realm.objectForPrimaryKey<UserStats>('UserStats', STATS_ID);

  if (!stats) {
    throw new Error('UserStats not initialized');
  }

  const hour = completedAt.getHours().toString();
  const day = completedAt.getDay().toString(); // 0-6 (Sunday-Saturday)

  realm.write(() => {
    // Update daily pattern
    const dailyPattern = JSON.parse(stats.dailyCompletionPattern);
    dailyPattern[hour] = (dailyPattern[hour] || 0) + 1;
    stats.dailyCompletionPattern = JSON.stringify(dailyPattern);

    // Update weekly pattern
    const weeklyPattern = JSON.parse(stats.weeklyCompletionPattern);
    weeklyPattern[day] = (weeklyPattern[day] || 0) + 1;
    stats.weeklyCompletionPattern = JSON.stringify(weeklyPattern);
  });
};

export const getDailyCompletionPattern = (): { [hour: string]: number } => {
  const stats = getStats();
  return JSON.parse(stats.dailyCompletionPattern);
};

export const getWeeklyCompletionPattern = (): { [day: string]: number } => {
  const stats = getStats();
  return JSON.parse(stats.weeklyCompletionPattern);
};
