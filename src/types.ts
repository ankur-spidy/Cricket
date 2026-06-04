/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeliveryType = 'normal' | 'wide' | 'noball' | 'bye' | 'legbye' | 'dead' | 'wicket';

export interface Delivery {
  id: string;
  type: DeliveryType;
  runs: number;       // total runs added (including boundary + extra if any)
  batsmanRuns: number; // runs credited to batsman score (just for reference in calculation, though batsman stats are not explicitly tracked)
  extrasRuns: number;  // runs categorized as extras
  wicket: boolean;
  timestamp: number;
  label: string;       // e.g. "•", "1", "W", "WD", "NB", "1B", "2LB"
}

export interface ExtrasBreakdown {
  wide: number;
  noball: number;
  bye: number;
  legbye: number;
  total: number;
}

export interface InningsState {
  teamName: string;
  isBatting: boolean;
  deliveries: Delivery[];
  wickets: number;
  completed: boolean;
}

export interface MatchState {
  id: string;
  teamA: string;
  teamB: string;
  oversLimit: number;
  firstBattingTeam: 'Team A' | 'Team B';
  status: 'setup' | 'live' | 'break' | 'completed';
  currentInnings: 1 | 2;
  innings1: InningsState;
  innings2: InningsState;
  winner?: string;
  margin?: string;
}
