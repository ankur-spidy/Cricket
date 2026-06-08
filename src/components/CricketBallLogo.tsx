import React from 'react';

interface CricketBallLogoProps extends React.ComponentPropsWithoutRef<'svg'> {
  size?: number;
  className?: string;
}

export default function CricketBallLogo({ size = 48, className, ...props }: CricketBallLogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        {/* Background Shadow */}
        <filter id="logoShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="20" stdDeviation="25" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
        
        {/* 3D Sphere Radial Gradient */}
        <radialGradient id="logoSphereGrad" cx="35%" cy="30%" r="70%" fx="35%" fy="30%">
          <stop offset="0%" stopColor="#ff4d4d"/>
          <stop offset="25%" stopColor="#d60000"/>
          <stop offset="65%" stopColor="#800000"/>
          <stop offset="90%" stopColor="#4a0000"/>
          <stop offset="100%" stopColor="#1f0000"/>
        </radialGradient>

        {/* Gloss Highlight */}
        <linearGradient id="logoGlossGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Shadow Outer */}
      <circle cx="256" cy="256" r="230" fill="black" opacity="0.15" filter="url(#logoShadow)" />

      {/* Ball Base Sphere */}
      <circle cx="256" cy="256" r="236" fill="url(#logoSphereGrad)" />

      {/* Stitching and Seam Groups */}
      {/* Row L2 (Far Left Stitching) */}
      <path d="M 256 20 C 60 110, 60 402, 256 492" stroke="white" strokeWidth="4.5" strokeDasharray="12 10" strokeLinecap="round" fill="none" opacity="0.65" />

      {/* Row L1 (Inner Left Stitching) */}
      <path d="M 256 20 C 95 110, 95 402, 256 492" stroke="white" strokeWidth="4.5" strokeDasharray="12 10" strokeLinecap="round" fill="none" opacity="0.85" />

      {/* The Main Seam Stripe (Thick White Band) */}
      <path d="M 256 20 C 130 110, 130 402, 256 492" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" fill="none" />
      
      {/* Central Seam Split (A Shadow/Crease Line) */}
      <path d="M 256 20 C 130 110, 130 402, 256 492" stroke="#4a0000" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />

      {/* Row R1 (Inner Right Stitching) */}
      <path d="M 256 20 C 165 110, 165 402, 256 492" stroke="white" strokeWidth="4.5" strokeDasharray="12 10" strokeLinecap="round" fill="none" opacity="0.85" />

      {/* Row R2 (Far Right Stitching) */}
      <path d="M 256 20 C 200 110, 200 402, 256 492" stroke="white" strokeWidth="4.5" strokeDasharray="12 10" strokeLinecap="round" fill="none" opacity="0.65" />

      {/* Glossy Highlights for 3D realism */}
      {/* Top Left Soft White Overlay */}
      <ellipse cx="180" cy="140" rx="90" ry="50" fill="url(#logoGlossGrad)" transform="rotate(-35, 180, 140)" />
    </svg>
  );
}
