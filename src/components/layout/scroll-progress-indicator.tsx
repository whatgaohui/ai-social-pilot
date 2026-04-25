"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";

// ─── Scroll Progress Indicator ──────────────────────────────────────────────

export function ScrollProgressIndicator() {
  const [progress, setProgress] = useState(0);
  const platform = useAppStore((s) => s.platform);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress((scrollTop / docHeight) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 z-[60] h-0.5 w-full pointer-events-none"
      aria-hidden="true"
    >
      <motion.div
        className={`h-full bg-gradient-to-r ${platform === 'xiaohongshu' ? 'from-rose-500 to-pink-500' : 'from-violet-500 to-purple-500'}`}
        style={{ width: `${progress}%` }}
        transition={{ duration: 0 }}
      />
    </div>
  );
}
