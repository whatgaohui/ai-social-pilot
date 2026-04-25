import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "db", "backups");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    if (!filename.endsWith(".json")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const filePath = path.join(BACKUP_DIR, filename);

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
    }

    const fileContent = await fs.readFile(filePath, "utf-8");
    const stat = await fs.stat(filePath);

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(stat.size),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to download backup" }, { status: 500 });
  }
}
