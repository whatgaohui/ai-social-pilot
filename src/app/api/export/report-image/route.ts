import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import sharp from "sharp";

// ─── Color palette: violet / purple / emerald gradients ────────────────────

const COLORS = {
  bg: "#0f0a1e",
  bgCard: "#1a1232",
  bgCardAlt: "#15102a",
  violet: "#8b5cf6",
  purple: "#a855f7",
  emerald: "#10b981",
  emeraldLight: "#34d399",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  border: "rgba(139, 92, 246, 0.2)",
};

// ─── Content type Chinese labels ───────────────────────────────────────────

const CONTENT_LABELS: Record<string, string> = {
  text: "纯文字",
  image: "图文搭配",
  video: "视频动态",
  mixed: "混合内容",
  story: "故事分享",
  insight: "观点洞察",
  interaction: "互动话题",
  seeding: "种草安利",
  review: "好物测评",
  tutorial: "教程攻略",
  drygoods: "干货知识",
  vlog: "生活Vlog",
  daily: "日常分享",
  recommend: "好物推荐",
  collection: "合集清单",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "待生成",
  generated: "已生成",
  optimized: "已优化",
  published: "已发布",
};

const TYPE_COLORS = [
  "#8b5cf6", "#a855f7", "#10b981", "#34d399",
  "#f59e0b", "#06b6d4", "#f43f5e", "#ec4899",
];

