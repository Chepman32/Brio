import Realm from 'realm';
import { Task, Achievement, UserStats, Settings } from './schemas';

let realmInstance: Realm | null = null;

export const initializeRealm = async (): Promise<Realm> => {
  if (realmInstance) {
    return realmInstance;
  }

  const config: Realm.Configuration = {
    schema: [Task, Achievement, UserStats, Settings],
    schemaVersion: 2,
    migration: (oldRealm, newRealm) => {
      // Migration for schema version 2: add timeFormat field
      if (oldRealm.schemaVersion < 2) {
        const oldSettings = oldRealm.objects('Settings');
        const newSettings = newRealm.objects('Settings');

        for (let i = 0; i < oldSettings.length; i++) {
          newSettings[i].timeFormat = 'auto';
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
