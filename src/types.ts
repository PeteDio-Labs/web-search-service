import { z } from 'zod';

export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().int().min(1).max(20).optional().default(5),
  categories: z.array(z.enum(['general', 'news', 'science', 'it'])).optional().default(['general']),
  language: z.string().length(2).optional().default('en'),
  provider: z.string().optional(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  score?: number;
}

export interface SearchResponse {
  query: string;
  provider: string;
  results: SearchResult[];
  metadata: {
    durationMs: number;
    fallbackUsed: boolean;
    providersAttempted: string[];
  };
}

export interface ProviderStats {
  name: string;
  available: boolean;
  avgLatencyMs: number;
  requestCount: number;
  errorCount: number;
  quotaRemaining: number | null;
  circuitOpen: boolean;
}

export interface SearchOptions {
  maxResults: number;
  categories: string[];
  language: string;
}
