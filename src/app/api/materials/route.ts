import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'upload', 'materials');
const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  text: ['text/plain', 'text/markdown', 'application/json'],
};
const MAX_SIZES: Record<string, number> = {
  image: 50 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  text: 1 * 1024 * 1024,
};

function detectType(mimeType: string): string | null {
  for (const [type, mimes] of Object.entries(ALLOWED_TYPES)) {
    if (mimes.includes(mimeType)) return type;
  }
  return null;
}

function getFileExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'text/plain': 'txt', 'text/markdown': 'md', 'application/json': 'json',
  };
  return map[mimeType] || 'bin';
}

async function ensureUploadDir(type: string) {
  const dir = path.join(UPLOAD_DIR, type);
  const thumbDir = path.join(dir, 'thumbs');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  if (!existsSync(thumbDir)) await mkdir(thumbDir, { recursive: true });
  return { dir, thumbDir };
}

async function generateThumbnail(fileBuffer: Buffer, type: string, thumbDir: string, filename: string): Promise<string> {
  if (type === 'image') {
    const thumbName = `thumb_${filename}`;
    const thumbPath = path.join(thumbDir, thumbName);
    await sharp(fileBuffer).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbPath);
    return `/upload/materials/${type}/thumbs/${thumbName}`;
  }
  return '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'createdAt_desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const tag = searchParams.get('tag');

    const where: Record<string, unknown> = { status };
    if (type && type !== 'all') where.type = type;
    if (search) where.name = { contains: search };
    if (tag) {
      where.tags = { contains: `"${tag}"` };
    }

    const [sortBy, sortOrder] = sort.split('_') as [string, 'asc' | 'desc'];
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder || 'desc';

    const [materials, total] = await Promise.all([
      db.material.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      db.material.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { materials, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Failed to get materials:', error);
    return NextResponse.json({ success: false, error: '加载素材失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = (formData.get('name') as string) || file?.name || '未命名素材';
    const tagsStr = (formData.get('tags') as string) || '[]';

    if (!file) {
      return NextResponse.json({ success: false, error: '未上传文件' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const type = detectType(mimeType);
    if (!type) {
      return NextResponse.json({ success: false, error: '不支持的文件类型' }, { status: 400 });
    }

    if (file.size > MAX_SIZES[type]) {
      return NextResponse.json({ success: false, error: `文件过大，${type} 最大 ${MAX_SIZES[type] / 1024 / 1024}MB` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = getFileExt(mimeType);
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { dir, thumbDir } = await ensureUploadDir(type);
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);

    const thumbnailUrl = await generateThumbnail(buffer, type, thumbDir, filename);
    const tags = JSON.parse(tagsStr);

    const material = await db.material.create({
      data: { name, type, fileUrl: `/upload/materials/${type}/${filename}`, thumbnailUrl, size: file.size, mimeType, tags: JSON.stringify(tags) },
    });

    return NextResponse.json({ success: true, data: material });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ success: false, error: '上传失败' }, { status: 500 });
  }
}
