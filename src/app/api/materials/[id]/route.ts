import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const THUMB_DIR = path.join(process.cwd(), 'public', 'upload', 'materials', 'video', 'thumbs');

async function saveVideoThumbnail(base64: string, fileUrl: string): Promise<string> {
  if (!existsSync(THUMB_DIR)) await mkdir(THUMB_DIR, { recursive: true });
  const baseName = path.basename(fileUrl, path.extname(fileUrl));
  const thumbName = `regenerate_${baseName}_${Date.now()}.jpg`;
  const thumbPath = path.join(THUMB_DIR, thumbName);
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  await writeFile(thumbPath, Buffer.from(base64Data, 'base64'));
  return `/upload/materials/video/thumbs/${thumbName}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const material = await db.material.findUnique({
      where: { id },
      include: { usages: { orderBy: { usedAt: 'desc' }, take: 20 } },
    });
    if (!material) {
      return NextResponse.json({ success: false, error: '素材不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: material });
  } catch (error) {
    console.error('Failed to get material:', error);
    return NextResponse.json({ success: false, error: '获取素材详情失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, tags, status } = body;

    const material = await db.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ success: false, error: '素材不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (status !== undefined) updateData.status = status;

    const updated = await db.material.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update material:', error);
    return NextResponse.json({ success: false, error: '更新素材失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { thumbnail } = body;

    if (!thumbnail) {
      return NextResponse.json({ success: false, error: '缺少缩略图数据' }, { status: 400 });
    }

    const material = await db.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ success: false, error: '素材不存在' }, { status: 404 });
    }

    if (material.type !== 'video') {
      return NextResponse.json({ success: false, error: '仅支持视频素材' }, { status: 400 });
    }

    const thumbnailUrl = await saveVideoThumbnail(thumbnail, material.fileUrl);
    const updated = await db.material.update({ where: { id }, data: { thumbnailUrl } });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to regenerate thumbnail:', error);
    return NextResponse.json({ success: false, error: '生成封面失败' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const material = await db.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ success: false, error: '素材不存在' }, { status: 404 });
    }
    await db.material.update({ where: { id }, data: { status: 'deleted' } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Failed to delete material:', error);
    return NextResponse.json({ success: false, error: '删除素材失败' }, { status: 500 });
  }
}
