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
    schemaVersion: 4,
    migration: (oldRealm, newRealm) => {
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
