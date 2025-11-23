import { getRealm } from '../realm';
import { Achievement } from '../schemas';
import { BSON } from 'realm';

export const initializeAchievements = (): void => {
  const realm = getRealm();
  const existingAchievements = realm.objects<Achievement>('Achievement');

  if (existingAchievements.length > 0) {
    return; // Already initialized
  }

  const achievements = [
    // Streak achievements
    {
      type: 'streak',
      name: '3-Day Streak',
      description: 'Complete tasks for 3 days in a row',
      target: 3,
      iconName: '3-day-streak',
    },
    {
      type: 'streak',
      name: '7-Day Streak',
      description: 'Complete tasks for 7 days in a row',
      target: 7,
      iconName: '7-day-streak',
    },
    {
      type: 'streak',
      name: '14-Day Streak',
      description: 'Complete tasks for 14 days in a row',
      target: 14,
      iconName: '14-day-streak',
    },
    {
      type: 'streak',
      name: '30-Day Streak',
      description: 'Complete tasks for 30 days in a row',
      target: 30,
      iconName: '30-day-streak',
    },
    {
      type: 'streak',
      name: '100-Day Streak',
      description: 'Complete tasks for 100 days in a row',
      target: 100,
      iconName: '100-day-streak',
    },

    // Milestone achievements
    {
      type: 'milestone',
      name: 'First Steps',
      description: 'Complete your first 10 tasks',
      target: 10,
      iconName: 'complete-10-tasks',
    },
    {
      type: 'milestone',
      name: 'Getting Started',
      description: 'Complete 50 tasks',
      target: 50,
      iconName: 'complete-50-tasks',
    },
    {
      type: 'milestone',
      name: 'Productive',
      description: 'Complete 100 tasks',
      target: 100,
      iconName: 'complete-100-tasks',
    },
    {
      type: 'milestone',
      name: 'Task Master',
      description: 'Complete 500 tasks',
      target: 500,
      iconName: 'trophy',
    },

    // Special achievements
    {
      type: 'special',
      name: 'First Task',
      description: 'Create your first task',
      target: 1,
      iconName: 'star',
    },
    {
      type: 'special',
      name: 'Perfect Week',
      description: 'Complete all tasks for a week',
      target: 1,
      iconName: 'award',
    },
  ];

  realm.write(() => {
    achievements.forEach(achievement => {
      realm.create<Achievement>('Achievement', {
        _id: new BSON.ObjectId().toHexString(),
        ...achievement,
        unlocked: false,
        progress: 0,
      });
    });
  });
};

export const getAchievements = (): Realm.Results<Achievement> => {
  const realm = getRealm();
  return realm.objects<Achievement>('Achievement');
};

export const getAchievementById = (id: string): Achievement | null => {
  const realm = getRealm();
  return realm.objectForPrimaryKey<Achievement>('Achievement', id);
};

export const updateAchievementProgress = (
  id: string,
  progress: number,
): void => {
  const realm = getRealm();
  const achievement = realm.objectForPrimaryKey<Achievement>('Achievement', id);

  if (!achievement) {
    throw new Error(`Achievement with id ${id} not found`);
  }

  realm.write(() => {
    achievement.progress = progress;

    if (progress >= achievement.target && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date();
    }
  });
};

export const unlockAchievement = (id: string): void => {
  const realm = getRealm();
  const achievement = realm.objectForPrimaryKey<Achievement>('Achievement', id);

  if (!achievement) {
    throw new Error(`Achievement with id ${id} not found`);
  }

  realm.write(() => {
    achievement.unlocked = true;
    achievement.unlockedAt = new Date();
    achievement.progress = achievement.target;
  });
};
