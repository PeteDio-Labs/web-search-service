import type { SearchResult, SearchOptions, ProviderStats } from '../types.js';

export interface SearchProvider {
  readonly name: string;
  readonly priority: number;
  isAvailable(): boolean;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  getStats(): ProviderStats;
}
