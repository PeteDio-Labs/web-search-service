import type { ProviderRouter } from '../providers/ProviderRouter.js';
import type { SearchRequest, SearchResponse, ProviderStats } from '../types.js';
import { logger } from '../utils/logger.js';

export class SearchService {
  private router: ProviderRouter;

  constructor(router: ProviderRouter) {
    this.router = router;
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    logger.debug(`Search request: "${request.query}" (max: ${request.maxResults}, provider: ${request.provider || 'auto'})`);

    const response = await this.router.search(
      request.query,
      {
        maxResults: request.maxResults,
        categories: request.categories,
        language: request.language,
      },
      request.provider,
    );

    logger.info(`Search completed: "${request.query}" via ${response.provider} (${response.results.length} results, ${response.metadata.durationMs}ms)`);

    return response;
  }

  getProviderStats(): ProviderStats[] {
    return this.router.getProviderStats();
  }
}
