import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function normalizeXhsUrl(input: string): string {
  const trimmed = input.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    if (!host.includes('xiaohongshu.com') && !host.includes('xhslink.com')) {
      return '';
    }

    parsed.hash = '';

    if (host.includes('xiaohongshu.com')) {
      const profileMatch = parsed.pathname.match(/^\/user\/profile\/([^/?#]+)/);
      if (!profileMatch) return '';

      return `${parsed.origin}/user/profile/${profileMatch[1]}`;
    }

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '';
  }
}

// GET /api/accounts - List all accounts
export async function GET() {
  try {
    const accounts = await db.xhsAccount.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { posts: true, drafts: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: accounts.map((a) => ({
        ...a,
        postsCount: a._count.posts,
        draftsCount: a._count.drafts,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error('Failed to list accounts:', error);
    return NextResponse.json(
      { success: false, error: '获取账号列表失败，请检查数据库配置' },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Add new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { xhsUrl } = body;

    if (!xhsUrl || typeof xhsUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供小红书主页链接' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeXhsUrl(xhsUrl);

    if (!normalizedUrl) {
      return NextResponse.json(
        { success: false, error: '请输入有效的小红书主页链接' },
        { status: 400 }
      );
    }

    const existing = await db.xhsAccount.findUnique({
      where: { xhsUrl: normalizedUrl },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '该账号已存在' },
        { status: 409 }
      );
    }

    const account = await db.xhsAccount.create({
      data: {
        xhsUrl: normalizedUrl,
        xhsId: normalizedUrl.split('/').pop() || '',
        status: 'idle',
      },
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    console.error('Failed to create account:', error);
    return NextResponse.json(
      { success: false, error: '创建账号失败，请检查数据库配置后重试' },
      { status: 500 }
    );
  }
}
