"use client";

import { motion } from "framer-motion";

interface SonarPulseProps {
  duration?: number;
  size?: number;
  intensity?: number;
}

export function SonarPulse({
  duration = 1.5,
  size = 200,
  intensity = 0.8,
}: SonarPulseProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Center dot */}
      <div className="absolute w-3 h-3 rounded-full bg-accent shadow-cobalt" />
      
      {/* Sonar waves */}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute rounded-full border-2 border-accent"
          style={{
            width: size,
            height: size,
          }}
          initial={{
            opacity: intensity,
            scale: 0,
          }}
          animate={{
            opacity: 0,
            scale: 1,
          }}
          transition={{
            duration,
            delay: index * (duration / 3),
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
      
      {/* Glow effect */}
      <motion.div
        className="absolute rounded-full bg-gradient-to-r from-accent/50 to-accent/0 blur-xl"
        style={{
          width: size * 1.2,
          height: size * 1.2,
        }}
        animate={{
          opacity: [intensity / 2, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
    </div>
  );
}
