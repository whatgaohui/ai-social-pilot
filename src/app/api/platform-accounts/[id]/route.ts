import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Get single account by ID
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await db.platformAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return NextResponse.json(
        { error: "账号不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("Failed to fetch platform account:", error);
    return NextResponse.json(
      { error: "获取账号详情失败" },
      { status: 500 }
    );
  }
}

// PUT: Update account
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const account = await db.platformAccount.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("Failed to update platform account:", error);
    return NextResponse.json(
      { error: "更新账号失败" },
      { status: 500 }
    );
  }
}

// DELETE: Disconnect/delete account
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Reset the account to disconnected state rather than deleting it
    const account = await db.platformAccount.update({
      where: { id },
      data: {
        status: "disconnected",
        accessToken: "",
        refreshToken: "",
        apiKey: "",
        apiSecret: "",
        apiEndpoint: "",
        scope: "",
        connectedAt: null,
        expiresAt: null,
        lastSyncAt: null,
        lastError: "",
        followers: 0,
        following: 0,
        postsCount: 0,
        displayName: "",
        avatarUrl: "",
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("Failed to disconnect platform account:", error);
    return NextResponse.json(
      { error: "断开连接失败" },
      { status: 500 }
    );
  }
}
