/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Delivery, InningsState, MatchState, ExtrasBreakdown } from './types';

export function getValidBallsCount(deliveries: Delivery[]): number {
  return deliveries.filter(d => d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead').length;
}

export function formatOvers(ballsCount: number): string {
  const overs = Math.floor(ballsCount / 6);
  const balls = ballsCount % 6;
  return `${overs}.${balls}`;
}

export function calculateInningsStats(innings: InningsState) {
  const deliveries = innings.deliveries;
  const totalRuns = deliveries.reduce((sum, d) => sum + d.runs, 0);
  const wickets = innings.wickets;
  const validBalls = getValidBallsCount(deliveries);

  const extras: ExtrasBreakdown = {
    wide: 0,
    noball: 0,
    bye: 0,
    legbye: 0,
    total: 0,
  };

  deliveries.forEach((d) => {
    if (d.type === 'wide') {
      extras.wide += d.runs;
    } else if (d.type === 'noball') {
      extras.noball += d.extrasRuns;
    } else if (d.type === 'bye') {
      extras.bye += d.runs;
    } else if (d.type === 'legbye') {
      extras.legbye += d.runs;
    }
  });

  extras.total = extras.wide + extras.noball + extras.bye + extras.legbye;

  // Run Rate
  const oversBowled = validBalls / 6;
  const crr = oversBowled > 0 ? totalRuns / oversBowled : 0;

  return {
    totalRuns,
    wickets,
    validBalls,
    extras,
    oversString: formatOvers(validBalls),
    crr: parseFloat(crr.toFixed(2)),
  };
}

export function getMatchProgress(match: MatchState) {
  const i1Stats = calculateInningsStats(match.innings1);
  const i2Stats = calculateInningsStats(match.innings2);
  const maxBalls = match.oversLimit * 6;

  const target = i1Stats.totalRuns + 1;
  const innings2Runs = i2Stats.totalRuns;
  const innings2Wickets = i2Stats.wickets;
  const innings2Balls = i2Stats.validBalls;

  const remainingRuns = Math.max(0, target - innings2Runs);
  const remainingBalls = Math.max(0, maxBalls - innings2Balls);

  // Required Run Rate (RRR)
  const remainingOversNeeded = remainingBalls / 6;
  const rrr =
    remainingOversNeeded > 0 && remainingRuns > 0
      ? remainingRuns / remainingOversNeeded
      : remainingRuns > 0 && remainingBalls <= 0
      ? Infinity
      : 0;

  const targetProgressPercent = Math.min(100, (innings2Runs / target) * 100);

  return {
    i1Runs: i1Stats.totalRuns,
    i1Wickets: i1Stats.wickets,
    i1Balls: i1Stats.validBalls,
    i1OversString: i1Stats.oversString,
    i1Crr: i1Stats.crr,

    i2Runs: i2Stats.totalRuns,
    i2Wickets: i2Stats.wickets,
    i2Balls: i2Stats.validBalls,
    i2OversString: i2Stats.oversString,
    i2Crr: i2Stats.crr,

    target,
    remainingRuns,
    remainingBalls,
    rrr: isFinite(rrr) ? parseFloat(rrr.toFixed(2)) : 100.0,
    targetProgressPercent,
  };
}

/**
 * Checks and updates the match state if victory conditions have been met.
 */
export function checkMatchStatus(match: MatchState): MatchState {
  const updated = { ...match };
  
  if (updated.status === 'setup' || updated.status === 'completed') {
    return updated;
  }

  // 1st Innings Setup
  if (updated.status === 'live' && updated.currentInnings === 1) {
    const stats = calculateInningsStats(updated.innings1);
    const maxBalls = updated.oversLimit * 6;

    // Ends if all out or overs complete
    if (stats.wickets >= 10 || stats.validBalls >= maxBalls) {
      updated.innings1.completed = true;
      updated.status = 'break';
      updated.currentInnings = 2;
    }
  }

  // 2nd Innings Setup
  if (updated.status === 'live' && updated.currentInnings === 2) {
    const stats1 = calculateInningsStats(updated.innings1);
    const stats2 = calculateInningsStats(updated.innings2);
    
    const target = stats1.totalRuns + 1;
    const maxBalls = updated.oversLimit * 6;

    const battingTeam = updated.innings2.teamName;
    const bowlingTeam = updated.innings1.teamName;

    // Condition A: Batsmen reach target
    if (stats2.totalRuns >= target) {
      updated.innings2.completed = true;
      updated.status = 'completed';
      updated.winner = battingTeam;
      const wicketsLeft = 10 - stats2.wickets;
      updated.margin = `won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`;
    }
    // Condition B: All out or Overs complete
    else if (stats2.wickets >= 10 || stats2.validBalls >= maxBalls) {
      updated.innings2.completed = true;
      updated.status = 'completed';

      if (stats2.totalRuns < stats1.totalRuns) {
        updated.winner = bowlingTeam;
        const runsMargin = stats1.totalRuns - stats2.totalRuns;
        updated.margin = `won by ${runsMargin} run${runsMargin === 1 ? '' : 's'}`;
      } else {
        // Runs are equal!
        updated.winner = 'Tie';
        updated.margin = 'Match Tied';
      }
    }
  }

  return updated;
}

export function isFreeHitActive(deliveries: Delivery[]): boolean {
  if (!deliveries || deliveries.length === 0) return false;
  for (let i = deliveries.length - 1; i >= 0; i--) {
    const d = deliveries[i];
    if (d.type === 'dead') {
      continue;
    }
    if (d.type === 'noball') {
      return true;
    }
    if (d.type === 'normal' || d.type === 'bye' || d.type === 'legbye' || d.type === 'wicket') {
      return false;
    }
  }
  return false;
}

