# Project Architecture

## System Overview

The application is organized as a layered reasoning pipeline with a chat delivery surface:

1. Data Layer (mock JSON datasets)
2. Analytics Layer (market + portfolio analytics)
3. Reasoning Layer (causal linking, ambiguity handling, prioritization)
4. Evaluation + Observability Layer
5. Interaction Layer (API, web UI, CLI)

## Runtime Flow

`User Question -> ChatAgent -> AdvisorAgent -> AnalyticsEngine -> ReasoningEvaluator -> Observability -> Response Stream`

## Layer Details

### Layer 0: Data Sources

Files:
- `data/market_data.json`
- `data/news_data.json`
- `data/portfolios.json`
- `data/historical_data.json`
- `data/sector_mapping.json`
- `data/mutual_funds.json`

Purpose:
- Provide deterministic challenge datasets for repeatable demos.

---

### Layer 1: Market Intelligence and Portfolio Analytics

Module:
- `src/services/AnalyticsEngine.ts`

Responsibilities:
- Load and normalize dataset JSON
- Compute market sentiment (`BULLISH`, `BEARISH`, `NEUTRAL`)
- Build sector trends from stock changes
- Filter relevant news by portfolio exposures
- Compute portfolio day P&L and allocation
- Detect concentration risk

Key methods:
- `analyzeMarketSentiment()`
- `getSectorTrends()`
- `analyzePortfolio(portfolio)`
- `getRelevantNews(portfolio, news)`

---

### Layer 2: Autonomous Reasoning

Modules:
- `src/services/AnalyticsEngine.ts`
- `src/agent/AdvisorAgent.ts`

Reasoning behavior:
- Generate causal links weighted by:
  - sector trend
  - article sentiment score
  - portfolio exposure weight
- Rank links by absolute impact
- Attach ambiguity notes when:
  - `conflict_flag` appears in news data
  - sentiment direction and sector movement conflict
- Generate concise recommendations from risk + market context

Output object:
- `AgentBriefing` (typed in `src/models/types.ts`)

---

### Layer 3: Evaluation

Module:
- `src/services/ReasoningEvaluator.ts`

Responsibilities:
- Score reasoning quality on a `0-10` scale
- Emit component scores:
  - causality
  - prioritization
  - conflict handling
  - actionability
- Produce human-readable rationale

Integration:
- `AdvisorAgent.generateBriefing()` enriches `AgentBriefing` with evaluation data.

---

### Layer 4: Observability

Module:
- `src/services/Observability.ts`

Responsibilities:
- Initialize Langfuse when keys are present
- Trace briefing and chat events
- Persist metadata like model and token usage (when available)

Behavior:
- Safe no-op when Langfuse keys are missing.

---

### Layer 5: Interaction Surfaces

API server:
- `src/api.ts`

Endpoints:
- `GET /api/portfolios`
- `GET /api/status`
- `POST /api/chat` (SSE streaming)
- `POST /api/chat/clear`

Web UI:
- `public/index.html` served by Express static hosting.

CLI modes:
- `src/index.ts` (single briefing)
- `src/cli.ts` (interactive advisor chat)

Compatibility wrapper:
- `src/server.ts` imports `src/api.ts`.

## LLM Provider Strategy

Implemented in:
- `src/agent/AdvisorAgent.ts`
- `src/agent/ChatAgent.ts`

Priority:
1. `OPENAI_API_KEY` (OpenAI direct)
2. `OPENROUTER_API_KEY` (OpenAI client + OpenRouter base URL)
3. No key -> rule-based fallback

## Reliability and Type Safety

Type definitions:
- `src/models/types.ts`

Reliability features:
- strict TypeScript with explicit interfaces
- graceful fallback when LLM/tracing is unavailable
- missing-data-safe defaults in analytics calculations

## Performance Notes

- Most analytics operations are local JSON computations and fast.
- Latency is dominated by external LLM calls when enabled.
- SSE token streaming improves perceived responsiveness in web chat.

## Change Checklist (Current Code Alignment)

- Includes `ReasoningEvaluator` and `Observability` services
- Reflects `GET /api/status`
- Reflects OpenAI + OpenRouter dual support
- Reflects single Express server serving API + frontend
- Reflects current script entrypoints: `dev`, `cli`, `api`, `web`
