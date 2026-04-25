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

    // Decrypt sensitive fields before returning
    return NextResponse.json(decryptAccount(account as unknown as Record<string, unknown>));
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

    // Encrypt sensitive fields before storing
    const encryptedData = encryptData(body as Record<string, unknown>);

    const account = await db.platformAccount.update({
      where: { id },
      data: encryptedData,
    });

    // Decrypt before returning to frontend
    return NextResponse.json(decryptAccount(account as unknown as Record<string, unknown>));
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
    // Note: clearing sensitive fields — no need to encrypt empty strings
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
