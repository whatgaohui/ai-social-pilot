import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// GET /api/materials/file/:path — Serve uploaded file content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { path: filePath } = await params;
    const decodedPath = decodeURIComponent(filePath);
    const fullPath = path.join(process.cwd(), 'public', 'upload', decodedPath);

    // Security: prevent path traversal
    const baseDir = path.join(process.cwd(), 'public', 'upload');
    if (!fullPath.startsWith(baseDir)) {
      return NextResponse.json({ success: false, error: '非法路径' }, { status: 403 });
    }

    const content = await readFile(fullPath, 'utf-8');
    return NextResponse.json({ success: true, data: { content } });
  } catch {
    return NextResponse.json({ success: false, error: '文件不存在' }, { status: 404 });
  }
}
