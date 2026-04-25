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

export class AnalyticsEngine {
  private dataPath: string;

  constructor(dataPath?: string) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.dataPath = dataPath || path.join(__dirname, '../../data');
  }

  private loadJson<T>(filename: string): T {
    const filePath = path.join(this.dataPath, filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
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
    return this.getNewsData().news;
  }

  public analyzeMarketSentiment(): MarketSentiment {
    const marketData = this.getMarketData();
    const indices: Index[] = Object.values(marketData.indices);

    if (indices.length === 0) {
      return {
        overall: 'NEUTRAL',
        confidence: 0,
        key_drivers: []
      };
    }

    const avgChange =
      indices.reduce((sum, index) => sum + (index.change_percent || 0), 0) / indices.length;

    const bearishCount = indices.filter(idx => idx.sentiment === 'BEARISH').length;
    const bullishCount = indices.filter(idx => idx.sentiment === 'BULLISH').length;

    let overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

    if (avgChange > 0.4 && bullishCount > bearishCount) {
      overall = 'BULLISH';
    } else if (avgChange < -0.4 && bearishCount > bullishCount) {
      overall = 'BEARISH';
    }

    const confidence = Math.min(Math.abs(avgChange) / 2, 1);

    const keyDrivers = indices
      .filter(idx => Math.abs(idx.change_percent || 0) > 1)
      .map(idx => `${idx.name}: ${(idx.change_percent || 0).toFixed(2)}%`);

    return {
      overall,
      confidence,
      key_drivers: keyDrivers
    };
  }

  public getSectorTrends(): SectorTrend[] {
    const marketData = this.getMarketData();
    const newsData = this.getNewsData();

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

    sectorStocks.forEach((sectorStockList, sector) => {
      const avgChange =
        sectorStockList.reduce((sum, stock) => {
          const stockChange = stock.change_percent ?? stock.day_change_percent ?? 0;
          return sum + stockChange;
        }, 0) / sectorStockList.length;

      const sentiment =
        avgChange > 0.5 ? 'BULLISH' : avgChange < -0.5 ? 'BEARISH' : 'NEUTRAL';

      const keyStocks = [...sectorStockList]
        .sort((a, b) => Math.abs((b.change_percent ?? 0)) - Math.abs((a.change_percent ?? 0)))
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

  public analyzePortfolio(portfolio: Portfolio): PortfolioAnalysis {
    const stocks = portfolio.holdings.stocks;
    const mutualFunds = portfolio.holdings.mutual_funds || [];

    let totalDayChange = 0;
    let totalValue = 0;
    let stockValue = 0;
    let mfValue = 0;
    const sectorWeights: Record<string, number> = {};

    stocks.forEach(stock => {
      const dayChange = stock.current_value * ((stock.day_change_percent || 0) / 100);
      totalDayChange += dayChange;
      totalValue += stock.current_value;
      stockValue += stock.current_value;

      sectorWeights[stock.sector] =
        (sectorWeights[stock.sector] || 0) + stock.weight_in_portfolio;
    });

    mutualFunds.forEach(mf => {
      const normalizedDayChangePercent = mf.day_change_percent ?? 0;
      const dayChange = mf.current_value * (normalizedDayChangePercent / 100);
      totalDayChange += dayChange;
      totalValue += mf.current_value;
      mfValue += mf.current_value;
    });

    const totalDayChangePercent = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0;

    const concentrationRisks = Object.entries(sectorWeights)
      .filter(([, weight]) => weight > 40)
      .map(([sector]) => sector);

    const allHoldings: Array<{
      symbol: string;
      sector: string;
      current_value: number;
      day_change_percent: number;
    }> = [
      ...stocks.map(stock => ({
        symbol: stock.symbol,
        sector: stock.sector,
        current_value: stock.current_value,
        day_change_percent: stock.day_change_percent
      })),
      ...mutualFunds.map(mf => ({
        symbol: mf.scheme_name,
        sector: mf.category,
        current_value: mf.current_value,
        day_change_percent: mf.day_change_percent ?? 0
      }))
    ];

    const topPerformers = [...allHoldings]
      .sort((a, b) => b.day_change_percent - a.day_change_percent)
      .slice(0, 3);

    const worstPerformers = [...allHoldings]
      .sort((a, b) => a.day_change_percent - b.day_change_percent)
      .slice(0, 3);

    return {
      total_day_change: totalDayChange,
      total_day_change_percent: totalDayChangePercent,
      sector_allocation: sectorWeights,
      asset_type_allocation: {
        DIRECT_STOCKS: totalValue > 0 ? Number(((stockValue / totalValue) * 100).toFixed(2)) : 0,
        MUTUAL_FUNDS: totalValue > 0 ? Number(((mfValue / totalValue) * 100).toFixed(2)) : 0
      },
      concentration_risks: concentrationRisks,
      top_performers: topPerformers,
      worst_performers: worstPerformers
    };
  }

  public getRelevantNews(portfolio: Portfolio, news: NewsArticle[]): NewsArticle[] {
    const userSectors = new Set(portfolio.holdings.stocks.map(s => s.sector));
    const userStocks = new Set(portfolio.holdings.stocks.map(s => s.symbol));

    const impactScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    return news
      .filter(article => {
        const sectorMatch = article.entities.sectors.some(sector => userSectors.has(sector));
        const stockMatch = article.entities.stocks.some(stock => userStocks.has(stock));
        const marketWide = article.scope === 'MARKET_WIDE';
        return sectorMatch || stockMatch || marketWide;
      })
      .sort((a, b) => {
        return (
          (impactScore[b.impact_level as keyof typeof impactScore] || 0) -
          (impactScore[a.impact_level as keyof typeof impactScore] || 0)
        );
      });
  }

  public generateCausalLinks(
    portfolio: Portfolio,
    news: NewsArticle[],
    sectorTrends: SectorTrend[]
  ): CausalLink[] {
    const links: CausalLink[] = [];

    const sectorExposure = new Map<string, number>();
    portfolio.holdings.stocks.forEach(stock => {
      sectorExposure.set(
        stock.sector,
        (sectorExposure.get(stock.sector) || 0) + stock.weight_in_portfolio
      );
    });

    news.forEach(article => {
      article.entities.sectors.forEach(sector => {
        if (!sectorExposure.has(sector)) {
          return;
        }

        const exposure = sectorExposure.get(sector) || 0;
        const sectorTrend = sectorTrends.find(t => t.sector === sector);
        const sectorChange = sectorTrend?.change_percent || 0;
        const sentimentScore = article.sentiment_score || 0;

        const weightedImpact = (sectorChange * sentimentScore * exposure) / 100;
        const sentimentDirectionMismatch =
          (sentimentScore > 0 && sectorChange < 0) || (sentimentScore < 0 && sectorChange > 0);

        const relatedHoldings = portfolio.holdings.stocks
          .filter(stock => stock.sector === sector)
          .map(stock => stock.symbol);

        let ambiguityNote: string | undefined;

        if (article.conflict_flag && article.conflict_explanation) {
          ambiguityNote = article.conflict_explanation;
        } else if (sentimentDirectionMismatch) {
          ambiguityNote = 'News sentiment and price direction are misaligned; near-term price action may reflect broader market pressure.';
        }

        const confidenceBase = Math.min(Math.abs(sentimentScore) + Math.abs(sectorChange) / 5, 1);
        const confidence = Number((ambiguityNote ? confidenceBase * 0.8 : confidenceBase).toFixed(2));

        const link: CausalLink = {
          news_id: article.id,
          sector,
          impact: Number(weightedImpact.toFixed(3)),
          explanation: `${article.headline} influenced ${sector} (${exposure.toFixed(2)}% portfolio exposure).`,
          confidence,
          related_holdings: relatedHoldings
        };

        if (ambiguityNote) {
          link.ambiguity_note = ambiguityNote;
        }

        links.push(link);
      });
    });

    return links
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 8);
  }

  public generateAgentBriefing(portfolioId: string): AgentBriefing {
    const portfolio = this.getPortfolio(portfolioId);
    const news = this.getNews();
    const sectorTrends = this.getSectorTrends();
    const analysis = this.analyzePortfolio(portfolio);
    const relevantNews = this.getRelevantNews(portfolio, news);
    const causalLinks = this.generateCausalLinks(portfolio, relevantNews, sectorTrends);
    const marketSentiment = this.analyzeMarketSentiment();

    const dayChangeStr =
      analysis.total_day_change_percent >= 0
        ? `gained ${analysis.total_day_change_percent.toFixed(2)}%`
        : `fell ${Math.abs(analysis.total_day_change_percent).toFixed(2)}%`;

    let summary = `${portfolio.user_name}'s portfolio ${dayChangeStr} today. `;

    if (marketSentiment.overall === 'BEARISH') {
      summary += `Market sentiment is bearish, driven by ${marketSentiment.key_drivers.join(', ')}. `;
    } else if (marketSentiment.overall === 'BULLISH') {
      summary += `Market sentiment is bullish, supported by ${marketSentiment.key_drivers.join(', ')}. `;
    } else {
      summary += 'Market sentiment is neutral today. ';
    }

    if (analysis.concentration_risks.length > 0) {
      summary += `Concentration risk detected in ${analysis.concentration_risks.join(', ')}. `;
    }

    const keyInsights: string[] = [];

    if (causalLinks[0]) {
      keyInsights.push(`Primary impact comes from ${causalLinks[0].sector} sector-linked news.`);
    }

    analysis.top_performers.forEach(performer => {
      if ((performer.day_change_percent || 0) > 0) {
        keyInsights.push(
          `${performer.symbol} was a top performer with +${performer.day_change_percent.toFixed(2)}%.`
        );
      }
    });

    analysis.worst_performers.forEach(performer => {
      if ((performer.day_change_percent || 0) < 0) {
        keyInsights.push(
          `${performer.symbol} lagged with ${performer.day_change_percent.toFixed(2)}%.`
        );
      }
    });

    const hasAmbiguity = causalLinks.some(link => Boolean(link.ambiguity_note));
    if (hasAmbiguity) {
      keyInsights.push('Some signals are conflicting; headline sentiment does not fully explain short-term price moves.');
    }

    const recommendations: string[] = [];

    if (analysis.concentration_risks.length > 0) {
      recommendations.push('Consider reducing single-sector concentration and broadening exposure.');
    }

    if (marketSentiment.overall === 'BEARISH') {
      recommendations.push('Review downside-sensitive holdings and keep defensive allocation disciplined.');
    }

    if (hasAmbiguity) {
      recommendations.push('For conflicting signals, track follow-up data points before making large allocation changes.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain allocation discipline and continue monitoring sector-linked catalysts.');
    }

    const reasoningQualityScore = Math.min(
      causalLinks.length * 0.12 + keyInsights.length * 0.06,
      1
    );

    return {
      portfolio_id: portfolioId,
      summary: summary.trim(),
      key_insights: keyInsights.slice(0, 6),
      causal_links: causalLinks.slice(0, 5),
      recommendations,
      confidence_score: marketSentiment.confidence,
      reasoning_quality_score: reasoningQualityScore
    };
  }
}
