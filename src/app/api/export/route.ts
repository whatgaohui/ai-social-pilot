import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");
    const format = searchParams.get("format") || "json";

    const posts = await db.contentPost.findMany({
      where: planId ? { planId } : undefined,
      orderBy: { scheduledDate: "asc" },
    });

    const persona = await db.persona.findFirst();

    if (format === "csv") {
      // CSV export with BOM for Excel Chinese support
      const BOM = "\uFEFF";
      const header =
        "日期,主题,内容类型,状态,AI评分,浏览,点赞,评论,收藏,转发,平台";

      const rows = posts.map((post) => {
        const esc = (val: string | number) => {
          const s = String(val);
          // Wrap in quotes and escape internal double quotes
          return `"${s.replace(/"/g, '""')}"`;
        };
        return [
          esc(post.scheduledDate),
          esc(post.topic),
          esc(post.contentType),
          esc(post.status),
          esc(post.aiScore),
          esc(post.views),
          esc(post.likes),
          esc(post.comments),
          esc(post.favorites),
          esc(post.shares),
          esc(post.platform),
        ].join(",");
      });

      const csvContent = BOM + header + "\n" + rows.join("\n");
      const today = new Date().toISOString().slice(0, 10);

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="content_export_${today}.csv"`,
        },
      });
    }

    if (format === "text") {
      // Plain text export
      const lines = posts.map((post, index) => {
        return [
          `【第${index + 1}天】${post.scheduledDate}`,
          `类型：${post.contentType} | 主题：${post.topic}`,
          `${post.content}`,
          "---".repeat(20),
        ].join("\n");
      });

      const header = [
        `朋友圈内容计划 - ${persona?.name || "未命名"}`,
        `导出时间：${new Date().toLocaleString("zh-CN")}`,
        `共 ${posts.length} 条内容`,
        "=".repeat(40),
        "",
      ].join("\n");

      return new NextResponse(header + lines.join("\n"), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="moments-plan-${new Date().toISOString().slice(0, 10)}.txt"`,
        },
      });
    }

    // JSON export
    const exportData = {
      persona,
      exportedAt: new Date().toISOString(),
      totalCount: posts.length,
      posts: posts.map((post) => ({
        date: post.scheduledDate,
        type: post.contentType,
        topic: post.topic,
        content: post.content,
        status: post.status,
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="moments-plan-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
