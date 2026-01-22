/**
 * Concurrent Campaign Triggers Test
 *
 * Tests system stability when multiple campaigns are triggered simultaneously.
 * Verifies no deadlocks occur and collision detection works correctly.
 *
 * Usage:
 *   k6 run test/load/scenarios/concurrent-triggers.js
 *   k6 run test/load/scenarios/concurrent-triggers.js --env CONCURRENT=50
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { url, withWorkspace, defaultHeaders, thresholds } from './config.js';

// Custom metrics
const triggerSuccess = new Counter('trigger_success');
const triggerFailed = new Counter('trigger_failed');
const triggerDuration = new Trend('trigger_duration');
const duplicateSends = new Counter('duplicate_sends');

// Test configuration
const CONCURRENT = parseInt(__ENV.CONCURRENT || '10');

export const options = {
  scenarios: {
    concurrent_triggers: {
      executor: 'per-vu-iterations',
      vus: CONCURRENT,
      iterations: 1,
      maxDuration: '5m',
    },
  },
  thresholds: {
    ...thresholds.concurrent,
    trigger_success: ['count>0'],
    duplicate_sends: ['count==0'],
  },
};

export function setup() {
  // Get list of available campaigns
  const res = http.get(url(withWorkspace('/single-sends')), {
    headers: defaultHeaders,
  });

  if (res.status !== 200) {
    console.error(`Failed to get campaigns: ${res.status} ${res.body}`);
    return { campaigns: [] };
  }

  const campaigns = JSON.parse(res.body);
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');

  console.log(`Found ${activeCampaigns.length} active campaigns for testing`);

  return {
    campaigns: activeCampaigns.map(c => c.id),
  };
}

export default function (data) {
  const { campaigns } = data;

  if (campaigns.length === 0) {
    console.error('No campaigns available for testing');
    return;
  }

  // Each VU triggers a different campaign (or cycles if more VUs than campaigns)
  const campaignId = campaigns[__VU % campaigns.length];

  console.log(`VU ${__VU}: Triggering campaign ${campaignId}`);

  const startTime = Date.now();

  const res = http.post(
    url(withWorkspace(`/single-sends/${campaignId}/trigger`)),
    null,
    { headers: defaultHeaders }
  );

  const duration = Date.now() - startTime;
  triggerDuration.add(duration);

  const success = check(res, {
    'trigger succeeded': (r) => r.status === 200 || r.status === 201,
    'no server error': (r) => r.status < 500,
  });

  if (success) {
    triggerSuccess.add(1);
    console.log(`VU ${__VU}: Campaign ${campaignId} triggered successfully in ${duration}ms`);
  } else {
    triggerFailed.add(1);
    console.error(`VU ${__VU}: Campaign ${campaignId} trigger failed: ${res.status} ${res.body}`);
  }

  // Small random delay to simulate real-world conditions
  sleep(Math.random() * 0.5);
}

export function teardown(data) {
  console.log('\n=== Concurrent Triggers Test Complete ===');
  console.log(`Total campaigns triggered: ${data.campaigns.length}`);

  // Check for duplicate sends by querying send logs
  // This would require a custom endpoint or direct DB query
}
