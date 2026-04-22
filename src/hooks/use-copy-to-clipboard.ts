"use client";

import { useState, useCallback, useRef } from "react";

interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
}

/**
 * Hook that copies text to clipboard with visual feedback.
 * Sets `copied` to true for `duration` ms after a successful copy,
 * then auto-resets. Uses a ref-based debounce so rapid calls don't
 * prematurely reset the "copied" indicator.
 */
export function useCopyToClipboard(duration = 1800): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), duration);
        return true;
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
          setCopied(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setCopied(false), duration);
          return true;
        } catch {
          return false;
        }
      }
    },
    [duration],
  );

  return { copied, copy };
}
