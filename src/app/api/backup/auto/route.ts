import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "db", "backups");
const MAX_AUTO_BACKUPS = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const maxBackups = (body.maxBackups as number) ?? MAX_AUTO_BACKUPS;

    // Create auto-backup by calling the main backup API
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = req.headers.get("host") ?? "localhost:3000";
    const backupRes = await fetch(`${protocol}://${host}/api/backup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto: true }),
    });

    if (!backupRes.ok) {
      const errData = await backupRes.json().catch(() => ({}));
      return NextResponse.json({ error: errData.error || "Auto-backup failed" }, { status: 500 });
    }

    // Clean up old auto-backups
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = await fs.readdir(BACKUP_DIR);
    const autoBackups = files
      .filter((f) => f.startsWith("auto-") && f.endsWith(".json"))
      .map(async (f) => {
        const stat = await fs.stat(path.join(BACKUP_DIR, f));
        return { filename: f, mtime: stat.mtime.getTime() };
      });

    const sorted = (await Promise.all(autoBackups)).sort((a, b) => b.mtime - a.mtime);

    if (sorted.length > maxBackups) {
      const toDelete = sorted.slice(maxBackups);
      for (const item of toDelete) {
        try {
          await fs.unlink(path.join(BACKUP_DIR, item.filename));
        } catch {
          // ignore individual delete failures
        }
      }
    }

    const backupData = await backupRes.json();
    return NextResponse.json({
      success: true,
      message: "Auto-backup created",
      backup: backupData,
      deletedOld: sorted.length > maxBackups ? sorted.length - maxBackups : 0,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create auto-backup" }, { status: 500 });
  }
}
