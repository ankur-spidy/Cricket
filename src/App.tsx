/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Award, Sun, Moon, ArrowRight, Activity, Trash2, Milestone, ChevronRight, BarChart3, HelpCircle } from 'lucide-react';
import { Delivery, InningsState, MatchState } from './types';
import { calculateInningsStats, getMatchProgress, checkMatchStatus, getValidBallsCount, formatOvers, isFreeHitActive } from './utils';
import MatchSetup from './components/MatchSetup';
import Timeline from './components/Timeline';
import ScoringControls from './components/ScoringControls';

const createEmptyInnings = (teamName: string, isBatting: boolean): InningsState => ({
  teamName,
  isBatting,
  deliveries: [],
  wickets: 0,
  completed: false,
});

export default function App() {
  // Theme Management
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cricket_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cricket_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cricket_theme', 'light');
    }
  }, [isDarkMode]);

  // Match State Loading / Initializing
  const [match, setMatch] = useState<MatchState>(() => {
    const saved = localStorage.getItem('cricket_active_match');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      id: '',
      teamA: '',
      teamB: '',
      oversLimit: 20,
      firstBattingTeam: 'Team A',
      status: 'setup',
      currentInnings: 1,
      innings1: createEmptyInnings('Team A', false),
      innings2: createEmptyInnings('Team B', false),
    };
  });

  // History stack for perfect Undo/Redo
  const [matchHistory, setMatchHistory] = useState<MatchState[]>(() => {
    const saved = localStorage.getItem('cricket_match_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [historyPointer, setHistoryPointer] = useState<number>(() => {
    const saved = localStorage.getItem('cricket_history_pointer');
    if (saved) {
      const parsed = parseInt(saved, 10);
      return isNaN(parsed) ? -1 : parsed;
    }
    return -1;
  });

  // Sync state to local storage
  useEffect(() => {
    if (match.id) {
      localStorage.setItem('cricket_active_match', JSON.stringify(match));
    } else {
      localStorage.removeItem('cricket_active_match');
    }
  }, [match]);

  // Sync history stack to local storage
  useEffect(() => {
    if (matchHistory.length > 0) {
      localStorage.setItem('cricket_match_history', JSON.stringify(matchHistory));
      localStorage.setItem('cricket_history_pointer', historyPointer.toString());
    } else {
      localStorage.removeItem('cricket_match_history');
      localStorage.removeItem('cricket_history_pointer');
    }
  }, [matchHistory, historyPointer]);

  // Sync history stack on direct match change if it is empty (like after page refresh)
  useEffect(() => {
    if (match.id && matchHistory.length === 0) {
      setMatchHistory([match]);
      setHistoryPointer(0);
    }
  }, [match.id]);

  const pushState = (newState: MatchState) => {
    const cleanState = JSON.parse(JSON.stringify(newState));
    const newHistory = matchHistory.slice(0, historyPointer + 1);
    newHistory.push(cleanState);
    setMatchHistory(newHistory);
    setHistoryPointer(newHistory.length - 1);
  };

  const handleStartMatch = (setup: {
    teamA: string;
    teamB: string;
    oversLimit: number;
    firstBattingTeam: 'Team A' | 'Team B';
  }) => {
    const battingTeam = setup.firstBattingTeam === 'Team A' ? setup.teamA : setup.teamB;
    const bowlingTeam = setup.firstBattingTeam === 'Team A' ? setup.teamB : setup.teamA;

    const freshMatch: MatchState = {
      id: `match-${Date.now()}`,
      teamA: setup.teamA,
      teamB: setup.teamB,
      oversLimit: setup.oversLimit,
      firstBattingTeam: setup.firstBattingTeam,
      status: 'live',
      currentInnings: 1,
      innings1: createEmptyInnings(battingTeam, true),
      innings2: createEmptyInnings(bowlingTeam, false),
    };

    setMatch(freshMatch);
    setMatchHistory([freshMatch]);
    setHistoryPointer(0);
  };

  const handleAddDelivery = (deliveryInfo: Omit<Delivery, 'id' | 'timestamp'>) => {
    if (match.status !== 'live') return;

    const inningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    const activeInnings = match[inningsKey];

    // Safety checks against overflow
    const totalValidBalls = getValidBallsCount(activeInnings.deliveries);
    if (totalValidBalls >= match.oversLimit * 6 || activeInnings.wickets >= 10 || activeInnings.completed) {
      return;
    }

    const timestamp = Date.now();
    const newDelivery: Delivery = {
      ...deliveryInfo,
      id: `d-${timestamp}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
    };

    const updatedInnings: InningsState = {
      ...activeInnings,
      deliveries: [...activeInnings.deliveries, newDelivery],
      wickets: deliveryInfo.wicket ? activeInnings.wickets + 1 : activeInnings.wickets,
    };

    let updatedMatch: MatchState = {
      ...match,
      [inningsKey]: updatedInnings,
    };

    // Calculate game progressions
    updatedMatch = checkMatchStatus(updatedMatch);

    setMatch(updatedMatch);
    pushState(updatedMatch);
  };

  const handleUndo = () => {
    if (historyPointer > 0) {
      const prevPointer = historyPointer - 1;
      const prevMatch = matchHistory[prevPointer];
      setMatch(JSON.parse(JSON.stringify(prevMatch)));
      setHistoryPointer(prevPointer);
    }
  };

  const handleRedo = () => {
    if (historyPointer < matchHistory.length - 1) {
      const nextPointer = historyPointer + 1;
      const nextMatch = matchHistory[nextPointer];
      setMatch(JSON.parse(JSON.stringify(nextMatch)));
      setHistoryPointer(nextPointer);
    }
  };

  const handleClearOver = () => {
    if (match.status !== 'live') return;

    const inningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    const activeInnings = match[inningsKey];

    // Find the starting point of the current over
    let validCount = 0;
    const overStartIndex: number[] = [0];

    for (let i = 0; i < activeInnings.deliveries.length; i++) {
      const d = activeInnings.deliveries[i];
      if (d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead') {
        validCount++;
        if (validCount % 6 === 0 && i < activeInnings.deliveries.length - 1) {
          overStartIndex.push(i + 1);
        }
      }
    }

    const lastOverStart = overStartIndex[overStartIndex.length - 1];
    const deliveriesToKeep = activeInnings.deliveries.slice(0, lastOverStart);
    
    // Find how many wickets are removed from this over
    const clearedDeliveries = activeInnings.deliveries.slice(lastOverStart);
    const clearedWicketsCount = clearedDeliveries.filter(d => d.wicket).length;
    const resolvedWickets = Math.max(0, activeInnings.wickets - clearedWicketsCount);

    const updatedInnings: InningsState = {
      ...activeInnings,
      deliveries: deliveriesToKeep,
      wickets: resolvedWickets,
    };

    let updatedMatch: MatchState = {
      ...match,
      [inningsKey]: updatedInnings,
    };

    updatedMatch = checkMatchStatus(updatedMatch);
    setMatch(updatedMatch);
    pushState(updatedMatch);
  };

  const handleEndInnings = () => {
    if (match.status !== 'live' || match.currentInnings !== 1) return;

    const updatedMatch: MatchState = {
      ...match,
      status: 'break',
      currentInnings: 2,
      innings1: {
        ...match.innings1,
        completed: true,
      },
      innings2: {
        ...match.innings2,
        isBatting: true,
      },
    };

    setMatch(updatedMatch);
    pushState(updatedMatch);
  };

  const handleStart2ndInnings = () => {
    const updatedMatch: MatchState = {
      ...match,
      status: 'live',
      currentInnings: 2,
      innings2: {
        ...match.innings2,
        isBatting: true,
      },
    };

    setMatch(updatedMatch);
    pushState(updatedMatch);
  };

  const handleResetMatch = () => {
    const setupMatch: MatchState = {
      id: '',
      teamA: '',
      teamB: '',
      oversLimit: 20,
      firstBattingTeam: 'Team A',
      status: 'setup',
      currentInnings: 1,
      innings1: createEmptyInnings('Team A', false),
      innings2: createEmptyInnings('Team B', false),
    };

    setMatch(setupMatch);
    setMatchHistory([]);
    setHistoryPointer(-1);
    localStorage.removeItem('cricket_active_match');
    localStorage.removeItem('cricket_match_history');
    localStorage.removeItem('cricket_history_pointer');
  };

  // Derive stats
  const activeInnings = match.currentInnings === 1 ? match.innings1 : match.innings2;
  const activeStats = calculateInningsStats(activeInnings);
  const matchProg = getMatchProgress(match);

  const getStatusBadgeColor = (status: string) => {
    if (status === 'live') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (status === 'break') return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  };

  const isCurrentOverEmpty = () => {
    let validCount = 0;
    const overStartIndex: number[] = [0];
    const deliveries = activeInnings.deliveries;

    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      if (d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead') {
        validCount++;
        if (validCount % 6 === 0 && i < deliveries.length - 1) {
          overStartIndex.push(i + 1);
        }
      }
    }

    const lastOverStart = overStartIndex[overStartIndex.length - 1];
    return deliveries.slice(lastOverStart).length === 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200" id="app-root">
      {/* Absolute Header with Theme switches */}
      <header className="sticky top-0 bg-white/85 dark:bg-gray-950/85 backdrop-blur-md border-b border-gray-100 dark:border-gray-900 z-40 transition-colors">
        <div className="max-w-md md:max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-[#00A86B]/10 text-[#00A86B]">
              <Award size={18} fill="currentColor" />
            </span>
            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-50 flex items-center gap-1.5">
                UmpScore Tracker
              </span>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                Cricket Scorekeeper
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {match.status !== 'setup' && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${getStatusBadgeColor(match.status)}`}>
                {match.status}
              </span>
            )}
            
            <button
              id="theme-toggler"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-[#00A86B] dark:hover:text-[#00A86B] transition cursor-pointer"
              title="Toggle theme mode"
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md md:max-w-4xl mx-auto px-4 pt-4 pb-96 md:pb-64 space-y-4">
        {match.status === 'setup' ? (
          <MatchSetup onStartMatch={handleStartMatch} />
        ) : (
          /* Scoring Interface - Dual component display on Desktop */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start animate-in fade-in duration-200" id="scoring-board">
            
            {/* Primary Stats panel (Left column on Wide screen) */}
            <div className="col-span-1 md:col-span-7 space-y-4">
              {/* MATCH SUMMARY (Team A vs Team B details) */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-4 shadow-xs" id="match-header-card">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">
                  <span>Live • Match Mode {match.oversLimit} Ov</span>
                  <span className="font-mono">Innings {match.currentInnings} of 2</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className={`text-left max-w-[42%] ${match.innings1.isBatting ? 'opacity-100' : 'opacity-65'}`}>
                    <p className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Batting First</p>
                    <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">
                      {match.innings1.teamName.toUpperCase()}
                    </p>
                  </div>
                  
                  <div className="text-center px-2 text-gray-300 dark:text-gray-800 font-black text-xs tracking-wider">
                    VS
                  </div>

                  <div className={`text-right max-w-[42%] ${match.innings2.isBatting ? 'opacity-100' : 'opacity-65'}`}>
                    <p className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Chasing</p>
                    <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">
                      {match.innings2.teamName.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* BENTO GRID SCORE DESIGN */}
              <div className="grid grid-cols-2 gap-3" id="bento-matrix-grid">
                
                {/* BENTO ITEM 1: MAIN LIVE SCORE DISPLAY */}
                <div className="col-span-2 bg-[#00A86B] p-5 rounded-[2rem] text-white flex flex-col justify-between shadow-lg shadow-[#00A86B]/25 relative overflow-hidden" id="live-score-card">
                  <div className="absolute top-0 right-0 p-4">
                    <Activity size={18} className="text-white/40 animate-pulse" />
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold opacity-85 uppercase tracking-widest">
                      {activeInnings.teamName.toUpperCase()} is Batting
                    </span>
                    {isFreeHitActive(activeInnings.deliveries) && (
                      <span className="text-[9px] bg-red-600 outline outline-1 outline-red-500/50 text-white font-black tracking-widest px-2 py-0.5 rounded-full uppercase animate-pulse shadow-md">
                        🔥 FREE HIT
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline justify-between mt-1">
                    <h1 className="text-5xl font-black tracking-tight tabular-nums" id="runs-wickets-display">
                      {activeStats.totalRuns}<span className="text-white/60 text-3xl font-medium">/{activeStats.wickets}</span>
                    </h1>
                    <div className="flex items-center space-x-4 text-right">
                      <div className="border-r border-white/20 pr-4">
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Over.Ball</p>
                        <p className="text-2xl font-black font-mono">{Math.floor(activeStats.validBalls / 6)}<span className="text-white/60 text-lg">.</span>{activeStats.validBalls % 6}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">CRR</p>
                        <p className="text-2xl font-black font-mono">{activeStats.crr}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BENTO ITEM 2: OVERS CARD */}
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-[1.5rem] border border-transparent dark:border-gray-800 transition-colors" id="overs-card">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter block mb-0.5">Overs</span>
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                    {activeStats.oversString}<span className="text-gray-400 dark:text-gray-600 text-sm font-bold">/{match.oversLimit}</span>
                  </p>
                </div>

                {/* BENTO ITEM 3: EXTRAS CARD */}
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-[1.5rem] border border-transparent dark:border-gray-800 transition-colors" id="extras-card">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter block mb-0.5">Extras</span>
                  <p className="text-2xl font-black text-blue-600 tabular-nums flex items-baseline justify-between">
                    <span>{activeStats.extras.total}</span>
                    <span className="text-[9px] font-mono font-medium text-gray-400 truncate max-w-[80px]">
                      WD:{activeStats.extras.wide} NB:{activeStats.extras.noball} B:{activeStats.extras.bye}
                    </span>
                  </p>
                </div>

                {/* BENTO ITEM 4: TARGET CHASING DETAIL CARD (Strictly shown only on Innings 2) */}
                {match.currentInnings === 2 && (
                  <div className="col-span-2 bg-gray-900 dark:bg-gray-950 p-5 rounded-[1.5rem] text-white flex flex-col justify-between border border-transparent dark:border-gray-900 shadow-sm" id="target-information-card">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Target: {matchProg.target} runs</span>
                        <p className="text-sm font-medium text-gray-100 mt-0.5">
                          Need <span className="text-[#00A86B] font-black">{matchProg.remainingRuns}</span> runs from <span className="text-[#00A86B] font-black">{matchProg.remainingBalls}</span> balls
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">RRR</span>
                        <p className="text-lg font-black leading-none text-emerald-400 mt-0.5">{matchProg.rrr === Infinity ? 'N/A' : matchProg.rrr}</p>
                      </div>
                    </div>

                    {/* Target Completion Progress bar */}
                    <div className="w-full bg-white/10 dark:bg-gray-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div
                        className="bg-[#00A86B] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${matchProg.targetProgressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}

              </div>

              {/* INNINGS BREAK / INTERMEDIATE SCREEN */}
              {match.status === 'break' && (
                <div className="bg-blue-600/10 border border-blue-600/20 p-5 rounded-2xl text-center space-y-4 shadow-sm animate-in zoom-in-95 duration-200">
                  <div>
                    <h2 className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                      Innings Break
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {match.innings1.teamName} completed their 1st Innings
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 inline-block mx-auto">
                    <p className="text-xs text-gray-400">First Innings Score</p>
                    <p className="text-lg font-black text-gray-900 dark:text-gray-100 mt-0.5">
                      {matchProg.i1Runs}/{matchProg.i1Wickets} <span className="text-xs font-normal text-gray-400">in {matchProg.i1OversString} ov</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Target for <span className="font-extrabold text-gray-900 dark:text-gray-100">{match.innings2.teamName}</span>: <span className="font-black text-blue-600 inline-block px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-base">{matchProg.target}</span> runs
                    </p>
                  </div>

                  <button
                    id="btn-start-2nd-innings"
                    onClick={handleStart2ndInnings}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/10 transition active:scale-95 text-xs tracking-wider uppercase inline-flex items-center space-x-1 border border-blue-600 cursor-pointer"
                  >
                    <span>Start 2nd Innings</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}

              {/* MATCH COMPLETED SUMMARY SCREEN */}
              {match.status === 'completed' && (
                <div className="bg-[#00A86B]/15 dark:bg-[#00A86B]/15 border border-[#00A86B]/25 p-5 rounded-2xl text-center space-y-4 shadow-sm animate-in zoom-in-95 duration-200" id="completed-match-card">
                  <div>
                    <h2 className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                      🏆 Match Completed
                    </h2>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {match.winner === 'Tie' ? 'Match Tied!' : `${match.winner} ${match.margin}`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-2">
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                      <p className="text-[10px] uppercase font-bold text-gray-400 truncate tracking-wider">{match.innings1.teamName}</p>
                      <p className="text-lg font-black text-gray-900 dark:text-gray-100 mt-1">
                        {matchProg.i1Runs}/{matchProg.i1Wickets}
                      </p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">{matchProg.i1OversString} Ov</p>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                      <p className="text-[10px] uppercase font-bold text-gray-400 truncate tracking-wider">{match.innings2.teamName}</p>
                      <p className="text-lg font-black text-gray-900 dark:text-gray-100 mt-1">
                        {matchProg.i2Runs}/{matchProg.i2Wickets}
                      </p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">{matchProg.i2OversString} Ov</p>
                    </div>
                  </div>

                  <button
                    id="btn-match-completed-restart"
                    onClick={handleResetMatch}
                    className="px-6 py-3 bg-[#00A86B] hover:bg-[#00945d] text-white rounded-xl font-bold shadow-md shadow-[#00A86B]/15 transition active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Setup New Game
                  </button>
                </div>
              )}
            </div>

            {/* BALL TIMELINE (Right-hand sticky column on Wide screen, stacked naturally on mobile) */}
            <div className="col-span-1 md:col-span-5 md:sticky md:top-[5.5rem] space-y-4">
              <Timeline deliveries={activeInnings.deliveries} />
            </div>

            {/* STICKY BOTTOM SCORING PANEL */}
            <ScoringControls
              onAddDelivery={handleAddDelivery}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClearOver={handleClearOver}
              onEndInnings={handleEndInnings}
              onStartNewMatch={handleResetMatch}
              canUndo={historyPointer > 0}
              canRedo={historyPointer < matchHistory.length - 1}
              isSecondInnings={match.currentInnings === 2}
              isOverEmpty={isCurrentOverEmpty()}
              matchCompleted={match.status === 'completed'}
              matchStatus={match.status}
              deliveries={activeInnings.deliveries}
            />

          </div>
        )}
      </main>
    </div>
  );
}
