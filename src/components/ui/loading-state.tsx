"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LoadingStateProps {
  /** Optional loading text below the indicator */
  text?: string;
  /** Visual variant */
  variant?: "spinner" | "dots" | "shimmer" | "pulse";
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerFade = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// ─── Spinner Variant ────────────────────────────────────────────────────────

function SpinnerLoading({ text }: { text?: string }) {
  return (
    <motion.div
      variants={containerFade}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center gap-3"
    >
      <div className="relative h-10 w-10">
        {/* Rotating gradient ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" as const }}
          className="absolute inset-0 rounded-full"
        >
          <div className="h-full w-full rounded-full border-[3px] border-transparent border-t-violet-500 border-r-violet-400" />
        </motion.div>
        {/* Inner pulse dot */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" as const }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-2 w-2 rounded-full bg-violet-500" />
        </motion.div>
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs text-muted-foreground"
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── Dots Variant ───────────────────────────────────────────────────────────

function DotsLoading({ text }: { text?: string }) {
  return (
    <motion.div
      variants={containerFade}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center gap-3"
    >
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -8, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut" as const,
            }}
            className="h-2 w-2 rounded-full bg-violet-500"
          />
        ))}
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs text-muted-foreground"
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── Shimmer Variant ────────────────────────────────────────────────────────

function ShimmerLoading() {
  const shimmerVariants = {
    initial: { backgroundPosition: "-200% 0" },
    animate: {
      backgroundPosition: "200% 0",
      transition: { repeat: Infinity, duration: 1.8, ease: "linear" as const },
    },
  };

  return (
    <motion.div
      variants={containerFade}
      initial="hidden"
      animate="visible"
      className="space-y-3 w-full"
    >
      {/* Card 1 */}
      <div className="rounded-xl overflow-hidden">
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="h-24 w-full bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] rounded-xl"
        />
      </div>
      {/* Card 2 */}
      <div className="rounded-xl overflow-hidden">
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" as const, delay: 0.2 }}
          className="h-16 w-4/5 bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] rounded-xl"
        />
      </div>
      {/* Card 3 */}
      <div className="rounded-xl overflow-hidden">
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" as const, delay: 0.4 }}
          className="h-12 w-3/5 bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] rounded-xl"
        />
      </div>
    </motion.div>
  );
}

// ─── Pulse Variant ──────────────────────────────────────────────────────────

function PulseLoading({ text }: { text?: string }) {
  return (
    <motion.div
      variants={containerFade}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center gap-3"
    >
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut" as const,
        }}
        className="flex items-center justify-center h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30"
      >
        <Loader2 className="h-5 w-5 text-violet-500" />
      </motion.div>
      {text && (
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut" as const,
          }}
          className="text-xs text-muted-foreground"
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function LoadingState({ text, variant = "spinner" }: LoadingStateProps) {
  switch (variant) {
    case "dots":
      return <DotsLoading text={text} />;
    case "shimmer":
      return <ShimmerLoading />;
    case "pulse":
      return <PulseLoading text={text} />;
    case "spinner":
    default:
      return <SpinnerLoading text={text} />;
  }
}
