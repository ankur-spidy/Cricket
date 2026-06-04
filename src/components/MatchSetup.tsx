/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Award } from 'lucide-react';
import { MatchState } from '../types';

interface MatchSetupProps {
  onStartMatch: (setup: {
    teamA: string;
    teamB: string;
    oversLimit: number;
    firstBattingTeam: 'Team A' | 'Team B';
  }) => void;
}

export default function MatchSetup({ onStartMatch }: MatchSetupProps) {
  const [teamA, setTeamA] = useState('Team A');
  const [teamB, setTeamB] = useState('Team B');
  const [oversLimit, setOversLimit] = useState(20);
  const [customOvers, setCustomOvers] = useState('20');
  const [firstBattingTeam, setFirstBattingTeam] = useState<'Team A' | 'Team B'>('Team A');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamA.trim() || !teamB.trim()) return;
    
    // Sanitize oversLimit before starting
    const parsedOvers = parseInt(customOvers, 10);
    const finalOvers = isNaN(parsedOvers) || parsedOvers <= 0 ? 20 : Math.min(100, parsedOvers);
    
    onStartMatch({
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      oversLimit: finalOvers,
      firstBattingTeam,
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00A86B]/10 text-[#00A86B] mb-3.5 shadow-sm">
          <Award size={36} />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-50 uppercase">
          Match Setup
        </h1>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
          Bento scoring configuration dashboard
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
