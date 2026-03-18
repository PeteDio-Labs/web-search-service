import 'dotenv/config';
import { createApp } from './app.js';
import { SearXNGProvider } from './providers/SearXNGProvider.js';
import { BraveSearchProvider } from './providers/BraveSearchProvider.js';
import { TavilyProvider } from './providers/TavilyProvider.js';
import { SerpAPIProvider } from './providers/SerpAPIProvider.js';
import { ProviderRouter } from './providers/ProviderRouter.js';
import { SearchService } from './services/searchService.js';
import type { SearchProvider } from './providers/SearchProvider.js';
import { appUp } from './metrics/index.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT || '3003', 10);

// Build provider list from available configuration
const providers: SearchProvider[] = [];

const searxngUrl = process.env.SEARXNG_URL;
if (searxngUrl) {
  providers.push(new SearXNGProvider(searxngUrl));
  logger.info(`SearXNG provider enabled: ${searxngUrl}`);
} else {
  logger.warn('SEARXNG_URL not set — SearXNG provider disabled');
}

const braveKey = process.env.BRAVE_API_KEY;
if (braveKey) {
  providers.push(new BraveSearchProvider(braveKey));
  logger.info('Brave Search provider enabled');
}

const tavilyKey = process.env.TAVILY_API_KEY;
if (tavilyKey) {
  providers.push(new TavilyProvider(tavilyKey));
  logger.info('Tavily provider enabled');
}

const serpapiKey = process.env.SERPAPI_KEY;
if (serpapiKey) {
  providers.push(new SerpAPIProvider(serpapiKey));
  logger.info('SerpAPI provider enabled');
}

if (providers.length === 0) {
  logger.error('No search providers configured! Set SEARXNG_URL or API keys.');
  process.exit(1);
}

const router = new ProviderRouter(providers);
const searchService = new SearchService(router);
const app = createApp(searchService);

app.listen(PORT, () => {
  appUp.set(1);
  logger.raw('');
  logger.raw('═══════════════════════════════════════════════════════');
  logger.raw('  Web Search Service v1.0.0');
  logger.raw(`  Started: ${new Date().toISOString()}`);
  logger.raw(`  Port: ${PORT}`);
  logger.raw(`  Providers: ${providers.map(p => p.name).join(', ')}`);
  logger.raw('═══════════════════════════════════════════════════════');
  logger.raw('');
});
