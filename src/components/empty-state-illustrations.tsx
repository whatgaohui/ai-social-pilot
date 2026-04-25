"use client";

export function EmptyCalendar({ className = "" }: { className?: string }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`illustration-float ${className}`}
      aria-label="空日历"
    >
      {/* Calendar body */}
      <rect x="20" y="28" width="80" height="76" rx="10" className="fill-muted/60 stroke-muted-foreground/20" strokeWidth="1.5" />
      {/* Calendar header */}
      <rect x="20" y="28" width="80" height="24" rx="10" className="fill-muted-foreground/10" />
      <rect x="20" y="42" width="80" height="10" className="fill-muted-foreground/10" />
      {/* Calendar rings */}
      <rect x="38" y="22" width="4" height="14" rx="2" className="fill-muted-foreground/30" />
      <rect x="78" y="22" width="4" height="14" rx="2" className="fill-muted-foreground/30" />
      {/* Ghost pages */}
      <rect x="30" y="60" width="20" height="14" rx="3" className="fill-muted/40 stroke-muted-foreground/10" strokeWidth="1" />
      <rect x="54" y="60" width="20" height="14" rx="3" className="fill-muted/40 stroke-muted-foreground/10" strokeWidth="1" />
      <rect x="30" y="80" width="20" height="14" rx="3" className="fill-muted/40 stroke-muted-foreground/10" strokeWidth="1" />
      <rect x="54" y="80" width="20" height="14" rx="3" className="fill-muted/40 stroke-muted-foreground/10" strokeWidth="1" />
      {/* Sparkles */}
      <circle cx="92" cy="58" r="2" className="fill-violet-400/40" />
      <circle cx="96" cy="68" r="1.5" className="fill-violet-400/30" />
      <circle cx="88" cy="72" r="1" className="fill-violet-400/25" />
    </svg>
  );
}

export function EmptyContent({ className = "" }: { className?: string }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`illustration-float ${className}`}
      aria-label="空内容"
    >
      {/* Pen body */}
      <path
        d="M45 90L30 100L35 83L82 36L96 50L45 90Z"
        className="fill-muted-foreground/15 stroke-muted-foreground/25"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Pen tip */}
      <path d="M30 100L35 83L45 90L30 100Z" className="fill-muted-foreground/25" />
      {/* Pen cap line */}
      <line x1="82" y1="36" x2="96" y2="50" className="stroke-muted-foreground/30" strokeWidth="1.5" />
      {/* Sparkles around pen */}
      <g className="animate-pulse">
        <path d="M72 24L74 28L78 30L74 32L72 36L70 32L66 30L70 28L72 24Z" className="fill-violet-400/50" />
      </g>
      <g className="animate-pulse" style={{ animationDelay: "0.5s" }}>
        <path d="M100 28L101.5 31L104 32L101.5 33L100 36L98.5 33L96 32L98.5 31L100 28Z" className="fill-violet-400/35" />
      </g>
      <g className="animate-pulse" style={{ animationDelay: "1s" }}>
        <path d="M62 44L63.5 47L66 48L63.5 49L62 52L60.5 49L58 48L60.5 47L62 44Z" className="fill-violet-400/30" />
      </g>
      {/* Wavy line suggesting empty space */}
      <path
        d="M28 108C40 104 50 112 60 108C70 104 80 112 90 108"
        className="stroke-muted-foreground/15"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function EmptyAnalytics({ className = "" }: { className?: string }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`illustration-float ${className}`}
      aria-label="空数据"
    >
      {/* Chart background */}
      <rect x="15" y="20" width="90" height="80" rx="12" className="fill-muted/60 stroke-muted-foreground/20" strokeWidth="1.5" />
      {/* Grid lines */}
      <line x1="30" y1="42" x2="90" y2="42" className="stroke-muted-foreground/8" strokeWidth="1" />
      <line x1="30" y1="58" x2="90" y2="58" className="stroke-muted-foreground/8" strokeWidth="1" />
      <line x1="30" y1="74" x2="90" y2="74" className="stroke-muted-foreground/8" strokeWidth="1" />
      {/* Ghost bars */}
      <rect x="33" y="50" width="10" height="36" rx="3" className="fill-muted/30" />
      <rect x="50" y="38" width="10" height="48" rx="3" className="fill-muted/30" />
      <rect x="67" y="55" width="10" height="31" rx="3" className="fill-muted/30" />
      <rect x="84" y="44" width="10" height="42" rx="3" className="fill-muted/30" />
      {/* Question mark */}
      <circle cx="60" cy="36" r="12" className="fill-muted-foreground/10 stroke-muted-foreground/20" strokeWidth="1" />
      <text
        x="60"
        y="41"
        textAnchor="middle"
        className="fill-muted-foreground/40"
        fontSize="14"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        ?
      </text>
    </svg>
  );
}

export function EmptyNotifications({ className = "" }: { className?: string }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`illustration-float ${className}`}
      aria-label="无通知"
    >
      {/* Bell body */}
      <path
        d="M36 72C36 72 36 48 36 44C36 30.746 46.746 20 60 20C73.254 20 84 30.746 84 44C84 48 84 72 84 72L90 80H30L36 72Z"
        className="fill-muted/60 stroke-muted-foreground/25"
        strokeWidth="1.5"
      />
      {/* Bell clapper */}
      <ellipse cx="60" cy="88" rx="10" ry="6" className="fill-muted-foreground/20" />
      {/* Bell top knob */}
      <circle cx="60" cy="20" r="3" className="fill-muted-foreground/25" />
      {/* Z letter on bell */}
      <text
        x="60"
        y="56"
        textAnchor="middle"
        className="fill-muted-foreground/30"
        fontSize="22"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        Z
      </text>
      {/* Small Z's floating (sleep) */}
      <text
        x="90"
        y="38"
        textAnchor="middle"
        className="fill-muted-foreground/20"
        fontSize="12"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        z
      </text>
      <text
        x="98"
        y="28"
        textAnchor="middle"
        className="fill-muted-foreground/15"
        fontSize="10"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        z
      </text>
    </svg>
  );
}
