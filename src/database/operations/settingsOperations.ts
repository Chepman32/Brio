import { getRealm } from '../realm';
import { Settings } from '../schemas';

const SETTINGS_ID = 'app_settings';

export const initializeSettings = (): void => {
  const realm = getRealm();
  const existingSettings = realm.objectForPrimaryKey<Settings>(
    'Settings',
    SETTINGS_ID,
  );

  if (existingSettings) {
    return; // Already initialized
  }

  realm.write(() => {
    realm.create<Settings>('Settings', {
      _id: SETTINGS_ID,
      theme: 'light',
      notificationsEnabled: true,
      defaultReminderTime: 15,
      onboardingCompleted: false,
      timeFormat: 'auto',
    });
  });
};

export const getSettings = (): Settings => {
  const realm = getRealm();
  const settings = realm.objectForPrimaryKey<Settings>('Settings', SETTINGS_ID);

  if (!settings) {
    throw new Error('Settings not initialized');
  }

  return settings;
};

export const updateSettings = (
  updates: Partial<Omit<Settings, '_id'>>,
): void => {
  const realm = getRealm();
  const settings = realm.objectForPrimaryKey<Settings>('Settings', SETTINGS_ID);

  if (!settings) {
    throw new Error('Settings not initialized');
  }

  realm.write(() => {
    Object.assign(settings, updates);
  });
};

export const setTheme = (theme: 'light' | 'dark'): void => {
  updateSettings({ theme });
};

export const setNotificationsEnabled = (enabled: boolean): void => {
  updateSettings({ notificationsEnabled: enabled });
};

export const setDefaultReminderTime = (minutes: number): void => {
  updateSettings({ defaultReminderTime: minutes });
};

export const setOnboardingCompleted = (completed: boolean): void => {
  updateSettings({ onboardingCompleted: completed });
};

export const setTimeFormat = (format: 'auto' | '12h' | '24h'): void => {
  updateSettings({ timeFormat: format });
};
