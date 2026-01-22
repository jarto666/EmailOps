/**
 * Smoke Test
 *
 * Quick sanity check that the API is working before running full load tests.
 * Verifies basic endpoints respond correctly.
 *
 * Usage:
 *   k6 run test/load/scenarios/smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { url, withWorkspace, defaultHeaders } from './config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
  },
};

export default function () {
  console.log('Running smoke test...\n');

  // Test 1: Health endpoint
  {
    const res = http.get(url('/health'));
    check(res, {
      'health endpoint returns 200': (r) => r.status === 200,
    });
    console.log(`Health check: ${res.status}`);
  }

  sleep(0.5);

  // Test 2: List campaigns
  {
    const res = http.get(url(withWorkspace('/single-sends')), {
      headers: defaultHeaders,
    });
    check(res, {
      'campaigns endpoint returns 200': (r) => r.status === 200,
      'campaigns returns array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });
    const campaigns = JSON.parse(res.body);
    console.log(`Campaigns: ${res.status} (${campaigns.length} found)`);
  }

  sleep(0.5);

  // Test 3: List campaign groups
  {
    const res = http.get(url(withWorkspace('/campaign-groups')), {
      headers: defaultHeaders,
    });
    check(res, {
      'campaign groups endpoint returns 200': (r) => r.status === 200,
    });
    const groups = JSON.parse(res.body);
    console.log(`Campaign Groups: ${res.status} (${groups.length} found)`);
  }

  sleep(0.5);

  // Test 4: List templates
  {
    const res = http.get(url(withWorkspace('/templates')), {
      headers: defaultHeaders,
    });
    check(res, {
      'templates endpoint returns 200': (r) => r.status === 200,
    });
    const templates = JSON.parse(res.body);
    console.log(`Templates: ${res.status} (${templates.length} found)`);
  }

  console.log('\nSmoke test complete!');
}
