/**
 * Queue Throughput Test
 *
 * Tests sustained send rate and measures latency percentiles.
 * Simulates steady load ramping up to target throughput.
 *
 * Usage:
 *   k6 run test/load/scenarios/queue-throughput.js
 *   k6 run test/load/scenarios/queue-throughput.js --env TARGET_RPS=500
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { url, withWorkspace, defaultHeaders, thresholds } from './config.js';

// Custom metrics
const sendSuccess = new Counter('send_success');
const sendFailed = new Counter('send_failed');
const sendLatency = new Trend('send_latency');

// Test configuration
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '100');
const RAMP_UP_DURATION = __ENV.RAMP_UP || '30s';
const SUSTAINED_DURATION = __ENV.SUSTAINED || '2m';
const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN || '30s';

export const options = {
  scenarios: {
    throughput_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: Math.ceil(TARGET_RPS * 1.5),
      maxVUs: TARGET_RPS * 2,
      stages: [
        { duration: RAMP_UP_DURATION, target: TARGET_RPS },
        { duration: SUSTAINED_DURATION, target: TARGET_RPS },
        { duration: RAMP_DOWN_DURATION, target: 0 },
      ],
    },
  },
  thresholds: {
    ...thresholds.throughput,
    send_success: ['count>0'],
    send_latency: ['p(95)<100', 'p(99)<200'],
  },
};

export function setup() {
  // Get a campaign to use for testing
  const res = http.get(url(withWorkspace('/single-sends')), {
    headers: defaultHeaders,
  });

  if (res.status !== 200) {
    console.error(`Failed to get campaigns: ${res.status}`);
    return { campaignId: null };
  }

  const campaigns = JSON.parse(res.body);
  const activeCampaign = campaigns.find(c => c.status === 'ACTIVE');

  if (!activeCampaign) {
    console.error('No active campaigns found');
    return { campaignId: null };
  }

  console.log(`Using campaign: ${activeCampaign.id}`);
  console.log(`Target throughput: ${TARGET_RPS} requests/second`);

  return {
    campaignId: activeCampaign.id,
  };
}

export default function (data) {
  const { campaignId } = data;

  if (!campaignId) {
    console.error('No campaign ID available');
    return;
  }

  // Simulate an individual send operation
  // In a real scenario, this would be hitting a send endpoint
  // For now, we test the campaign status endpoint as a proxy for API performance
  const startTime = Date.now();

  const res = http.get(
    url(withWorkspace(`/single-sends/${campaignId}`)),
    { headers: defaultHeaders }
  );

  const latency = Date.now() - startTime;
  sendLatency.add(latency);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'latency < 100ms': (r) => latency < 100,
    'latency < 200ms': (r) => latency < 200,
  });

  if (success) {
    sendSuccess.add(1);
  } else {
    sendFailed.add(1);
  }
}

export function teardown(data) {
  console.log('\n=== Queue Throughput Test Complete ===');
  console.log(`Target RPS: ${TARGET_RPS}`);
}
