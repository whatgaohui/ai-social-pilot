import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function POST() {
  try {
    // Run VACUUM to optimize SQLite database
    await db.$executeRaw(Prisma.sql`VACUUM`);
    return NextResponse.json({
      success: true,
      message: "Database optimized successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to optimize database";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
