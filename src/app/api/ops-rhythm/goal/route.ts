import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GOAL_FILE = path.join(process.cwd(), 'db', 'weekly-goal.json');

function ensureDir() {
  const dir = path.dirname(GOAL_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readGoal(): { target: number } {
  try {
    if (fs.existsSync(GOAL_FILE)) {
      const raw = fs.readFileSync(GOAL_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return { target: 7 };
}

function writeGoal(target: number): void {
  ensureDir();
  fs.writeFileSync(GOAL_FILE, JSON.stringify({ target }, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const goal = readGoal();
    return NextResponse.json(goal);
  } catch {
    return NextResponse.json({ target: 7 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const target = Number(body.target);

    if (!target || target < 1 || target > 30 || !Number.isInteger(target)) {
      return NextResponse.json(
        { error: '目标必须是1-30之间的整数' },
        { status: 400 },
      );
    }

    writeGoal(target);
    return NextResponse.json({ target });
  } catch {
    return NextResponse.json(
      { error: '更新目标失败' },
      { status: 500 },
    );
  }
}
