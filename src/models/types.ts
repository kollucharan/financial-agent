/**
 * Type Definitions - Comprehensive TypeScript interfaces for type safety
 *
 * Data Models:
 * - Stock: Individual security data
 * - Index: Market index information
 * - NewsArticle: Financial news with sentiment & entities
 * - Portfolio: User holdings (stocks + mutual funds)
 *
 * Analysis Outputs:
 * - MarketSentiment: Overall market direction & confidence
 * - SectorTrend: Per-sector performance & drivers
 * - PortfolioAnalysis: Complete portfolio breakdown
 * - CausalLink: News → Impact connection
 * - AgentBriefing: Final comprehensive output
 */

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  sub_sector?: string;
  current_price: number;
  previous_close: number;
  change_percent: number;
  change_absolute: number;
  volume: number;
  avg_volume_20d?: number;
  market_cap_cr?: number;
  pe_ratio?: number;
  '52_week_high': number;
  '52_week_low': number;
  beta: number;
}

export interface Index {
  name: string;
  current_value: number;
  previous_close: number;
  change_percent: number;
  change_absolute: number;
  day_high: number;
  day_low: number;
  '52_week_high': number;
  '52_week_low': number;
  sentiment: string;
}

export interface MarketData {
  metadata: {
    date: string;
    data_source: string;
    currency: string;
    market_status: string;
  };
  indices: Record<string, Index>;
  stocks: Record<string, Stock>;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  published_at: string;
  source: string;
  sentiment: string;
  sentiment_score: number;
  scope: string;
  impact_level: string;
  entities: {
    sectors: string[];
    stocks: string[];
    indices: string[];
    keywords: string[];
  };
  causal_factors: string[];
}

export interface NewsData {
  metadata: {
    date: string;
    data_source: string;
    total_articles: number;
  };
  news: NewsArticle[];
}

export interface StockHolding {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  investment_value: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  weight_in_portfolio: number;
  day_change_percent: number;
}

export interface MutualFundHolding {
  scheme_code: string;
  scheme_name: string;
  fund_house: string;
  category: string;
  nav: number;
  units: number;
  avg_buy_nav: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  weight_in_portfolio: number;
  day_change_percent: number;
}

export interface Portfolio {
  user_id: string;
  user_name: string;
  portfolio_type: string;
  risk_profile: string;
  investment_horizon: string;
  description: string;
  total_investment: number;
  current_value: number;
  overall_gain_loss: number;
  overall_gain_loss_percent: number;
  holdings: {
    stocks: StockHolding[];
    mutual_funds: MutualFundHolding[];
  };
}

export interface PortfoliosData {
  metadata: {
    date: string;
    data_source: string;
    currency: string;
  };
  portfolios: Record<string, Portfolio>;
}

export interface SectorInfo {
  name: string;
  description: string;
  key_drivers: string[];
  correlation_with_market: number;
  volatility_index: number;
}

export interface SectorMapping {
  sectors: Record<string, SectorInfo>;
}

export interface MarketSentiment {
  overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  key_drivers: string[];
}

export interface SectorTrend {
  sector: string;
  change_percent: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  key_stocks: string[];
  news_count: number;
}

export interface PortfolioAnalysis {
  total_day_change: number;
  total_day_change_percent: number;
  sector_allocation: Record<string, number>;
  concentration_risks: string[];
  top_performers: (StockHolding | MutualFundHolding)[];
  worst_performers: (StockHolding | MutualFundHolding)[];
}

export interface CausalLink {
  news_id: string;
  sector: string;
  impact: number;
  explanation: string;
  confidence: number;
}

export interface AgentBriefing {
  portfolio_id: string;
  summary: string;
  key_insights: string[];
  causal_links: CausalLink[];
  recommendations: string[];
  confidence_score: number;
  reasoning_quality_score: number;
}
export interface AgentBriefing {
  portfolio_id: string;
  summary: string;
  key_insights: string[];
  causal_links: CausalLink[];
  recommendations: string[];
  confidence_score: number;
  reasoning_quality_score: number;
}
export interface CausalLink {
  news_id: string;
  sector: string;
  impact: number;
  explanation: string;
  confidence: number;
}