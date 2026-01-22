/**
 * Campaign Groups SDK tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestClient, getClient } from './setup';
import type { EmailOps } from '../src';

describe('Campaign Groups', () => {
  let client: EmailOps;

  useTestClient(beforeAll, afterAll);

  beforeAll(() => {
    client = getClient();
  });

  it('should create a campaign group', async () => {
    const group = await client.campaignGroups.create({
      name: 'Test Campaign Group',
      description: 'A test campaign group',
      collisionWindow: 86400, // 24 hours in seconds
      collisionPolicy: 'HIGHEST_PRIORITY_WINS',
    });

    expect(group).toBeDefined();
    expect(group.id).toBeDefined();
    expect(group.name).toBe('Test Campaign Group');
    expect(group.collisionWindow).toBe(86400);
    expect(group.collisionPolicy).toBe('HIGHEST_PRIORITY_WINS');
  });

  it('should list campaign groups', async () => {
    const groups = await client.campaignGroups.list();

    expect(Array.isArray(groups)).toBe(true);
  });

  it('should get a campaign group by ID', async () => {
    const created = await client.campaignGroups.create({
      name: 'Get Test Group',
    });

    const group = await client.campaignGroups.get(created.id);

    expect(group.id).toBe(created.id);
    expect(group.name).toBe('Get Test Group');
  });

  it('should update a campaign group', async () => {
    const created = await client.campaignGroups.create({
      name: 'Update Test Group',
      collisionPolicy: 'SEND_ALL',
    });

    const updated = await client.campaignGroups.update(created.id, {
      name: 'Updated Group Name',
      collisionPolicy: 'FIRST_SCHEDULED_WINS',
    });

    expect(updated.name).toBe('Updated Group Name');
    expect(updated.collisionPolicy).toBe('FIRST_SCHEDULED_WINS');
  });

  it('should delete a campaign group', async () => {
    const group = await client.campaignGroups.create({
      name: 'Delete Test Group',
    });

    const result = await client.campaignGroups.delete(group.id);
    expect(result.ok).toBe(true);

    // Verify it's deleted
    await expect(client.campaignGroups.get(group.id)).rejects.toThrow();
  });

  it('should support different collision policies', async () => {
    const policies = ['SEND_ALL', 'HIGHEST_PRIORITY_WINS', 'FIRST_SCHEDULED_WINS'] as const;

    for (const policy of policies) {
      const group = await client.campaignGroups.create({
        name: `Policy Test - ${policy}`,
        collisionPolicy: policy,
      });

      expect(group.collisionPolicy).toBe(policy);
    }
  });

  it('should get campaigns in a group', async () => {
    const group = await client.campaignGroups.create({
      name: 'Campaigns Test Group',
    });

    // Get campaigns (should be empty initially)
    const campaigns = await client.campaignGroups.getCampaigns(group.id);
    expect(Array.isArray(campaigns)).toBe(true);
  });
});
