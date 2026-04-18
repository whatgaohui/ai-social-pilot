import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List all platform accounts
export async function GET() {
  try {
    const accounts = await db.platformAccount.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Failed to fetch platform accounts:", error);
    return NextResponse.json(
      { error: "获取账号列表失败" },
      { status: 500 }
    );
  }
}

// POST: Create or update a platform account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, accountType, displayName, ...rest } = body;

    if (!platform) {
      return NextResponse.json(
        { error: "平台类型不能为空" },
        { status: 400 }
      );
    }

    // Upsert based on unique constraint [platform, accountType]
    const account = await db.platformAccount.upsert({
      where: {
        platform_accountType: {
          platform,
          accountType: accountType || "personal",
        },
      },
      update: {
        ...(displayName !== undefined && { displayName }),
        ...rest,
      },
      create: {
        platform,
        accountType: accountType || "personal",
        displayName: displayName || "",
        ...rest,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("Failed to create/update platform account:", error);
    return NextResponse.json(
      { error: "保存账号失败" },
      { status: 500 }
    );
  }
}
