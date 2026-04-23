import { format, parseISO, isValid, type Locale } from "date-fns";

/**
 * Safely format a date string, returning fallback text if the date is invalid.
 * Prevents RangeError: Invalid time value crashes.
 */
export function safeFormat(
  dateStr: string | Date | null | undefined,
  formatStr: string,
  fallback: string = "--",
  options?: { locale?: Locale; [key: string]: unknown },
): string {
  if (!dateStr) return fallback;
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return fallback;
    return options ? format(date, formatStr, options) : format(date, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Safely parse an ISO date string, returning null if invalid.
 */
export function safeParseISO(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}
