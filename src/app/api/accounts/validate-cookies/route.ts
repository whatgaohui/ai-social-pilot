import { NextRequest, NextResponse } from 'next/server';

function normalizeCookieInput(input: string): string {
  const trimmed = input
    .trim()
    .replace(/^[Cc]ookie:\s*/, '')
    .replace(/[，,。\s]+$/g, '');

  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item?.name && item?.value !== undefined)
        .map((item) => `${item.name}=${item.value}`)
        .join('; ');
    }

    if (typeof parsed === 'object' && parsed) {
      if (typeof parsed.cookie === 'string') return normalizeCookieInput(parsed.cookie);
      if (typeof parsed.cookies === 'string') return normalizeCookieInput(parsed.cookies);
      if (Array.isArray(parsed.cookies)) return normalizeCookieInput(JSON.stringify(parsed.cookies));
    }
  } catch {
    // Plain Cookie header string.
  }

  return trimmed;
}

function hasCookieKey(cookies: string, key: string): boolean {
  return new RegExp(`(?:^|;\\s*)${key}=`).test(cookies);
}

export async function POST(request: NextRequest) {
  try {
    const { cookies } = await request.json();

    if (!cookies || typeof cookies !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please provide Cookie text.' },
        { status: 400 }
      );
    }

    const normalizedCookies = normalizeCookieInput(cookies);
    const hasA1 = hasCookieKey(normalizedCookies, 'a1');
    const hasSession =
      hasCookieKey(normalizedCookies, 'web_session') ||
      hasCookieKey(normalizedCookies, 'webId');

    if (!hasA1 || !hasSession) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'Cookie is incomplete. It must include a1 and web_session or webId.',
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      message:
        'Cookie format looks correct. If scraping still returns 0 posts, the XHS internal API may require request signing or a fresher browser Cookie.',
      cookies: normalizedCookies,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      },
      { status: 500 }
    );
  }
}
