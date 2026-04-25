import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const TEMPLATES_FILE = join(process.cwd(), "db", "templates.json");

interface Template {
  id: string;
  title: string;
  platform: string;
  category: string;
  content: string;
  tone: string;
  contentType: string;
  tags: string[];
  isPublic: boolean;
  isFeatured: boolean;
  usageCount: number;
  rating: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

function readTemplates(): Template[] {
  if (!existsSync(TEMPLATES_FILE)) {
    mkdirSync(join(process.cwd(), "db"), { recursive: true });
    writeFileSync(TEMPLATES_FILE, "[]", "utf-8");
    return [];
  }
  try {
    const data = readFileSync(TEMPLATES_FILE, "utf-8");
    return JSON.parse(data) as Template[];
  } catch {
    return [];
  }
}

function writeTemplates(templates: Template[]): void {
  mkdirSync(join(process.cwd(), "db"), { recursive: true });
  writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
}

// GET /api/templates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "";
  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "newest";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const featured = searchParams.get("featured") === "true";

  let templates = readTemplates();

  // Filter by featured
  if (featured) {
    templates = templates.filter((t) => t.isFeatured);
  }

  // Filter by platform
  if (platform && platform !== "all") {
    templates = templates.filter((t) => t.platform === platform);
  }

  // Filter by category
  if (category) {
    templates = templates.filter((t) => t.category === category);
  }

  // Search by title, content, tags
  if (search) {
    const q = search.toLowerCase();
    templates = templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  // Sort
  switch (sortBy) {
    case "newest":
      templates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
    case "popular":
      templates.sort((a, b) => b.usageCount - a.usageCount);
      break;
    case "rating":
      templates.sort((a, b) => b.rating - a.rating);
      break;
  }

  // Pagination
  const total = templates.length;
  const start = (page - 1) * limit;
  const paginatedTemplates = templates.slice(start, start + limit);

  return NextResponse.json({
    templates: paginatedTemplates,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/templates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, platform, category, content, tone, contentType, tags, isPublic } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    const templates = readTemplates();
    const newTemplate: Template = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      platform: platform || "wechat",
      category: category || "日常分享",
      content,
      tone: tone || "professional",
      contentType: contentType || "text",
      tags: tags || [],
      isPublic: isPublic !== false,
      isFeatured: false,
      usageCount: 0,
      rating: 0,
      preview: content.length > 60 ? content.slice(0, 60) + "..." : content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    templates.push(newTemplate);
    writeTemplates(templates);

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建模板失败", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/templates
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少模板ID" }, { status: 400 });
    }

    const templates = readTemplates();
    const index = templates.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }

    // Regenerate preview if content changed
    if (updates.content) {
      updates.preview = updates.content.length > 60 ? updates.content.slice(0, 60) + "..." : updates.content;
    }

    templates[index] = { ...templates[index], ...updates, updatedAt: new Date().toISOString() };
    writeTemplates(templates);

    return NextResponse.json(templates[index]);
  } catch (error) {
    return NextResponse.json(
      { error: "更新模板失败", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/templates
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "缺少模板ID" }, { status: 400 });
  }

  const templates = readTemplates();
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  templates.splice(index, 1);
  writeTemplates(templates);

  return NextResponse.json({ success: true });
}
