import type { SearchProvider } from './SearchProvider.js';
import type { SearchResponse, SearchOptions } from '../types.js';
import { logger } from '../utils/logger.js';

export class ProviderRouter {
  private providers: SearchProvider[];

  constructor(providers: SearchProvider[]) {
    this.providers = providers;
    logger.info(`ProviderRouter initialized with ${providers.length} providers: ${providers.map(p => p.name).join(', ')}`);
  }

  async search(query: string, options: SearchOptions, forceProvider?: string): Promise<SearchResponse> {
    const attempted: string[] = [];
    const start = Date.now();

    if (forceProvider) {
      const provider = this.providers.find(p => p.name === forceProvider);
      if (!provider) {
        throw new Error(`Unknown provider: ${forceProvider}`);
      }
      attempted.push(provider.name);
      const results = await provider.search(query, options);
      return {
        query,
        provider: provider.name,
        results,
        metadata: {
          durationMs: Date.now() - start,
          fallbackUsed: false,
          providersAttempted: attempted,
        },
      };
    }

    const ranked = this.providers
      .filter(p => p.isAvailable())
      .sort((a, b) => this.score(b) - this.score(a));

    if (ranked.length === 0) {
      throw new Error('All search providers unavailable');
    }

    for (const provider of ranked) {
      attempted.push(provider.name);
      try {
        const results = await provider.search(query, options);
        return {
          query,
          provider: provider.name,
          results,
          metadata: {
            durationMs: Date.now() - start,
            fallbackUsed: attempted.length > 1,
            providersAttempted: attempted,
          },
        };
      } catch {
        logger.warn(`Provider ${provider.name} failed, trying next...`);
        continue;
      }
    }

    throw new Error(`All providers failed. Attempted: ${attempted.join(', ')}`);
  }

  getProviderStats() {
    return this.providers.map(p => p.getStats());
  }

  private score(p: SearchProvider): number {
    const stats = p.getStats();
    const latencyFactor = 1 / Math.max(stats.avgLatencyMs || 1, 1);
    const quotaFactor = stats.quotaRemaining === null ? 1.0 : Math.min(Math.max(stats.quotaRemaining, 0) / 100, 1.0);
    return latencyFactor * quotaFactor * (1 / (p.priority + 1));
  }
}
