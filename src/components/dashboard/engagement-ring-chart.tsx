'use client';

/** SVG Donut/Ring Chart for engagement rate */
export function EngagementRingChart({
  rate,
  likeRate,
  commentRate,
  collectRate,
}: {
  rate: string;
  likeRate: string;
  commentRate: string;
  collectRate: string;
}) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const numRate = parseFloat(rate) || 0;
  const numLike = parseFloat(likeRate) || 0;
  const numComment = parseFloat(commentRate) || 0;
  const numCollect = parseFloat(collectRate) || 0;

  const total = numLike + numComment + numCollect;
  const likePct = total > 0 ? numLike / total : 0.4;
  const commentPct = total > 0 ? numComment / total : 0.3;
  const collectPct = total > 0 ? numCollect / total : 0.3;

  const likeLen = circumference * likePct;
  const commentLen = circumference * commentPct;
  const collectLen = circumference * collectPct;

  const likeOffset = 0;
  const commentOffset = likeLen;
  const collectOffset = likeLen + commentLen;

  const fillScale = Math.min(numRate / 10, 1);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeWidth={strokeWidth}
          />
          {/* Collect segment - amber */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${collectLen * fillScale} ${circumference}`}
            strokeDashoffset={-collectOffset * fillScale}
            className="transition-all duration-700 ease-out"
          />
          {/* Comment segment - emerald */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${commentLen * fillScale} ${circumference}`}
            strokeDashoffset={-commentOffset * fillScale}
            className="transition-all duration-700 ease-out"
          />
          {/* Like segment - red */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="#f43f5e"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${likeLen * fillScale} ${circumference}`}
            strokeDashoffset={-likeOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-tight">{rate}%</span>
          <span className="text-[9px] text-muted-foreground">互动率</span>
        </div>
      </div>
      {/* Legend */}
      <div className="space-y-2.5 text-xs min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
          <span className="text-muted-foreground">点赞率</span>
          <span className="font-semibold ml-auto">{likeRate}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-muted-foreground">评论率</span>
          <span className="font-semibold ml-auto">{commentRate}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-muted-foreground">收藏率</span>
          <span className="font-semibold ml-auto">{collectRate}%</span>
        </div>
      </div>
    </div>
  );
}
