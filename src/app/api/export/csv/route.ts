import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ─── CSV safe escape ──────────────────────────────────────────────────────
function csvEsc(val: string | number | null | undefined): string {
  const s = val == null ? "" : String(val);
  // If value contains comma, quote, newline, or CRLF → wrap in double quotes
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

// ─── Platform label mapping ────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  wechat: "朋友圈",
  xiaohongshu: "小红书",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "计划中",
  generated: "已生成",
  optimized: "已优化",
  scheduled: "已排期",
  published: "已发布",
};

// ─── GET handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || "all"; // wechat | xiaohongshu | all
    const status = searchParams.get("status") || ""; // planned | generated | optimized | scheduled | published
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    // Build where clause
    const where: Prisma.ContentPostWhereInput = {};

    if (platform !== "all") {
      where.platform = platform;
    }

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) {
        where.scheduledDate.gte = dateFrom;
      }
      if (dateTo) {
        where.scheduledDate.lte = dateTo;
      }
    }

    const posts = await db.contentPost.findMany({
      where,
      orderBy: { scheduledDate: "desc" },
    });

    // ── CSV header ────────────────────────────────────────────────────────
    const BOM = "\uFEFF";
    const header =
      "日期,平台,类型,主题,内容,状态,AI评分,点赞,评论,转发,浏览,收藏";

    // ── CSV rows ──────────────────────────────────────────────────────────
    const rows = posts.map((post) => {
      const content = (post.content || "").length > 200
        ? post.content.slice(0, 200) + "..."
        : (post.content || "");

      return [
        csvEsc(post.scheduledDate),
        csvEsc(PLATFORM_LABELS[post.platform] || post.platform),
        csvEsc(post.contentType),
        csvEsc(post.topic),
        csvEsc(content),
        csvEsc(STATUS_LABELS[post.status] || post.status),
        csvEsc(post.aiScore ? Math.round(post.aiScore * 10) / 10 : 0),
        csvEsc(post.likes),
        csvEsc(post.comments),
        csvEsc(post.shares),
        csvEsc(post.views),
        csvEsc(post.favorites || 0),
      ].join(",");
    });

    const csvContent = BOM + header + "\n" + rows.join("\n");

    const today = new Date().toISOString().slice(0, 10);
    const platformSuffix = platform !== "all" ? `_${platform}` : "";

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="content_export${platformSuffix}_${today}.csv"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("CSV export failed:", error);
    return NextResponse.json(
      { error: "CSV 导出失败" },
      { status: 500 }
    );
  }
}
