import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/assets - Get content assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const assetType = searchParams.get('assetType');

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;
    if (assetType && assetType !== 'all') where.assetType = assetType;

    const assets = await db.contentAsset.findMany({
      where,
      orderBy: { scrapedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: assets });
  } catch (error) {
    console.error('Failed to get assets:', error);
    return NextResponse.json(
      { success: false, error: '加载素材失败' },
      { status: 500 }
    );
  }
}

// POST /api/assets - Create a content asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, assetType, title, filePath, originalUrl, thumbnailPath, fileSize, scrapedAt } = body;

    if (!accountId || !assetType) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const asset = await db.contentAsset.create({
      data: { accountId, assetType, title: title || '', filePath: filePath || '', originalUrl: originalUrl || '', thumbnailPath: thumbnailPath || '', fileSize: fileSize || 0, scrapedAt: scrapedAt || new Date().toISOString().slice(0, 10) },
    });

    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    console.error('Failed to create asset:', error);
    return NextResponse.json(
      { success: false, error: '创建素材失败' },
      { status: 500 }
    );
  }
}

// DELETE has been moved to /api/assets/[id]/route.ts
