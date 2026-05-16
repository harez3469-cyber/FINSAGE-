import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface WaveformProps {
  isAnimating: boolean;
  color?: string;
  barCount?: number;
  className?: string;
}

const Waveform: React.FC<WaveformProps> = ({ 
  isAnimating, 
  color = "bg-white", 
  barCount = 5,
  className 
}) => {
  return (
    <div className={cn("flex items-center gap-1 h-6", className)}>
      {[...Array(barCount)].map((_, i) => (
        <motion.div
          key={i}
          animate={isAnimating ? { 
            height: [4, Math.random() * 16 + 8, 4],
            opacity: [0.4, 1, 0.4]
          } : { 
            height: 4,
            opacity: 0.3
          }}
          transition={isAnimating ? { 
            repeat: Infinity, 
            duration: 0.5 + Math.random() * 0.5, 
            delay: i * 0.1,
            ease: "easeInOut"
          } : { duration: 0.2 }}
          className={cn("w-1 rounded-full", color)}
        />
      ))}
    </div>
  );
};

export default Waveform;
