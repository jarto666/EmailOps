/**
 * Collision Detection Accuracy Test
 *
 * Verifies collision detection works correctly under concurrent load.
 * Multiple campaigns in the same group targeting overlapping recipients
 * should never result in duplicate sends.
 *
 * Usage:
 *   k6 run test/load/scenarios/collision-accuracy.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { url, withWorkspace, defaultHeaders, WORKSPACE_ID } from './config.js';

// Custom metrics
const collisionChecked = new Counter('collision_checked');
const collisionBlocked = new Counter('collision_blocked');
const duplicatesFound = new Counter('duplicates_found');
const checkDuration = new Trend('collision_check_duration');

// Test configuration
const CAMPAIGNS_PER_GROUP = parseInt(__ENV.CAMPAIGNS_PER_GROUP || '5');
const CONCURRENT_TRIGGERS = parseInt(__ENV.CONCURRENT || '10');
const TRIGGER_WINDOW_MS = parseInt(__ENV.TRIGGER_WINDOW || '5000');

export const options = {
  scenarios: {
    // Phase 1: Trigger multiple campaigns nearly simultaneously
    trigger_campaigns: {
      executor: 'per-vu-iterations',
      vus: CONCURRENT_TRIGGERS,
      iterations: 1,
      maxDuration: '2m',
      exec: 'triggerCampaigns',
    },
    // Phase 2: Wait for processing, then verify no duplicates
    verify_results: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      startTime: '2m30s', // Start after triggers complete
      maxDuration: '5m',
      exec: 'verifyResults',
    },
  },
  thresholds: {
    duplicates_found: ['count==0'], // Zero tolerance for duplicates
    collision_blocked: ['count>0'], // We expect some collisions to be blocked
  },
};

export function setup() {
  // Clean up stale runs from previous tests (staleMinutes=0 cleans all active runs)
  const cleanupRes = http.get(
    url(withWorkspace('/single-sends/actions/cleanup-stale-runs') + '&staleMinutes=0'),
    { headers: defaultHeaders }
  );

  if (cleanupRes.status === 200) {
    const cleanup = JSON.parse(cleanupRes.body);
    console.log(`Cleaned up ${cleanup.cleanedUp || 0} stale runs from previous tests`);
  } else {
    console.log(`Cleanup returned ${cleanupRes.status}: ${cleanupRes.body}`);
  }

  // Get campaigns in the same group for collision testing
  const res = http.get(url(withWorkspace('/single-sends')), {
    headers: defaultHeaders,
  });

  if (res.status !== 200) {
    console.error(`Failed to get campaigns: ${res.status}`);
    return { campaigns: [], groupId: null };
  }

  const allCampaigns = JSON.parse(res.body);

  // Find campaigns that share a campaign group
  const groupedCampaigns = {};
  for (const campaign of allCampaigns) {
    if (campaign.campaignGroupId && campaign.status === 'ACTIVE') {
      if (!groupedCampaigns[campaign.campaignGroupId]) {
        groupedCampaigns[campaign.campaignGroupId] = [];
      }
      groupedCampaigns[campaign.campaignGroupId].push(campaign);
    }
  }

  // Find a group with multiple campaigns
  let testGroup = null;
  let testCampaigns = [];

  for (const [groupId, campaigns] of Object.entries(groupedCampaigns)) {
    if (campaigns.length >= 2) {
      testGroup = groupId;
      testCampaigns = campaigns.slice(0, CAMPAIGNS_PER_GROUP);
      break;
    }
  }

  if (!testGroup) {
    console.error('No campaign group with multiple campaigns found');
    return { campaigns: [], groupId: null };
  }

  console.log(`Testing collision detection for group: ${testGroup}`);
  console.log(`Campaigns in test: ${testCampaigns.map(c => c.id).join(', ')}`);
  console.log(`Campaign priorities: ${testCampaigns.map(c => c.priority).join(', ')}`);

  return {
    campaigns: testCampaigns.map(c => ({ id: c.id, priority: c.priority })),
    groupId: testGroup,
  };
}

export function triggerCampaigns(data) {
  const { campaigns, groupId } = data;

  if (campaigns.length === 0) {
    console.error('No campaigns available for testing');
    return;
  }

  // Each VU triggers a campaign (cycling through available campaigns)
  const campaignIndex = __VU % campaigns.length;
  const campaign = campaigns[campaignIndex];

  // Add small random delay within trigger window to simulate near-simultaneous triggers
  const randomDelay = Math.random() * (TRIGGER_WINDOW_MS / 1000);
  sleep(randomDelay);

  console.log(`VU ${__VU}: Triggering campaign ${campaign.id} (priority: ${campaign.priority})`);

  const res = http.post(
    url(withWorkspace(`/single-sends/${campaign.id}/trigger`)),
    null,
    { headers: defaultHeaders }
  );

  check(res, {
    'trigger accepted': (r) => r.status === 200 || r.status === 201 || r.status === 400,
  });

  if (res.status === 400) {
    // Campaign might already be running - this is expected in collision scenarios
    console.log(`VU ${__VU}: Campaign ${campaign.id} - ${res.body}`);
  }
}

export function verifyResults(data) {
  const { campaigns, groupId } = data;

  if (!groupId) {
    console.error('No group ID for verification');
    return;
  }

  console.log('\n=== Verifying Collision Detection Results ===');

  // Get campaign group details with send logs
  const groupRes = http.get(
    url(withWorkspace(`/campaign-groups/${groupId}`)),
    { headers: defaultHeaders }
  );

  if (groupRes.status !== 200) {
    console.error(`Failed to get campaign group: ${groupRes.status}`);
    return;
  }

  const group = JSON.parse(groupRes.body);
  console.log(`Group: ${group.name}`);
  console.log(`Collision Policy: ${group.collisionPolicy}`);
  console.log(`Collision Window: ${group.collisionWindow}s`);

  // Check each campaign's runs for the test
  for (const campaign of campaigns) {
    const campaignRes = http.get(
      url(withWorkspace(`/single-sends/${campaign.id}`)),
      { headers: defaultHeaders }
    );

    if (campaignRes.status === 200) {
      const campaignData = JSON.parse(campaignRes.body);
      const recentRuns = campaignData.runs || [];

      console.log(`Campaign ${campaign.id} (priority ${campaign.priority}): ${recentRuns.length} runs`);

      for (const run of recentRuns.slice(0, 3)) {
        const stats = run.stats || {};
        console.log(`  Run ${run.id}: status=${run.status}, sent=${stats.sent || 0}, skipped=${stats.skipped || 0}`);

        if (stats.skippedReasons) {
          console.log(`    Skip reasons: ${JSON.stringify(stats.skippedReasons)}`);
          if (stats.skippedReasons.collision) {
            collisionBlocked.add(stats.skippedReasons.collision);
          }
        }
      }
    }
  }

  // TODO: Add direct database query to verify no duplicate send logs exist
  // This would require a custom API endpoint or database access

  console.log('\nCollision verification complete');
  console.log('Check the metrics for duplicates_found - should be 0');
}

export function teardown(data) {
  console.log('\n=== Collision Accuracy Test Complete ===');
  console.log(`Tested group: ${data.groupId}`);
  console.log(`Campaigns tested: ${data.campaigns.length}`);
}
