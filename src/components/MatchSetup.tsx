/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';
import { MatchState } from '../types';
import CricketBallLogo from './CricketBallLogo';

interface MatchSetupProps {
  onStartMatch: (setup: {
    teamA: string;
    teamB: string;
    oversLimit: number;
    firstBattingTeam: 'Team A' | 'Team B';
    strikerName?: string;
    nonStrikerName?: string;
    bowlerName?: string;
    teamAPlayers?: string[];
    teamBPlayers?: string[];
    tournamentMode?: boolean;
  }) => void;
}

export default function MatchSetup({ onStartMatch }: MatchSetupProps) {
  const [teamA, setTeamA] = useState('Team A');
  const [teamB, setTeamB] = useState('Team B');
  const [oversLimit, setOversLimit] = useState(20);
  const [customOvers, setCustomOvers] = useState('25');
  const [firstBattingTeam, setFirstBattingTeam] = useState<'Team A' | 'Team B'>('Team A');
  const [tournamentMode, setTournamentMode] = useState(false);
  const [showPlayersConfig, setShowPlayersConfig] = useState(false);
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>(Array(11).fill(''));
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>(Array(11).fill(''));
  const [activeTab, setActiveTab] = useState<'teamA' | 'teamB'>('teamA');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamA.trim() || !teamB.trim()) return;
    
    // Sanitize oversLimit before starting
    const parsedOvers = parseInt(customOvers, 10);
    const finalOvers = isNaN(parsedOvers) || parsedOvers <= 0 ? 20 : Math.min(100, parsedOvers);
    const finalTeamA = teamA.trim();
    const finalTeamB = teamB.trim();

    const finalAPlayers = teamAPlayers.map((p, idx) => p.trim() || `${finalTeamA} Player ${idx + 1}`);
    const finalBPlayers = teamBPlayers.map((p, idx) => p.trim() || `${finalTeamB} Player ${idx + 1}`);
    
    let finalStriker: string;
    let finalNonStriker: string;
    let finalBowler: string;

    if (firstBattingTeam === 'Team A') {
      finalStriker = finalAPlayers[0] || 'Striker';
      finalNonStriker = finalAPlayers[1] || 'Non-Striker';
      finalBowler = finalBPlayers[0] || 'Bowler';
    } else {
      finalStriker = finalBPlayers[0] || 'Striker';
      finalNonStriker = finalBPlayers[1] || 'Non-Striker';
      finalBowler = finalAPlayers[0] || 'Bowler';
    }
    
    onStartMatch({
      teamA: finalTeamA,
      teamB: finalTeamB,
      oversLimit: finalOvers,
      firstBattingTeam,
      strikerName: tournamentMode ? finalStriker : 'Striker',
      nonStrikerName: tournamentMode ? finalNonStriker : 'Non-Striker',
      bowlerName: tournamentMode ? finalBowler : 'Bowler',
      teamAPlayers: tournamentMode ? finalAPlayers : undefined,
      teamBPlayers: tournamentMode ? finalBPlayers : undefined,
      tournamentMode,
    });
  };

  const handlePresetClick = (preset: number) => {
    setOversLimit(preset);
    setCustomOvers(preset.toString());
  };

  const oversPresets = [5, 10, 20, 50];

  return (
    <div className="w-full max-w-md mx-auto p-6" id="match-setup-container">
      <div className="text-center mb-8">
        <div className="mb-4 inline-flex">
          <CricketBallLogo size={80} className="hover:scale-110 hover:rotate-12 transition duration-300 drop-shadow-xl" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-50 uppercase">
          Match Setup
        </h1>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
          Cricket Score Tracker Setup Screen
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Inputs - Elegant Bento Block */}
        <div className="space-y-4 p-5 rounded-[1.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs">
          <div>
            <label htmlFor="teamA-input" className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
              Team A (Home / Batting defaults)
            </label>
            <input
              id="teamA-input"
              type="text"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              placeholder="e.g. India"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#00A86B] focus:border-[#00A86B] transition text-sm font-bold"
              required
            />
          </div>

          <div>
            <label htmlFor="teamB-input" className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
              Team B (Away)
            </label>
            <input
              id="teamB-input"
              type="text"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              placeholder="e.g. Australia"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#00A86B] focus:border-[#00A86B] transition text-sm font-bold"
              required
            />
          </div>
        </div>

        {/* Overs Settings - Elegant Bento Block */}
        <div className="p-5 rounded-[1.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Match Overs Limit
          </label>
          <div className="grid grid-cols-4 gap-2">
            {oversPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                id={`preset-overs-${preset}`}
                onClick={() => handlePresetClick(preset)}
                className={`py-2 px-1 rounded-xl text-xs font-black border transition active:scale-95 cursor-pointer ${
                  oversLimit === preset
                    ? 'bg-[#00A86B] text-white border-[#00A86B] shadow-sm shadow-[#00A86B]/20'
                    : 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                {preset} Ov
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Custom:
            </span>
            <input
              id="custom-overs"
              type="number"
              min={1}
              max={100}
              value={customOvers}
              onChange={(e) => {
                const val = e.target.value;
                setCustomOvers(val); // This lets them type, delete, clear, etc.
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed) && parsed > 0) {
                  setOversLimit(Math.min(100, parsed)); // Dynamic sync
                }
              }}
              onBlur={() => {
                // Self-correcting on leave/blur to guarantee a valid final number
                const parsed = parseInt(customOvers, 10);
                if (isNaN(parsed) || parsed <= 0) {
                  setCustomOvers(oversLimit.toString());
                } else if (parsed > 100) {
                  setCustomOvers('100');
                  setOversLimit(100);
                } else {
                  setCustomOvers(parsed.toString());
                  setOversLimit(parsed);
                }
              }}
              className="w-full pl-20 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-950 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#00A86B] text-sm font-black"
            />
          </div>
        </div>

        {/* First Batting */}
        <div className="p-5 rounded-[1.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
          <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Who bats first?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              id="select-batting-team-a"
              type="button"
              onClick={() => setFirstBattingTeam('Team A')}
              className={`p-3.5 rounded-xl border text-center transition flex flex-col justify-center items-center active:scale-95 cursor-pointer ${
                firstBattingTeam === 'Team A'
                  ? 'bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]'
                  : 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
              }`}
            >
              <span className="text-[9px] font-black uppercase opacity-65 tracking-widest mb-0.5">Home</span>
              <span className="text-xs font-black truncate max-w-[130px]">{teamA || 'Team A'}</span>
            </button>
            <button
              id="select-batting-team-b"
              type="button"
              onClick={() => setFirstBattingTeam('Team B')}
              className={`p-3.5 rounded-xl border text-center transition flex flex-col justify-center items-center active:scale-95 cursor-pointer ${
                firstBattingTeam === 'Team B'
                  ? 'bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]'
                  : 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
              }`}
            >
              <span className="text-[9px] font-black uppercase opacity-65 tracking-widest mb-0.5">Away</span>
              <span className="text-xs font-black truncate max-w-[130px]">{teamB || 'Team B'}</span>
            </button>
          </div>
        </div>

        {/* Optional Player Names Section */}
        <div className="p-5 rounded-[1.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="space-y-0.5">
              <span className="block text-[10px] font-black uppercase tracking-widest text-[#00A86B] dark:text-emerald-450">
                🏆 TOURNAMENT OPTION
              </span>
              <span className="block text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black leading-none">
                Player names & squad lineups
              </span>
            </div>
            <button
              type="button"
              id="btn-toggle-tournament-mode"
              onClick={() => {
                const nextVal = !tournamentMode;
                setTournamentMode(nextVal);
                setShowPlayersConfig(nextVal);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer ${
                tournamentMode ? 'bg-[#00A86B]' : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow transition-transform duration-300 ${
                  tournamentMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {tournamentMode && showPlayersConfig && (
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-4">
                {/* Tab switcher for Team A vs Team B squads */}
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 dark:border-gray-800/60 pb-1">
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => setActiveTab('teamA')}
                      className={`pb-1 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition ${
                        activeTab === 'teamA'
                          ? 'border-[#00a86b] text-[#00a86b]'
                          : 'border-transparent text-gray-400 hover:text-gray-500'
                      }`}
                    >
                      {teamA.toUpperCase() || 'TEAM A'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('teamB')}
                      className={`pb-1 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition ${
                        activeTab === 'teamB'
                          ? 'border-[#00a86b] text-[#00a86b]'
                          : 'border-transparent text-gray-400 hover:text-gray-500'
                      }`}
                    >
                      {teamB.toUpperCase() || 'TEAM B'}
                    </button>
                  </div>

                  {/* Presets */}
                  <div className="flex gap-1 items-center pb-1">
                    <span className="text-[7.5px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Presets:</span>
                    {[5, 8, 11, 15].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const updater = (prev: string[]) => {
                            if (prev.length < s) {
                              return [...prev, ...Array(s - prev.length).fill('')];
                            } else {
                              return prev.slice(0, s);
                            }
                          };
                          if (activeTab === 'teamA') {
                            setTeamAPlayers(updater(teamAPlayers));
                          } else {
                            setTeamBPlayers(updater(teamBPlayers));
                          }
                        }}
                        className="text-[8.5px] font-bold px-1.5 py-0.5 border border-gray-200 dark:border-gray-800 rounded bg-white dark:bg-gray-900 text-gray-650 dark:text-gray-400 hover:text-[#00A86B] hover:border-[#00A86B]/50 transition cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const list = activeTab === 'teamA' ? teamAPlayers : teamBPlayers;
                  return (
                    <div className="space-y-3">
                      {/* Input Fields in dynamic grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                        {list.map((currentVal, idx) => {
                          // Helpful indicators for roles
                          let roleLabel = `Player ${idx + 1}`;
                          if (idx === 0) roleLabel = `Player 1 (Striker)`;
                          if (idx === 1) roleLabel = `Player 2 (Non-Striker)`;
                          if (idx === list.length - 1 && list.length > 2) roleLabel = `Player ${idx + 1} (Last Bowler)`;

                          return (
                            <div key={idx} className="flex flex-col">
                              <label className="text-[7px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5 truncate">
                                {roleLabel}
                              </label>
                              <div className="relative flex items-center gap-1">
                                <input
                                  type="text"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (activeTab === 'teamA') {
                                      const updated = [...teamAPlayers];
                                      updated[idx] = val;
                                      setTeamAPlayers(updated);
                                    } else {
                                      const updated = [...teamBPlayers];
                                      updated[idx] = val;
                                      setTeamBPlayers(updated);
                                    }
                                  }}
                                  placeholder={`${activeTab === 'teamA' ? teamA : teamB} P${idx + 1}`}
                                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-[#00A86B] text-[10.5px] font-bold"
                                />
                                {list.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (activeTab === 'teamA') {
                                        setTeamAPlayers(teamAPlayers.filter((_, i) => i !== idx));
                                      } else {
                                        setTeamBPlayers(teamBPlayers.filter((_, i) => i !== idx));
                                      }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                    title="Remove Player"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add player row */}
                      <div className="flex justify-between items-center bg-gray-50/70 dark:bg-gray-950/45 px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                        <span className="text-[9px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">
                          Roster: {list.length} Players
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeTab === 'teamA') {
                              setTeamAPlayers([...teamAPlayers, '']);
                            } else {
                              setTeamBPlayers([...teamBPlayers, '']);
                            }
                          }}
                          className="inline-flex items-center gap-1 py-1 px-3.5 bg-[#00A86B]/10 hover:bg-[#00A86B]/20 border border-[#00A86B]/20 text-[#00A86B] rounded-lg text-[9px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                        >
                          <Plus size={10} strokeWidth={3} />
                          Add Player
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <p className="text-[9px] text-gray-400 dark:text-gray-500 italic mt-1 leading-normal">
                Leave empty to use defaults. You can also edit names at any time directly on the live scoring board!
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          id="btn-start-match"
          type="submit"
          className="w-full py-4 bg-[#00A86B] hover:bg-[#00945d] text-white rounded-[1.5rem] font-bold shadow-lg shadow-[#00A86B]/20 transition flex items-center justify-center space-x-2 active:scale-[0.98] cursor-pointer"
        >
          <Play size={18} fill="currentColor" />
          <span className="text-xs uppercase tracking-widest font-black">Start Scoring</span>
        </button>
      </form>
    </div>
  );
}
