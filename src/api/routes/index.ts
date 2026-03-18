import { Router } from 'express';
import { createSearchRouter } from './search.js';
import { createProvidersRouter } from './providers.js';
import { createHealthRouter } from './health.js';
import type { SearchService } from '../../services/searchService.js';

export function createRoutes(searchService: SearchService): Router {
  const routes = Router();

  routes.use(createHealthRouter(searchService));

  const apiV1 = Router();
  apiV1.use('/search', createSearchRouter(searchService));
  apiV1.use('/providers', createProvidersRouter(searchService));

  routes.use('/api/v1', apiV1);

  return routes;
}
