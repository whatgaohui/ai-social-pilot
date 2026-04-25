import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

// Fields that need encryption for PlatformAccount
const ENCRYPTED_FIELDS = ["accessToken", "refreshToken", "apiKey", "apiSecret"] as const;

/**
 * Decrypt sensitive fields on a platform account object for API responses.
 */
function decryptAccount<T extends Record<string, unknown>>(account: T): T {
  const result = { ...account };
  for (const field of ENCRYPTED_FIELDS) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result as Record<string, unknown>)[field] = decrypt(value);
    }
  }
  return result;
}

/**
 * Encrypt sensitive fields on a data object before storing to the database.
 */
function encryptData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const field of ENCRYPTED_FIELDS) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result as Record<string, unknown>)[field] = encrypt(value);
    }
  }
  return result;
}

// GET: List all platform accounts
export async function GET() {
  try {
    const accounts = await db.platformAccount.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Decrypt sensitive fields before returning
    const decryptedAccounts = accounts.map(decryptAccount);

    return NextResponse.json(decryptedAccounts);
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

    // Encrypt sensitive fields before storing
    const encryptedRest = encryptData(rest as Record<string, unknown>);

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
        ...encryptedRest,
      },
      create: {
        platform,
        accountType: accountType || "personal",
        displayName: displayName || "",
        ...encryptedRest,
      },
    });

    // Decrypt before returning to frontend
    return NextResponse.json(decryptAccount(account as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Failed to create/update platform account:", error);
    return NextResponse.json(
      { error: "保存账号失败" },
      { status: 500 }
    );
  }
}
