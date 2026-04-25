import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const startTime = performance.now();
  try {
    const [
      contentPosts,
      contentPlans,
      knowledgeItems,
      personas,
      contentVersions,
      aiConfigs,
      materials,
      platformAccounts,
      notifications,
      trackedAccounts,
    ] = await Promise.all([
      db.contentPost.count(),
      db.contentPlan.count(),
      db.knowledgeItem.count(),
      db.persona.count(),
      db.contentVersion.count(),
      db.aIConfig.count(),
      db.material.count(),
      db.platformAccount.count(),
      db.notification.count(),
      db.trackedAccount.count(),
    ]);

    const publishedPosts = await db.contentPost.count({ where: { status: "published" } });
    const scheduledPosts = await db.contentPost.count({ where: { status: "scheduled" } });

    // Database file size
    const dbPath = path.join(process.cwd(), "db", "custom.db");
    let dbSize = 0;
    try {
      const dbStat = await fs.stat(dbPath);
      dbSize = dbStat.size;
    } catch {
      // db file might not exist
    }

    // Backup directory size
    const backupDir = path.join(process.cwd(), "db", "backups");
    let backupSize = 0;
    let backupCount = 0;
    let lastBackupTime: string | null = null;
    try {
      const files = await fs.readdir(backupDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      backupCount = jsonFiles.length;
      for (const f of jsonFiles) {
        const stat = await fs.stat(path.join(backupDir, f));
        backupSize += stat.size;
        if (!lastBackupTime || stat.mtime > new Date(lastBackupTime)) {
          lastBackupTime = stat.mtime.toISOString();
        }
      }
    } catch {
      // backup dir might not exist
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round((memUsage.rss / 1024 / 1024) * 100) / 100;

    const apiResponseTime = Math.round((performance.now() - startTime) * 100) / 100;

    // Calculate health score
    let healthScore = 100;
    if (dbSize > 100 * 1024 * 1024) healthScore -= 10; // > 100MB
    if (contentPosts === 0 && contentPlans === 0) healthScore -= 15; // empty DB
    if (backupCount === 0) healthScore -= 10; // no backups
    if (apiResponseTime > 1000) healthScore -= 15; // slow API
    if (memoryMB > 500) healthScore -= 10; // high memory
    if (notifications > 1000) healthScore -= 5; // too many notifications
    healthScore = Math.max(0, Math.min(100, healthScore));

    const tableCounts = {
      contentPosts,
      contentPlans,
      knowledgeItems,
      personas,
      contentVersions,
      aiConfigs,
      materials,
      platformAccounts,
      notifications,
      trackedAccounts,
    };

    return NextResponse.json({
      healthScore,
      database: {
        size: dbSize,
        sizeFormatted: formatBytes(dbSize),
        tableCounts,
      },
      storage: {
        dbSize,
        backupSize,
        backupSizeFormatted: formatBytes(backupSize),
        backupCount,
        totalUsed: dbSize + backupSize,
        totalUsedFormatted: formatBytes(dbSize + backupSize),
      },
      backup: {
        lastBackupTime,
        backupCount,
        autoBackupEnabled: false,
      },
      apiPerformance: {
        responseTime: apiResponseTime,
        status: apiResponseTime < 500 ? "good" : apiResponseTime < 1000 ? "moderate" : "slow",
      },
      content: {
        totalPosts: contentPosts,
        publishedPosts,
        scheduledPosts,
        totalPlans: contentPlans,
        totalKnowledge: knowledgeItems,
      },
      system: {
        version: "1.0.0",
        build: "20250601",
        memoryMB,
        uptime: process.uptime(),
        nodeVersion: process.version,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get health status" }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
