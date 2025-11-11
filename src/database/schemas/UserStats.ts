import Realm from 'realm';

export class UserStats extends Realm.Object<UserStats> {
  _id!: string;
  currentStreak!: number;
  longestStreak!: number;
  totalTasksCompleted!: number;
  lastActiveDate!: Date;
  dailyCompletionPattern!: string; // JSON string of { [hour: string]: number }
  weeklyCompletionPattern!: string; // JSON string of { [day: string]: number }

  static schema: Realm.ObjectSchema = {
    name: 'UserStats',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      currentStreak: { type: 'int', default: 0 },
      longestStreak: { type: 'int', default: 0 },
      totalTasksCompleted: { type: 'int', default: 0 },
      lastActiveDate: 'date',
      dailyCompletionPattern: { type: 'string', default: '{}' },
      weeklyCompletionPattern: { type: 'string', default: '{}' },
    },
  };
}
