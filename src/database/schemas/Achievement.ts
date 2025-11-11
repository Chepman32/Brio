import Realm from 'realm';

export class Achievement extends Realm.Object<Achievement> {
  _id!: string;
  type!: 'streak' | 'milestone' | 'special';
  name!: string;
  description!: string;
  unlocked!: boolean;
  unlockedAt?: Date;
  progress!: number;
  target!: number;
  iconName!: string;

  static schema: Realm.ObjectSchema = {
    name: 'Achievement',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      type: 'string',
      name: 'string',
      description: 'string',
      unlocked: { type: 'bool', default: false },
      unlockedAt: 'date?',
      progress: { type: 'int', default: 0 },
      target: 'int',
      iconName: 'string',
    },
  };
}
