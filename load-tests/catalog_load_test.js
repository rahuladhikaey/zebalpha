/**
 * ZEBALPHA PHASE 5 — CATALOG LOAD TEST (k6)
 * Target Endpoint: GET /api/products?page=1&limit=12
 * 
 * Objectives:
 * - Ramp through 50, 100, 250, and 500 Virtual Users (VUs)
 * - Measure p50, p95, p99 latencies, throughput, and HTTP error rate
 * - Production Target: p95 < 200ms, Error Rate < 0.1%
 * 
 * Safety:
 * - Requires STAGING_BASE_URL environment variable
 * - Refuses to execute against production domains without explicit confirmation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Metrics
const errorRate = new Rate('error_rate');
const catalogDuration = new Trend('catalog_request_duration_ms');

// Staging target verification
const BASE_URL = __ENV.STAGING_BASE_URL || 'http://localhost:3000';
const IS_PROD_URL = BASE_URL.includes('zebalpha.shop') || BASE_URL.includes('production');

if (IS_PROD_URL && !__ENV.ALLOW_PRODUCTION_TEST) {
  throw new Error('[SAFETY GUARD]: Load tests must NOT run against production domains without ALLOW_PRODUCTION_TEST=true. Aborting.');
}

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Warm-up to 50 VUs
    { duration: '1m',  target: 100 },  // Sustained 100 VUs
    { duration: '1m',  target: 250 },  // Scale to 250 VUs
    { duration: '1m',  target: 500 },  // Peak 500 VUs stress
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'], // 95% requests < 200ms
    'error_rate': ['rate<0.001'],                     // Less than 0.1% errors
  },
};

export default function () {
  const url = `${BASE_URL}/api/products?page=1&limit=12`;
  const params = {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-Zebalpha-LoadTest/1.0',
      'X-Request-Source': 'load-test-runner'
    },
    tags: { name: 'GetCatalogPage1' },
    timeout: '5s'
  };

  const res = http.get(url, params);

  catalogDuration.add(res.timings.duration);

  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
    'has valid payload': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (Array.isArray(body.products) || Array.isArray(body.data) || body.success !== undefined);
      } catch (_) {
        return false;
      }
    },
    'response under 1500ms': (r) => r.timings.duration < 1500,
  });

  errorRate.add(!isSuccess);

  // Think time between customer browsing actions (200ms - 800ms)
  sleep(0.2 + Math.random() * 0.6);
}
