import { getRealm } from '../realm';
import { Achievement } from '../schemas';
import { BSON } from 'realm';

export const initializeAchievements = (): void => {
  const realm = getRealm();
  const existingAchievements = realm.objects<Achievement>('Achievement');

  const achievements = [
    // Streak achievements
    {
      type: 'streak',
      name: 'Daily Spark',
      description: 'Complete tasks for 1 day in a row',
      target: 1,
      iconName: 'fire',
    },
    {
      type: 'streak',
      name: '3-Day Streak',
      description: 'Complete tasks for 3 days in a row',
      target: 3,
      iconName: '3-day-streak',
    },
    {
      type: 'streak',
      name: '5-Day Flow',
      description: 'Complete tasks for 5 days in a row',
      target: 5,
      iconName: 'fire',
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
      name: '10-Day Groove',
      description: 'Complete tasks for 10 days in a row',
      target: 10,
      iconName: 'fire',
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
      name: '21-Day Habit',
      description: 'Complete tasks for 21 days in a row',
      target: 21,
      iconName: 'medal',
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
      name: '45-Day Burn',
      description: 'Complete tasks for 45 days in a row',
      target: 45,
      iconName: 'fire',
    },
    {
      type: 'streak',
      name: '60-Day Rhythm',
      description: 'Complete tasks for 60 days in a row',
      target: 60,
      iconName: 'medal',
    },
    {
      type: 'streak',
      name: '75-Day Surge',
      description: 'Complete tasks for 75 days in a row',
      target: 75,
      iconName: 'trophy',
    },
    {
      type: 'streak',
      name: '100-Day Streak',
      description: 'Complete tasks for 100 days in a row',
      target: 100,
      iconName: '100-day-streak',
    },
    {
      type: 'streak',
      name: '150-Day Marathon',
      description: 'Complete tasks for 150 days in a row',
      target: 150,
      iconName: 'trophy',
    },
    {
      type: 'streak',
      name: '250-Day Evergreen',
      description: 'Complete tasks for 250 days in a row',
      target: 250,
      iconName: 'award',
    },
    {
      type: 'streak',
      name: '365-Day Legend',
      description: 'Complete tasks for 365 days in a row',
      target: 365,
      iconName: 'trophy',
    },

    // Milestone achievements
    {
      type: 'milestone',
      name: 'First Five',
      description: 'Complete 5 tasks',
      target: 5,
      iconName: 'check-circle',
    },
    {
      type: 'milestone',
      name: 'First Steps',
      description: 'Complete your first 10 tasks',
      target: 10,
      iconName: 'complete-10-tasks',
    },
    {
      type: 'milestone',
      name: 'Fifteen Focus',
      description: 'Complete 15 tasks',
      target: 15,
      iconName: 'star',
    },
    {
      type: 'milestone',
      name: 'Quarter Century',
      description: 'Complete 25 tasks',
      target: 25,
      iconName: 'check-circle',
    },
    {
      type: 'milestone',
      name: 'Habit Builder',
      description: 'Complete 40 tasks',
      target: 40,
      iconName: 'star',
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
      name: 'Flow Starter',
      description: 'Complete 60 tasks',
      target: 60,
      iconName: 'star',
    },
    {
      type: 'milestone',
      name: 'Seventy-Five Sprint',
      description: 'Complete 75 tasks',
      target: 75,
      iconName: 'medal',
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
      name: 'Precision Planner',
      description: 'Complete 125 tasks',
      target: 125,
      iconName: 'medal',
    },
    {
      type: 'milestone',
      name: 'Century and a Half',
      description: 'Complete 150 tasks',
      target: 150,
      iconName: 'award',
    },
    {
      type: 'milestone',
      name: 'Two Hundred Triumph',
      description: 'Complete 200 tasks',
      target: 200,
      iconName: 'trophy',
    },
    {
      type: 'milestone',
      name: 'Quartermaster',
      description: 'Complete 250 tasks',
      target: 250,
      iconName: 'award',
    },
    {
      type: 'milestone',
      name: 'Pace Setter',
      description: 'Complete 300 tasks',
      target: 300,
      iconName: 'medal',
    },
    {
      type: 'milestone',
      name: 'Consistency Captain',
      description: 'Complete 400 tasks',
      target: 400,
      iconName: 'star',
    },
    {
      type: 'milestone',
      name: 'Task Master',
      description: 'Complete 500 tasks',
      target: 500,
      iconName: 'trophy',
    },
    {
      type: 'milestone',
      name: 'Six Hundred Grind',
      description: 'Complete 600 tasks',
      target: 600,
      iconName: 'fire',
    },
    {
      type: 'milestone',
      name: 'Iron Will',
      description: 'Complete 750 tasks',
      target: 750,
      iconName: 'medal',
    },
    {
      type: 'milestone',
      name: 'Task Titan',
      description: 'Complete 1000 tasks',
      target: 1000,
      iconName: 'trophy',
    },
    {
      type: 'milestone',
      name: 'Relentless Runner',
      description: 'Complete 1250 tasks',
      target: 1250,
      iconName: 'fire',
    },
    {
      type: 'milestone',
      name: 'Marathon Mind',
      description: 'Complete 1500 tasks',
      target: 1500,
      iconName: 'trophy',
    },
    {
      type: 'milestone',
      name: 'Ultra Finisher',
      description: 'Complete 1750 tasks',
      target: 1750,
      iconName: 'trophy',
    },
    {
      type: 'milestone',
      name: 'Legendary Planner',
      description: 'Complete 2000 tasks',
      target: 2000,
      iconName: 'medal',
    },
    {
      type: 'milestone',
      name: 'Infinity Loop',
      description: 'Complete 2500 tasks',
      target: 2500,
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
    const existingNames = new Set<string>();
    existingAchievements.forEach(a => existingNames.add(a.name));

    achievements.forEach(achievement => {
      if (existingNames.has(achievement.name)) {
        return;
      }

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
