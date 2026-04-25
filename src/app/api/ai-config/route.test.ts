import { describe, it, expect, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/ai-config/route';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

describe('AI Config API Route', () => {
  let createdConfigIds: string[] = [];

  afterEach(async () => {
    if (createdConfigIds.length > 0) {
      await db.aIConfig.deleteMany({
        where: { id: { in: createdConfigIds } },
      });
      createdConfigIds = [];
    }
  });

  describe('GET /api/ai-config', () => {
    it('should return 200 with an array', async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/ai-config', () => {
    it('should create a config', async () => {
      const body = {
        name: 'Test Config',
        provider: 'z-ai',
        modelId: 'test-model',
        baseUrl: '',
        apiKey: 'test-api-key-123',
        isFree: true,
        isActive: false,
        maxTokens: 2048,
        temperature: 0.7,
      };

      const request = createRequest('http://localhost:3000/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Test Config');
      expect(data.provider).toBe('z-ai');
      expect(data.apiKey).toBe('test-api-key-123'); // Should be decrypted in response
      expect(data.isFree).toBe(true);

      createdConfigIds.push(data.id);
    });

    it('should encrypt apiKey before storing and decrypt in response', async () => {
      const testApiKey = 'super-secret-key-xyz';
      const body = {
        name: 'Encryption Test Config',
        provider: 'custom',
        modelId: 'test-model',
        baseUrl: 'https://api.example.com',
        apiKey: testApiKey,
        isFree: false,
        isActive: false,
      };

      const request = createRequest('http://localhost:3000/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      const data = await response.json();
      createdConfigIds.push(data.id);

      // Response should have decrypted apiKey
      expect(data.apiKey).toBe(testApiKey);

      // Database should have encrypted apiKey
      const dbConfig = await db.aIConfig.findUnique({ where: { id: data.id } });
      expect(dbConfig?.apiKey).not.toBe(testApiKey);
      // Verify it can be decrypted back
      expect(decrypt(dbConfig?.apiKey || '')).toBe(testApiKey);
    });

    it('should deactivate other configs when isActive=true', async () => {
      // Create first active config
      const body1 = {
        name: 'First Active Config',
        provider: 'z-ai',
        apiKey: 'key-1',
        isActive: true,
      };

      const req1 = createRequest('http://localhost:3000/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body1),
      });

      const res1 = await POST(req1 as any);
      const data1 = await res1.json();
      createdConfigIds.push(data1.id);
      expect(data1.isActive).toBe(true);

      // Create second active config — should deactivate the first
      const body2 = {
        name: 'Second Active Config',
        provider: 'groq',
        apiKey: 'key-2',
        isActive: true,
      };

      const req2 = createRequest('http://localhost:3000/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body2),
      });

      const res2 = await POST(req2 as any);
      const data2 = await res2.json();
      createdConfigIds.push(data2.id);
      expect(data2.isActive).toBe(true);

      // Verify first config is now deactivated
      const firstConfig = await db.aIConfig.findUnique({ where: { id: data1.id } });
      expect(firstConfig?.isActive).toBe(false);

      // Verify second config is active
      const secondConfig = await db.aIConfig.findUnique({ where: { id: data2.id } });
      expect(secondConfig?.isActive).toBe(true);
    });
  });
});
