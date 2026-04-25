import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsEngine } from './AnalyticsEngine.js';

const engine = new AnalyticsEngine();

test('analyzeMarketSentiment returns bearish signal for current mock data', () => {
  const sentiment = engine.analyzeMarketSentiment();

  assert.equal(sentiment.overall, 'BEARISH');
  assert.ok(sentiment.confidence > 0);
  assert.ok(sentiment.key_drivers.length >= 1);
});

test('analyzePortfolio detects concentration risk for portfolio 2', () => {
  const portfolio = engine.getPortfolio('PORTFOLIO_002');
  const analysis = engine.analyzePortfolio(portfolio);

  assert.ok(analysis.total_day_change_percent < 0);
  assert.ok(analysis.concentration_risks.includes('BANKING'));
  assert.ok(analysis.asset_type_allocation.DIRECT_STOCKS > 80);
});

test('getRelevantNews filters to portfolio exposures and market-wide items', () => {
  const portfolio = engine.getPortfolio('PORTFOLIO_002');
  const allNews = engine.getNews();
  const relevant = engine.getRelevantNews(portfolio, allNews);

  assert.ok(relevant.length > 0);
  assert.ok(relevant.some(item => item.id === 'NEWS001'));
  assert.ok(
    relevant.every(
      item =>
        item.scope === 'MARKET_WIDE' ||
        item.entities.sectors.includes('BANKING') ||
        item.entities.sectors.includes('FINANCIAL_SERVICES') ||
        item.entities.stocks.some(symbol =>
          portfolio.holdings.stocks.some(stock => stock.symbol === symbol)
        )
    )
  );
});

test('generateCausalLinks returns ranked links with ambiguity notes for conflicts', () => {
  const portfolio = engine.getPortfolio('PORTFOLIO_002');
  const relevantNews = engine.getRelevantNews(portfolio, engine.getNews());
  const sectorTrends = engine.getSectorTrends();
  const links = engine.generateCausalLinks(portfolio, relevantNews, sectorTrends);

  assert.ok(links.length > 0);
  assert.ok(Math.abs(links[0].impact) >= Math.abs(links[links.length - 1].impact));
  assert.ok(links.some(link => Boolean(link.ambiguity_note)));
});
