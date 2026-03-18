import { Router } from 'express';
import type { Request, Response } from 'express';
import { SearchRequestSchema } from '../../types.js';
import type { SearchService } from '../../services/searchService.js';
import { logger } from '../../utils/logger.js';

export function createSearchRouter(searchService: SearchService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const parsed = SearchRequestSchema.parse(req.body);
      const response = await searchService.search(parsed);
      res.json(response);
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        res.status(400).json({ error: 'Invalid request', details: error });
        return;
      }

      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Search failed: ${msg}`);

      if (msg.includes('All') && (msg.includes('unavailable') || msg.includes('failed'))) {
        res.status(503).json({ error: msg });
        return;
      }

      res.status(500).json({ error: 'Search failed' });
    }
  });

  return router;
}
