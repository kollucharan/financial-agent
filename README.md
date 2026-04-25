# Autonomous Financial Advisor Chat Agent

A modular TypeScript project that analyzes market data, news, and user portfolios, then explains portfolio movement using causal links:

`Macro News -> Sector Trend -> Stock Movement -> Portfolio Impact`

## What This Project Solves

- Market intelligence from index/stock/news mock datasets
- Portfolio analytics (daily P&L, allocation, concentration risk)
- Autonomous reasoning with conflict handling and prioritization
- Chat interface (web + CLI) for advisor-style user interaction
- Observability hooks (Langfuse) and self-evaluation scoring

## Current Architecture

### 1) Market Intelligence Layer
- Computes market sentiment from index movement
- Derives sector trends from stock performance
- Filters relevant news for a selected portfolio

Implemented in:
- `src/services/AnalyticsEngine.ts`

### 2) Portfolio Analytics Engine
- Computes daily P&L absolute and percentage
- Builds sector and asset-type allocation
- Flags concentration risk (`> 40%` sector exposure)
- Identifies top/worst performers

Implemented in:
- `src/services/AnalyticsEngine.ts`

### 3) Autonomous Reasoning Layer
- Builds causal links between news and exposed sectors
- Weights impact by sector trend, sentiment, and portfolio exposure
- Handles ambiguity (conflicting signals)
- Produces concise recommendations

Implemented in:
- `src/services/AnalyticsEngine.ts`
- `src/agent/AdvisorAgent.ts`

### 4) Observability & Evaluation Layer
- Optional Langfuse trace logging
- Rule-based reasoning quality evaluator with component scores

Implemented in:
- `src/services/Observability.ts`
- `src/services/ReasoningEvaluator.ts`
- integrated via `src/agent/AdvisorAgent.ts`

## Tech Stack

- Node.js + TypeScript
- Express (API + static web app)
- OpenAI SDK (works with OpenAI API or OpenRouter base URL)
- Langfuse (optional tracing)

## Project Structure

```text
financial-advisor-agent/
  data/
    market_data.json
    news_data.json
    portfolios.json
    historical_data.json
    mutual_funds.json
    sector_mapping.json
  public/
    index.html
  src/
    agent/
      AdvisorAgent.ts
      ChatAgent.ts
    models/
      types.ts
    services/
      AnalyticsEngine.ts
      Observability.ts
      ReasoningEvaluator.ts
    api.ts
    cli.ts
    index.ts
    server.ts
  ARCHITECTURE.md
  README.md
```

## Setup

### 1) Install

```bash
npm install
```

### 2) Environment

Copy `.env.example` to `.env` and fill values as needed.

Supported LLM modes:
- OpenAI direct: `OPENAI_API_KEY`
- OpenRouter via OpenAI client compatibility: `OPENROUTER_API_KEY`
- Fallback mode: no API key (rule-based responses only)

Optional:
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_BASE_URL`

### 3) Build

```bash
npm run build
```

## Run Modes

### Web Chat (ChatGPT-style UI)

```bash
npm run api
```

Open:
- `http://localhost:3000`

## Deploy (Render Free)

This repo is a single full-stack service (API + frontend together), so deploy as one web service.

### Option A: Blueprint Deploy (recommended)

1. Push repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select this repository (it includes `render.yaml`).
4. Set secret environment variables in Render:
   - `OPENROUTER_API_KEY`
   - `LANGFUSE_SECRET_KEY` (optional)
   - `LANGFUSE_PUBLIC_KEY` (optional)
5. Deploy.

### Option B: Manual Web Service

Use these settings:
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/api/status`

Set env vars:
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL=openrouter/free`
- `LANGFUSE_SECRET_KEY` (optional)
- `LANGFUSE_PUBLIC_KEY` (optional)
- `LANGFUSE_BASE_URL=https://us.cloud.langfuse.com`

### Single Briefing (script mode)

```bash
npm run dev PORTFOLIO_001
npm run dev PORTFOLIO_002
npm run dev PORTFOLIO_003
```

### Interactive CLI

```bash
npm run cli
```

## API Endpoints

- `GET /api/portfolios`  
  Returns list of portfolio cards for UI (name, type, value, risk profile, description).

- `GET /api/status`  
  Returns runtime mode (`api_configured`, `tracing_enabled`, `model`).

- `POST /api/chat`  
  SSE streaming endpoint for chat responses.

- `POST /api/chat/clear`  
  Clears session-specific chat history.

## Evaluation Output

`AgentBriefing` includes:
- `summary`
- `key_insights`
- `causal_links`
- `recommendations`
- `confidence_score`
- `reasoning_quality_score`
- `reasoning_evaluation` (component scores + rationale)

## Challenge Rubric Mapping

- Reasoning Quality: causal links + ambiguity handling + prioritization
- Code Design: modular services + typed models
- Observability: Langfuse trace wrapper
- Edge Cases: conflicting sentiment/price and concentration alerts
- Evaluation Layer: explicit scoring via `ReasoningEvaluator`

## Notes

- Data is mock/static by design for the challenge.
- `src/server.ts` is a thin import wrapper over `src/api.ts`.
- Existing UI in `public/index.html` is served directly by Express.
