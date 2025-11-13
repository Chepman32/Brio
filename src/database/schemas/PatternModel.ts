import Realm from 'realm';

/**
 * Time cluster schema for pattern detection
 */
export class TimeCluster extends Realm.Object<TimeCluster> {
  bin!: number;
  weight!: number;
  lastSeenAt!: number;

  static schema: Realm.ObjectSchema = {
    name: 'TimeCluster',
    embedded: true,
    properties: {
      bin: 'int',
      weight: 'double',
      lastSeenAt: 'double',
    },
  };
}

/**
 * Occurrence record schema
 */
export class Occurrence extends Realm.Object<Occurrence> {
  yearWeek!: string;
  creationDow!: number;
  creationBin!: number;
  createdAt!: number;

  static schema: Realm.ObjectSchema = {
    name: 'Occurrence',
    embedded: true,
    properties: {
      yearWeek: 'string',
      creationDow: 'int',
      creationBin: 'int',
      createdAt: 'double',
    },
  };
}

/**
 * Pattern model schema for recurring task suggestions
 */
export class PatternModel extends Realm.Object<PatternModel> {
  _id!: string;
  key!: string;
  category!: string;
  displayTitle!: string;
  normalizedTitle!: string;

  occurrences!: Realm.List<Occurrence>;

  ewmaBin!: number;
  ewmaWeight!: number;
  clusters!: Realm.List<TimeCluster>;

  cadence!: string; // 'weekly' | 'biweekly' | 'monthly' | 'irregular'

  lastSuggestedAt?: number;
  lastUserResponse?: string; // 'accepted' | 'dismissed' | 'ignored'
  ignoredCount!: number;

  createdAt!: number;
  updatedAt!: number;

  static schema: Realm.ObjectSchema = {
    name: 'PatternModel',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      key: { type: 'string', indexed: true },
      category: 'string',
      displayTitle: 'string',
      normalizedTitle: 'string',

      occurrences: 'Occurrence[]',

      ewmaBin: 'double',
      ewmaWeight: 'double',
      clusters: 'TimeCluster[]',

      cadence: 'string',

      lastSuggestedAt: 'double?',
      lastUserResponse: 'string?',
      ignoredCount: { type: 'int', default: 0 },

      createdAt: 'double',
      updatedAt: 'double',
    },
  };
}
