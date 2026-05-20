import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/uploads/[...path] — Serves uploaded files via file-server proxy
 *
 * Files are served by a separate Bun file server on port 3001.
 * This route proxies requests to avoid loading files into Next.js memory.
 */

export const dynamic = 'force-dynamic';

const FILE_SERVER_PORT = 3001;

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

    const filePath = segments.join('/');
    const fileServerUrl = `http://localhost:${FILE_SERVER_PORT}/${filePath}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(fileServerUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return new NextResponse(
        response.status === 404 ? 'Not Found' : 'Error',
        { status: response.status }
      );
    }

    const headers = new Headers();
    const ct = response.headers.get('content-type');
    const cc = response.headers.get('cache-control');
    const ar = response.headers.get('accept-ranges');
    if (ct) headers.set('Content-Type', ct);
    if (cc) headers.set('Cache-Control', cc);
    if (ar) headers.set('Accept-Ranges', ar);

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('[uploads] Proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
