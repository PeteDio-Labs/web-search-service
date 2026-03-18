import { BaseProvider } from './BaseProvider.js';
import type { SearchResult, SearchOptions } from '../types.js';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
}

export class TavilyProvider extends BaseProvider {
  readonly name = 'tavily';
  readonly priority = 2;
  private apiKey: string;
  private timeout: number;

  constructor(apiKey: string, timeout = 10_000) {
    super();
    this.apiKey = apiKey;
    this.timeout = timeout;
    this.quota = 1000; // free tier monthly
  }

  protected async doSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: options.maxResults,
        search_depth: 'basic',
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (response.status === 429) {
      this.quota = 0;
      throw new Error('Tavily rate limited');
    }

    if (!response.ok) {
      throw new Error(`Tavily returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as TavilyResponse;

    return data.results
      .slice(0, options.maxResults)
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        source: 'tavily',
        score: r.score,
      }));
  }
}
