import { Router } from 'express';
import type { Request, Response } from 'express';
import type { SearchService } from '../../services/searchService.js';

export function createProvidersRouter(searchService: SearchService): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const stats = searchService.getProviderStats();
    res.json({
      providers: stats.map(p => ({
        name: p.name,
        available: p.available,
        avgLatencyMs: Math.round(p.avgLatencyMs),
        requestCount: p.requestCount,
        errorCount: p.errorCount,
        quotaRemaining: p.quotaRemaining,
        circuitOpen: p.circuitOpen,
      })),
    });
  });

  return router;
}
