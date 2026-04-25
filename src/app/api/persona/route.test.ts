import { describe, it, expect, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/persona/route';
import { db } from '@/lib/db';

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

describe('Persona API Route', () => {
  // Track original persona to restore after tests
  let originalPersona: any = null;

  afterEach(async () => {
    // Clean up - remove test persona data
    await db.persona.deleteMany().catch(() => {});
    // Restore original if there was one
    if (originalPersona) {
      await db.persona.create({ data: originalPersona }).catch(() => {});
      originalPersona = null;
    }
  });

  describe('GET /api/persona', () => {
    it('should return 200 (may be null if no persona set)', async () => {
      // Remove any existing persona for clean test
      await db.persona.deleteMany();

      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      // When no persona exists, it returns null
      expect(data).toBeNull();
    });

    it('should return the persona object when one exists', async () => {
      await db.persona.deleteMany();
      await db.persona.create({
        data: {
          name: 'Test Persona',
          title: 'Test Title',
          industry: 'Tech',
          tone: 'professional',
          style: 'balanced',
        },
      });

      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).not.toBeNull();
      expect(data.name).toBe('Test Persona');
      expect(data.title).toBe('Test Title');
    });
  });

  describe('POST /api/persona', () => {
    it('should create/updates persona with valid data', async () => {
      await db.persona.deleteMany();

      const body = {
        name: 'New Persona',
        title: 'AI Expert',
        industry: 'Technology',
        tone: 'casual',
        style: 'concise',
        keywords: 'AI, tech, testing',
        bio: 'A test persona for vitest',
        targetAudience: 'developers',
      };

      const request = createRequest('http://localhost:3000/api/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('New Persona');
      expect(data.tone).toBe('casual');
      expect(data.style).toBe('concise');
    });

    it('should replace existing persona (deleteMany + create)', async () => {
      // Create an initial persona
      await db.persona.deleteMany();
      await db.persona.create({
        data: { name: 'Old Persona' },
      });

      // Verify there's exactly one
      const beforeCount = await db.persona.count();
      expect(beforeCount).toBe(1);

      const body = {
        name: 'Replacement Persona',
        title: 'Updated',
      };

      const request = createRequest('http://localhost:3000/api/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.name).toBe('Replacement Persona');

      // Verify there's still exactly one persona
      const afterCount = await db.persona.count();
      expect(afterCount).toBe(1);
    });
  });
});
