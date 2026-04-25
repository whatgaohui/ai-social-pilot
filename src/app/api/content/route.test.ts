import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/content/route';
import { db } from '@/lib/db';

// Helper to create a NextRequest-like Request object
function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

describe('Content API Route', () => {
  let testPlanId: string;
  let createdPostIds: string[] = [];

  beforeAll(async () => {
    // Create a test plan that content posts can reference
    const plan = await db.contentPlan.create({
      data: {
        month: '2099-12',
        theme: 'test-plan-for-content-tests',
        status: 'draft',
      },
    });
    testPlanId = plan.id;
  });

  afterEach(async () => {
    // Clean up created content posts after each test
    if (createdPostIds.length > 0) {
      await db.contentPost.deleteMany({
        where: { id: { in: createdPostIds } },
      });
      createdPostIds = [];
    }
  });

  afterAll(async () => {
    // Clean up the test plan
    if (testPlanId) {
      await db.contentPlan.delete({ where: { id: testPlanId } }).catch(() => {});
    }
  });

  describe('GET /api/content', () => {
    it('should return 200 with an array', async () => {
      const request = createRequest('http://localhost:3000/api/content');
      const response = await GET(request as any);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return content filtered by planId', async () => {
      const request = createRequest(`http://localhost:3000/api/content?planId=${testPlanId}`);
      const response = await GET(request as any);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/content', () => {
    it('should create a new content post with valid data', async () => {
      const body = {
        planId: testPlanId,
        scheduledDate: '2099-12-15',
        platform: 'wechat',
        contentType: 'text',
        topic: 'Test Post Topic',
        content: 'This is a test content post.',
        status: 'planned',
      };

      const request = createRequest('http://localhost:3000/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.planId).toBe(testPlanId);
      expect(data.topic).toBe('Test Post Topic');
      expect(data.content).toBe('This is a test content post.');
      expect(data.platform).toBe('wechat');
      
      createdPostIds.push(data.id);
    });

    it('should return 500 when creating with missing required fields (no planId)', async () => {
      const body = {
        scheduledDate: '2099-12-15',
        topic: 'Missing Plan ID',
      };

      const request = createRequest('http://localhost:3000/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      // Prisma will throw when planId is missing (required relation field)
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
