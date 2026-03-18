import type { SearchProvider } from './SearchProvider.js';
import type { SearchResult, SearchOptions, ProviderStats } from '../types.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { logger } from '../utils/logger.js';
import {
  searchRequestsTotal,
  searchRequestDuration,
  searchErrorsTotal,
  providerAvailable,
  providerLatencyAvg,
  providerQuotaRemaining,
  circuitBreakerState,
} from '../metrics/index.js';

const MAX_LATENCY_SAMPLES = 100;

export abstract class BaseProvider implements SearchProvider {
  abstract readonly name: string;
  abstract readonly priority: number;

  protected circuitBreaker: CircuitBreaker;
  protected latencySamples: number[] = [];
  protected requestCount = 0;
  protected errorCount = 0;
  protected quota: number | null = null;
  protected log = logger;

  constructor(cbThreshold = 3, cbWindowMs = 60_000, cbCooldownMs = 30_000) {
    this.circuitBreaker = new CircuitBreaker(cbThreshold, cbWindowMs, cbCooldownMs);
  }

  isAvailable(): boolean {
    return !this.circuitBreaker.isOpen();
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    this.requestCount++;
    const start = Date.now();

    try {
      const results = await this.doSearch(query, options);
      const durationMs = Date.now() - start;

      this.circuitBreaker.recordSuccess();
      this.recordLatency(durationMs);
      this.updateMetrics(durationMs, 'success');

      return results;
    } catch (error) {
      const durationMs = Date.now() - start;
      this.errorCount++;
      this.circuitBreaker.recordFailure();
      this.recordLatency(durationMs);
      this.updateMetrics(durationMs, 'error');

      const msg = error instanceof Error ? error.message : String(error);
      this.log.error(`Provider ${this.name} failed: ${msg}`);
      searchErrorsTotal.inc({ provider: this.name, error_type: 'request_failed' });

      throw error;
    }
  }

  getStats(): ProviderStats {
    return {
      name: this.name,
      available: this.isAvailable(),
      avgLatencyMs: this.getAvgLatency(),
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      quotaRemaining: this.quota,
      circuitOpen: this.circuitBreaker.isOpen(),
    };
  }

  protected abstract doSearch(query: string, options: SearchOptions): Promise<SearchResult[]>;

  private recordLatency(ms: number): void {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > MAX_LATENCY_SAMPLES) {
      this.latencySamples.shift();
    }
  }

  private getAvgLatency(): number {
    if (this.latencySamples.length === 0) return 0;
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return sum / this.latencySamples.length;
  }

  private updateMetrics(durationMs: number, status: string): void {
    const durationSec = durationMs / 1000;
    searchRequestsTotal.inc({ provider: this.name, status });
    searchRequestDuration.observe({ provider: this.name }, durationSec);
    providerAvailable.set({ provider: this.name }, this.isAvailable() ? 1 : 0);
    providerLatencyAvg.set({ provider: this.name }, this.getAvgLatency() / 1000);
    providerQuotaRemaining.set({ provider: this.name }, this.quota ?? -1);
    circuitBreakerState.set({ provider: this.name }, this.circuitBreaker.isOpen() ? 1 : 0);
  }
}
