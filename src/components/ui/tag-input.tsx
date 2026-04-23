"use client";

import * as React from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TagInputProps {
  /** Controlled tags */
  value?: string[];
  /** Default tags for uncontrolled usage */
  defaultValue?: string[];
  /** Callback when tags change */
  onChange?: (tags: string[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum number of tags */
  maxTags?: number;
  /** Duplicate detection */
  allowDuplicates?: boolean;
  /** Characters that trigger tag addition (default: Enter and comma) */
  delimiterKeys?: string[];
  /** Separator string for paste splitting (default: ",") */
  pasteSeparator?: string;
  /** Custom tag validation */
  validateTag?: (tag: string) => boolean | string;
  /** Tag render function */
  renderTag?: (tag: string, index: number, onRemove: () => void) => React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Error message */
  error?: string;
  /** Additional class name */
  className?: string;
  /** Input class name */
  inputClassName?: string;
  /** Tag class name */
  tagClassName?: string;
  /** ID attribute */
  id?: string;
  /** Name attribute */
  name?: string;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const tagVariants = {
  initial: { opacity: 0, scale: 0.8, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, y: 4, transition: { duration: 0.15 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TagInput({
  value: controlledValue,
  defaultValue = [],
  onChange,
  placeholder = "输入后按 Enter 添加标签",
  maxTags = 10,
  allowDuplicates = false,
  delimiterKeys = ["Enter", ","],
  pasteSeparator = ",",
  validateTag,
  renderTag,
  disabled = false,
  readOnly = false,
  error,
  className,
  inputClassName,
  tagClassName,
  id,
  name,
}: TagInputProps) {
  // Internal state for uncontrolled mode
  const [internalTags, setInternalTags] = React.useState<string[]>(defaultValue);
  const [inputValue, setInputValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const tags = controlledValue !== undefined ? controlledValue : internalTags;
  const setTags = React.useCallback(
    (newTags: string[]) => {
      if (controlledValue === undefined) {
        setInternalTags(newTags);
      }
      onChange?.(newTags);
    },
    [controlledValue, onChange]
  );

  const isMaxReached = tags.length >= maxTags;

  // Add a tag
  const addTag = React.useCallback(
    (raw: string) => {
      const tag = raw.trim();
      if (!tag) return;

      // Validate
      if (validateTag) {
        const result = validateTag(tag);
        if (result !== true) {
          return; // Either false or error string
        }
      }

      // Duplicate check
      if (!allowDuplicates) {
        const isDuplicate = tags.some(
          (t) => t.toLowerCase() === tag.toLowerCase()
        );
        if (isDuplicate) {
          setInputValue("");
          return;
        }
      }

      // Max check
      if (isMaxReached) return;

      const newTags = [...tags, tag];
      setTags(newTags);
      setInputValue("");
    },
    [tags, setTags, validateTag, allowDuplicates, isMaxReached]
  );

  // Remove a tag
  const removeTag = React.useCallback(
    (index: number) => {
      const newTags = tags.filter((_, i) => i !== index);
      setTags(newTags);
    },
    [tags, setTags]
  );

  // Handle keyboard events
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled || readOnly) return;

      if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        e.preventDefault();
        removeTag(tags.length - 1);
        return;
      }

      if (delimiterKeys.includes(e.key)) {
        e.preventDefault();
        addTag(inputValue);
      }
    },
    [disabled, readOnly, inputValue, tags, delimiterKeys, addTag, removeTag]
  );

  // Handle paste — split by separator
  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled || readOnly) return;
      const pastedText = e.clipboardData.getData("text/plain");
      if (pastedText.includes(pasteSeparator)) {
        e.preventDefault();
        const pastedTags = pastedText
          .split(pasteSeparator)
          .map((t) => t.trim())
          .filter(Boolean);

        for (const tag of pastedTags) {
          if (tags.length + (pastedTags.indexOf(tag)) >= maxTags) break;
          addTag(tag);
        }
      }
    },
    [disabled, readOnly, pasteSeparator, addTag, tags.length, maxTags]
  );

  // Handle swipe to remove on mobile
  const handleDragEnd = React.useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -60) {
        // Swipe left triggers removal of the last tag
        // (not ideal UX, but works for mobile)
      }
    },
    []
  );

  // Container click focuses input
  const handleContainerClick = React.useCallback(() => {
    if (!disabled && !readOnly) {
      inputRef.current?.focus();
    }
  }, [disabled, readOnly]);

  return (
    <div className="w-full">
      <div
        role="group"
        aria-label="标签输入"
        id={id}
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg border bg-background transition-all duration-200",
          "hover:border-border/80",
          isFocused
            ? "border-violet-400/60 ring-2 ring-violet-400/15 shadow-sm shadow-violet-500/5"
            : "border-border/20",
          disabled && "opacity-50 cursor-not-allowed bg-muted/30",
          readOnly && "bg-muted/20 cursor-default",
          error && "border-destructive/60 focus-within:ring-destructive/20",
          className
        )}
        onClick={handleContainerClick}
      >
        {/* Rendered tags */}
        <AnimatePresence mode="popLayout" initial={false}>
          {tags.map((tag, index) =>
            renderTag ? (
              <motion.div
                key={`tag-${tag}-${index}`}
                variants={tagVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {renderTag(tag, index, () => removeTag(index))}
              </motion.div>
            ) : (
              <motion.span
                key={`tag-${tag}-${index}`}
                variants={tagVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                  "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
                  "border border-violet-200/60 dark:border-violet-700/40",
                  "transition-colors hover:bg-violet-200/80 dark:hover:bg-violet-900/50",
                  "select-none",
                  tagClassName
                )}
              >
                <span className="max-w-[120px] truncate">{tag}</span>
                {!disabled && !readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(index);
                    }}
                    className="flex items-center justify-center h-3.5 w-3.5 rounded-full hover:bg-violet-300/60 dark:hover:bg-violet-700/60 transition-colors"
                    aria-label={`移除标签 ${tag}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </motion.span>
            )
          )}
        </AnimatePresence>

        {/* Input */}
        {!disabled && !readOnly && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isMaxReached ? `已达上限 (${maxTags})` : placeholder}
            disabled={isMaxReached || disabled}
            readOnly={readOnly}
            className={cn(
              "flex-1 min-w-[80px] h-6 bg-transparent border-none outline-none text-sm",
              "placeholder:text-muted-foreground/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              inputClassName
            )}
            aria-label="输入标签"
          />
        )}
      </div>

      {/* Bottom hints */}
      <div className="flex items-center justify-between mt-1 px-0.5">
        {/* Error message */}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {/* Tag count */}
        <p
          className={cn(
            "text-[11px] tabular-nums ml-auto",
            isMaxReached
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground/50"
          )}
        >
          {tags.length} / {maxTags}
        </p>
      </div>
    </div>
  );
}
