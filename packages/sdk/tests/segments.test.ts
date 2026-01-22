/**
 * Segment SDK tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestClient, getClient } from './setup';
import type { EmailOps } from '../src';

describe('Segments', () => {
  let client: EmailOps;

  useTestClient(beforeAll, afterAll);
  let dataConnectorId: string;

  beforeAll(async () => {
    client = getClient();

    // Create a data connector for segments
    const dataConnector = await client.dataConnectors.create({
      name: 'Segment Test DB',
      type: 'POSTGRES',
      config: {
        connectionString: 'postgresql://test:test@localhost:5432/test',
      },
    });
    dataConnectorId = dataConnector.id;
  });

  it('should create a segment', async () => {
    const segment = await client.segments.create({
      name: 'Test Segment',
      description: 'A test segment',
      dataConnectorId,
      sqlQuery: "SELECT 1 as id, 'user@example.com' as email, '{}'::json as vars",
    });

    expect(segment).toBeDefined();
    expect(segment.id).toBeDefined();
    expect(segment.name).toBe('Test Segment');
  });

  it('should list segments', async () => {
    const segments = await client.segments.list();

    expect(Array.isArray(segments)).toBe(true);
  });

  it('should get a segment by ID', async () => {
    const created = await client.segments.create({
      name: 'Get Test Segment',
      dataConnectorId,
      sqlQuery: "SELECT 1 as id, 'test@example.com' as email",
    });

    const segment = await client.segments.get(created.id);

    expect(segment.id).toBe(created.id);
    expect(segment.name).toBe('Get Test Segment');
  });

  it('should update a segment', async () => {
    const created = await client.segments.create({
      name: 'Update Test Segment',
      dataConnectorId,
      sqlQuery: "SELECT 1 as id, 'test@example.com' as email",
    });

    const updated = await client.segments.update(created.id, {
      name: 'Updated Segment Name',
      description: 'Updated description',
    });

    expect(updated.name).toBe('Updated Segment Name');
    expect(updated.description).toBe('Updated description');
  });

  it('should delete a segment', async () => {
    const segment = await client.segments.create({
      name: 'Delete Test Segment',
      dataConnectorId,
      sqlQuery: "SELECT 1 as id, 'test@example.com' as email",
    });

    const result = await client.segments.delete(segment.id);
    expect(result.ok).toBe(true);

    // Verify it's deleted
    await expect(client.segments.get(segment.id)).rejects.toThrow();
  });
});
