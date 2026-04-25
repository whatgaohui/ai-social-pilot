import { describe, it, expect, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/knowledge/route';
import { db } from '@/lib/db';

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

describe('Knowledge API Route', () => {
  let createdItemIds: string[] = [];

  afterEach(async () => {
    if (createdItemIds.length > 0) {
      await db.knowledgeItem.deleteMany({
        where: { id: { in: createdItemIds } },
      });
      createdItemIds = [];
    }
  });

  describe('GET /api/knowledge', () => {
    it('should return 200 with an array', async () => {
      const request = createRequest('http://localhost:3000/api/knowledge');
      const response = await GET(request as any);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/knowledge', () => {
    it('should create a knowledge item with valid data', async () => {
      const body = {
        title: 'Test Knowledge Item',
        content: 'This is test content for a knowledge item.',
        category: 'expertise',
        tags: 'test,vitest',
      };

      const request = createRequest('http://localhost:3000/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.title).toBe('Test Knowledge Item');
      expect(data.content).toBe('This is test content for a knowledge item.');
      expect(data.category).toBe('expertise');
      expect(data.tags).toBe('test,vitest');

      createdItemIds.push(data.id);
    });

    it('should return 500 when creating with missing title (required field)', async () => {
      const body = {
        content: 'Content without a title',
      };

      const request = createRequest('http://localhost:3000/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      // Prisma will throw because title is a required field
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
