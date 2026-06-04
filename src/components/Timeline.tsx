/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Delivery } from '../types';

interface TimelineProps {
  deliveries: Delivery[];
}

export default function Timeline({ deliveries }: TimelineProps) {
  // Color coding helper for ball timeline
  const getBallStyle = (type: string) => {
    switch (type) {
      case 'wicket':
        return 'bg-red-500 text-white font-black animate-pulse shadow-sm';
      case 'wide':
      case 'noball':
        return 'bg-blue-600 text-white font-bold';
      case 'bye':
      case 'legbye':
        return 'bg-blue-500/85 text-white font-semibold';
      case 'dead':
        return 'bg-gray-400 dark:bg-gray-600 text-white font-medium';
      case 'normal':
      default:
        return 'bg-emerald-600 text-white font-bold';
    }
  };

  interface OverGroup {
    overNumber: number;
    balls: Delivery[];
    validCount: number;
    runs: number;
    wickets: number;
  }

  const getOversGrouped = (deliveriesList: Delivery[]): OverGroup[] => {
    const overs: OverGroup[] = [];
    let currentOverBalls: Delivery[] = [];
    let currentValidCount = 0;
    let currentOverIndex = 1;
    let currentOverRuns = 0;
    let currentOverWickets = 0;

    for (let i = 0; i < deliveriesList.length; i++) {
      const d = deliveriesList[i];
      currentOverBalls.push(d);
      currentOverRuns += d.runs;
      if (d.wicket) {
        currentOverWickets += 1;
      }
      
      // Check if ball counts as a valid ball in the over
      if (d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead') {
        currentValidCount++;
      }

      if (currentValidCount === 6) {
        overs.push({
          overNumber: currentOverIndex,
          balls: [...currentOverBalls],
          validCount: currentValidCount,
          runs: currentOverRuns,
          wickets: currentOverWickets
        });
        currentOverBalls = [];
        currentValidCount = 0;
        currentOverIndex++;
        currentOverRuns = 0;
        currentOverWickets = 0;
      }
    }

    // Left over active balls
    if (currentOverBalls.length > 0) {
      overs.push({
        overNumber: currentOverIndex,
        balls: [...currentOverBalls],
        validCount: currentValidCount,
        runs: currentOverRuns,
        wickets: currentOverWickets
      });
    }

    return overs;
  };

  const overs = getOversGrouped(deliveries);

  return (
    <div className="space-y-4 font-sans" id="timeline-card">
      {/* Beautiful grouped overs feed */}
      {overs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-6 text-center shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">
            Innings Timeline
          </span>
          <p className="text-xs text-gray-400 italic py-2">Waiting for first ball of the over...</p>
        </div>
      ) : (
        <div className="space-y-3" id="overs-breakdown-container">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00A86B] dark:text-[#00A86B]/85">
              Overs Breakdown (Recent first)
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Total Overs: {overs.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {[...overs].reverse().map((over) => {
              const activeValidCount = deliveries.filter(
                (d) => d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead'
              ).length;
              const currentActiveOverNum = Math.floor(activeValidCount / 6) + 1;
              const isActive = over.overNumber === currentActiveOverNum;

              return (
                <div
                  key={`over-block-${over.overNumber}`}
                  className={`bg-white dark:bg-gray-900 border ${
                    isActive
                      ? 'border-[#00a669] shadow-sm'
                      : 'border-gray-100 dark:border-gray-800'
                  } rounded-2xl p-4 transition-all`}
                  id={`over-group-${over.overNumber}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                          isActive
                            ? 'bg-[#00A86B] text-white shadow-xs'
                            : 'bg-black text-white border border-black'
                        }`}
                      >
                        OVER {over.overNumber}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-black tracking-widest text-[#00A86B] uppercase bg-[#00A86B]/10 px-1.5 py-0.5 rounded animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-bold text-gray-400 dark:text-gray-500">
                      <span>Runs: <strong className="text-gray-800 dark:text-gray-100 font-mono font-black">{over.runs}</strong></span>
                      <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-800"></span>
                      <span>Wkts: <strong className={over.wickets > 0 ? 'text-red-500 font-black' : 'text-gray-800 dark:text-gray-100 font-mono font-black'}>{over.wickets}</strong></span>
                    </div>
                  </div>

                  {/* Wrapped Flex for balls, ensuring that 20 wide balls wrap flawlessly! */}
                  <div className="flex flex-wrap items-center gap-2">
                    {over.balls.map((d, idx) => {
                      const isExtraBall = d.type === 'wide' || d.type === 'noball' || d.type === 'dead';
                      return (
                        <div
                          key={`ball-elem-${over.overNumber}-${d.id}-${idx}`}
                          className="flex flex-col items-center space-y-1"
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-xs transition duration-150 ${getBallStyle(
                              d.type
                            )}`}
                            title={`${d.type.toUpperCase()}: ${d.runs} runs`}
                          >
                            {d.label}
                          </div>
                          <span className="text-[8px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                            {isExtraBall
                              ? d.type === 'wide'
                                ? 'Wide'
                                : d.type === 'noball'
                                ? 'NoBall'
                                : 'Dead'
                              : `Ball ${
                                  over.balls
                                    .slice(0, idx + 1)
                                    .filter((b) => b.type !== 'wide' && b.type !== 'noball' && b.type !== 'dead').length
                                }`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend Card */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 p-3.5 rounded-[1.2rem] bg-gray-100 dark:bg-gray-900/30 text-[10px] text-gray-500 dark:text-gray-400 border border-gray-200/20 dark:border-gray-800/25">
        <div className="flex items-center space-x-1.5 justify-center py-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block flex-shrink-0"></span>
          <span>• Dot</span>
        </div>
        <div className="flex items-center space-x-1.5 justify-center py-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 block flex-shrink-0"></span>
          <span>W Wkt</span>
        </div>
        <div className="flex items-center space-x-1.5 justify-center py-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block flex-shrink-0"></span>
          <span>WD Wide</span>
        </div>
        <div className="flex items-center space-x-1.5 justify-center py-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block flex-shrink-0"></span>
          <span>NB NoBall</span>
        </div>
        <div className="flex items-center space-x-1.5 justify-center py-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500/85 block flex-shrink-0"></span>
          <span>B Bye</span>
        </div>
        <div className="flex items-center space-x-1.5 justify-center py-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500/85 block flex-shrink-0"></span>
          <span>LB L-Bye</span>
        </div>
        <div className="flex items-center space-x-1.5 justify-center py-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400 block flex-shrink-0"></span>
          <span>DB Dead</span>
        </div>
      </div>
    </div>
  );
}
