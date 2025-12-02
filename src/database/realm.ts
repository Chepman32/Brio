import Realm from 'realm';
import {
  Task,
  Achievement,
  UserStats,
  Settings,
  RTStats,
  PatternModel,
  Occurrence,
    TimeCluster,
  } from './schemas';

let realmInstance: Realm | null = null;

export const initializeRealm = async (): Promise<Realm> => {
  if (realmInstance) {
    return realmInstance;
  }

  const config: Realm.Configuration = {
    schema: [
      Task,
      Achievement,
      UserStats,
      Settings,
      RTStats,
      PatternModel,
      Occurrence,
      TimeCluster,
    ],
    schemaVersion: 6,
    onMigration: (oldRealm: Realm, newRealm: Realm) => {
      // Migration for schema version 2: add timeFormat field
      if (oldRealm.schemaVersion < 2) {
        const oldSettings = oldRealm.objects('Settings');
        const newSettings = newRealm.objects('Settings');

        for (let i = 0; i < oldSettings.length; i++) {
          newSettings[i].timeFormat = 'auto';
        }
      }

      // Migration for schema version 3: add RTStats schema
      // No data migration needed, RTStats will be created as needed

      // Migration for schema version 4: add PatternModel schema
      // No data migration needed, PatternModel will be created as tasks are added

      // Migration for schema version 5: add soundEnabled, hapticsEnabled, locale to Settings
      if (oldRealm.schemaVersion < 5) {
        const newSettings = newRealm.objects('Settings');

        for (let i = 0; i < newSettings.length; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const setting = newSettings[i] as any;
          setting.soundEnabled = true;
          setting.hapticsEnabled = true;
          setting.locale = 'en';
        }
      }

      // Migration for schema version 6: add icon to Task
      if (oldRealm.schemaVersion < 6) {
        const newTasks = newRealm.objects('Task');
        for (let i = 0; i < newTasks.length; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const task = newTasks[i] as any;
          if (task.icon === undefined) {
            task.icon = null;
          }
        }
      }
    },
  };

  realmInstance = await Realm.open(config);
  return realmInstance;
};

export const getRealm = (): Realm => {
  if (!realmInstance) {
    throw new Error('Realm not initialized. Call initializeRealm() first.');
  }
  return realmInstance;
};

export const closeRealm = () => {
  if (realmInstance && !realmInstance.isClosed) {
    realmInstance.close();
    realmInstance = null;
  }
};
