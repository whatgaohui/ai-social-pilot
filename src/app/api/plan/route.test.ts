import { describe, it, expect, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/plan/route';
import { db } from '@/lib/db';

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

describe('Plan API Route', () => {
  let createdPlanIds: string[] = [];

  afterEach(async () => {
    if (createdPlanIds.length > 0) {
      // ContentPosts are cascade-deleted with plan
      await db.contentPlan.deleteMany({
        where: { id: { in: createdPlanIds } },
      });
      createdPlanIds = [];
    }
    // Clean up any notifications created by the route
    await db.notification.deleteMany({
      where: { title: '内容计划已创建' },
    }).catch(() => {});
  });

  describe('GET /api/plan', () => {
    it('should return 200 with an array', async () => {
      const request = createRequest('http://localhost:3000/api/plan');
      const response = await GET();

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/plan', () => {
    it('should create a plan with valid data', async () => {
      const body = {
        month: '2099-06',
        theme: 'Test Plan Theme',
        status: 'draft',
      };

      const request = createRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.month).toBe('2099-06');
      expect(data.theme).toBe('Test Plan Theme');
      expect(data.status).toBe('draft');

      createdPlanIds.push(data.id);
    });

    it('should return 500 when creating with missing month (required field)', async () => {
      const body = {
        theme: 'Plan without month',
      };

      const request = createRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      // Prisma will throw because month is required
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
