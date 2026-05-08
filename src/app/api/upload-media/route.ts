import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, filename, mediaType } = body as {
      data: string; // base64
      filename: string;
      mediaType: 'image' | 'video';
    };

    if (!data || !filename || !mediaType) {
      return NextResponse.json(
        { success: false, error: '缺少文件数据' },
        { status: 400 }
      );
    }

    // Validate
    const isImage = mediaType === 'image';
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

    // Decode base64 to buffer
    const base64Data = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > maxSize) {
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      const maxMB = isImage ? '10' : '500';
      return NextResponse.json(
        { success: false, error: `文件过大: ${sizeMB}MB，最大支持 ${maxMB}MB` },
        { status: 400 }
      );
    }

    // Write file
    const subDir = isImage ? 'images' : 'videos';
    const uploadDir = path.join(process.cwd(), 'public', 'upload', subDir);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const ext = path.extname(filename);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const newFilename = `${timestamp}-${random}${ext || (isImage ? '.jpg' : '.mp4')}`;
    const filePath = path.join(uploadDir, newFilename);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      data: {
        url: `/upload/${subDir}/${newFilename}`,
        filename: newFilename,
        size: buffer.length,
        mediaType,
      },
    });
  } catch (error) {
    console.error('Upload media error:', error);
    return NextResponse.json(
      { success: false, error: '上传失败，请重试' },
      { status: 500 }
    );
  }
}
