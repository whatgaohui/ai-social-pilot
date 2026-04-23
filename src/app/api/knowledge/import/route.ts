import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const format = formData.get('format') as string || 'json';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    let imported = 0;
    let errors = 0;

    if (format === 'json') {
      try {
        const data = JSON.parse(text);
        const items = Array.isArray(data) ? data : data.items || [data];

        for (const item of items) {
          if (!item.title || !item.content) {
            errors++;
            continue;
          }

          await db.knowledgeItem.create({
            data: {
              title: String(item.title).slice(0, 200),
              content: String(item.content),
              category: String(item.category || 'general').slice(0, 50),
              tags: String(item.tags || '').slice(0, 500),
            },
          });
          imported++;
        }
      } catch (e) {
        return NextResponse.json(
          { error: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}` },
          { status: 400 }
        );
      }
    } else if (format === 'csv') {
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        return NextResponse.json({ error: 'CSV must have headers and at least one row' }, { status: 400 });
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 2) {
          errors++;
          continue;
        }

        const record: Record<string, string> = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx] || '';
        });

        const title = record['title'] || record['标题'] || '';
        const content = record['content'] || record['内容'] || '';
        if (!title || !content) {
          errors++;
          continue;
        }

        await db.knowledgeItem.create({
          data: {
            title: title.slice(0, 200),
            content,
            category: (record['category'] || record['分类'] || 'general').slice(0, 50),
            tags: (record['tags'] || record['标签'] || '').slice(0, 500),
          },
        });
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      errors,
      message: `成功导入 ${imported} 条知识${errors > 0 ? `，${errors} 条跳过` : ''}`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { searchParams } = new URL(new URL('', 'http://localhost').href);
    // This endpoint returns a template for import
    const template = [
      'title,category,content,tags',
      '示例知识标题,expertise,示例知识内容，这里填写详细内容...,标签1,标签2',
      '产品介绍,resource,介绍产品的优势和特点...,产品,介绍',
    ].join('\n');

    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="knowledge-import-template.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

/** Parse a CSV line respecting quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
