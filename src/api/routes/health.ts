import { Router } from 'express';
import type { Request, Response } from 'express';
import { getMetrics } from '../../metrics/index.js';
import type { SearchService } from '../../services/searchService.js';

export function createHealthRouter(searchService: SearchService): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    const providers = searchService.getProviderStats();
    const anyAvailable = providers.some(p => p.available);
    res.status(anyAvailable ? 200 : 503).json({
      status: anyAvailable ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      providers: providers.map(p => ({
        name: p.name,
        available: p.available,
        avgLatencyMs: Math.round(p.avgLatencyMs),
      })),
    });
  });

  router.get('/health/live', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  router.get('/health/ready', (_req: Request, res: Response) => {
    const providers = searchService.getProviderStats();
    const anyAvailable = providers.some(p => p.available);
    res.status(anyAvailable ? 200 : 503).json({
      status: anyAvailable ? 'ok' : 'not_ready',
    });
  });

  router.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', 'text/plain');
    res.send(await getMetrics());
  });

  return router;
}
