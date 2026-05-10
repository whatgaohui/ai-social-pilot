import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

const ALLOWED_EXTENSIONS: Record<'image' | 'video', string[]> = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  video: ['.mp4', '.mov', '.webm'],
};

function sanitizeExtension(filename: string, mediaType: 'image' | 'video') {
  const ext = path.extname(filename).toLowerCase();
  if (ALLOWED_EXTENSIONS[mediaType].includes(ext)) return ext;
  return mediaType === 'image' ? '.jpg' : '.mp4';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, filename, mediaType, thumbnail } = body as {
      data?: string;
      filename?: string;
      mediaType?: 'image' | 'video';
      thumbnail?: string;
    };

    if (!data || !filename || (mediaType !== 'image' && mediaType !== 'video')) {
      return NextResponse.json({ success: false, error: '缺少文件数据' }, { status: 400 });
    }

    const base64Data = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const maxSize = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

    if (buffer.length === 0) {
      return NextResponse.json({ success: false, error: '文件内容为空' }, { status: 400 });
    }

    if (buffer.length > maxSize) {
      const maxMB = mediaType === 'image' ? 10 : 500;
      return NextResponse.json({ success: false, error: `文件过大，最大支持 ${maxMB}MB` }, { status: 400 });
    }

    const subDir = mediaType === 'image' ? 'images' : 'videos';
    const uploadDir = path.join(process.cwd(), 'public', 'upload', subDir);
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const ext = sanitizeExtension(filename, mediaType);
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    await writeFile(path.join(uploadDir, safeName), buffer);

    // Save video thumbnail if provided
    let thumbnailUrl = '';
    if (thumbnail && mediaType === 'video') {
      const thumbDir = path.join(process.cwd(), 'public', 'upload', subDir, 'thumbs');
      if (!existsSync(thumbDir)) await mkdir(thumbDir, { recursive: true });
      const thumbName = safeName.replace(/\.[^.]+$/, '.jpg');
      const thumbData = thumbnail.replace(/^data:image\/[a-z]+;base64,/, '');
      await writeFile(path.join(thumbDir, thumbName), Buffer.from(thumbData, 'base64'));
      thumbnailUrl = `/upload/${subDir}/thumbs/${thumbName}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        url: `/upload/${subDir}/${safeName}`,
        thumbnailUrl,
        filename: safeName,
        size: buffer.length,
        mediaType,
      },
    });
  } catch (error) {
    console.error('Upload media error:', error);
    return NextResponse.json({ success: false, error: '上传失败，请重试' }, { status: 500 });
  }
}
