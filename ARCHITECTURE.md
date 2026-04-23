# Project Architecture

## Overview

The Autonomous Financial Advisor Agent implements a four-layer architecture for sophisticated financial analysis:

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Observability & Evaluation                            │
│ (Langfuse Tracing, Self-Evaluation, Quality Scoring)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ Layer 3: Autonomous Reasoning (AdvisorAgent)                    │
│ - Causal Link Generation                                        │
│ - LLM Enhancement (OpenRouter)                                  │
│ - Self-Evaluation                                               │
│ - Output Orchestration                                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ Layer 2: Portfolio Analytics (AnalyticsEngine)                  │
│ - Portfolio Analysis (P&L, allocation, risks)                   │
│ - Sector Weighting                                              │
│ - Risk Detection (concentration, volatility)                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ Layer 1: Market Intelligence (AnalyticsEngine)                  │
│ - Market Sentiment Analysis                                     │
│ - Sector Trend Extraction                                       │
│ - News Processing & Entity Linking                              │
│ - Relevant News Filtering                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ Data Layer: JSON Mock Data                                      │
│ - market_data.json | news_data.json | portfolios.json           │
│ - sector_mapping.json | mutual_funds.json | historical_data.json│
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### Layer 1: Market Intelligence Layer

**Responsibilities:**
- Analyze index movements (NIFTY 50, SENSEX, BANKNIFTY, etc.)
- Determine market sentiment (Bullish/Bearish/Neutral)
- Extract sector-level trends dynamically
- Process and classify financial news

**Key Methods:**
```typescript
analyzeMarketSentiment(): MarketSentiment
getSectorTrends(): SectorTrend[]
getRelevantNews(portfolio, news): NewsArticle[]
```

**Data Transformations:**
```
Raw Indices → Average Change → Sentiment Classification
Raw Stocks → Group by Sector → Sector Averages → Trends
Raw News → Extract Entities → Link to Portfolio
```

### Layer 2: Portfolio Analytics Engine

**Responsibilities:**
- Calculate daily P&L (absolute and percentage)
- Compute asset allocation breakdown
- Detect concentration risks
- Identify top performers and laggards

**Key Methods:**
```typescript
analyzePortfolio(portfolio): PortfolioAnalysis
```

**Risk Detection Logic:**
```
Sector Weights > 40% → Concentration Risk Flag
Beta * Change % → Volatility Scoring
Dividend/Price → Income Analysis
```

### Layer 3: Autonomous Reasoning

**Responsibilities:**
- Generate causal links from news to portfolio impact
- Handle conflicting signals
- Prioritize high-impact factors
- Orchestrate LLM enhancement
- Perform self-evaluation

**Key Methods:**
```typescript
generateAgentBriefing(portfolioId): AgentBriefing
generateCausalLinks(portfolio, news, trends): CausalLink[]
enhanceWithLLM(briefing): AgentBriefing
selfEvaluate(briefing): {score, reason}
```

**Causal Linking Algorithm:**
```
1. Extract relevant news for portfolio sectors/stocks
2. Calculate impact = Sector Change % × News Sentiment Score
3. Rank by absolute impact magnitude
4. Identify conflicts (positive news, negative price)
5. Generate causal narrative linking chain
6. Score confidence based on data quality & agreement
```

### Layer 4: Observability & Evaluation

**Responsibilities:**
- Trace all important operations via Langfuse
- Track LLM tokens and costs
- Implement self-evaluation
- Generate quality metrics

**Langfuse Integration:**
```typescript
trace.generation({
  name: "briefing-enhancement",
  model: "microsoft/wizardlm-2-8x22b",
  prompt: userPrompt
})
```

## Data Flow Example

### Input: Portfolio Analysis Request

```json
{
  "portfolio_id": "PORTFOLIO_002",
  "user_request": "Analyze my portfolio"
}
```

### Processing Pipeline

```
1. Load Portfolio Data
   ↓
2. Analyze Market Sentiment (Layer 1)
   - NIFTY 50: -1.00% → BEARISH
   - Confidence: 0.24
   ↓
3. Extract Sector Trends (Layer 1)
   - BANKING: -2.45% (down)
   - IT: +1.35% (up)
   ↓
4. Filter Relevant News (Layer 1)
   - "RBI Hawkish Stance" → affects BANKING
   - "US Tech Earnings" → affects IT
   ↓
5. Calculate Portfolio Analytics (Layer 2)
   - Total P&L: -2.73%
   - Concentration: 91.6% in BANKING ⚠️
   ↓
6. Generate Causal Links (Layer 3)
   - RBI news → BANKING sector (-2.45%)
   - HDFC Bank (-3.51%) → Portfolio impact (22.62%)
   ↓
7. LLM Enhancement (Layer 3)
   - Create sophisticated narrative
   ↓
8. Self-Evaluation (Layer 3)
   - Quality Score: 9.0/10
   ↓
9. Langfuse Tracing (Layer 4)
   - Log all operations
```

