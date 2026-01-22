/**
 * Shared configuration for k6 load tests
 */

export const BASE_URL = __ENV.API_URL || 'http://localhost:3300';
export const WORKSPACE_ID = __ENV.WORKSPACE_ID || 'load-test-workspace';

export const defaultHeaders = {
  'Content-Type': 'application/json',
};

// Thresholds for different test scenarios
export const thresholds = {
  segment: {
    http_req_duration: ['p(95)<60000', 'p(99)<120000'], // 60s p95, 120s p99
    http_req_failed: ['rate<0.01'], // <1% failure rate
  },
  concurrent: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'], // 5s p95, 10s p99
    http_req_failed: ['rate<0.05'], // <5% failure rate
  },
  throughput: {
    http_req_duration: ['p(95)<100', 'p(99)<200'], // 100ms p95, 200ms p99
    http_req_failed: ['rate<0.01'], // <1% failure rate
  },
};

// Helper to construct URLs
export function url(path) {
  return `${BASE_URL}${path}`;
}

// Helper to add workspace query param
export function withWorkspace(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}workspaceId=${WORKSPACE_ID}`;
}
