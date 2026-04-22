import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [totalPosts, totalPlans, totalKnowledge, totalMaterials, totalAIConfigs, totalAccounts] =
      await Promise.all([
        db.contentPost.count(),
        db.contentPlan.count(),
        db.knowledgeItem.count(),
        db.material.count(),
        db.aIConfig.count(),
        db.platformAccount.count(),
      ]);

    return NextResponse.json({
      totalPosts,
      totalPlans,
      totalKnowledge,
      totalMaterials,
      totalAIConfigs,
      totalAccounts,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
