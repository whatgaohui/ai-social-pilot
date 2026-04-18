import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: Publish a post to a connected platform (simulated in sandbox)
export async function POST(req: NextRequest) {
  try {
    const { postId, platform } = await req.json();

    if (!postId || !platform) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // Verify platform account is connected
    const account = await db.platformAccount.findFirst({
      where: { platform, status: "connected" },
    });

    if (!account) {
      return NextResponse.json(
        { error: `${platform === "wechat" ? "微信" : "小红书"}账号未连接`, connected: false },
        { status: 400 }
      );
    }

    // Verify the post exists
    const post = await db.contentPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "内容不存在" },
        { status: 404 }
      );
    }

    // Simulate publishing delay (real API calls would happen here)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update post status to published
    const updatedPost = await db.contentPost.update({
      where: { id: postId },
      data: {
        status: "published",
        platform: platform,
      },
    });

    return NextResponse.json({
      success: true,
      post: updatedPost,
      platform,
      publishedAt: new Date().toISOString(),
      message: `${platform === "wechat" ? "朋友圈" : "小红书"}发布成功`,
    });
  } catch (error) {
    console.error("Failed to publish:", error);
    return NextResponse.json(
      { error: "发布失败，请重试" },
      { status: 500 }
    );
  }
}
