import Realm from 'realm';
import { Task, Achievement, UserStats, Settings } from './schemas';

let realmInstance: Realm | null = null;

export const initializeRealm = async (): Promise<Realm> => {
  if (realmInstance) {
    return realmInstance;
  }

  const config: Realm.Configuration = {
    schema: [Task, Achievement, UserStats, Settings],
    schemaVersion: 1,
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
