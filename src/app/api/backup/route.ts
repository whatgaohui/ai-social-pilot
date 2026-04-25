import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "db", "backups");

async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

export async function GET() {
  try {
    await ensureBackupDir();
    const files = await fs.readdir(BACKUP_DIR);
    const backups: Array<{
      filename: string;
      size: number;
      date: string;
      type: string;
      recordCounts: Record<string, number>;
    }> = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(BACKUP_DIR, file);
      const stat = await fs.stat(filePath);
      const isAuto = file.includes("auto");
      try {
        const content = JSON.parse(await fs.readFile(filePath, "utf-8")) as {
          metadata?: { recordCounts?: Record<string, number>; timestamp?: string };
        };
        backups.push({
          filename: file,
          size: stat.size,
          date: stat.mtime.toISOString(),
          type: isAuto ? "auto" : "manual",
          recordCounts: content.metadata?.recordCounts ?? {},
        });
      } catch {
        backups.push({
          filename: file,
          size: stat.size,
          date: stat.mtime.toISOString(),
          type: isAuto ? "auto" : "manual",
          recordCounts: {},
        });
      }
    }

    backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json({ backups });
  } catch (error) {
    return NextResponse.json({ error: "Failed to list backups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureBackupDir();
    const body = await req.json().catch(() => ({}));
    const isAuto = body.auto === true;

    const [
      contentPosts,
      knowledgeItems,
      contentPlans,
      personas,
      contentVersions,
      aiConfigs,
      materials,
      platformAccounts,
      notifications,
      trackedAccounts,
    ] = await Promise.all([
      db.contentPost.findMany({ include: { versions: true, postComments: true, postInteractions: true } }),
      db.knowledgeItem.findMany(),
      db.contentPlan.findMany(),
      db.persona.findMany(),
      db.contentVersion.findMany(),
      db.aIConfig.findMany(),
      db.material.findMany(),
      db.platformAccount.findMany(),
      db.notification.findMany(),
      db.trackedAccount.findMany(),
    ]);

    const recordCounts: Record<string, number> = {
      contentPosts: contentPosts.length,
      knowledgeItems: knowledgeItems.length,
      contentPlans: contentPlans.length,
      personas: personas.length,
      contentVersions: contentVersions.length,
      aiConfigs: aiConfigs.length,
      materials: materials.length,
      platformAccounts: platformAccounts.length,
      notifications: notifications.length,
      trackedAccounts: trackedAccounts.length,
    };

    const backup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      type: isAuto ? "auto" : "manual",
      metadata: { recordCounts },
      data: {
        contentPosts,
        knowledgeItems,
        contentPlans,
        personas,
        contentVersions,
        aiConfigs,
        materials,
        platformAccounts,
        notifications,
        trackedAccounts,
      },
    };

    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const prefix = isAuto ? "auto-" : "";
    const filename = `${prefix}backup-${ts}.json`;
    await fs.writeFile(path.join(BACKUP_DIR, filename), JSON.stringify(backup, null, 2), "utf-8");

    const stat = await fs.stat(path.join(BACKUP_DIR, filename));
    return NextResponse.json({
      success: true,
      filename,
      size: stat.size,
      recordCounts,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }
    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(BACKUP_DIR, filename);
    await fs.access(filePath);
    await fs.unlink(filePath);

    return NextResponse.json({ success: true, deleted: filename });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete backup" }, { status: 500 });
  }
}
