/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Award, Sun, Moon, ArrowRight, Activity, Trash2, Milestone, ChevronRight, BarChart3, HelpCircle, Plus, Users, FileDown, FileSpreadsheet } from 'lucide-react';
import { Delivery, InningsState, MatchState } from './types';
import { calculateInningsStats, getMatchProgress, checkMatchStatus, getValidBallsCount, formatOvers, isFreeHitActive } from './utils';
import { exportCricketPDF } from './pdfReport';
import MatchSetup from './components/MatchSetup';
import Timeline from './components/Timeline';
import ScoringControls from './components/ScoringControls';
import CricketBallLogo from './components/CricketBallLogo';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';

const createEmptyInnings = (
  teamName: string,
  isBatting: boolean,
  strikerName?: string,
  nonStrikerName?: string,
  bowlerName?: string
): InningsState => ({
  teamName,
  isBatting,
  deliveries: [],
  wickets: 0,
  completed: false,
  strikerName: strikerName || 'Striker',
  nonStrikerName: nonStrikerName || 'Non-Striker',
  bowlerName: bowlerName || 'Bowler',
});

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [editingField, setEditingField] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);
  const [tempName, setTempName] = useState<string>('');
  const [showSquadDrawer, setShowSquadDrawer] = useState<boolean>(false);

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
    strikerName?: string;
    nonStrikerName?: string;
    bowlerName?: string;
    teamAPlayers?: string[];
    teamBPlayers?: string[];
  }) => {
    const battingTeam = setup.firstBattingTeam === 'Team A' ? setup.teamA : setup.teamB;
    const bowlingTeam = setup.firstBattingTeam === 'Team A' ? setup.teamB : setup.teamA;

    // Smart default roles for chasing (innings 2)
    const i2Batsman1 = setup.firstBattingTeam === 'Team A'
      ? (setup.teamBPlayers?.[0] || 'Striker')
      : (setup.teamAPlayers?.[0] || 'Striker');
    const i2Batsman2 = setup.firstBattingTeam === 'Team A'
      ? (setup.teamBPlayers?.[1] || 'Non-Striker')
      : (setup.teamAPlayers?.[1] || 'Non-Striker');
    const i2Bowler = setup.firstBattingTeam === 'Team A'
      ? (setup.teamAPlayers?.[0] || 'Bowler')
      : (setup.teamBPlayers?.[0] || 'Bowler');

    const freshMatch: MatchState = {
      id: `match-${Date.now()}`,
      teamA: setup.teamA,
      teamB: setup.teamB,
      teamAPlayers: setup.teamAPlayers,
      teamBPlayers: setup.teamBPlayers,
      oversLimit: setup.oversLimit,
      firstBattingTeam: setup.firstBattingTeam,
      status: 'live',
      currentInnings: 1,
      innings1: createEmptyInnings(battingTeam, true, setup.strikerName, setup.nonStrikerName, setup.bowlerName),
      innings2: createEmptyInnings(bowlingTeam, false, i2Batsman1, i2Batsman2, i2Bowler),
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
    const currentStriker = activeInnings.strikerName || 'Striker';
    const currentNonStriker = activeInnings.nonStrikerName || 'Non-Striker';
    const currentBowler = activeInnings.bowlerName || 'Bowler';

    const newDelivery: Delivery = {
      ...deliveryInfo,
      id: `d-${timestamp}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      strikerName: currentStriker,
      nonStrikerName: currentNonStriker,
      bowlerName: currentBowler,
    };

    // Determine next striker and non-striker
    let nextStriker = currentStriker;
    let nextNonStriker = currentNonStriker;

    // Check if batsman scored odd runs, trigger strike swap
    const isOddBatmanRuns = 
      (newDelivery.type === 'normal' && (newDelivery.runs % 2 === 1)) ||
      ((newDelivery.type === 'bye' || newDelivery.type === 'legbye') && (newDelivery.runs % 2 === 1)) ||
      (newDelivery.type === 'noball' && (newDelivery.batsmanRuns % 2 === 1));

    if (isOddBatmanRuns) {
      nextStriker = currentNonStriker;
      nextNonStriker = currentStriker;
    }

    // Check if the over has ended (after this ball is added)
    const isBallValid = newDelivery.type !== 'wide' && newDelivery.type !== 'noball' && newDelivery.type !== 'dead';
    const newValidCount = totalValidBalls + (isBallValid ? 1 : 0);
    const isOverComplete = isBallValid && (newValidCount % 6 === 0);

    if (isOverComplete) {
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    const updatedInnings: InningsState = {
      ...activeInnings,
      deliveries: [...activeInnings.deliveries, newDelivery],
      wickets: deliveryInfo.wicket ? activeInnings.wickets + 1 : activeInnings.wickets,
      strikerName: nextStriker,
      nonStrikerName: nextNonStriker,
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

  const handleUpdatePlayerNames = (updatedPlayers: {
    strikerName?: string;
    nonStrikerName?: string;
    bowlerName?: string;
  }) => {
    if (match.status !== 'live') return;

    const inningsKey = match.currentInnings === 1 ? 'innings1' : 'innings2';
    const activeInnings = match[inningsKey];

    const updatedInnings: InningsState = {
      ...activeInnings,
      ...updatedPlayers,
    };

    const updatedMatch: MatchState = {
      ...match,
      [inningsKey]: updatedInnings,
    };

    setMatch(updatedMatch);
    pushState(updatedMatch);
  };

  const handleUpdateSquadPlayer = (team: 'A' | 'B', index: number, newName: string) => {
    const updatedMatch = { ...match };
    if (team === 'A') {
      const players = [...(updatedMatch.teamAPlayers || [])];
      players[index] = newName;
      updatedMatch.teamAPlayers = players;
    } else {
      const players = [...(updatedMatch.teamBPlayers || [])];
      players[index] = newName;
      updatedMatch.teamBPlayers = players;
    }
    setMatch(updatedMatch);
    pushState(updatedMatch);
  };

  const handleAddSquadPlayer = (team: 'A' | 'B') => {
    const updatedMatch = { ...match };
    if (team === 'A') {
      const players = [...(updatedMatch.teamAPlayers || [])];
      players.push('');
      updatedMatch.teamAPlayers = players;
    } else {
      const players = [...(updatedMatch.teamBPlayers || [])];
      players.push('');
      updatedMatch.teamBPlayers = players;
    }
    setMatch(updatedMatch);
    pushState(updatedMatch);
  };

  const handleRemoveSquadPlayer = (team: 'A' | 'B', index: number) => {
    const updatedMatch = { ...match };
    if (team === 'A') {
      const players = (updatedMatch.teamAPlayers || []).filter((_, i) => i !== index);
      if (players.length < 2) return;
      updatedMatch.teamAPlayers = players;
    } else {
      const players = (updatedMatch.teamBPlayers || []).filter((_, i) => i !== index);
      if (players.length < 2) return;
      updatedMatch.teamBPlayers = players;
    }
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
  const activeInnings = (match.currentInnings === 1 || match.status === 'break') ? match.innings1 : match.innings2;
  const activeStats = calculateInningsStats(activeInnings);
  const matchProg = getMatchProgress(match);

  // Derive squads
  const isTeamABattingNow = match.status === 'setup' ? false : (
    match.currentInnings === 1
      ? match.firstBattingTeam === 'Team A'
      : match.firstBattingTeam !== 'Team A'
  );
  const activeBattingSquad = isTeamABattingNow ? (match.teamAPlayers || []) : (match.teamBPlayers || []);
  const activeBowlingSquad = isTeamABattingNow ? (match.teamBPlayers || []) : (match.teamAPlayers || []);

  const getBatsmenStats = () => {
    const statsMap: Record<string, {
      name: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      isOut: boolean;
      dismissalBowler?: string;
      isOnStrike: boolean;
      isNonStriker: boolean;
    }> = {};

    const sName = activeInnings.strikerName || 'Striker';
    const nName = activeInnings.nonStrikerName || 'Non-Striker';

    // Seed the map with current active batsmen
    statsMap[sName] = {
      name: sName,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      isOnStrike: true,
      isNonStriker: false,
    };

    if (nName !== sName) {
      statsMap[nName] = {
        name: nName,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        isOnStrike: false,
        isNonStriker: true,
      };
    }

    // Process all deliveries
    activeInnings.deliveries.forEach((d) => {
      const striker = d.strikerName || 'Striker';
      
      // Initialize stats block if not present
      if (!statsMap[striker]) {
        statsMap[striker] = {
          name: striker,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          isOnStrike: false,
          isNonStriker: false,
        };
      }

      // Add batsman runs
      statsMap[striker].runs += d.batsmanRuns || 0;

      // Add ball faced if it's not a wide
      if (d.type !== 'wide') {
        statsMap[striker].balls += 1;
      }

      // Assess boundaries
      if (d.batsmanRuns === 4) {
        statsMap[striker].fours += 1;
      }
      if (d.batsmanRuns === 6) {
        statsMap[striker].sixes += 1;
      }

      // Check for dismissal
      if (d.wicket) {
        statsMap[striker].isOut = true;
        statsMap[striker].dismissalBowler = d.bowlerName || 'Bowler';
      }
    });

    // Ensure currently active players are never marked as isOut in live display
    if (statsMap[sName]) {
      statsMap[sName].isOut = false;
      statsMap[sName].isOnStrike = true;
    }
    if (statsMap[nName]) {
      statsMap[nName].isOut = false;
      statsMap[nName].isNonStriker = true;
    }

    return Object.values(statsMap);
  };

  const getBowlersStats = () => {
    const statsMap: Record<string, {
      name: string;
      balls: number;
      runs: number;
      wickets: number;
    }> = {};

    const bName = activeInnings.bowlerName || 'Bowler';
    // Seed with current bowler
    statsMap[bName] = {
      name: bName,
      balls: 0,
      runs: 0,
      wickets: 0,
    };

    activeInnings.deliveries.forEach((d) => {
      const bowler = d.bowlerName || 'Bowler';
      if (!statsMap[bowler]) {
        statsMap[bowler] = {
          name: bowler,
          balls: 0,
          runs: 0,
          wickets: 0,
        };
      }

      // Legal ball calculation
      const isLegal = d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead';
      if (isLegal) {
        statsMap[bowler].balls += 1;
      }

      // Runs calculation (exclude byes/legbyes)
      if (d.type !== 'bye' && d.type !== 'legbye') {
        statsMap[bowler].runs += d.runs || 0;
      }

      // Wickets
      if (d.wicket) {
        statsMap[bowler].wickets += 1;
      }
    });

    return Object.values(statsMap);
  };

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
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {!showSplash && (
        <div className="min-h-screen bg-gray-50 dark:bg-[#020617] text-gray-900 dark:text-gray-100 transition-colors duration-200" id="app-root">
          {/* Absolute Header with Theme switches */}
          <header className="sticky top-0 bg-white/85 dark:bg-[#020617]/85 backdrop-blur-md border-b border-gray-100 dark:border-gray-900/50 z-40 transition-colors">
            <div className="max-w-md md:max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <CricketBallLogo size={32} className="drop-shadow-md hover:scale-110 active:rotate-180 transition duration-300 cursor-pointer" />
                <div>
                  <span className="text-sm font-black text-gray-900 dark:text-gray-50 uppercase tracking-wider">
                    Cricket Score Tracker
                  </span>
                  <p className="text-[9px] text-[#10B981] font-mono font-black uppercase tracking-widest">
                    Official Scorer • CST
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {match.status !== 'setup' && (
                  <button
                    id="btn-export-pdf-header"
                    onClick={() => exportCricketPDF(match)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider transition cursor-pointer border border-emerald-500/20 shadow-xs active:scale-95 duration-200"
                    title="Export score to PDF"
                  >
                    <FileDown size={13} />
                    <span className="hidden sm:inline">Export PDF</span>
                  </button>
                )}

                {match.status !== 'setup' && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeColor(match.status)}`}>
                    {match.status}
                  </span>
                )}
                
                <button
                  id="theme-toggler"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-[#00A86B] dark:hover:text-[#00A86B] transition cursor-pointer border border-transparent dark:border-gray-800"
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
                      {match.status === 'break' ? `${activeInnings.teamName.toUpperCase()} - 1st Innings Complete` : `${activeInnings.teamName.toUpperCase()} is Batting`}
                    </span>
                    {match.status !== 'break' && isFreeHitActive(activeInnings.deliveries) && (
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
                {match.currentInnings === 2 && match.status === 'live' && (
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

                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                    <button
                      id="btn-match-completed-export"
                      onClick={() => exportCricketPDF(match)}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/15 transition active:scale-95 text-xs uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <FileDown size={14} />
                      Export PDF Scorecard
                    </button>
                    <button
                      id="btn-match-completed-restart"
                      onClick={handleResetMatch}
                      className="px-5 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition active:scale-95 text-xs uppercase tracking-wider cursor-pointer border border-gray-200/50 dark:border-gray-700/50"
                    >
                      Setup New Game
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BALL TIMELINE (Right-hand sticky column on Wide screen, stacked naturally on mobile) */}
            <div className="col-span-1 md:col-span-5 md:sticky md:top-[5.5rem] space-y-4">
              <Timeline deliveries={activeInnings.deliveries} />

              {/* BENTO ITEM 5: LIVE MATCH SCORECARD (Minimalist Who is Batting, Bowling & Out display) */}
              {match.status === 'live' && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/60 p-4 rounded-[1.5rem] shadow-xs space-y-3.5 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200" id="live-players-bento">
                  
                  {/* LIVE INNINGS SCORECARD CARD (Minimalist Who is Batting, Bowling & Out display) */}
                  <div className="font-sans" id="live-innings-scorecard">
                    <div className="bg-gray-50/50 dark:bg-gray-900/20 rounded-xl p-3 border border-gray-100 dark:border-gray-800/80 space-y-3.5">
                      
                      {/* Section Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800/40">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#00A86B] dark:text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Live Match State
                        </span>
                        <span className="text-[9px] font-mono font-bold text-gray-500 dark:text-gray-400">
                          Wickets Lost: {activeStats.wickets}/10
                        </span>
                      </div>

                      {/* Who is Batting & Bowling */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Batting State */}
                        <div className="space-y-2">
                          <h5 className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">🏏 Currently Batting</h5>
                          <div className="space-y-1.5">
                            {/* Striker */}
                            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] border border-emerald-500/10">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-emerald-500 text-xs">🏏</span>
                                <span className="font-extrabold text-gray-900 dark:text-gray-100 truncate">
                                  {activeInnings.strikerName || 'Striker'}
                                </span>
                                <span className="text-[7.5px] bg-emerald-500 text-white font-black px-1.5 py-0.2 rounded font-mono uppercase tracking-wider scale-90">Striker</span>
                              </div>
                              <span className="font-black text-gray-950 dark:text-gray-50 font-mono text-xs whitespace-nowrap">
                                {getBatsmenStats().find(b => b.isOnStrike)?.runs ?? 0} <span className="text-gray-400 text-[10px] font-medium">({getBatsmenStats().find(b => b.isOnStrike)?.balls ?? 0}b)</span>
                              </span>
                            </div>

                            {/* Non-Striker */}
                            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-blue-500/[0.03] dark:bg-blue-500/[0.01] border border-blue-500/10">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-blue-400 text-xs">👤</span>
                                <span className="font-bold text-gray-700 dark:text-gray-300 truncate">
                                  {activeInnings.nonStrikerName || 'Non-Striker'}
                                </span>
                              </div>
                              <span className="font-black text-gray-800 dark:text-gray-200 font-mono text-xs whitespace-nowrap">
                                {getBatsmenStats().find(b => b.isNonStriker)?.runs ?? 0} <span className="text-gray-400 text-[10px] font-medium">({getBatsmenStats().find(b => b.isNonStriker)?.balls ?? 0}b)</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bowling State */}
                        <div className="space-y-2">
                          <h5 className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">🔴 Currently Bowling</h5>
                          <div className="p-2 rounded-lg bg-red-500/[0.03] dark:bg-red-500/[0.01] border border-red-500/10 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-red-500 text-sm">🔴</span>
                              <span className="font-extrabold text-gray-900 dark:text-gray-100 truncate">
                                {activeInnings.bowlerName || 'Bowler'}
                              </span>
                              <span className="text-[7.5px] bg-red-500 text-white font-black px-1.5 py-0.2 rounded font-mono uppercase tracking-wider scale-90">Active</span>
                            </div>
                            <div className="text-right whitespace-nowrap font-mono text-xs">
                              {(() => {
                                const stats = getBowlersStats().find(b => b.name === (activeInnings.bowlerName || 'Bowler'));
                                const overs = stats ? (Math.floor(stats.balls / 6) + (stats.balls % 6) / 10).toFixed(1) : '0.0';
                                const runs = stats?.runs ?? 0;
                                const wickets = stats?.wickets ?? 0;
                                return (
                                  <span className="font-black text-gray-950 dark:text-gray-50">
                                    {wickets}<span className="text-red-500 font-extrabold">w</span> / {runs}<span className="text-gray-400 font-normal">r</span> <span className="text-[9px] text-gray-500 font-normal">({overs} ov)</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Who is Out */}
                      <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800/40">
                        <h5 className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">❌ Out / Dismissed Batsmen</h5>
                        {getBatsmenStats().filter(b => b.isOut).length === 0 ? (
                          <div className="p-2 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-800/80 text-center">
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 italic block">No wickets down yet. Standard innings is clean!</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {getBatsmenStats().filter(b => b.isOut).map((batsman, idx) => (
                              <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 dark:bg-red-500/15 border border-red-500/10 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-250">
                                <span className="text-red-500 text-[10px]">❌</span>
                                <span className="font-black text-gray-950 dark:text-gray-100">{batsman.name}</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  ({batsman.runs} runs)
                                </span>
                                {batsman.dismissalBowler && (
                                  <span className="text-[9.5px] text-red-600 dark:text-red-400 font-semibold">
                                    b. {batsman.dismissalBowler}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {showSquadDrawer && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200" id="live-squad-management-pane">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          📋 Live Squad Rosters
                        </h4>
                        <span className="text-[8px] text-gray-400 dark:text-gray-500 italic">
                          Change player names or add extra squad member lines live
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* TEAM A SQUAD */}
                        <div className="p-3 bg-gray-55/60 dark:bg-gray-950/40 border border-gray-150/50 dark:border-gray-800/60 rounded-2xl space-y-2.5">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800/45">
                            <span className="text-[10px] font-black text-[#00A86B] dark:text-emerald-400 uppercase truncate max-w-[130px]">
                              {match.teamA} ({match.teamAPlayers?.length || 11} players)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddSquadPlayer('A')}
                              className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-[#00A86B]/15 hover:bg-[#00A86B]/25 text-[#00A86B] dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer border border-[#00A86B]/20"
                            >
                              <Plus size={10} strokeWidth={3} />
                              Add Player
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {(match.teamAPlayers || []).map((player, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="text-[8.5px] font-mono font-bold text-gray-450 dark:text-gray-500 min-w-[14px]">
                                  {idx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={player}
                                  onChange={(e) => handleUpdateSquadPlayer('A', idx, e.target.value)}
                                  placeholder={`${match.teamA} Player ${idx + 1}`}
                                  className="flex-1 px-2 py-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-850 rounded-lg text-[10.5px] text-gray-900 dark:text-gray-100 font-bold focus:outline-none focus:ring-1 focus:ring-[#00A86B]"
                                />
                                {(match.teamAPlayers || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSquadPlayer('A', idx)}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition"
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* TEAM B SQUAD */}
                        <div className="p-3 bg-gray-55/60 dark:bg-gray-950/40 border border-gray-150/50 dark:border-gray-800/60 rounded-2xl space-y-2.5">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800/45">
                            <span className="text-[10px] font-black text-blue-600 dark:text-emerald-400 uppercase truncate max-w-[130px]">
                              {match.teamB} ({match.teamBPlayers?.length || 11} players)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddSquadPlayer('B')}
                              className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-[#00A86B]/15 hover:bg-[#00A86B]/25 text-[#00A86B] dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer border border-[#00A86B]/20"
                            >
                              <Plus size={10} strokeWidth={3} />
                              Add Player
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {(match.teamBPlayers || []).map((player, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="text-[8.5px] font-mono font-bold text-gray-455 dark:text-gray-500 min-w-[14px]">
                                  {idx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={player}
                                  onChange={(e) => handleUpdateSquadPlayer('B', idx, e.target.value)}
                                  placeholder={`${match.teamB} Player ${idx + 1}`}
                                  className="flex-1 px-2 py-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-850 rounded-lg text-[10.5px] text-gray-900 dark:text-gray-100 font-bold focus:outline-none focus:ring-1 focus:ring-[#00A86B]"
                                />
                                {(match.teamBPlayers || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSquadPlayer('B', idx)}
                                    className="p-1 text-gray-455 hover:text-red-500 hover:bg-red-500/10 rounded-md transition"
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              strikerName={activeInnings.strikerName || 'Striker'}
              nonStrikerName={activeInnings.nonStrikerName || 'Non-Striker'}
              bowlerName={activeInnings.bowlerName || 'Bowler'}
              strikerRuns={getBatsmenStats().find(b => b.isOnStrike)?.runs ?? 0}
              strikerBalls={getBatsmenStats().find(b => b.isOnStrike)?.balls ?? 0}
              nonStrikerRuns={getBatsmenStats().find(b => b.isNonStriker)?.runs ?? 0}
              nonStrikerBalls={getBatsmenStats().find(b => b.isNonStriker)?.balls ?? 0}
              bowlerRuns={getBowlersStats().find(b => b.name === (activeInnings.bowlerName || 'Bowler'))?.runs ?? 0}
              bowlerWickets={getBowlersStats().find(b => b.name === (activeInnings.bowlerName || 'Bowler'))?.wickets ?? 0}
              bowlerOvers={(() => {
                const stats = getBowlersStats().find(b => b.name === (activeInnings.bowlerName || 'Bowler'));
                return stats ? (Math.floor(stats.balls / 6) + (stats.balls % 6) / 10).toFixed(1) : '0.0';
              })()}
              activeBattingSquad={activeBattingSquad}
              activeBowlingSquad={activeBowlingSquad}
              onUpdatePlayerNames={handleUpdatePlayerNames}
              tournamentMode={match.tournamentMode}
              showSquadDrawer={showSquadDrawer}
              onToggleSquadDrawer={() => setShowSquadDrawer(!showSquadDrawer)}
            />

          </div>
        )}
      </main>
    </div>
      )}
    </>
  );
}
