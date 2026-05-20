import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/uploads/[...path] — Serves uploaded files from disk
 *
 * In Next.js standalone production mode, files added to public/ at runtime
 * are NOT served as static files. This API route reads them from disk and
 * returns them with proper Content-Type and caching headers.
 */

// Force dynamic rendering — prevent caching/prerendering
export const dynamic = 'force-dynamic';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const segments = resolvedParams.path;

    if (!segments || segments.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Dynamic imports to avoid standalone bundling issues
    const pathMod = await import('path');
    const fsMod = await import('fs');

    const UPLOAD_DIR = pathMod.join(process.cwd(), 'public', 'uploads');

    // Build the file path from the route segments
    const filePath = pathMod.join(UPLOAD_DIR, ...segments);

    // Security: prevent path traversal outside UPLOAD_DIR
    const resolvedPath = pathMod.resolve(filePath);
    const resolvedUploadDir = pathMod.resolve(UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if file exists using async stat
    let fileStat;
    try {
      fileStat = await fsMod.promises.stat(resolvedPath);
    } catch {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Determine Content-Type
    const ext = pathMod.extname(resolvedPath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    // Read the file using async readFile (small files like images)
    // For videos, use streaming approach
    const isVideo = contentType.startsWith('video/') || contentType.startsWith('audio/');

    if (isVideo) {
      // Stream video files to avoid loading entire file into memory
      const range = request.headers.get('range');

      if (range) {
        const totalLength = fileStat.size;
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
        const contentLength = end - start + 1;

        const fd = await fsMod.promises.open(resolvedPath, 'r');
        const buffer = Buffer.alloc(contentLength);
        await fd.read(buffer, 0, contentLength, start);
        await fd.close();

        return new NextResponse(buffer, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(contentLength),
            'Content-Range': `bytes ${start}-${end}/${totalLength}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      // No range request - stream the entire file
      const { Readable } = await import('stream');
      const fileStream = fsMod.createReadStream(resolvedPath);
      const webStream = Readable.toWeb(fileStream) as ReadableStream;

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Accept-Ranges': 'bytes',
        },
      });
    }

    // For images and other small files, read into buffer
    const buffer = await fsMod.promises.readFile(resolvedPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('[uploads] Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
