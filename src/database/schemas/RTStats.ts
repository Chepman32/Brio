import Realm from 'realm';

/**
 * Realm schema for storing RT (Reaction Time) statistics
 * Stores aggregated notification interaction data for learning optimal timing
 */
export class RTStats extends Realm.Object<RTStats> {
  _id!: string; // Primary key: "global" or "{category}:{dow}:{bin}"

  // Beta distribution parameters for open probabilities
  open5m_a!: number;
  open5m_b!: number;
  open30m_a!: number;
  open30m_b!: number;

  // Log-normal distribution parameters for reaction time
  lnRt_mean!: number;
  lnRt_var!: number;
  weight!: number;

  // Counters
  delivered!: number;
  opened!: number;
  ignored!: number;

  // Metadata
  lastUpdateAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'RTStats',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      open5m_a: { type: 'double', default: 2.0 },
      open5m_b: { type: 'double', default: 2.0 },
      open30m_a: { type: 'double', default: 2.0 },
      open30m_b: { type: 'double', default: 2.0 },
      lnRt_mean: { type: 'double', default: 9.616 }, // ln(15 * 60 * 1000) ≈ 9.616
      lnRt_var: { type: 'double', default: 0.64 },
      weight: { type: 'double', default: 1.0 },
      delivered: { type: 'int', default: 0 },
      opened: { type: 'int', default: 0 },
      ignored: { type: 'int', default: 0 },
      lastUpdateAt: 'date',
    },
  };
}
