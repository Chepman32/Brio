/**
 * Priority Scoring Types
 */

export interface PriorityScore {
  score: number; // 0..1
  deadlinePressure: number;
  keywordWeight: number;
  categoryWeight: number;
  streakWeight: number;
  durationPenalty: number;
}

export interface PriorityWeights {
  deadline: number;
  keyword: number;
  category: number;
  streak: number;
  duration: number;
}

export interface KeywordDict {
  [word: string]: number; // weight 0..1
}
