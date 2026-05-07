import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Validation constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

// Zod-like validation
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: '未提供文件' };
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `不支持的文件类型: ${file.type}。支持: jpg, png, mp4, mov`
    };
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `图片文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB。最大支持 10MB`
    };
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: `视频文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB。最大支持 500MB`
    };
  }

  return { valid: true };
}

// Generate unique filename
function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  return `${timestamp}-${random}${ext}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file
    const validation = validateFile(file!);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Determine upload path
    const isImage = ALLOWED_IMAGE_TYPES.includes(file!.type);
    const subDir = isImage ? 'images' : 'videos';
    const uploadDir = path.join(process.cwd(), 'public', 'upload', subDir);

    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const filename = generateFilename(file!.name);
    const filePath = path.join(uploadDir, filename);

    // Write file
    const bytes = await file!.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return accessible URL
    const url = `/upload/${subDir}/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        url,
        filename,
        size: file!.size,
        type: file!.type,
        mediaType: isImage ? 'image' : 'video',
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