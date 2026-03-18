# Web Search Service

K8s-native multi-provider web search proxy for PeteDio homelab. Routes queries through SearXNG (self-hosted) with automatic failover to Brave Search, Tavily, and SerpAPI.

## Quick Start

```bash
bun install
cp .env.example .env  # configure SEARXNG_URL and API keys
bun dev               # http://localhost:3003
```

## Scripts

```bash
bun dev          # dev server (port 3003, hot reload)
bun build        # production build
bun test         # run tests
bun run typecheck
```

## Stack

- **Runtime:** Bun
- **Framework:** Express 5, TypeScript
- **Validation:** Zod v4
- **Logging:** Pino
- **Metrics:** prom-client (Prometheus)

## Architecture

```
Any Agent/Service ──POST /api/v1/search──→ web-search-service (port 3003)
                                                │
                                         ProviderRouter (score = latency × quota × priority)
                                         ┌──────┼──────────┐
                                         ▼      ▼          ▼
                                    SearXNG   Brave    Tavily/SerpAPI
                                   (K8s pod)  (API)      (API)
                                   priority 0  priority 1  priority 2-3
```

### Provider Routing

The `ProviderRouter` scores available providers by `(1/avgLatency) * quotaFactor * (1/(priority+1))` and tries them in order. If a provider fails, the next one is attempted automatically.

### Circuit Breaker

Each provider has its own `CircuitBreaker` — 3 failures within 60 seconds opens the circuit for 30 seconds, preventing cascading failures.

## Providers

| Provider | Priority | Auth | Free Tier |
|----------|----------|------|-----------|
| SearXNG | 0 | None (self-hosted) | Unlimited |
| Brave Search | 1 | `X-Subscription-Token` header | 2,000/month |
| Tavily | 2 | `Authorization: Bearer` header | 1,000/month |
| SerpAPI | 3 | `api_key` query param | 100/month |

## API

### Search

- `POST /api/v1/search` — Search with auto-routing or forced provider

```json
// Request
{
  "query": "MicroK8s MetalLB setup",
  "maxResults": 5,
  "categories": ["general"],
  "language": "en",
  "provider": "searxng"  // optional — force a specific provider
}

// Response
{
  "query": "MicroK8s MetalLB setup",
  "provider": "searxng",
  "results": [
    { "title": "...", "url": "...", "snippet": "...", "source": "google" }
  ],
  "metadata": {
    "durationMs": 342,
    "fallbackUsed": false,
    "providersAttempted": ["searxng"]
  }
}
```

### Providers

- `GET /api/v1/providers` — Provider health and stats

### Health & Metrics

- `GET /health` — Health check (503 if no providers available)
- `GET /health/live` — Liveness probe
- `GET /health/ready` — Readiness probe
- `GET /metrics` — Prometheus metrics

### Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `web_search_requests_total` | Counter | Total search requests by provider and status |
| `web_search_request_duration_seconds` | Histogram | Search latency by provider |
| `web_search_errors_total` | Counter | Errors by provider and type |
| `web_search_provider_available` | Gauge | Provider availability (1/0) |
| `web_search_circuit_breaker_state` | Gauge | Circuit breaker state (0=closed, 1=open) |
| `web_search_provider_quota_remaining` | Gauge | Estimated remaining quota per provider |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3003` | Server port |
| `SEARXNG_URL` | Yes* | — | SearXNG instance URL |
| `BRAVE_API_KEY` | No | — | Brave Search API key |
| `TAVILY_API_KEY` | No | — | Tavily API key |
| `SERPAPI_KEY` | No | — | SerpAPI key |
| `METRICS_ENABLED` | No | `true` | Enable Prometheus metrics |
| `LOG_LEVEL` | No | `info` | Pino log level |

*At least one provider must be configured or the service will exit.

## Deployment

Pushed to `docker.toastedbytes.com/web-search-service` via GitHub Actions. ArgoCD Image Updater handles digest bumps. K8s manifests live in `homelab-gitops` (`web-search-service/base/`). Deployed in dedicated `web-search` namespace alongside SearXNG.
