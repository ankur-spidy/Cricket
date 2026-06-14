import { jsPDF } from 'jspdf';
import { MatchState, Delivery } from './types';
import { getValidBallsCount } from './utils';

export interface BatsmanReport {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissedBy?: string;
}

export interface BowlerReport {
  name: string;
  overs: string;
  runs: number;
  wickets: number;
  economy: number;
  maidens: number;
  dotBalls: number;
}

export interface OverWiseReport {
  overNum: number;
  bowler: string;
  runs: number;
  wickets: number;
  detail: string;
}

export interface InningsReport {
  teamName: string;
  batsmen: BatsmanReport[];
  bowlers: BowlerReport[];
  overs: OverWiseReport[];
  totalRuns: number;
  wicketsCount: number;
  oversCount: string;
}

// Compute comprehensive statistics for a given innings
export function computeInningsReport(teamName: string, deliveries: Delivery[], wickets: number): InningsReport {
  const batsmenMap: Record<string, { runs: number; balls: number; fours: number; sixes: number; isOut: boolean; dismissedBy: string }> = {};
  const bowlersMap: Record<string, { balls: number; runs: number; wickets: number; dotBalls: number }> = {};
  
  const battingOrder: string[] = [];
  const bowlingOrder: string[] = [];

  const oversList: { bowler: string; deliveries: Delivery[]; runsConceded: number; wickets: number }[] = [];
  let currentOverDeliveries: Delivery[] = [];
  let currentOverValidCount = 0;
  let currentOverBowler = '';

  deliveries.forEach((d) => {
    const striker = d.strikerName || 'Striker';
    const bowler = d.bowlerName || 'Bowler';

    // Register batsman
    if (!batsmenMap[striker]) {
      batsmenMap[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissedBy: '' };
      battingOrder.push(striker);
    }
    // Register bowler
    if (!bowlersMap[bowler]) {
      bowlersMap[bowler] = { balls: 0, runs: 0, wickets: 0, dotBalls: 0 };
      bowlingOrder.push(bowler);
    }

    // Accumulate batsman stats
    const bStat = batsmenMap[striker];
    bStat.runs += d.batsmanRuns;
    if (d.type !== 'wide' && d.type !== 'dead') {
      bStat.balls += 1;
    }
    if (d.batsmanRuns === 4) bStat.fours += 1;
    if (d.batsmanRuns === 6) bStat.sixes += 1;
    if (d.wicket) {
      bStat.isOut = true;
      bStat.dismissedBy = bowler;
    }

    // Accumulate bowler stats
    const bowlerStat = bowlersMap[bowler];
    const isValidBall = d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead';
    if (isValidBall) {
      bowlerStat.balls += 1;
    }

    // Dot balls tracking
    if (d.runs === 0 && d.type !== 'wide' && d.type !== 'noball' && d.type !== 'dead') {
      bowlerStat.dotBalls += 1;
    }

    // Runs conceded
    let conceded = 0;
    if (d.type === 'normal') conceded = d.runs;
    else if (d.type === 'wide') conceded = d.runs;
    else if (d.type === 'noball') conceded = d.runs;
    else if (d.type === 'wicket') conceded = d.runs;

    bowlerStat.runs += conceded;
    if (d.wicket) {
      bowlerStat.wickets += 1;
    }

    // Grouping into overs
    if (!currentOverBowler) {
      currentOverBowler = bowler;
    }
    currentOverDeliveries.push(d);
    if (isValidBall) {
      currentOverValidCount++;
      if (currentOverValidCount === 6) {
        oversList.push({
          bowler: currentOverBowler,
          deliveries: currentOverDeliveries,
          runsConceded: currentOverDeliveries.reduce((sum, ball) => {
            if (ball.type === 'bye' || ball.type === 'legbye' || ball.type === 'dead') return sum;
            return sum + ball.runs;
          }, 0),
          wickets: currentOverDeliveries.filter(b => b.wicket).length,
        });
        currentOverDeliveries = [];
        currentOverValidCount = 0;
        currentOverBowler = '';
      }
    }
  });

  // Incomplete over
  if (currentOverDeliveries.length > 0) {
    oversList.push({
      bowler: currentOverBowler || 'Bowler',
      deliveries: currentOverDeliveries,
      runsConceded: currentOverDeliveries.reduce((sum, ball) => {
        if (ball.type === 'bye' || ball.type === 'legbye' || ball.type === 'dead') return sum;
        return sum + ball.runs;
      }, 0),
      wickets: currentOverDeliveries.filter(b => b.wicket).length,
    });
  }

  // Calculate maidens
  const bowlerMaidens: Record<string, number> = {};
  oversList.forEach((ov) => {
    const isCompletedOver = ov.deliveries.filter(b => b.type !== 'wide' && b.type !== 'noball' && b.type !== 'dead').length === 6;
    if (isCompletedOver && ov.runsConceded === 0) {
      bowlerMaidens[ov.bowler] = (bowlerMaidens[ov.bowler] || 0) + 1;
    }
  });

  const batsmen: BatsmanReport[] = battingOrder.map((name) => {
    const s = batsmenMap[name];
    const strikeRate = s.balls > 0 ? (s.runs / s.balls) * 100 : 0;
    return {
      name,
      runs: s.runs,
      balls: s.balls,
      fours: s.fours,
      sixes: s.sixes,
      strikeRate: parseFloat(strikeRate.toFixed(1)),
      isOut: s.isOut,
      dismissedBy: s.dismissedBy || '',
    };
  });

  const bowlers: BowlerReport[] = bowlingOrder.map((name) => {
    const s = bowlersMap[name];
    const oversFraction = Math.floor(s.balls / 6) + (s.balls % 6) / 10;
    const oversVal = s.balls / 6;
    const economy = oversVal > 0 ? s.runs / oversVal : 0;
    return {
      name,
      overs: oversFraction.toFixed(1),
      runs: s.runs,
      wickets: s.wickets,
      economy: parseFloat(economy.toFixed(2)),
      maidens: bowlerMaidens[name] || 0,
      dotBalls: s.dotBalls,
    };
  });

  const overs: OverWiseReport[] = oversList.map((ov, idx) => ({
    overNum: idx + 1,
    bowler: ov.bowler,
    runs: ov.runsConceded,
    wickets: ov.wickets,
    detail: ov.deliveries.map(ball => ball.label).join(' '),
  }));

  const totalRuns = deliveries.reduce((sum, d) => sum + d.runs, 0);
  const validBallsCount = getValidBallsCount(deliveries);
  const oversFormatted = `${Math.floor(validBallsCount / 6)}.${validBallsCount % 6}`;

  return {
    teamName,
    batsmen,
    bowlers,
    overs,
    totalRuns,
    wicketsCount: wickets,
    oversCount: oversFormatted,
  };
}

