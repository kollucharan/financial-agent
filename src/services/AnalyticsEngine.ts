import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  type Portfolio,
  type NewsArticle,
  type MarketData,
  type NewsData,
  type PortfoliosData,
  type SectorMapping,
  type MarketSentiment,
  type SectorTrend,
  type PortfolioAnalysis,
  type CausalLink,
  type AgentBriefing,
  type Stock,
  type Index
} from '../models/types.js';

/**
 * AnalyticsEngine - Core reasoning and analysis layer
 *
 * Responsible for all data ingestion and analysis:
 * - Phase 1: Market Intelligence (sentiment, sector trends, news processing)
 * - Phase 2: Portfolio Analytics (P&L, risk detection, allocation)
 * - Phase 3: Causal Linking (connects news to portfolio impact)
 *
 * @example
 * const engine = new AnalyticsEngine();
 * const portfolio = engine.getPortfolio('PORTFOLIO_001');
 * const sentiment = engine.analyzeMarketSentiment();
 * const trends = engine.getSectorTrends();
 * const analysis = engine.analyzePortfolio(portfolio);
 */
export class AnalyticsEngine {
  private dataPath: string;

  constructor(dataPath?: string) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.dataPath = dataPath || path.join(__dirname, '../../data');
  }

  private loadJson<T>(filename: string): T {
    const filePath = path.join(this.dataPath, filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  public getMarketData(): MarketData {
    return this.loadJson<MarketData>('market_data.json');
  }

  public getNewsData(): NewsData {
    return this.loadJson<NewsData>('news_data.json');
  }

  public getPortfoliosData(): PortfoliosData {
    return this.loadJson<PortfoliosData>('portfolios.json');
  }

  public getSectorMapping(): SectorMapping {
    return this.loadJson<SectorMapping>('sector_mapping.json');
  }

  public getPortfolio(id: string): Portfolio {
    const portfoliosData = this.getPortfoliosData();
    const portfolio = portfoliosData.portfolios[id];
    if (!portfolio) {
      throw new Error(`Portfolio ${id} not found`);
    }
    return portfolio;
  }

  public getNews(): NewsArticle[] {
    const newsData = this.getNewsData();
    return newsData.news;
  }

  // Phase 1: Market Intelligence Layer
  public analyzeMarketSentiment(): MarketSentiment {
    const marketData = this.getMarketData();
    const indices: Index[] = Object.values(marketData.indices);

    const avgChange = indices.reduce((sum, index) => sum + index.change_percent, 0) / indices.length;
    const bearishCount = indices.filter(idx => idx.sentiment === 'BEARISH').length;
    const bullishCount = indices.filter(idx => idx.sentiment === 'BULLISH').length;

    let overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (avgChange > 0.5 && bullishCount > bearishCount) {
      overall = 'BULLISH';
    } else if (avgChange < -0.5 && bearishCount > bullishCount) {
      overall = 'BEARISH';
    } else {
      overall = 'NEUTRAL';
    }

    const confidence = Math.abs(avgChange) / 2; // Simple confidence based on magnitude

    const keyDrivers = indices
      .filter(idx => Math.abs(idx.change_percent) > 1)
      .map(idx => `${idx.name}: ${idx.change_percent.toFixed(2)}%`);

    return { overall, confidence: Math.min(confidence, 1), key_drivers: keyDrivers };
  }

  public getSectorTrends(): SectorTrend[] {
    const marketData = this.getMarketData();
    const newsData = this.getNewsData();
    const sectorMapping = this.getSectorMapping();

    const sectorStocks = new Map<string, Stock[]>();
    const stocks: Stock[] = Object.values(marketData.stocks);
    stocks.forEach(stock => {
      if (!sectorStocks.has(stock.sector)) {
        sectorStocks.set(stock.sector, []);
      }
      sectorStocks.get(stock.sector)!.push(stock);
    });

    const sectorNewsCount = new Map<string, number>();
    newsData.news.forEach(article => {
      article.entities.sectors.forEach(sector => {
        sectorNewsCount.set(sector, (sectorNewsCount.get(sector) || 0) + 1);
      });
    });

    const trends: SectorTrend[] = [];
    sectorStocks.forEach((stocks, sector) => {
      const avgChange = stocks.reduce((sum, stock) => sum + stock.change_percent, 0) / stocks.length;
      const sentiment = avgChange > 0.5 ? 'BULLISH' : avgChange < -0.5 ? 'BEARISH' : 'NEUTRAL';
      const keyStocks = stocks
        .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
        .slice(0, 3)
        .map(s => s.symbol);

      trends.push({
        sector,
        change_percent: avgChange,
        sentiment,
        key_stocks: keyStocks,
        news_count: sectorNewsCount.get(sector) || 0
      });
    });

    return trends.sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent));
  }

  // Phase 2: Portfolio Analytics Engine
  public analyzePortfolio(portfolio: Portfolio): PortfolioAnalysis {
    const stocks = portfolio.holdings.stocks;
    const mutualFunds = portfolio.holdings.mutual_funds || [];

    let totalDayChange = 0;
    let totalValue = 0;
    const sectorWeights: Record<string, number> = {};

    stocks.forEach(stock => {
      // Day change based on weight and day change percent
      const dayChange = stock.current_value * (stock.day_change_percent / 100);
      totalDayChange += dayChange;
      totalValue += stock.current_value;

      sectorWeights[stock.sector] = (sectorWeights[stock.sector] || 0) + stock.weight_in_portfolio;
    });

    mutualFunds.forEach(mf => {
      // For mutual funds, use the day_change_percent if available
      const dayChangePercent = mf.day_change_percent || 0;
      const dayChange = mf.current_value * (dayChangePercent / 100);
      totalDayChange += dayChange;
      totalValue += mf.current_value;
    });

    const totalDayChangePercent = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0;

    const concentrationRisks = Object.entries(sectorWeights)
      .filter(([_, weight]) => weight > 40)
      .map(([sector]) => sector);

    const allHoldings = [...stocks, ...mutualFunds.map(mf => ({ ...mf, sector: mf.category }))];
    const topPerformers = allHoldings
      .filter(h => h.day_change_percent !== undefined)
      .sort((a, b) => (b.day_change_percent || 0) - (a.day_change_percent || 0))
      .slice(0, 3);

    const worstPerformers = allHoldings
      .filter(h => h.day_change_percent !== undefined)
      .sort((a, b) => (a.day_change_percent || 0) - (b.day_change_percent || 0))
      .slice(0, 3);

    return {
      total_day_change: totalDayChange,
      total_day_change_percent: totalDayChangePercent,
      sector_allocation: sectorWeights,
      concentration_risks: concentrationRisks,
      top_performers: topPerformers,
      worst_performers: worstPerformers
    };
  }

  // Phase 3: Autonomous Reasoning
  public getRelevantNews(portfolio: Portfolio, news: NewsArticle[]): NewsArticle[] {
    const userSectors = new Set(portfolio.holdings.stocks.map(s => s.sector));
    const userStocks = new Set(portfolio.holdings.stocks.map(s => s.symbol));

    return news.filter(article => {
      const sectorMatch = article.entities.sectors.some(sector => userSectors.has(sector));
      const stockMatch = article.entities.stocks.some(stock => userStocks.has(stock));
      const marketWide = article.scope === 'MARKET_WIDE';
      return sectorMatch || stockMatch || marketWide;
    }).sort((a, b) => {
      // Prioritize by impact level and relevance
      const impactScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (impactScore[b.impact_level as keyof typeof impactScore] || 0) -
             (impactScore[a.impact_level as keyof typeof impactScore] || 0);
    });
  }

  public generateCausalLinks(portfolio: Portfolio, news: NewsArticle[], sectorTrends: SectorTrend[]): CausalLink[] {
    const links: CausalLink[] = [];
    const portfolioSectors = new Set(portfolio.holdings.stocks.map(s => s.sector));

    news.forEach(article => {
      article.entities.sectors.forEach(sector => {
        if (portfolioSectors.has(sector)) {
          const sectorTrend = sectorTrends.find(t => t.sector === sector);
          const impact = sectorTrend ? Math.abs(sectorTrend.change_percent) * (article.sentiment_score || 0) : 0;

          links.push({
            news_id: article.id,
            sector,
            impact,
            explanation: `${article.headline} affecting ${sector} sector`,
            confidence: Math.abs(article.sentiment_score || 0)
          });
        }
      });
    });

    return links.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  public generateAgentBriefing(portfolioId: string): AgentBriefing {
    const portfolio = this.getPortfolio(portfolioId);
    const news = this.getNews();
    const sectorTrends = this.getSectorTrends();
    const analysis = this.analyzePortfolio(portfolio);
    const relevantNews = this.getRelevantNews(portfolio, news);
    const causalLinks = this.generateCausalLinks(portfolio, relevantNews, sectorTrends);

    // Generate summary
    const marketSentiment = this.analyzeMarketSentiment();
    const dayChangeStr = analysis.total_day_change_percent >= 0 ?
      `gained ${analysis.total_day_change_percent.toFixed(2)}%` :
      `fell ${Math.abs(analysis.total_day_change_percent).toFixed(2)}%`;

    let summary = `${portfolio.user_name}'s portfolio ${dayChangeStr} today. `;

    if (marketSentiment.overall === 'BEARISH') {
      summary += `The market sentiment is bearish, primarily driven by ${marketSentiment.key_drivers.join(', ')}. `;
    } else if (marketSentiment.overall === 'BULLISH') {
      summary += `The market sentiment is bullish, supported by ${marketSentiment.key_drivers.join(', ')}. `;
    }

    if (analysis.concentration_risks.length > 0) {
      summary += `Concentration risk detected in: ${analysis.concentration_risks.join(', ')}. `;
    }

    // Key insights
    const keyInsights: string[] = [];
    if (causalLinks.length > 0) {
      const topLink = causalLinks[0];
      if (topLink) {
        keyInsights.push(`Primary impact from ${topLink.sector} sector due to related news.`);
      }
    }

    analysis.top_performers.forEach(performer => {
      if (performer.day_change_percent > 0) {
        const name = 'symbol' in performer ? performer.symbol : performer.scheme_name;
        keyInsights.push(`${name} was a top performer with +${performer.day_change_percent.toFixed(2)}% change.`);
      }
    });

    analysis.worst_performers.forEach(performer => {
      if (performer.day_change_percent < 0) {
        const name = 'symbol' in performer ? performer.symbol : performer.scheme_name;
        keyInsights.push(`${name} was a laggard with ${performer.day_change_percent.toFixed(2)}% change.`);
      }
    });

    // Recommendations
    const recommendations: string[] = [];
    if (analysis.concentration_risks.length > 0) {
      recommendations.push('Consider diversifying to reduce concentration risk.');
    }
    if (marketSentiment.overall === 'BEARISH') {
      recommendations.push('Monitor defensive sectors for potential opportunities.');
    }

    // Simple reasoning quality score (placeholder)
    const reasoningQualityScore = Math.min(causalLinks.length * 0.1 + keyInsights.length * 0.05, 1);

    return {
      portfolio_id: portfolioId,
      summary,
      key_insights: keyInsights,
      causal_links: causalLinks.slice(0, 5), // Top 5
      recommendations,
      confidence_score: marketSentiment.confidence,
      reasoning_quality_score: reasoningQualityScore
    };
  }
}