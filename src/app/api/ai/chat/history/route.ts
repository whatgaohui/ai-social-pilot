import { NextResponse } from 'next/server';

/**
 * Chat History API
 * All conversation history is stored in localStorage on the client side.
 * This endpoint exists for API completeness and potential future server-side features.
 */

// GET: Return empty list (client handles storage via localStorage)
export async function GET() {
  return NextResponse.json({
    conversations: [],
    message: '对话历史存储在客户端 localStorage 中',
  });
}
