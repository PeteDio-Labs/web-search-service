import { BaseProvider } from './BaseProvider.js';
import type { SearchResult, SearchOptions } from '../types.js';

interface SerpAPIOrganicResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

interface SerpAPIResponse {
  organic_results?: SerpAPIOrganicResult[];
}

export class SerpAPIProvider extends BaseProvider {
  readonly name = 'serpapi';
  readonly priority = 3;
  private apiKey: string;
  private timeout: number;

  constructor(apiKey: string, timeout = 10_000) {
    super();
    this.apiKey = apiKey;
    this.timeout = timeout;
    this.quota = 100; // free tier monthly
  }

  protected async doSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('num', String(options.maxResults));
    url.searchParams.set('engine', 'google');
    url.searchParams.set('hl', options.language);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (response.status === 429) {
      this.quota = 0;
      throw new Error('SerpAPI rate limited');
    }

    if (!response.ok) {
      throw new Error(`SerpAPI returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as SerpAPIResponse;

    return (data.organic_results ?? [])
      .slice(0, options.maxResults)
      .map((r) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        source: r.source || 'google',
      }));
  }
}
