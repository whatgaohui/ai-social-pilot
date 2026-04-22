import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ─── CSV Parsing (no external library) ──────────────────────────────────

function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

function parseCSV(text: string): Record<string, string>[] {
  const cleaned = stripBOM(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n").filter((l) => l.trim() !== "");

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

// ─── JSON Parsing ────────────────────────────────────────────────────────

function parseJSON(text: string): Record<string, string>[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error("JSON 格式不正确：需要数组格式");
  }
  return data.map((item) => {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(item)) {
      record[key] = String(value ?? "");
    }
    return record;
  });
}

// ─── Import Content Posts ───────────────────────────────────────────────

async function importContentPosts(
  rows: Record<string, string>[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Find or create a ContentPlan for the current month
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let plan = await db.contentPlan.findFirst({ where: { month: monthStr } });
  if (!plan) {
    plan = await db.contentPlan.create({
      data: {
        month: monthStr,
        theme: `导入内容 - ${monthStr}`,
        status: "active",
      },
    });
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // header is row 1

    const scheduledDate = row.scheduledDate || row.scheduled_date || row.date || "";
    const topic = row.topic || row.title || "";
    const content = row.content || row.text || row.body || "";
    const contentType = row.contentType || row.content_type || row.type || "text";
    const platform = row.platform || "wechat";
    const status = row.status || "planned";

    // Validate required fields
    if (!scheduledDate) {
      skipped++;
      errors.push(`第 ${rowNum} 行：缺少 scheduledDate（计划日期）`);
      continue;
    }

    if (!topic && !content) {
      skipped++;
      errors.push(`第 ${rowNum} 行：topic 和 content 不能同时为空`);
      continue;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(scheduledDate)) {
      skipped++;
      errors.push(`第 ${rowNum} 行：日期格式不正确，应为 YYYY-MM-DD`);
      continue;
    }

    // Validate platform
    if (!["wechat", "xiaohongshu"].includes(platform)) {
      skipped++;
      errors.push(`第 ${rowNum} 行：不支持的 platform "${platform}"，应为 wechat 或 xiaohongshu`);
      continue;
    }

    // Validate status
    const validStatuses = ["planned", "generated", "optimized", "published"];
    if (!validStatuses.includes(status)) {
      skipped++;
      errors.push(`第 ${rowNum} 行：不支持的 status "${status}"，应为 ${validStatuses.join("/")}`);
      continue;
    }

    try {
      await db.contentPost.create({
        data: {
          planId: plan.id,
          scheduledDate,
          topic,
          content,
          contentType,
          platform,
          status,
        },
      });
      imported++;
    } catch (err) {
      skipped++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`第 ${rowNum} 行：创建失败 - ${msg}`);
    }
  }

  return { imported, skipped, errors };
}

// ─── Import Knowledge Items ─────────────────────────────────────────────

async function importKnowledgeItems(
  rows: Record<string, string>[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // header is row 1

    const title = row.title || row.name || "";
    const content = row.content || row.text || row.body || row.description || "";
    const category = row.category || row.type || "general";

    // Validate required fields
    if (!title) {
      skipped++;
      errors.push(`第 ${rowNum} 行：缺少 title（标题）`);
      continue;
    }

    if (!content) {
      skipped++;
      errors.push(`第 ${rowNum} 行：缺少 content（内容）`);
      continue;
    }

    try {
      await db.knowledgeItem.create({
        data: {
          title,
          content,
          category,
        },
      });
      imported++;
    } catch (err) {
      skipped++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`第 ${rowNum} 行：创建失败 - ${msg}`);
    }
  }

  return { imported, skipped, errors };
}

// ─── POST Handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const importType = formData.get("type") as string | null;

    // Validate import type
    if (!importType || !["content", "knowledge"].includes(importType)) {
      return NextResponse.json(
        { success: false, imported: 0, skipped: 0, errors: ["缺少或无效的 type 参数，应为 content 或 knowledge"] },
        { status: 400 }
      );
    }

    // Validate file
    if (!file) {
      return NextResponse.json(
        { success: false, imported: 0, skipped: 0, errors: ["未选择文件"] },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, imported: 0, skipped: 0, errors: [`文件大小 ${(file.size / 1024 / 1024).toFixed(1)}MB 超过限制 5MB`] },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith(".csv");
    const isJSON = fileName.endsWith(".json");

    if (!isCSV && !isJSON) {
      return NextResponse.json(
        { success: false, imported: 0, skipped: 0, errors: ["不支持的文件格式，请上传 .csv 或 .json 文件"] },
        { status: 400 }
      );
    }

    // Read file content
    const rawText = await file.text();

    // Parse file
    let rows: Record<string, string>[];
    try {
      rows = isCSV ? parseCSV(rawText) : parseJSON(rawText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "解析失败";
      return NextResponse.json(
        { success: false, imported: 0, skipped: 0, errors: [`文件解析失败：${msg}`] },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, imported: 0, skipped: 0, errors: ["文件内容为空，没有可导入的数据"] },
        { status: 400 }
      );
    }

    // Import data
    const result =
      importType === "content"
        ? await importContentPosts(rows)
        : await importKnowledgeItems(rows);

    return NextResponse.json({
      success: result.imported > 0,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (err) {
    console.error("Import error:", err);
    const msg = err instanceof Error ? err.message : "服务器内部错误";
    return NextResponse.json(
      { success: false, imported: 0, skipped: 0, errors: [`服务器错误：${msg}`] },
      { status: 500 }
    );
  }
}
