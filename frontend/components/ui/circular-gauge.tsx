"use client";

import {motion} from "framer-motion";

interface CircularGaugeProps {
  value: number;
  label: string;
}

export function CircularGauge({value, label}: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r={radius} stroke="#1f1f24" strokeWidth="8" />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          stroke="url(#lumarisGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{strokeDashoffset: offset}}
          transition={{duration: 0.8, ease: "easeOut"}}
        />
        <defs>
          <linearGradient id="lumarisGradient" x1="0" y1="0" x2="120" y2="120">
            <stop offset="0%" stopColor="#4DA751" />
            <stop offset="100%" stopColor="#C8E43B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-2xl text-white">{clamped.toFixed(0)}%</p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      </div>
      <span className="absolute inset-0 animate-ping rounded-full border border-[#4DA751]/25" />
    </div>
  );
}
