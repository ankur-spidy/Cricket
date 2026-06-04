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

  // Group deliveries into overs. Each over has up to 6 valid balls.
  // Wait, let's keep a simple list of the most recent deliveries.
  // Standard Cricket Display shows the current over.
  // Let's find the current over deliveries (deliveries bowled since the start of the current over).
  // An over is finished when there are 6 valid balls.
  // To find the current over's balls, we find how many valid balls have been bowled,
  // and we take all deliveries since the (Math.floor(validBalls / 6) * 6)th valid ball.
  
  const getOverDeliveries = () => {
    let validCount = 0;
    const overStartIndex: number[] = [0]; // index in deliveries where each over starts
    
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
    return deliveries.slice(lastOverStart);
  };

  const currentOverBalls = getOverDeliveries();
  const reversedRecent = [...deliveries].reverse().slice(0, 18); // display last 18 balls overall in scroll list

  return (
    <div className="space-y-3.5" id="timeline-card">
      {/* Current Over Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-4.5 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Recent Deliveries
          </span>
          <span className="text-[11px] font-bold text-[#00A86B] tracking-wider uppercase bg-[#00A86B]/10 dark:bg-[#00A86B]/20 px-2 py-0.5 rounded-full">
            Over {Math.floor(deliveries.filter(d => d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead').length / 6) + 1}
          </span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none min-h-[44px]">
          {currentOverBalls.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">Waiting for first ball of the over...</p>
          ) : (
            currentOverBalls.map((d) => (
              <div
                key={d.id}
                className={`flex-shrink-0 w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${getBallStyle(
                  d.type
                )}`}
                title={`${d.type.toUpperCase()}: ${d.runs} runs`}
              >
                {d.label}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Historical Match Timeline Feed if matches have been bowled */}
      {deliveries.length > 0 && (
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-[1.5rem] p-4.5 border border-dashed border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Innings Timeline (Recent first)
            </span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {reversedRecent.map((d, index) => (
              <div key={`hist-${d.id}-${index}`} className="flex flex-col items-center space-y-1 flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition duration-150 ${getBallStyle(
                    d.type
                  )}`}
                >
                  {d.label}
                </div>
                <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500">
                  {deliveries.length - index}
                </span>
              </div>
            ))}
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
