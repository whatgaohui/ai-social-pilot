import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      contentPosts,
      contentPlans,
      knowledgeItems,
      materials,
      aIConfigs,
      platformAccounts,
      notifications,
      trackedAccounts,
      personas,
      contentVersions,
      reportTemplates,
      reportHistories,
      analyticsSummaries,
      contentComments,
      contentInteractions,
    ] = await Promise.all([
      db.contentPost.count(),
      db.contentPlan.count(),
      db.knowledgeItem.count(),
      db.material.count(),
      db.aIConfig.count(),
      db.platformAccount.count(),
      db.notification.count(),
      db.trackedAccount.count(),
      db.persona.count(),
      db.contentVersion.count(),
      db.reportTemplate.count(),
      db.reportHistory.count(),
      db.analyticsSummary.count(),
      db.contentComment.count(),
      db.contentInteraction.count(),
    ]);

    // Status breakdown for content posts
    const [published, scheduled, generated, optimized, planned] = await Promise.all([
      db.contentPost.count({ where: { status: "published" } }),
      db.contentPost.count({ where: { status: "scheduled" } }),
      db.contentPost.count({ where: { status: "generated" } }),
      db.contentPost.count({ where: { status: "optimized" } }),
      db.contentPost.count({ where: { status: "planned" } }),
    ]);

    // Unread notifications
    const unreadNotifications = await db.notification.count({ where: { read: false } });

    return NextResponse.json({
      totalPosts: contentPosts,
      totalPlans: contentPlans,
      totalKnowledge: knowledgeItems,
      totalMaterials: materials,
      totalAIConfigs: aIConfigs,
      totalAccounts: platformAccounts,
      totalNotifications: notifications,
      totalTrackedAccounts: trackedAccounts,
      totalPersonas: personas,
      totalVersions: contentVersions,
      totalReportTemplates: reportTemplates,
      totalReportHistories: reportHistories,
      totalAnalytics: analyticsSummaries,
      totalComments: contentComments,
      totalInteractions: contentInteractions,
      unreadNotifications,
      // Status breakdown
      postStatuses: {
        published,
        scheduled,
        generated,
        optimized,
        planned,
      },
      // All model counts for display
      modelCounts: {
        contentPosts,
        contentPlans,
        knowledgeItems,
        materials,
        aIConfigs,
        platformAccounts,
        notifications,
        trackedAccounts,
        personas,
        contentVersions,
        reportTemplates,
        reportHistories,
        analyticsSummaries,
        contentComments,
        contentInteractions,
      },
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
