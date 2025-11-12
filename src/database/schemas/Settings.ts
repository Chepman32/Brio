import Realm from 'realm';

export class Settings extends Realm.Object<Settings> {
  _id!: string;
  theme!: 'light' | 'dark';
  notificationsEnabled!: boolean;
  defaultReminderTime!: number; // minutes before due time
  onboardingCompleted!: boolean;
  timeFormat!: 'auto' | '12h' | '24h'; // auto = use device setting

  static schema: Realm.ObjectSchema = {
    name: 'Settings',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      theme: { type: 'string', default: 'light' },
      notificationsEnabled: { type: 'bool', default: true },
      defaultReminderTime: { type: 'int', default: 15 },
      onboardingCompleted: { type: 'bool', default: false },
      timeFormat: { type: 'string', default: 'auto' },
    },
  };
}
