import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'upload', 'materials');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;
    const filePath = path.join(UPLOAD_DIR, ...pathParts);

    // Security: prevent path traversal
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ success: false, error: '禁止访问' }, { status: 403 });
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ success: false, error: '文件不存在' }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif',
      '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
      '.txt': 'text/plain', '.md': 'text/markdown', '.json': 'application/json',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' },
    });
  } catch (error) {
    console.error('Failed to serve file:', error);
    return NextResponse.json({ success: false, error: '读取文件失败' }, { status: 500 });
  }
}