### Output: Structured Briefing

```json
{
  "portfolio_id": "PORTFOLIO_002",
  "summary": "Priya Patel's portfolio fell 2.73% today...",
  "key_insights": [
    "Primary impact from BANKING sector",
    "HDFCBANK was a laggard with -3.51%"
  ],
  "causal_links": [
    {
      "news_id": "NEWS001",
      "sector": "BANKING",
      "impact": -2.12,
      "explanation": "RBI Hawkish Stance affecting BANKING",
      "confidence": 0.72
    }
  ],
  "recommendations": [
    "Consider diversifying to reduce concentration risk"
  ],
  "confidence_score": 0.244,
  "reasoning_quality_score": 0.9
}
```

## Type Safety

All data flows through strictly typed interfaces:

```typescript
// Input
Portfolio → portfolios.json schema
NewsArticle → news_data.json schema
Stock → market_data.json schema

// Processing
Portfolio → PortfolioAnalysis (computed)
NewsArticle[] → CausalLink[] (derived)
SectorTrend[] → Recommendations (generated)

// Output
AgentBriefing (structured & type-safe)
```

## Error Handling Strategy

```
API Call Fails
    ↓
Catch & Log Error
    ↓
Use Fallback Data?
    ├─ Yes → Continue with degraded mode
    └─ No → Inform user & exit gracefully
        
Missing Data
    ↓
Use Defaults/Estimates
    ↓
Reduce Confidence Score
    ↓
Continue Analysis
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Load Data | ~10ms | File I/O, JSON parsing |
| Market Sentiment | ~5ms | Index aggregation |
| Sector Trends | ~10ms | Stock grouping & sorting |
| Portfolio Analysis | ~5ms | Holdings calculation |
| Causal Linking | ~15ms | News correlation |
| LLM Enhancement | ~2-5s | OpenRouter API call |
| Self-Evaluation | ~2-5s | LLM grading |
| **Total** | **~30-40ms (basic)** or **~35-40s (with LLM)** | |

## Extension Points

### Adding New Data Sources
```typescript
// In AnalyticsEngine
public getAlternativeNews(): NewsArticle[] {
  return this.loadJson<NewsData>('alternative_news.json').news;
}
```

### Custom Risk Metrics
```typescript
// In PortfolioAnalysis interface
custom_risk_score?: number;
```

### Alternative LLM Providers
```typescript
// In AdvisorAgent constructor
this.ai = new Anthropic({ apiKey: ... });
// Update methods to use Anthropic API
```

### New Portfolio Types
```typescript
// portfolios.json: add new portfolio object
// CLI: add new menu option
// AutomAtically supported by generic engine
```

## Testing Strategy

### Unit Tests (Conceptual)
- Market sentiment calculation
- Sector grouping logic
- P&L computation
- Risk detection thresholds

### Integration Tests
- End-to-end briefing generation
- LLM with fallback behavior
- Langfuse tracing

### System Tests
- All three portfolios
- Various market conditions
- API failures & recovery

## Security Considerations

✅ **Environment Isolation**: API keys in `.env` (gitignored)
✅ **No PII Storage**: Works with anonymous portfolio IDs
✅ **Graceful Degradation**: Works without API keys
✅ **Input Validation**: JSON schema validation on data load
✅ **Error Logging**: Structured logging without sensitive data

## Monitoring & Observability

Via Langfuse:
- LLM token usage & costs
- Prompt/completion quality
- Latency metrics
- Error tracking
- User interactions

## Future Enhancements

1. **Real-time Data**: Replace mock JSON with live market feeds
2. **ML Enhancement**: Learn from historical predictions
3. **Multi-language**: Support non-English portfolios
4. **Sentiment Training**: Custom sentiment models for financial news
5. **Risk Models**: Advanced VaR, Sharpe ratio calculations
6. **Portfolio Optimization**: Suggest rebalancing strategies
7. **Backtesting**: Historical performance analysis

---

For implementation details, see individual source files with inline documentation.
