import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export const register = new Registry();

export const appUp = new Gauge({
  name: 'web_search_service_up',
  help: '1=service running, 0=offline',
  registers: [register],
});

export const searchRequestsTotal = new Counter({
  name: 'web_search_requests_total',
  help: 'Total search requests by provider and status',
  labelNames: ['provider', 'status'],
  registers: [register],
});

export const searchRequestDuration = new Histogram({
  name: 'web_search_request_duration_seconds',
  help: 'Search request duration in seconds by provider',
  labelNames: ['provider'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const searchErrorsTotal = new Counter({
  name: 'web_search_errors_total',
  help: 'Total search errors by provider and error type',
  labelNames: ['provider', 'error_type'],
  registers: [register],
});

export const providerAvailable = new Gauge({
  name: 'web_search_provider_available',
  help: '1=provider available, 0=unavailable',
  labelNames: ['provider'],
  registers: [register],
});

export const providerLatencyAvg = new Gauge({
  name: 'web_search_provider_latency_avg_seconds',
  help: 'Average provider latency in seconds',
  labelNames: ['provider'],
  registers: [register],
});

export const providerQuotaRemaining = new Gauge({
  name: 'web_search_provider_quota_remaining',
  help: 'Remaining quota for provider (-1 for unlimited)',
  labelNames: ['provider'],
  registers: [register],
});

export const circuitBreakerState = new Gauge({
  name: 'web_search_circuit_breaker_state',
  help: '0=closed (healthy), 1=open (tripped)',
  labelNames: ['provider'],
  registers: [register],
});

export const apiRequestsTotal = new Counter({
  name: 'web_search_api_requests_total',
  help: 'Total HTTP API requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const apiRequestDuration = new Histogram({
  name: 'web_search_api_request_duration_seconds',
  help: 'HTTP API request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export function resetMetrics(): void {
  register.resetMetrics();
}
