/**
 * Suppression SDK tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestClient, getClient } from './setup';
import type { EmailOps } from '../src';

describe('Suppressions', () => {
  let client: EmailOps;

  useTestClient(beforeAll, afterAll);

  beforeAll(() => {
    client = getClient();
  });

  it('should add an email to suppression list', async () => {
    const email = `suppressed-${Date.now()}@example.com`;

    const suppression = await client.suppressions.create({
      email,
      reason: 'MANUAL',
      source: 'SDK Test',
    });

    expect(suppression).toBeDefined();
    expect(suppression.id).toBeDefined();
    expect(suppression.email).toBe(email);
    expect(suppression.reason).toBe('MANUAL');
  });

  it('should list suppressions', async () => {
    const result = await client.suppressions.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should check if email is suppressed', async () => {
    const email = `check-suppressed-${Date.now()}@example.com`;

    // Initially not suppressed
    const beforeResult = await client.suppressions.check(email);
    expect(beforeResult.suppressed).toBe(false);

    // Add to suppression list
    await client.suppressions.create({
      email,
      reason: 'BOUNCE',
    });

    // Now should be suppressed
    const afterResult = await client.suppressions.check(email);
    expect(afterResult.suppressed).toBe(true);
    expect(afterResult.suppression?.email).toBe(email);
  });

  it('should delete a suppression', async () => {
    const email = `delete-suppressed-${Date.now()}@example.com`;

    const suppression = await client.suppressions.create({
      email,
      reason: 'UNSUBSCRIBE',
    });

    const result = await client.suppressions.delete(suppression.id);
    expect(result.ok).toBe(true);

    // Verify it's removed
    const checkResult = await client.suppressions.check(email);
    expect(checkResult.suppressed).toBe(false);
  });

  it('should handle different suppression reasons', async () => {
    const reasons = ['BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'MANUAL'] as const;

    for (const reason of reasons) {
      const email = `reason-${reason.toLowerCase()}-${Date.now()}@example.com`;

      const suppression = await client.suppressions.create({
        email,
        reason,
      });

      expect(suppression.reason).toBe(reason);
    }
  });
});
