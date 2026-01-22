/**
 * Analytics SDK tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestClient, getClient } from './setup';
import type { EmailOps } from '../src';

describe('Analytics', () => {
  let client: EmailOps;

  useTestClient(beforeAll, afterAll);

  beforeAll(() => {
    client = getClient();
  });

  it('should get overview stats', async () => {
    const stats = await client.analytics.getOverview();

    expect(stats).toBeDefined();
    expect(typeof stats.totalSent).toBe('number');
    expect(typeof stats.totalDelivered).toBe('number');
    expect(typeof stats.totalBounced).toBe('number');
    expect(typeof stats.totalFailed).toBe('number');
    expect(typeof stats.deliveryRate).toBe('number');
    expect(typeof stats.activeCampaigns).toBe('number');
    expect(typeof stats.totalSegments).toBe('number');
    expect(typeof stats.totalTemplates).toBe('number');
  });

  it('should get daily metrics', async () => {
    const metrics = await client.analytics.getDailyMetrics();

    expect(Array.isArray(metrics)).toBe(true);
  });

  it('should get daily metrics with custom days parameter', async () => {
    const metrics = await client.analytics.getDailyMetrics(7);

    expect(Array.isArray(metrics)).toBe(true);
    // API returns the requested days + today
    expect(metrics.length).toBeLessThanOrEqual(8);
  });

  it('should get recent campaigns (empty initially)', async () => {
    const campaigns = await client.analytics.getRecentCampaigns();

    expect(Array.isArray(campaigns)).toBe(true);
  });
});
