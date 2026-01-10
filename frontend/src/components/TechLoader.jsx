import { motion } from 'framer-motion';

export default function TechLoader({ className }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Core Sphere */}
      <motion.div
        className="w-3 h-3 rounded-full bg-white shadow-[0_0_15px_rgba(99,102,241,0.6)] z-10"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Inner Orbit */}
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/30"
        style={{ width: '100%', height: '100%' }}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 3, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      {/* Outer Glow Ring */}
      <motion.div
        className="absolute -inset-1 rounded-full border border-primary/10 blur-[1px]"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut"
        }}
      />
    </div>
  );
}
