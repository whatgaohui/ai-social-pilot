"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X } from "lucide-react";

// ─── Stack Context ─────────────────────────────────────────────────────────

interface BottomSheetStackContextType {
  depth: number;
  register: () => void;
  unregister: () => void;
}

const BottomSheetStackContext = createContext<BottomSheetStackContextType>({
  depth: 0,
  register: () => {},
  unregister: () => {},
});

export function useBottomSheetStack() {
  return useContext(BottomSheetStackContext);
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  /** If true, sheet will try to adjust when keyboard appears */
  keyboardAware?: boolean;
  className?: string;
  /** Optional footer content */
  footer?: ReactNode;
}

const DEFAULT_SNAP_POINTS = [0.25, 0.5, 0.75, 1.0];

// ─── Spring Configs ───────────────────────────────────────────────────────

const SHEET_SPRING = { type: "spring" as const, stiffness: 350, damping: 32 };
const BACKDROP_SPRING = { type: "spring" as const, stiffness: 400, damping: 40 };

// ─── Component ────────────────────────────────────────────────────────────

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = DEFAULT_SNAP_POINTS,
  initialSnap = 1,
  keyboardAware = true,
  className = "",
  footer,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const stackCtx = useBottomSheetStack();
  const [depth, setDepth] = useState(stackCtx.depth);

  // Register in stack — depth is tracked via callback from context
  useEffect(() => {
    stackCtx.register();
    return () => {
      stackCtx.unregister();
    };
  }, [stackCtx]);

  // Keyboard awareness
  useEffect(() => {
    if (!keyboardAware) return;

    function onVisualViewportResize() {
      const vv = window.visualViewport;
      if (vv) {
        const offset = window.innerHeight - vv.height;
        setKeyboardOffset(offset > 100 ? offset : 0);
      }
    }

    window.visualViewport?.addEventListener("resize", onVisualViewportResize);
    window.visualViewport?.addEventListener("scroll", onVisualViewportResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", onVisualViewportResize);
      window.visualViewport?.removeEventListener("scroll", onVisualViewportResize);
    };
  }, [keyboardAware]);

  // Reset snap when opened — use ref to avoid setState in effect
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Just opened
      requestAnimationFrame(() => {
        setCurrentSnap(initialSnap);
        setKeyboardOffset(0);
      });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialSnap]);

  const snapHeight = snapPoints[currentSnap] ?? snapPoints[snapPoints.length - 1];
  const sheetMaxH = `calc(${snapHeight * 100}% - env(safe-area-inset-top, 0px))`;

  const findNearestSnap = useCallback(
    (y: number) => {
      const vh = window.innerHeight;
      const currentH = vh * (1 - y / vh);
      let nearest = 0;
      let minDist = Infinity;
      for (let i = 0; i < snapPoints.length; i++) {
        const dist = Math.abs(snapPoints[i] * vh - currentH);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
      return nearest;
    },
    [snapPoints],
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      const { velocity, offset } = info;

      if (velocity.y > 500 || offset.y > 150) {
        onClose();
        return;
      }
      if (velocity.y < -500) {
        const maxSnap = snapPoints.length - 1;
        setCurrentSnap(Math.min(currentSnap + 1, maxSnap));
        return;
      }

      const newSnap = findNearestSnap(offset.y);
      setCurrentSnap(newSnap);
    },
    [currentSnap, findNearestSnap, onClose, snapPoints.length],
  );

  const handleBackdropClick = useCallback(() => {
    if (Date.now() - lastTapRef.current < 300) return;
    lastTapRef.current = Date.now();
    onClose();
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const zIndex = 50 + depth * 10;
  const backdropOpacity = Math.min(0.15 + depth * 0.1, 0.5);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: backdropOpacity }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_SPRING}
            onClick={handleBackdropClick}
            className="bottom-sheet-backdrop fixed inset-0 z-[var(--bs-z-index)] bg-black/40 backdrop-blur-sm"
            style={{ ["--bs-z-index" as string]: `${zIndex}` }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{
              y: keyboardOffset > 0
                ? `${-keyboardOffset}px`
                : "0%",
              height: keyboardOffset > 0
                ? `calc(${snapHeight * 100}% + ${keyboardOffset}px - env(safe-area-inset-top, 0px))`
                : sheetMaxH,
            }}
            exit={{ y: "100%" }}
            transition={SHEET_SPRING}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.4 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            onPointerDown={() => {
              lastTapRef.current = Date.now();
            }}
            className={`bottom-sheet fixed inset-x-0 bottom-0 z-[calc(var(--bs-z-index)+1)] flex flex-col rounded-t-2xl bg-background border-t border-border/50 shadow-2xl ${
              isDragging ? "select-none" : ""
            } ${className}`}
            style={{
              ["--bs-z-index" as string]: `${zIndex}`,
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              maxHeight: "96dvh",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Drag Handle (pill) */}
            <div className="bottom-sheet-handle flex justify-center pt-2.5 pb-1 touch-none">
              <div className="h-1 w-9 rounded-full bg-muted-foreground/30 transition-colors active:bg-muted-foreground/50" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 pb-2 pt-0.5">
                <h2 className="text-sm font-semibold text-foreground truncate pr-8">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors tap-target flex-shrink-0"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Snap point indicator dots */}
            {snapPoints.length > 1 && (
              <div className="flex items-center justify-center gap-1 px-4 pb-2">
                {snapPoints.map((_, idx) => (
                  <motion.div
                    key={idx}
                    className="h-1 rounded-full transition-all duration-200"
                    animate={{
                      width: idx === currentSnap ? 12 : 4,
                      backgroundColor:
                        idx === currentSnap
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground) / 0.2)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain smooth-scroll px-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-border/40 px-4 pt-3 pb-2 safe-area-bottom">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Bottom Sheet Provider (for stack support) ────────────────────────────

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const register = useCallback(() => setCount((c) => c + 1), []);
  const unregister = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return (
    <BottomSheetStackContext.Provider value={{ depth: count, register, unregister }}>
      {children}
    </BottomSheetStackContext.Provider>
  );
}
