import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "db", "backups");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename } = body as { filename?: string };

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }
    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(BACKUP_DIR, filename);
    let backupData: {
      version?: string;
      data?: Record<string, unknown[]>;
    };

    try {
      const raw = await fs.readFile(filePath, "utf-8");
      backupData = JSON.parse(raw) as typeof backupData;
    } catch {
      return NextResponse.json({ error: "Backup file not found or corrupted" }, { status: 404 });
    }

    if (!backupData.data) {
      return NextResponse.json({ error: "Invalid backup format: missing data" }, { status: 400 });
    }

    const restoredCounts: Record<string, number> = {};

    // Delete existing data in reverse dependency order
    await db.contentComment.deleteMany();
    await db.contentInteraction.deleteMany();
    await db.contentVersion.deleteMany();
    await db.contentPost.deleteMany();
    await db.syncTask.deleteMany();
    await db.trackedAccount.deleteMany();
    await db.notification.deleteMany();
    await db.analyticsSummary.deleteMany();
    await db.material.deleteMany();
    await db.platformAccount.deleteMany();
    await db.aIConfig.deleteMany();
    await db.persona.deleteMany();
    await db.contentPlan.deleteMany();
    await db.knowledgeItem.deleteMany();

    // Restore data
    const data = backupData.data;

    if (Array.isArray(data.knowledgeItems) && data.knowledgeItems.length > 0) {
      const count = await db.knowledgeItem.createMany({
        data: data.knowledgeItems as any,
        skipDuplicates: true,
      });
      restoredCounts.knowledgeItems = count.count;
    }

    if (Array.isArray(data.personas) && data.personas.length > 0) {
      const count = await db.persona.createMany({
        data: data.personas as any,
        skipDuplicates: true,
      });
      restoredCounts.personas = count.count;
    }

    if (Array.isArray(data.contentPlans) && data.contentPlans.length > 0) {
      const count = await db.contentPlan.createMany({
        data: data.contentPlans as any,
        skipDuplicates: true,
      });
      restoredCounts.contentPlans = count.count;
    }

    if (Array.isArray(data.aiConfigs) && data.aiConfigs.length > 0) {
      const count = await db.aIConfig.createMany({
        data: data.aiConfigs as any,
        skipDuplicates: true,
      });
      restoredCounts.aiConfigs = count.count;
    }

    if (Array.isArray(data.materials) && data.materials.length > 0) {
      const count = await db.material.createMany({
        data: data.materials as any,
        skipDuplicates: true,
      });
      restoredCounts.materials = count.count;
    }

    if (Array.isArray(data.platformAccounts) && data.platformAccounts.length > 0) {
      const count = await db.platformAccount.createMany({
        data: data.platformAccounts as any,
        skipDuplicates: true,
      });
      restoredCounts.platformAccounts = count.count;
    }

    if (Array.isArray(data.notifications) && data.notifications.length > 0) {
      const count = await db.notification.createMany({
        data: data.notifications as any,
        skipDuplicates: true,
      });
      restoredCounts.notifications = count.count;
    }

    if (Array.isArray(data.trackedAccounts) && data.trackedAccounts.length > 0) {
      const count = await db.trackedAccount.createMany({
        data: data.trackedAccounts as any,
        skipDuplicates: true,
      });
      restoredCounts.trackedAccounts = count.count;
    }

    // Restore content posts (need to handle planId reference)
    if (Array.isArray(data.contentPosts) && data.contentPosts.length > 0) {
      const postsData = data.contentPosts as Array<Record<string, unknown>>;
      const cleanPosts = postsData.map((post) => {
        const { versions, postComments, postInteractions, ...rest } = post;
        return rest;
      });
      const count = await db.contentPost.createMany({
        data: cleanPosts as any,
        skipDuplicates: true,
      });
      restoredCounts.contentPosts = count.count;
    }

    // Restore content versions
    if (Array.isArray(data.contentVersions) && data.contentVersions.length > 0) {
      const count = await db.contentVersion.createMany({
        data: data.contentVersions as any,
        skipDuplicates: true,
      });
      restoredCounts.contentVersions = count.count;
    }

    // Restore content interactions (if available in backup)
    if (Array.isArray((data as Record<string, unknown>).contentInteractions) && (data as Record<string, unknown>).contentInteractions!.length > 0) {
      const count = await db.contentInteraction.createMany({
        data: (data as Record<string, unknown>).contentInteractions as any,
        skipDuplicates: true,
      });
      restoredCounts.contentInteractions = count.count;
    }

    // Restore analytics summaries (if available in backup)
    if (Array.isArray((data as Record<string, unknown>).analyticsSummaries) && (data as Record<string, unknown>).analyticsSummaries!.length > 0) {
      const count = await db.analyticsSummary.createMany({
        data: (data as Record<string, unknown>).analyticsSummaries as any,
        skipDuplicates: true,
      });
      restoredCounts.analyticsSummaries = count.count;
    }

    return NextResponse.json({
      success: true,
      message: "Backup restored successfully",
      restoredCounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore backup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
