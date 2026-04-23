"use client";

import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ContentPost } from "@/types";
import {
  POST_STATUS_LABELS,
  XHS_CONTENT_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_COLORS,
  CONTENT_TYPE_COLORS,
  PostStatus,
  XHSContentType,
  ContentType,
  PLATFORM_LABELS,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  BarChart3,
  Copy,
  Star,
  MessageCircle,
  Heart,
  Eye as EyeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { safeFormat } from "@/lib/safe-date";

// --- Helpers ---

function getContentTypeLabel(post: ContentPost) {
  if (post.platform === "xiaohongshu")
    return XHS_CONTENT_TYPE_LABELS[post.contentType as XHSContentType] || post.contentType;
  return CONTENT_TYPE_LABELS[post.contentType as ContentType] || post.contentType;
}

function getContentTypeColor(post: ContentPost) {
  if (post.platform === "xiaohongshu")
    return XHS_CONTENT_TYPE_COLORS[post.contentType as XHSContentType] || "";
  return CONTENT_TYPE_COLORS[post.contentType as ContentType] || "";
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "published":
      return "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300";
    case "optimized":
      return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300";
    case "generated":
      return "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getPlatformBadgeColor(platform?: string) {
  if (platform === "xiaohongshu")
    return "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300";
  return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300";
}

function getPlatformAccentColor(platform?: string) {
  return platform === "xiaohongshu"
    ? "border-t-rose-400 dark:border-t-rose-500"
    : "border-t-green-400 dark:border-t-green-500";
}

// --- Types ---

interface HoverPreviewProps {
  post: ContentPost;
  anchorRect: DOMRect | null;
  containerRect: DOMRect | null;
  visible: boolean;
  onEdit: (post: ContentPost) => void;
  onViewAnalytics: (post: ContentPost) => void;
  onCopy: (post: ContentPost) => void;
}

// --- Animation ---

const previewVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 4,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

// --- Component ---

export function ContentHoverPreview({
  post,
  anchorRect,
  containerRect,
  visible,
  onEdit,
  onViewAnalytics,
  onCopy,
}: HoverPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [showDelay, setShowDelay] = useState(false);

  // Delay appearance slightly for stability
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (visible && anchorRect) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      const timer = setTimeout(() => setShowDelay(true), 150);
      return () => clearTimeout(timer);
    } else {
      hideTimerRef.current = setTimeout(() => setShowDelay(false), 0);
    }
  }, [visible, anchorRect]);

  // Calculate smart position
  const positionStyle = useSmartPosition(anchorRect, containerRect);

  // Arrow position based on alignment
  const arrowStyle = useMemoArrowStyle(anchorRect, containerRect);

  const platformLabel = post.platform
    ? PLATFORM_LABELS[post.platform as keyof typeof PLATFORM_LABELS] || post.platform
    : "朋友圈";

  const statusLabel = POST_STATUS_LABELS[post.status as PostStatus] || post.status;
  const contentPreview =
    post.content && post.content.length > 100
      ? post.content.slice(0, 100) + "…"
      : post.content;

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(post);
    },
    [post, onEdit],
  );

  const handleAnalytics = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onViewAnalytics(post);
    },
    [post, onViewAnalytics],
  );

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCopy(post);
      toast.success("已复制内容", { description: post.topic });
    },
    [post, onCopy],
  );

  if (!showDelay || !anchorRect || !containerRect) return null;

  return (
    <AnimatePresence>
      {showDelay && (
        <motion.div
          ref={previewRef}
          variants={previewVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: "fixed",
            ...positionStyle,
            zIndex: 9999,
            pointerEvents: "auto",
          }}
          className="w-[280px] max-w-[280px]"
        >
          <div
            className={`
              rounded-lg border border-border/60 shadow-xl shadow-black/10
              bg-background/80 backdrop-blur-xl backdrop-saturate-150
              border-t-[3px] ${getPlatformAccentColor(post.platform)}
              overflow-hidden
            `}
          >
            {/* Header: Platform + Status badges */}
            <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
              <div className="flex items-center gap-1">
                <Badge
                  className={`text-[9px] px-1.5 py-0 h-5 leading-5 font-medium ${getPlatformBadgeColor(post.platform)}`}
                  variant="secondary"
                >
                  {platformLabel}
                </Badge>
                <Badge
                  className={`text-[9px] px-1.5 py-0 h-5 leading-5 font-medium ${getContentTypeColor(post)}`}
                  variant="secondary"
                >
                  {getContentTypeLabel(post)}
                </Badge>
              </div>
              <Badge
                className={`text-[9px] px-1.5 py-0 h-5 leading-5 font-medium ${getStatusBadgeColor(post.status)}`}
                variant="secondary"
              >
                {statusLabel}
              </Badge>
            </div>

            {/* Content */}
            <div className="px-3 py-1.5 space-y-1.5">
              {/* Topic */}
              <h4 className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                {post.topic}
              </h4>

              {/* Content preview */}
              {contentPreview && (
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
                  {contentPreview}
                </p>
              )}

              {/* Scheduled date */}
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70">
                <span>排期：</span>
                <span className="tabular-nums font-medium text-muted-foreground">
                  {safeFormat(post.scheduledDate, "yyyy年M月d日 EEEE")}
                </span>
              </div>

              {/* AI Score */}
              {post.aiScore > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {post.aiScore}
                    </span>
                  </div>
                  {post.views > 0 && (
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <EyeIcon className="h-2.5 w-2.5" />
                      <span className="text-[9px] tabular-nums">{post.views}</span>
                    </div>
                  )}
                  {post.likes > 0 && (
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <Heart className="h-2.5 w-2.5" />
                      <span className="text-[9px] tabular-nums">{post.likes}</span>
                    </div>
                  )}
                  {post.comments > 0 && (
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <MessageCircle className="h-2.5 w-2.5" />
                      <span className="text-[9px] tabular-nums">{post.comments}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-border/40" />

            {/* Action buttons */}
            <div className="flex items-center gap-1 px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                onClick={handleEdit}
              >
                <Pencil className="h-3 w-3" />
                编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                onClick={handleAnalytics}
              >
                <BarChart3 className="h-3 w-3" />
                数据
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 ml-auto"
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3" />
                复制
              </Button>
            </div>
          </div>

          {/* Arrow pointer */}
          {arrowStyle && (
            <div
              style={arrowStyle}
              className="absolute w-2.5 h-2.5 rotate-45 bg-background/80 backdrop-blur-xl border border-border/60 z-10"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Hook: smart edge-aware positioning ---

function useSmartPosition(
  anchorRect: DOMRect | null,
  containerRect: DOMRect | null,
): CSSProperties {
  if (!anchorRect || !containerRect) return {};

  const GAP = 8;
  const PREVIEW_W = 280;
  const PREVIEW_EST_H = 220;

  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;

  // Prefer right side
  const spaceRight = window.innerWidth - anchorRect.right;
  const spaceLeft = anchorRect.left;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;

  let left: number;
  let top: number;

  // Horizontal: prefer right, fallback left
  if (spaceRight >= PREVIEW_W + GAP) {
    left = anchorRect.right + GAP;
  } else if (spaceLeft >= PREVIEW_W + GAP) {
    left = anchorRect.left - PREVIEW_W - GAP;
  } else {
    // Center below/above if not enough horizontal space
    left = Math.max(GAP, Math.min(anchorCenterX - PREVIEW_W / 2, window.innerWidth - PREVIEW_W - GAP));
  }

  // Vertical: prefer below center, then above
  if (spaceBelow >= PREVIEW_EST_H + GAP) {
    top = anchorCenterY - 20;
  } else if (spaceAbove >= PREVIEW_EST_H + GAP) {
    top = anchorCenterY - PREVIEW_EST_H + 20;
  } else {
    top = Math.max(GAP, Math.min(anchorCenterY - PREVIEW_EST_H / 2, window.innerHeight - PREVIEW_EST_H - GAP));
  }

  // Clamp to viewport
  left = Math.max(GAP, Math.min(left, window.innerWidth - PREVIEW_W - GAP));
  top = Math.max(GAP, Math.min(top, window.innerHeight - 60));

  return { left, top };
}

// --- Hook: arrow pointing at anchor ---

function useMemoArrowStyle(
  anchorRect: DOMRect | null,
  _containerRect: DOMRect | null,
): CSSProperties | null {
  if (!anchorRect) return null;

  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const spaceRight = window.innerWidth - anchorRect.right;
  const spaceLeft = anchorRect.left;

  // Determine which side the preview is on
  const onRight = spaceRight >= 280 + 8;

  if (onRight) {
    // Arrow points left, positioned at the left edge of preview
    const top = anchorRect.top + anchorRect.height / 2 - 5;
    return {
      left: -5,
      top: Math.max(8, top),
    };
  } else if (spaceLeft >= 280 + 8) {
    // Arrow points right
    const top = anchorRect.top + anchorRect.height / 2 - 5;
    return {
      right: -5,
      top: Math.max(8, top),
    };
  }

  return null; // No arrow if centered
}

// --- Hover hook for calendar cells ---

interface UseContentHoverResult {
  hoveredPost: ContentPost | null;
  anchorRect: DOMRect | null;
  containerRect: DOMRect | null;
  handleMouseEnter: (e: React.MouseEvent, post: ContentPost) => void;
  handleMouseMove: (e: React.MouseEvent, post: ContentPost) => void;
  handleMouseLeave: () => void;
}

export function useContentHover(): UseContentHoverResult {
  const [hoveredPost, setHoveredPost] = useState<ContentPost | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, post: ContentPost) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      containerRef.current = e.currentTarget as HTMLElement;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setAnchorRect(rect);
      // Find nearest scrollable container
      let parent = (e.currentTarget as HTMLElement).parentElement;
      while (parent) {
        if (parent.scrollHeight > parent.clientHeight) {
          setContainerRect(parent.getBoundingClientRect());
          break;
        }
        parent = parent.parentElement;
      }
      setHoveredPost(post);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, post: ContentPost) => {
      // Only update position, not post (avoid flicker)
      if (hoveredPost?.id === post.id) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setAnchorRect(rect);
      } else {
        handleMouseEnter(e, post);
      }
    },
    [hoveredPost, handleMouseEnter],
  );

  const handleMouseLeave = useCallback(() => {
    // Delay dismiss to allow mouse to move to preview
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setHoveredPost(null);
      setAnchorRect(null);
    }, 120);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    hoveredPost,
    anchorRect,
    containerRect,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
  };
}