export interface MatchPerformance {
  ranking: 1 | 2 | 3;
  name: string;
  type: 'BAT' | 'BOWL';
  stat: string;
  score: number;
}

// Compute Top 3 Match Performers (1st, 2nd, 3rd)
export function getTopPerformers(i1: InningsReport, i2: InningsReport): MatchPerformance[] {
  const allPerformers: { name: string; type: 'BAT' | 'BOWL'; stat: string; score: number }[] = [];

  // Add batsmen
  [...i1.batsmen, ...i2.batsmen].forEach((bat) => {
    // Score based on runs
    allPerformers.push({
      name: bat.name,
      type: 'BAT',
      stat: `${bat.runs} Runs (${bat.balls} balls, SR: ${bat.strikeRate})`,
      score: bat.runs * 2, // weight runs heavily
    });
  });

  // Add bowlers
  [...i1.bowlers, ...i2.bowlers].forEach((bowl) => {
    // Score based on wickets and economy
    const score = bowl.wickets * 25 + (10 - Math.min(10, bowl.economy)) * 2;
    allPerformers.push({
      name: bowl.name,
      type: 'BOWL',
      stat: `${bowl.wickets}/${bowl.runs} (Overs: ${bowl.overs}, Econ: ${bowl.economy})`,
      score: score,
    });
  });

  // Sort candidates by custom score
  allPerformers.sort((a, b) => b.score - a.score);

  // Return top 3
  const results: MatchPerformance[] = [];
  const seenNames = new Set<string>();

  for (const item of allPerformers) {
    if (seenNames.has(item.name) || item.name === 'Striker' || item.name === 'Non-Striker' || item.name === 'Bowler') continue;
    seenNames.add(item.name);
    results.push({
      ranking: (results.length + 1) as 1 | 2 | 3,
      name: item.name,
      type: item.type,
      stat: item.stat,
      score: Math.round(item.score),
    });
    if (results.length === 3) break;
  }

  // Fallback items if we don't have enough named players
  while (results.length < 3) {
    const idx = results.length + 1;
    results.push({
      ranking: idx as 1 | 2 | 3,
      name: `Performer ${idx}`,
      type: 'BAT',
      stat: 'N/A',
      score: 0,
    });
  }

  return results;
}

