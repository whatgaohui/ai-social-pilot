import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// ─── Constants ──────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbs');
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const SUPPORTED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
]);

// ─── Helper: DB row → MediaAssetInfo ────────────────────────────────────

function toMediaAssetInfo(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    type: (row.type as string) || 'image',
    fileName: (row.fileName as string) || '',
    originalName: (row.originalName as string) || '',
    url: (row.url as string) || '',
    thumbnail: (row.thumbnail as string) || '',
    fileSize: (row.fileSize as number) || 0,
    mimeType: (row.mimeType as string) || '',
    width: (row.width as number) || 0,
    height: (row.height as number) || 0,
    category: (row.category as string) || '',
    tags: JSON.parse((row.tags as string) || '[]'),
    description: (row.description as string) || '',
    aiDescription: (row.aiDescription as string) || '',
    aiTags: JSON.parse((row.aiTags as string) || '[]'),
    aiAnalyzed: (row.aiAnalyzed as boolean) || false,
    source: (row.source as string) || 'upload',
    accountId: (row.accountId as string) || '',
    textContent: (row.textContent as string) || '',
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString(),
  };
}

// ─── Helper: ensure directories exist ───────────────────────────────────

async function ensureDirectories() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  if (!existsSync(THUMB_DIR)) {
    await mkdir(THUMB_DIR, { recursive: true });
  }
}

// ─── Helper: process a single file ──────────────────────────────────────

async function processFile(
  file: File,
  category: string,
  description: string
) {
  const mimeType = file.type || 'application/octet-stream';
  const isImage = SUPPORTED_IMAGE_TYPES.has(mimeType);
  const isVideo = SUPPORTED_VIDEO_TYPES.has(mimeType);

  if (!isImage && !isVideo) {
    throw new Error(`不支持的文件类型: ${mimeType}`);
  }

  // Size check
  if (isImage && file.size > MAX_IMAGE_SIZE) {
    throw new Error(`图片文件大小不能超过 5MB: ${file.name}`);
  }
  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    throw new Error(`视频文件大小不能超过 100MB: ${file.name}`);
  }

  // Generate unique filename
  const ext = path.extname(file.name) || (isImage ? '.jpg' : '.mp4');
  const uniqueName = `${crypto.randomUUID()}${ext}`;

  // Save file
  const filePath = path.join(UPLOAD_DIR, uniqueName);
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));

  // Build record data
  const assetType = isImage ? 'image' : 'video';
  const url = `/uploads/${uniqueName}`;
  let thumbnail = '';
  let width = 0;
  let height = 0;

  // For images: extract metadata and create thumbnail
  if (isImage) {
    try {
      const metadata = await sharp(filePath).metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;

      // Create thumbnail (300x300 max, cover fit)
      const thumbName = `thumb_${uniqueName}`;
      const thumbPath = path.join(THUMB_DIR, thumbName);
      await sharp(filePath)
        .resize(300, 300, { fit: 'cover', withoutEnlargement: true })
        .toFile(thumbPath);
      thumbnail = `/uploads/thumbs/${thumbName}`;
    } catch (err) {
      console.warn('[media/upload] Thumbnail generation failed:', err);
      // Non-fatal: continue without thumbnail
    }
  }

  // Create DB record
  const asset = await db.mediaAsset.create({
    data: {
      type: assetType,
      fileName: uniqueName,
      originalName: file.name,
      url,
      thumbnail,
      fileSize: file.size,
      mimeType,
      width,
      height,
      category: category || '',
      tags: '[]',
      description: description || '',
      source: 'upload',
    },
  });

  return toMediaAssetInfo(asset as Record<string, unknown>);
}

// ─── POST /api/media/upload ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    await ensureDirectories();

    const formData = await request.formData();
    const category = (formData.get('category') as string) || '';
    const description = (formData.get('description') as string) || '';

    // Collect files from both 'file' and 'files' fields
    const files: File[] = [];

    const singleFile = formData.get('file');
    if (singleFile && singleFile instanceof File) {
      files.push(singleFile);
    }

    const multiFiles = formData.getAll('files');
    for (const f of multiFiles) {
      if (f instanceof File) {
        files.push(f);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: '请选择要上传的文件' },
        { status: 400 }
      );
    }

    // Process each file
    const results = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const asset = await processFile(file, category, description);
        results.push(asset);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知错误';
        errors.push(`${file.name}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        items: results,
        count: results.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('[media/upload] POST error:', error);
    return NextResponse.json(
      { success: false, error: '上传文件失败' },
      { status: 500 }
    );
  }
}
