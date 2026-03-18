import { BaseProvider } from './BaseProvider.js';
import type { SearchResult, SearchOptions } from '../types.js';

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveResponse {
  web?: { results: BraveWebResult[] };
}

export class BraveSearchProvider extends BaseProvider {
  readonly name = 'brave';
  readonly priority = 1;
  private apiKey: string;
  private timeout: number;

  constructor(apiKey: string, timeout = 10_000) {
    super();
    this.apiKey = apiKey;
    this.timeout = timeout;
    this.quota = 2000; // free tier monthly
  }

  protected async doSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(options.maxResults));

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (response.status === 429) {
      this.quota = 0;
      throw new Error('Brave Search rate limited');
    }

    if (!response.ok) {
      throw new Error(`Brave Search returned ${response.status}: ${response.statusText}`);
    }

    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining !== null) {
      this.quota = parseInt(rateLimitRemaining, 10);
    }

    const data = (await response.json()) as BraveResponse;

    return (data.web?.results ?? [])
      .slice(0, options.maxResults)
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
        source: 'brave',
      }));
  }
}