// Draw elegant headers and tables in PDF using jsPDF
export function exportCricketPDF(match: MatchState) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const i1Rep = computeInningsReport(match.innings1.teamName, match.innings1.deliveries, match.innings1.wickets);
  const i2Rep = computeInningsReport(match.innings2.teamName, match.innings2.deliveries, match.innings2.wickets);
  const top3 = getTopPerformers(i1Rep, i2Rep);

  let y = 15;

  const checkPageOverflow = (neededHeight: number) => {
    if (y + neededHeight > 275) {
      doc.addPage();
      y = 15;
      // Draw minimal header on new pages
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(15, 8, 195, 8);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`UmpScore Live Cricket Report | ${match.teamA} vs ${match.teamB}`, 15, 6);
    }
  };

  // MAIN GRAPHICAL HEADER
  doc.setFillColor(0, 168, 107); // UmpScore Theme Emerald Green
  doc.rect(15, y, 180, 24, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('MATCH SCORECARD REPORT', 22, y + 9);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(230, 255, 240);
  const statusString = match.status === 'completed'
    ? `WINNER: ${match.winner === 'Tie' ? 'MATCH TIED' : `${match.winner?.toUpperCase()} (${match.margin?.toUpperCase()})`}`
    : 'LIVE MATCH SCORECARD';
  doc.text(statusString, 22, y + 16);

  // Timestamp
  doc.setFontSize(8);
  doc.setTextColor(200, 245, 220);
  doc.text(`REPORT GENERATED: ${new Date().toLocaleString()}`, 130, y + 16);

  y += 33;

  // QUICK STATS CONTAINER
  checkPageOverflow(25);
  doc.setFillColor(242, 248, 245);
  doc.roundedRect(15, y, 180, 18, 2, 2, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 120, 80);
  doc.text(`${match.innings1.teamName.toUpperCase()} 1ST INNINGS`, 22, y + 7);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 40, 30);
  doc.text(`${i1Rep.totalRuns} / ${i1Rep.wicketsCount}`, 22, y + 14);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`(${i1Rep.oversCount} Overs)`, 48, y + 14);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 120, 80);
  doc.text(`${match.innings2.teamName.toUpperCase()} 2ND INNINGS`, 110, y + 7);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 40, 30);
  doc.text(`${i2Rep.totalRuns} / ${i2Rep.wicketsCount}`, 110, y + 14);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`(${i2Rep.oversCount} Overs)`, 136, y + 14);

  y += 28;

  // 1ST 2ND 3RD MATCH PERFORMANCE RANKINGS PLATFORM
  checkPageOverflow(46);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 168, 107);
  doc.text('👑 TOP 3 SPOTLIGHT PERFORMANCE AWARDS', 15, y);
  
  // Custom separator line
  doc.setDrawColor(0, 168, 107);
  doc.setLineWidth(0.6);
  doc.line(15, y + 2, 50, y + 2);
  
  y += 7;

  // Draw 1st, 2nd, 3rd honors columns
  const podiumColors = [
    { bg: [255, 248, 220], border: [218, 165, 32], text: '1ST GOLD MEDAL' }, // Gold
    { bg: [245, 245, 250], border: [169, 169, 169], text: '2ND SILVER MEDAL' }, // Silver
    { bg: [250, 240, 230], border: [205, 127, 50], text: '3RD BRONZE MEDAL' }, // Bronze
  ];

  const colWidth = 57;
  top3.forEach((perf, idx) => {
    const colX = 15 + idx * colWidth + (idx * 4);
    const color = podiumColors[idx];
    
    // Background highlight box
    doc.setFillColor(color.bg[0], color.bg[1], color.bg[2]);
    doc.roundedRect(colX, y, colWidth, 30, 1, 1, 'F');
    // Border accent
    doc.setDrawColor(color.border[0], color.border[1], color.border[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(colX, y, colWidth, 30, 1, 1, 'S');

    // Rank label
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(color.border[0], color.border[1], color.border[2]);
    doc.text(color.text, colX + 4, y + 5);

    // Player name
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    // Truncate player name if too long
    const shortName = perf.name.length > 20 ? perf.name.substring(0, 17) + '...' : perf.name;
    doc.text(shortName, colX + 4, y + 12);

    // Type Category Badge
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(perf.type === 'BAT' ? 0 : 220, perf.type === 'BAT' ? 168 : 50, perf.type === 'BAT' ? 107 : 50);
    doc.roundedRect(colX + 4, y + 15, perf.type === 'BAT' ? 13 : 15, 3.5, 0.5, 0.5, 'F');
    doc.text(perf.type === 'BAT' ? 'BATSMAN' : 'BOWLER', colX + 5.5, y + 17.8);

    // Performance Stats description
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const splitStat = doc.splitTextToSize(perf.stat, colWidth - 8);
    doc.text(splitStat, colX + 4, y + 23);
  });

  y += 40;

  // render inning details
  const renderInningsSection = (report: InningsReport) => {
    // INNINGS HEADER
    checkPageOverflow(12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(10, 40, 20);
    doc.text(`Scorecard: ${report.teamName} Innings`, 15, y);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 168, 107);
    doc.text(`${report.totalRuns}/${report.wicketsCount} (${report.oversCount} Ov)`, 160, y);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, y + 2, 195, y + 2);
    y += 7;

    // BATSMEN TABLE (which player make which run)
    checkPageOverflow(30);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 168, 107);
    doc.text('🏏 BATTING SCORECARD SUMMARY', 15, y);
    y += 4.5;

    // Header row
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, 180, 6, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('BATSMAN', 18, y + 4.2);
    doc.text('STATUS', 68, y + 4.2);
    doc.text('RUNS', 120, y + 4.2);
    doc.text('BALLS', 138, y + 4.2);
    doc.text('4S', 155, y + 4.2);
    doc.text('6S', 170, y + 4.2);
    doc.text('S/R', 183, y + 4.2);
    y += 6;

    if (report.batsmen.length === 0) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('No batsmen batted yet in this innings.', 18, y + 5);
      y += 8;
    } else {
      report.batsmen.forEach((bat) => {
        checkPageOverflow(7);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        doc.text(bat.name, 18, y + 5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        if (bat.isOut) {
          doc.setTextColor(180, 40, 40);
          doc.setFont('Helvetica', 'bold');
          doc.text(`Out (b. ${bat.dismissedBy || 'Bowler'})`, 68, y + 5);
        } else {
          doc.setTextColor(40, 140, 80);
          doc.text('Not Out', 68, y + 5);
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 100, 50);
        doc.text(bat.runs.toString(), 120, y + 5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(bat.balls.toString(), 138, y + 5);
        doc.text(bat.fours.toString(), 155, y + 5);
        doc.text(bat.sixes.toString(), 170, y + 5);
        doc.text(bat.strikeRate.toFixed(1), 183, y + 5);

        // Underline
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(15, y + 6.8, 195, y + 6.8);
        y += 7;
      });
    }

    y += 3;

    // BOWLER TABLE (who make good ball)
    checkPageOverflow(30);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(200, 40, 40);
    doc.text('🔴 BOWLING SPELLS ANALYSIS', 15, y);
    y += 4.5;

    // Header row
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, 180, 6, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('BOWLER', 18, y + 4.2);
    doc.text('OVERS', 65, y + 4.2);
    doc.text('MAIDENS', 85, y + 4.2);
    doc.text('DOT BALLS', 108, y + 4.2);
    doc.text('RUNS CONCEDED', 131, y + 4.2);
    doc.text('WICKETS', 165, y + 4.2);
    doc.text('ECONOMY', 183, y + 4.2);
    y += 6;

    if (report.bowlers.length === 0) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('No bowler completed a delivery yet.', 18, y + 5);
      y += 8;
    } else {
      report.bowlers.forEach((bowl) => {
        checkPageOverflow(7);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        doc.text(bowl.name, 18, y + 5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(bowl.overs, 65, y + 5);
        doc.text(bowl.maidens.toString(), 85, y + 5);
        doc.text((bowl.dotBalls || 0).toString(), 108, y + 5);
        doc.text(bowl.runs.toString(), 131, y + 5);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(180, 20, 20);
        doc.text(bowl.wickets.toString(), 165, y + 5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(bowl.economy.toFixed(2), 183, y + 5);

        // Underline
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(15, y + 6.8, 195, y + 6.8);
        y += 7;
      });
    }

    y += 3;

    // OVER-WISE TABLE (over wise run)
    checkPageOverflow(30);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('📊 OVER-BY-OVER PROGRESSION DETAILED LOG', 15, y);
    y += 4.5;

    // Header row
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, 180, 6, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('OVER #', 18, y + 4.2);
    doc.text('BOWLER', 45, y + 4.2);
    doc.text('RUNS CONCEDED', 95, y + 4.2);
    doc.text('WICKETS TALLIED', 130, y + 4.2);
    doc.text('BALL-BY-BALL CHRONICLE', 160, y + 4.2);
    y += 6;

    if (report.overs.length === 0) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('No overs recorded yet.', 18, y + 5);
      y += 8;
    } else {
      report.overs.forEach((ov) => {
        checkPageOverflow(7);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Over ${ov.overNum}`, 18, y + 5);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.text(ov.bowler, 45, y + 5);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 100, 50);
        doc.text(`${ov.runs} runs`, 95, y + 5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        if (ov.wickets > 0) {
          doc.setTextColor(180, 20, 20);
        } else {
          doc.setTextColor(100, 100, 100);
        }
        doc.text(`${ov.wickets} W`, 130, y + 5);

        // Highlight visual layout for ball indicators
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 102, 204);
        doc.text(ov.detail, 160, y + 5);

        // Underline
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(15, y + 6.8, 195, y + 6.8);
        y += 7;
      });
    }

    y += 7; // spacing between innings
  };

  // Render Innings 1 Scorecard
  renderInningsSection(i1Rep);

  // Render Innings 2 Scorecard (if started)
  if (match.innings2.deliveries.length > 0) {
    renderInningsSection(i2Rep);
  }

  // Draw clean, stylish footer line on final page as sign of craft
  checkPageOverflow(12);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(15, y, 195, y);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for choosing UmpScore. Live cleanly and practice well!', 15, y + 5);

  // Download PDF file locally
  doc.save(`UmpScore_${match.teamA}_vs_${match.teamB}_Scorecard.pdf`);
}
