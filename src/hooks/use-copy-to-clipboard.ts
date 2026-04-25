"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
}

/**
 * Hook that copies text to clipboard with visual feedback.
 * Sets `copied` to true for `duration` ms after a successful copy,
 * then auto-resets. Uses a ref-based debounce so rapid calls don't
 * prematurely reset the "copied" indicator.
 *
 * Also shows a brief toast notification on copy success.
 */
export function useCopyToClipboard(duration = 1800): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      let success = false;
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        // Fallback for environments where clipboard API is restricted
        try {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          success = true;
        } catch {
          toast.error("复制失败，请手动复制");
          return false;
        }
      }

      if (success) {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), duration);
        toast.success("已复制到剪贴板", { duration: 1200, description: text.slice(0, 50) + (text.length > 50 ? "..." : "") });
      }

      return success;
    },
    [duration],
  );

  return { copied, copy };
}
