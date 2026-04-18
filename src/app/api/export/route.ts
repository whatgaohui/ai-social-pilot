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
