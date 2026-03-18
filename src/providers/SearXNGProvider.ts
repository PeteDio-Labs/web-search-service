import { BaseProvider } from './BaseProvider.js';
import type { SearchResult, SearchOptions } from '../types.js';

interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  score: number;
}

interface SearXNGResponse {
  results: SearXNGResult[];
}

export class SearXNGProvider extends BaseProvider {
  readonly name = 'searxng';
  readonly priority = 0;
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout = 10_000) {
    super();
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.quota = null; // unlimited
  }

  protected async doSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('language', options.language);
    for (const cat of options.categories) {
      url.searchParams.append('categories', cat);
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`SearXNG returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as SearXNGResponse;

    return data.results
      .slice(0, options.maxResults)
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        source: r.engine,
        score: r.score,
      }));
  }
}
