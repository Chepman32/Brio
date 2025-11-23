import Realm from 'realm';

export type ThemeType = 'light' | 'dark' | 'solar' | 'mono';
export type LocaleType = 'en' | 'zh' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt-BR' | 'ar' | 'ru' | 'it' | 'nl' | 'tr' | 'th' | 'vi' | 'id' | 'pl' | 'uk' | 'hi' | 'he' | 'sv' | 'no' | 'da' | 'fi' | 'cs' | 'hu' | 'ro' | 'el' | 'ms' | 'fil';

export class Settings extends Realm.Object<Settings> {
  _id!: string;
  theme!: ThemeType;
  soundEnabled!: boolean;
  hapticsEnabled!: boolean;
  locale!: LocaleType;
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
      soundEnabled: { type: 'bool', default: true },
      hapticsEnabled: { type: 'bool', default: true },
      locale: { type: 'string', default: 'en' },
      notificationsEnabled: { type: 'bool', default: true },
      defaultReminderTime: { type: 'int', default: 15 },
      onboardingCompleted: { type: 'bool', default: false },
      timeFormat: { type: 'string', default: 'auto' },
    },
  };
}