// ─── SVG helpers ───────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function buildSVG(svgStr: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">${svgStr}</svg>`;
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    // Date range filter
    const now = new Date();
    const cutoff = new Date(now);
    if (period === "week") cutoff.setDate(cutoff.getDate() - 7);
    else if (period === "month") cutoff.setDate(cutoff.getDate() - 30);

    const posts = await db.contentPost.findMany({
      where: {
        createdAt: period === "all" ? undefined : { gte: cutoff },
      },
      orderBy: { createdAt: "desc" },
    });

    const persona = await db.persona.findFirst();

    // ── Compute stats ────────────────────────────────────────────────────
    const totalPosts = posts.length;
    const totalInteractions = posts.reduce(
      (s, p) => s + p.likes + p.comments + p.shares + (p.favorites || 0),
      0
    );
    const avgScore =
      totalPosts > 0
        ? Math.round(
            (posts.reduce((s, p) => s + p.aiScore, 0) / totalPosts) * 10
          ) / 10
        : 0;
    const publishedCount = posts.filter((p) => p.status === "published").length;
    const publishRate =
      totalPosts > 0
        ? Math.round((publishedCount / totalPosts) * 100)
        : 0;

    // Content type distribution
    const typeDist: Record<string, number> = {};
    posts.forEach((p) => {
      typeDist[p.contentType] = (typeDist[p.contentType] || 0) + 1;
    });
    const typeEntries = Object.entries(typeDist).sort((a, b) => b[1] - a[1]);
    const maxTypeCount = Math.max(...typeEntries.map((e) => e[1]), 1);

    // Top 5 posts by engagement
    const topPosts = [...posts]
      .sort(
        (a, b) =>
          b.likes +
          b.comments * 2 +
          b.shares * 3 +
          (b.favorites || 0) -
          (a.likes + a.comments * 2 + a.shares * 3 + (a.favorites || 0))
      )
      .slice(0, 5);

    // Period label
    const periodLabel =
      period === "week"
        ? "近7天"
        : period === "month"
          ? "近30天"
          : "全部数据";
    const dateRange =
      period === "all"
        ? "全部时间"
        : `${formatDate(cutoff)} ~ ${formatDate(now)}`;

    // ── Build SVG content ────────────────────────────────────────────────
    let svg = "";

    // Background
    svg += `<defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stop-color="#1a0a3e"/>
        <stop offset="50%" stop-color="${COLORS.bg}"/>
        <stop offset="100%" stop-color="#0a0520"/>
      </linearGradient>
      <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e1535"/>
        <stop offset="100%" stop-color="#150f28"/>
      </linearGradient>
      <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${COLORS.violet}"/>
        <stop offset="50%" stop-color="${COLORS.purple}"/>
        <stop offset="100%" stop-color="${COLORS.emerald}"/>
      </linearGradient>
      <linearGradient id="statBar1" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${COLORS.violet}"/>
        <stop offset="100%" stop-color="${COLORS.purple}"/>
      </linearGradient>
      <linearGradient id="statBar2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${COLORS.emerald}"/>
        <stop offset="100%" stop-color="${COLORS.emeraldLight}"/>
      </linearGradient>
    </defs>`;

    // Full background rect
    svg += `<rect width="800" height="1200" fill="url(#bgGrad)" rx="0"/>`;

    // ── Decorative circles ──────────────────────────────────────────────
    svg += `<circle cx="700" cy="80" r="120" fill="${COLORS.violet}" opacity="0.05"/>`;
    svg += `<circle cx="60" cy="1100" r="100" fill="${COLORS.emerald}" opacity="0.05"/>`;
    svg += `<circle cx="750" cy="900" r="80" fill="${COLORS.purple}" opacity="0.04"/>`;

    // ── Title section ───────────────────────────────────────────────────
    let y = 50;
    svg += `<text x="400" y="${y}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="url(#titleGrad)">运营数据报告</text>`;
    y += 30;
    svg += `<text x="400" y="${y}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="${COLORS.textMuted}">${esc(persona?.name || "AI社交运营助手")} · ${periodLabel} · ${dateRange}</text>`;
    y += 10;

    // Divider line
    y += 10;
    svg += `<line x1="80" y1="${y}" x2="720" y2="${y}" stroke="${COLORS.border}" stroke-width="1"/>`;

    // ── Core stats cards (2×2 grid) ────────────────────────────────────
    y += 30;
    const cardW = 310;
    const cardH = 90;
    const gapX = 20;
    const gapY = 16;
    const startX = (800 - cardW * 2 - gapX) / 2;

    const stats = [
      { label: "帖子总数", value: String(totalPosts), unit: "篇", color: COLORS.violet },
      { label: "总互动量", value: String(totalInteractions), unit: "次", color: COLORS.emerald },
      { label: "平均AI评分", value: String(avgScore), unit: "分", color: COLORS.amber },
      { label: "发布率", value: String(publishRate), unit: "%", color: COLORS.rose },
    ];

    stats.forEach((stat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = startX + col * (cardW + gapX);
      const cy = y + row * (cardH + gapY);

      // Card background
      svg += `<rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="12" fill="url(#cardGrad)" stroke="${COLORS.border}" stroke-width="1"/>`;
      // Accent bar at top-left
      svg += `<rect x="${cx}" y="${cy}" width="4" height="${cardH}" rx="2" fill="${stat.color}"/>`;

      // Label
      svg += `<text x="${cx + 20}" y="${cy + 32}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.textMuted}">${esc(stat.label)}</text>`;
      // Value + unit
      svg += `<text x="${cx + 20}" y="${cy + 64}" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="${stat.color}">${esc(stat.value)}</text>`;
      svg += `<text x="${cx + 20 + String(stat.value).length * 18 + 4}" y="${cy + 64}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.textDim}">${esc(stat.unit)}</text>`;
    });

    y += 2 * (cardH + gapY) + 20;

    // ── Content type distribution bar chart ────────────────────────────
    svg += `<text x="80" y="${y}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="${COLORS.text}">📊 内容类型分布</text>`;
    y += 25;

    const barChartW = 640;
    const barH = 24;
    const barGap = 8;
    const barLabelW = 80;

    typeEntries.forEach((entry, i) => {
      const [type, count] = entry;
      const label = CONTENT_LABELS[type] || type;
      const pct = count / maxTypeCount;
      const barWidth = Math.max(pct * (barChartW - barLabelW - 60), 8);
      const color = TYPE_COLORS[i % TYPE_COLORS.length];

      // Label
      svg += `<text x="80" y="${y + 16}" font-family="system-ui, sans-serif" font-size="12" fill="${COLORS.textMuted}">${esc(label)}</text>`;
      // Bar background
      svg += `<rect x="${80 + barLabelW}" y="${y}" width="${barChartW - barLabelW - 60}" height="${barH}" rx="6" fill="${COLORS.bgCard}" opacity="0.8"/>`;
      // Bar fill
      svg += `<rect x="${80 + barLabelW}" y="${y}" width="${barWidth}" height="${barH}" rx="6" fill="${color}" opacity="0.85"/>`;
      // Count
      svg += `<text x="${80 + barChartW - 45}" y="${y + 16}" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="${COLORS.text}">${count}</text>`;

      y += barH + barGap;
    });

    y += 10;

    // ── Top 5 posts ────────────────────────────────────────────────────
    svg += `<text x="80" y="${y}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="${COLORS.text}">🏆 热门内容 TOP 5</text>`;
    y += 20;

    topPosts.forEach((post, i) => {
      const rank = i + 1;
      const rankColors = [COLORS.amber, "#94a3b8", "#c2703e", COLORS.textDim, COLORS.textDim];
      const topic = truncate(post.topic || "无标题", 22);
      const engagement =
        post.likes +
        post.comments * 2 +
        post.shares * 3 +
        (post.favorites || 0);

      // Row background (alternating)
      if (i % 2 === 0) {
        svg += `<rect x="70" y="${y - 6}" width="660" height="48" rx="8" fill="${COLORS.bgCard}" opacity="0.5"/>`;
      }

      // Rank badge
      svg += `<circle cx="96" cy="${y + 18}" r="14" fill="${rankColors[i]}" opacity="0.2"/>`;
      svg += `<text x="96" y="${y + 23}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${rankColors[i]}">${rank}</text>`;

      // Topic
      svg += `<text x="120" y="${y + 15}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.text}">${esc(topic)}</text>`;

      // Engagement breakdown
      svg += `<text x="120" y="${y + 33}" font-family="system-ui, sans-serif" font-size="11" fill="${COLORS.textDim}">♥${post.likes}  💬${post.comments}  ↗${post.shares}  ⭐${post.favorites || 0}</text>`;

      // Engagement score
      svg += `<text x="710" y="${y + 23}" text-anchor="end" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${COLORS.emerald}">${engagement}</text>`;

      y += 56;
    });

    // ── Bottom watermark ───────────────────────────────────────────────
    y = 1160;
    svg += `<line x1="200" y1="${y}" x2="600" y2="${y}" stroke="${COLORS.border}" stroke-width="1"/>`;
    y += 25;
    svg += `<text x="400" y="${y}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${COLORS.textDim}">AI社交运营助手 · 数据仅供参考</text>`;

    const fullSvg = buildSVG(svg);

    // ── Convert SVG → PNG using sharp ──────────────────────────────────
    const pngBuffer = await sharp(Buffer.from(fullSvg)).png().toBuffer();

    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="report_${today}.png"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Report image generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate report image" },
      { status: 500 }
    );
  }
}
