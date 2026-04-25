import OpenAI from 'openai';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { AdvisorAgent } from './AdvisorAgent.js';
import type { AgentBriefing } from '../models/types.js';
import 'dotenv/config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatAgent {
  private ai: OpenAI;
  private engine: AnalyticsEngine;
  private advisorAgent: AdvisorAgent;
  private conversationHistory: ChatMessage[] = [];
  private cachedBriefings: Map<string, AgentBriefing> = new Map();

  constructor() {
    this.ai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
    });
    this.engine = new AnalyticsEngine();
    this.advisorAgent = new AdvisorAgent();
  }

  private buildSystemPrompt(portfolioId?: string): string {
    const portfoliosData = this.engine.getPortfoliosData();
    const marketSentiment = this.engine.analyzeMarketSentiment();
    const sectorTrends = this.engine.getSectorTrends().slice(0, 5);

    let portfolioContext = '';
    if (portfolioId && this.cachedBriefings.has(portfolioId)) {
      const briefing = this.cachedBriefings.get(portfolioId)!;
      const portfolio = this.engine.getPortfolio(portfolioId);
      const analysis = this.engine.analyzePortfolio(portfolio);

      portfolioContext = `
ACTIVE PORTFOLIO: ${portfolio.user_name} (${portfolioId})
Type: ${portfolio.portfolio_type} | Risk: ${portfolio.risk_profile}
Total Value: ₹${portfolio.current_value.toLocaleString()}
Overall P&L: ₹${portfolio.overall_gain_loss.toLocaleString()} (${portfolio.overall_gain_loss_percent.toFixed(2)}%)
Today's Change: ${analysis.total_day_change_percent.toFixed(2)}%
Sector Allocation: ${Object.entries(analysis.sector_allocation).map(([s, w]) => `${s}: ${(w as number).toFixed(1)}%`).join(', ')}
Concentration Risks: ${analysis.concentration_risks.length > 0 ? analysis.concentration_risks.join(', ') : 'None'}

Briefing Summary: ${briefing.summary}
Key Insights: ${briefing.key_insights.join(' | ')}
Recommendations: ${briefing.recommendations.join(' | ')}
`;
    } else {
      // Provide data for all portfolios
      const portfolioList = Object.entries(portfoliosData.portfolios)
        .map(([id, p]) => `- ${id}: ${p.user_name} (${p.portfolio_type}, ₹${p.current_value.toLocaleString()})`)
        .join('\n');
      portfolioContext = `AVAILABLE PORTFOLIOS:\n${portfolioList}`;
    }

    return `You are Artha, an expert AI wealth advisor serving Indian retail investors. You have access to real-time market data and portfolio analytics.

PERSONALITY:
- Warm, professional, and reassuring — like a trusted financial advisor
- Use simple language; avoid jargon unless the user seems experienced
- Be direct with insights but always explain the "why"
- Acknowledge uncertainty honestly — never fabricate data
- Use Indian context: mention BSE/NSE, sectors relevant to India, refer to amounts in ₹

MARKET CONTEXT (Today):
Overall Sentiment: ${marketSentiment.overall} (confidence: ${(marketSentiment.confidence * 100).toFixed(0)}%)
Key Drivers: ${marketSentiment.key_drivers.join(', ')}
Top Moving Sectors: ${sectorTrends.map(t => `${t.sector} ${t.change_percent > 0 ? '+' : ''}${t.change_percent.toFixed(2)}%`).join(', ')}

${portfolioContext}

CAPABILITIES:
- Analyze any of the available portfolios in detail
- Explain why specific stocks or sectors are moving
- Provide risk assessments and diversification advice
- Answer general investing questions with context specific to the user's holdings
- Compare portfolio performance against market trends

RULES:
- If asked about a specific portfolio not yet analyzed, tell the user you'll analyze it and call for a briefing
- Never recommend specific buy/sell decisions without caveats about consulting a SEBI-registered advisor
- If you don't have data for something, say so clearly
- Keep responses concise but complete — aim for 3-5 sentences unless more detail is needed`;
  }

  async chat(
    userMessage: string,
    portfolioId: string | undefined,
    onToken: (token: string) => void
  ): Promise<string> {
    // Auto-load briefing if portfolio selected and not cached
    if (portfolioId && !this.cachedBriefings.has(portfolioId)) {
      try {
        const briefing = await this.advisorAgent.generateBriefing(portfolioId);
        this.cachedBriefings.set(portfolioId, briefing);
      } catch (e) {
        console.warn('Could not pre-load briefing:', e);
      }
    }

    this.conversationHistory.push({ role: 'user', content: userMessage });

    const systemPrompt = this.buildSystemPrompt(portfolioId);

    const stream = await this.ai.chat.completions.create({
      model: 'microsoft/wizardlm-2-8x22b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory,
      ],
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullResponse += token;
        onToken(token);
      }
    }

    this.conversationHistory.push({ role: 'assistant', content: fullResponse });
    return fullResponse;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  async getBriefing(portfolioId: string): Promise<AgentBriefing> {
    if (!this.cachedBriefings.has(portfolioId)) {
      const briefing = await this.advisorAgent.generateBriefing(portfolioId);
      this.cachedBriefings.set(portfolioId, briefing);
    }
    return this.cachedBriefings.get(portfolioId)!;
  }
}