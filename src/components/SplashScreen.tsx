import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CricketBallLogo from './CricketBallLogo';

interface SplashScreenProps {
  onComplete: () => void;
  key?: string;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fill progress bar from 0% to 100% over 1.8 seconds.
    const duration = 1800; 
    const intervalTime = 30;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          // Wait slightly after reaching 100% to trigger exit
          setTimeout(onComplete, 200);
          return 100;
        }
        return Math.min(100, prev + increment);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      id="splash-screen-container"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020617] text-white overflow-hidden select-none"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 1.05,
        filter: "blur(8px)",
        transition: { duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] }
      }}
    >
      {/* Immersive Cricket Stadium Subtle Light Ray Background */}
      <div className="absolute inset-0 bg-radial-gradient from-emerald-950/20 via-slate-950/40 to-[#020617] opacity-80 pointer-events-none" />
      
      {/* Decorative Subtle Glowing Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-emerald-500/5 animate-pulse duration-[4000ms] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-emerald-500/10 pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-sm px-6 text-center z-10 space-y-8">
        
        {/* Centered Logo with Emerald Pulsing Halo */}
        <motion.div
          id="splash-logo-wrapper"
          className="relative inline-flex items-center justify-center p-6 rounded-[2.5rem] bg-slate-900/40 border border-slate-800 backdrop-blur-md shadow-2xl"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 100, 
            damping: 15,
            delay: 0.1 
          }}
        >
          {/* Subtle logo pulse ripple effect */}
          <span className="absolute inset-0 rounded-[2.5rem] bg-emerald-500/10 animate-ping opacity-25 pointer-events-none" style={{ animationDuration: '3s' }} />
          
          <CricketBallLogo size={110} className="drop-shadow-2xl" />
        </motion.div>

        {/* Dynamic App Brand Typography */}
        <div className="space-y-1">
          <motion.h1
            id="splash-title"
            className="text-2xl font-black uppercase tracking-widest bg-gradient-to-r from-emerald-400 via-teal-100 to-white bg-clip-text text-transparent"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Cricket Score Tracker
          </motion.h1>
          <motion.div
            id="splash-subtitle-container"
            className="flex items-center justify-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <span className="h-px w-5 bg-emerald-500/50" />
            <p className="text-[10px] font-mono tracking-[0.25em] text-emerald-400 uppercase font-bold">
              PREMIUM SCORER (CST)
            </p>
            <span className="h-px w-5 bg-emerald-500/50" />
          </motion.div>
        </div>

        {/* Loading Bar & Progress */}
        <motion.div 
          id="splash-progress-wrapper"
          className="w-48 space-y-2 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <div className="w-full bg-slate-950/80 rounded-full h-1.5 border border-slate-850 overflow-hidden relative">
            <motion.div
              id="splash-progress-bar"
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[8px] font-black tracking-widest text-emerald-400 font-mono uppercase">
              INITIALIZING
            </span>
            <span className="text-[9px] font-bold text-gray-400 font-mono tracking-tighter">
              {Math.round(progress)}%
            </span>
          </div>
        </motion.div>
      </div>

      {/* Humble Signature Card footer (no simulated telemetry or port log slop) */}
      <motion.div
        id="splash-footer"
        className="absolute bottom-8 text-center text-gray-500 dark:text-gray-600 text-[9px] font-mono tracking-[0.15em] opacity-50 uppercase font-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.8 }}
      >
        Official Brand Scorer Edition
      </motion.div>
    </motion.div>
  );
}
