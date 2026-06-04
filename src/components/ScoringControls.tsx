/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Undo2, Redo2, RotateCcw, AlertTriangle, Check, ArrowRight, CornerDownLeft, EyeOff } from 'lucide-react';
import { Delivery } from '../types';
import { isFreeHitActive } from '../utils';

interface ScoringControlsProps {
  onAddDelivery: (deliveryData: {
    type: 'normal' | 'wide' | 'noball' | 'bye' | 'legbye' | 'dead' | 'wicket';
    runs: number;
    batsmanRuns: number;
    extrasRuns: number;
    wicket: boolean;
    label: string;
  }) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearOver: () => void;
  onEndInnings: () => void;
  onStartNewMatch: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSecondInnings: boolean;
  isOverEmpty: boolean;
  matchCompleted: boolean;
  matchStatus?: string;
  deliveries?: Delivery[];
}

export default function ScoringControls({
  onAddDelivery,
  onUndo,
  onRedo,
  onClearOver,
  onEndInnings,
  onStartNewMatch,
  canUndo,
  canRedo,
  isSecondInnings,
  isOverEmpty,
  matchCompleted,
  matchStatus = 'live',
  deliveries = [],
}: ScoringControlsProps) {
  const [activeExtraMode, setActiveExtraMode] = useState<'none' | 'B' | 'LB' | 'NB' | 'WD'>('none');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmClearOver, setShowConfirmClearOver] = useState(false);
  const [showConfirmEndInnings, setShowConfirmEndInnings] = useState(false);

  const handleNormalRun = (runs: number) => {
    onAddDelivery({
      type: 'normal',
      runs,
      batsmanRuns: runs,
      extrasRuns: 0,
      wicket: false,
      label: runs === 0 ? '•' : runs.toString(),
    });
  };

  const handleWicket = () => {
    onAddDelivery({
      type: 'wicket',
      runs: 0,
      batsmanRuns: 0,
      extrasRuns: 0,
      wicket: true,
      label: 'W',
    });
  };

  const handleDeadBall = () => {
    onAddDelivery({
      type: 'dead',
      runs: 0,
      batsmanRuns: 0,
      extrasRuns: 0,
      wicket: false,
      label: 'DB',
    });
  };

  const handleWide = () => {
    // Wide adds 1 run automatically as wide extra
    onAddDelivery({
      type: 'wide',
      runs: 1,
      batsmanRuns: 0,
      extrasRuns: 1,
      wicket: false,
      label: 'WD',
    });
    setActiveExtraMode('none');
  };

  const handleWideWithRuns = (runsConceded: number) => {
    // e.g. WD + 4 boundary = 5 total runs
    onAddDelivery({
      type: 'wide',
      runs: 1 + runsConceded,
      batsmanRuns: 0,
      extrasRuns: 1 + runsConceded,
      wicket: false,
      label: runsConceded > 0 ? `${runsConceded + 1}WD` : 'WD',
    });
    setActiveExtraMode('none');
  };

  const handleNoBallWithRuns = (batsmanRunsScored: number) => {
    // 1 extra run for the NB itself, plus runs hit by batsman
    onAddDelivery({
      type: 'noball',
      runs: 1 + batsmanRunsScored,
      batsmanRuns: batsmanRunsScored,
      extrasRuns: 1,
      wicket: false,
      label: batsmanRunsScored > 0 ? `${batsmanRunsScored}NB` : 'NB',
    });
    setActiveExtraMode('none');
  };

  const handleByeSelected = (byeRuns: number) => {
    onAddDelivery({
      type: 'bye',
      runs: byeRuns,
      batsmanRuns: 0,
      extrasRuns: byeRuns,
      wicket: false,
      label: `${byeRuns}B`,
    });
    setActiveExtraMode('none');
  };

  const handleLegByeSelected = (legByeRuns: number) => {
    onAddDelivery({
      type: 'legbye',
      runs: legByeRuns,
      batsmanRuns: 0,
      extrasRuns: legByeRuns,
      wicket: false,
      label: `${legByeRuns}LB`,
    });
    setActiveExtraMode('none');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 w-full md:max-w-lg bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-900 rounded-t-[2.5rem] shadow-[0_-8px_30px_rgb(0,0,0,0.08)] overflow-hidden z-30" id="sticky-bottom-panel">
      {/* Undo / Redo & Smart Admin Actions bar */}
      <div className="max-w-md mx-auto px-5 py-3 border-b border-gray-100 dark:border-gray-900 flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center space-x-1.5 font-sans">
          <button
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 px-3 rounded-xl flex items-center space-x-1 border border-gray-200/65 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer active:scale-95"
            title="Undo last action"
          >
            <Undo2 size={13} />
            <span className="font-bold text-[10px] uppercase tracking-wider">Undo</span>
          </button>
          <button
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 px-3 rounded-xl flex items-center space-x-1 border border-gray-200/65 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer active:scale-95"
            title="Redo previous action"
          >
            <Redo2 size={13} />
            <span className="font-bold text-[10px] uppercase tracking-wider">Redo</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {matchStatus === 'live' && (
            <button
              id="btn-clear-over"
              onClick={() => setShowConfirmClearOver(true)}
              disabled={isOverEmpty}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50/70 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 disabled:opacity-40 uppercase tracking-widest transition cursor-pointer"
            >
              Reset Over
            </button>
          )}

          {matchStatus === 'live' && !isSecondInnings && (
            <button
              id="btn-end-innings"
              onClick={() => setShowConfirmEndInnings(true)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 uppercase tracking-widest transition cursor-pointer"
            >
              Innings Break
            </button>
          )}

          <button
            id="btn-reset-match-trigger"
            onClick={() => setShowConfirmReset(true)}
            className="p-1.5 text-red-500 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer"
            title="Reset match completely"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Main Scoring Grid */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {isFreeHitActive(deliveries) && matchStatus === 'live' && (
          <div className="bg-red-500/10 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-900/30 p-2.5 rounded-xl text-center text-xs font-black uppercase tracking-wider animate-pulse flex flex-col items-center justify-center space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              <span>🔥 FREE HIT ACTIVE! (Next ball)</span>
            </div>
            <p className="text-[10px] opacity-85 leading-normal normal-case font-bold tracking-wide">
              Only Run Out or Obstruction counts as out.
            </p>
          </div>
        )}

        {matchStatus === 'completed' ? (
          <div className="py-4 text-center space-y-3" id="match-completed-panel">
            <p className="text-sm font-semibold text-emerald-600">
              Match Stage finalized successfully!
            </p>
            <button
              id="btn-start-new-after-complete"
              onClick={onStartNewMatch}
              className="px-6 py-3 bg-[#00A86B] text-white rounded-xl font-bold shadow-md hover:bg-[#00945d] transition active:scale-95 text-xs uppercase tracking-wider inline-flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Start New Match</span>
            </button>
          </div>
        ) : matchStatus === 'break' ? (
          <div className="py-5 text-center space-y-1.5" id="match-break-panel">
            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              🏏 Innings Break
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal max-w-xs mx-auto">
              First innings is complete. Click <strong className="font-extrabold text-blue-600 dark:text-blue-400">"Start 2nd Innings"</strong> above to continue scoring the chase.
            </p>
          </div>
        ) : activeExtraMode !== 'none' && activeExtraMode !== 'NB' ? (
          /* Smart Extra Selector Overlay Panel */
          <div className="bg-[#00A86B]/5 dark:bg-[#00A86B]/10 p-3.5 rounded-2xl border border-[#00A86B]/20 animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-[#00A86B] uppercase tracking-widest">
                {activeExtraMode === 'B' && 'Byes (B) Selector'}
                {activeExtraMode === 'LB' && 'Leg Byes (LB) Selector'}
                {activeExtraMode === 'WD' && 'Wides (WD) Selector'}
              </span>
              <button
                id="btn-cancel-extra-panel"
                onClick={() => setActiveExtraMode('none')}
                className="text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Sub-selectors */}
            {activeExtraMode === 'WD' && (
              <div className="grid grid-cols-4 gap-2">
                <button
                  id="btn-wd-1"
                  onClick={handleWide}
                  className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm tracking-wide shadow-sm"
                >
                  1 WD
                </button>
                <button
                  id="btn-wd-2"
                  onClick={() => handleWideWithRuns(1)}
                  className="py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm"
                >
                  2 WD
                </button>
                <button
                  id="btn-wd-3"
                  onClick={() => handleWideWithRuns(2)}
                  className="py-3 rounded-xl bg-blue-500/80 hover:bg-blue-500/90 text-white font-black text-xs"
                >
                  3 WD
                </button>
                <button
                  id="btn-wd-5"
                  onClick={() => handleWideWithRuns(4)}
                  className="py-3 rounded-xl bg-blue-400 hover:bg-blue-500 text-white font-black text-xs"
                >
                  5 WD
                </button>
              </div>
            )}

            {activeExtraMode === 'B' && (
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 6].map((runs) => (
                  <button
                    key={`b-${runs}`}
                    id={`btn-bye-${runs}`}
                    onClick={() => handleByeSelected(runs)}
                    className="py-3 rounded-xl bg-blue-500/90 hover:bg-blue-600 text-white font-black text-sm"
                  >
                    {runs} B
                  </button>
                ))}
              </div>
            )}

            {activeExtraMode === 'LB' && (
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 6].map((runs) => (
                  <button
                    key={`lb-${runs}`}
                    id={`btn-legbye-${runs}`}
                    onClick={() => handleLegByeSelected(runs)}
                    className="py-3 rounded-xl bg-blue-500/90 hover:bg-blue-600 text-white font-black text-sm"
                  >
                    {runs} LB
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default Scoring Panel Inputs */
          <div className="space-y-3">
            {/* Primary runs buttons: Big friendly shapes */}
            <div className="grid grid-cols-6 gap-2">
              <button
                id="btn-score-dot"
                onClick={() => handleNormalRun(0)}
                className="h-13 rounded-xl bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-950 dark:text-gray-50 font-black text-2xl flex items-center justify-center transition active:scale-95 cursor-pointer border border-gray-200 dark:border-gray-800 shadow-xs"
              >
                •
              </button>
              {[1, 2, 3, 4, 6].map((runValue) => (
                <button
                  key={runValue}
                  id={`btn-score-${runValue}`}
                  onClick={() => handleNormalRun(runValue)}
                  className={`h-13 rounded-xl font-black text-lg flex items-center justify-center transition active:scale-95 cursor-pointer ${
                    runValue === 4 || runValue === 6
                      ? 'bg-[#00A86B] text-white hover:bg-[#00945d] shadow-sm shadow-[#00A86B]/25'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-50 border border-gray-200 dark:border-gray-800 shadow-xs'
                  }`}
                >
                  {runValue}
                </button>
              ))}
            </div>

            {/* Secondary Extras & Wicket Grid */}
            <div className="grid grid-cols-6 gap-2">
              <button
                id="btn-extra-wd"
                onClick={() => setActiveExtraMode('WD')}
                className="py-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 font-black text-[10px] tracking-wider transition hover:bg-blue-100/60"
              >
                WD
              </button>
              <button
                id="btn-extra-nb"
                onClick={() => setActiveExtraMode('NB')}
                className="py-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 font-black text-[10px] tracking-wider transition hover:bg-blue-100/60"
              >
                NB
              </button>
              <button
                id="btn-extra-b"
                onClick={() => setActiveExtraMode('B')}
                className="py-3 rounded-xl bg-blue-50 dark:bg-blue-950/10 text-blue-500 border border-blue-200/20 font-black text-[10px] tracking-wider transition hover:bg-blue-100/60"
              >
                B
              </button>
              <button
                id="btn-extra-lb"
                onClick={() => setActiveExtraMode('LB')}
                className="py-3 rounded-xl bg-blue-50 dark:bg-blue-950/10 text-blue-500 border border-blue-200/20 font-black text-[10px] tracking-wider transition hover:bg-blue-100/60"
              >
                LB
              </button>
              <button
                id="btn-extra-db"
                onClick={handleDeadBall}
                className="py-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 font-extrabold text-[10px] tracking-wider transition hover:bg-gray-100"
              >
                DB
              </button>
              
              {/* Wicket Button */}
              <button
                id="btn-wicket"
                onClick={handleWicket}
                className="py-3 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 text-xs tracking-widest shadow-md shadow-red-200 dark:shadow-red-950/20 uppercase transition active:scale-95 block cursor-pointer"
              >
                W
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Reset Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="bg-red-500/10 p-2.5 rounded-full text-red-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Reset Match?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This will completely clear your current game state and restore setup page. This progress cannot be recovered.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-confirm-reset-cancel"
                onClick={() => setShowConfirmReset(false)}
                className="py-3 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm cursor-pointer"
              >
                No, Keep
              </button>
              <button
                id="btn-confirm-reset-execute"
                onClick={() => {
                  onStartNewMatch();
                  setShowConfirmReset(false);
                }}
                className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-md shadow-red-500/10 cursor-pointer"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Clear Over Modal */}
      {showConfirmClearOver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="bg-orange-500/10 p-2.5 rounded-full text-orange-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Clear Current Over?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This deletes all deliveries belonging to the current over in progress. Past completed overs are kept.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-confirm-clear-cancel"
                onClick={() => setShowConfirmClearOver(false)}
                className="py-3 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-clear-execute"
                onClick={() => {
                  onClearOver();
                  setShowConfirmClearOver(false);
                }}
                className="py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-md cursor-pointer"
              >
                Clear Ball History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation End Innings Modal */}
      {showConfirmEndInnings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="bg-blue-500/10 p-2.5 rounded-full text-blue-500">
                <Check size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Declare & End Innings 1?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Are you sure you want to end the 1st innings early and set the target for Team B?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-confirm-end-cancel"
                onClick={() => setShowConfirmEndInnings(false)}
                className="py-3 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm cursor-pointer"
              >
                Go Back
              </button>
              <button
                id="btn-confirm-end-execute"
                onClick={() => {
                  onEndInnings();
                  setShowConfirmEndInnings(false);
                }}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md cursor-pointer"
              >
                End 1st Innings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO BALLS (NB) SELECTOR MODAL DIALOG */}
      {activeExtraMode === 'NB' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="nb-selector-modal">
          <div className="bg-gray-950 border border-gray-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 text-white">
            <div className="text-center">
              <span className="text-[10px] font-black tracking-widest text-[#00A86B] uppercase block">
                UmpScore Extra
              </span>
              <h2 className="text-sm font-black text-gray-100 uppercase tracking-wide mt-1">
                NO BALLS (NB) SELECTOR
              </h2>
            </div>

            {/* Same design style as WD, B, LB but dark theme with blue gradient buttons in 3x2 grid */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <button
                id="btn-nb-select-0"
                type="button"
                onClick={() => handleNoBallWithRuns(0)}
                className="py-5 px-1 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 text-white font-black text-sm active:scale-95 transition duration-150 cursor-pointer shadow-md shadow-blue-900/30 flex flex-col items-center justify-center space-y-1"
              >
                <span className="text-xs">NB</span>
                <span className="text-[9px] opacity-60 font-mono font-medium">(1 Run)</span>
              </button>
              <button
                id="btn-nb-select-1"
                type="button"
                onClick={() => handleNoBallWithRuns(1)}
                className="py-5 px-1 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 text-white font-black text-sm active:scale-95 transition duration-150 cursor-pointer shadow-md shadow-blue-900/30 flex flex-col items-center justify-center space-y-1"
              >
                <span className="text-xs">NB +1</span>
                <span className="text-[9px] opacity-60 font-mono font-medium">(2 Runs)</span>
              </button>
              <button
                id="btn-nb-select-2"
                type="button"
                onClick={() => handleNoBallWithRuns(2)}
                className="py-5 px-1 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 text-white font-black text-sm active:scale-95 transition duration-150 cursor-pointer shadow-md shadow-blue-900/30 flex flex-col items-center justify-center space-y-1"
              >
                <span className="text-xs">NB +2</span>
                <span className="text-[9px] opacity-60 font-mono font-medium">(3 Runs)</span>
              </button>
              <button
                id="btn-nb-select-3"
                type="button"
                onClick={() => handleNoBallWithRuns(3)}
                className="py-5 px-1 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 text-white font-black text-sm active:scale-95 transition duration-150 cursor-pointer shadow-md shadow-blue-900/30 flex flex-col items-center justify-center space-y-1"
              >
                <span className="text-xs">NB +3</span>
                <span className="text-[9px] opacity-60 font-mono font-medium">(4 Runs)</span>
              </button>
              <button
                id="btn-nb-select-4"
                type="button"
                onClick={() => handleNoBallWithRuns(4)}
                className="py-5 px-1 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 text-white font-black text-sm active:scale-95 transition duration-150 cursor-pointer shadow-md shadow-blue-900/30 flex flex-col items-center justify-center space-y-1"
              >
                <span className="text-xs">NB +4</span>
                <span className="text-[9px] opacity-60 font-mono font-medium">(5 Runs)</span>
              </button>
              <button
                id="btn-nb-select-6"
                type="button"
                onClick={() => handleNoBallWithRuns(6)}
                className="py-5 px-1 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 text-white font-black text-sm active:scale-95 transition duration-150 cursor-pointer shadow-md shadow-blue-900/30 flex flex-col items-center justify-center space-y-1"
              >
                <span className="text-xs">NB +6</span>
                <span className="text-[9px] opacity-60 font-mono font-medium">(7 Runs)</span>
              </button>
            </div>

            <div className="pt-1 text-center px-1">
              <p className="text-[10px] text-gray-500 font-bold leading-normal">
                • Automatically awards 1 extra run.<br/>
                • Does not count as a legal delivery.<br/>
                • Activates FREE HIT for the next ball.
              </p>
            </div>

            <div className="pt-2">
              <button
                id="btn-nb-modal-cancel"
                type="button"
                onClick={() => setActiveExtraMode('none')}
                className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-gray-300 font-black text-xs tracking-widest uppercase rounded-2xl transition duration-150 border border-gray-800 active:scale-95 cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
