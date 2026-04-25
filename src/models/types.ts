export type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type Scope = 'MARKET_WIDE' | 'SECTOR_SPECIFIC' | 'STOCK_SPECIFIC';

export interface Index {
  name: string;
  current_value?: number;
  previous_close?: number;
  change_percent: number;
  sentiment: Sentiment;
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  current_price?: number;
  change_percent?: number;
  current_value: number;
  day_change_percent: number;
  weight_in_portfolio: number;
}

export interface MutualFund {
  scheme_code?: string;
  scheme_name: string;
  category: string;
  current_value: number;
  day_change_percent?: number;
  weight_in_portfolio?: number;
}

export interface Portfolio {
  user_id?: string;
  user_name: string;
  portfolio_type: string;
  risk_profile?: string;
  description?: string;
  current_value: number;
  overall_gain_loss: number;
  overall_gain_loss_percent: number;
  holdings: {
    stocks: Stock[];
    mutual_funds?: MutualFund[];
  };
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  sentiment_score: number;
  impact_level: ImpactLevel;
  scope: Scope;
  published_at?: string;
  conflict_flag?: boolean;
  conflict_explanation?: string;
  causal_factors?: string[];
  entities: {
    sectors: string[];
    stocks: string[];
  };
}

export interface MarketData {
  indices: Record<string, Index>;
  stocks: Record<string, Stock>;
}

export interface NewsData {
  news: NewsArticle[];
}

export interface PortfoliosData {
  portfolios: Record<string, Portfolio>;
}

export interface SectorMapping {
  [symbol: string]: string;
}

export interface MarketSentiment {
  overall: Sentiment;
  confidence: number;
  key_drivers: string[];
}

export interface SectorTrend {
  sector: string;
  change_percent: number;
  sentiment: Sentiment;
  key_stocks: string[];
  news_count: number;
}

export interface PortfolioAnalysis {
  total_day_change: number;
  total_day_change_percent: number;
  sector_allocation: Record<string, number>;
  asset_type_allocation: Record<string, number>;
  concentration_risks: string[];
  top_performers: Array<{
    symbol: string;
    sector: string;
    current_value: number;
    day_change_percent: number;
  }>;
  worst_performers: Array<{
    symbol: string;
    sector: string;
    current_value: number;
    day_change_percent: number;
  }>;
}

export interface CausalLink {
  news_id: string;
  sector: string;
  impact: number;
  explanation: string;
  confidence: number;
  related_holdings?: string[];
  ambiguity_note?: string;
}

export interface ReasoningEvaluation {
  score: number;
  rationale: string;
  component_scores: {
    causality: number;
    prioritization: number;
    conflict_handling: number;
    actionability: number;
  };
}

export interface AgentBriefing {
  portfolio_id: string;
  summary: string;
  key_insights: string[];
  causal_links: CausalLink[];
  recommendations: string[];
  confidence_score: number;
  reasoning_quality_score: number;
  reasoning_evaluation?: ReasoningEvaluation;
}
