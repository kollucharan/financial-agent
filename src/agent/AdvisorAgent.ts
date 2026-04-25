import OpenAI from 'openai';
import { Langfuse } from 'langfuse';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import type { AgentBriefing } from '../models/types.js';
import 'dotenv/config';

/**
 * AdvisorAgent - Orchestrates autonomous financial analysis
 *
 * Responsibilities:
 * - Integrates with LLM (OpenRouter) for intelligent narrative generation
 * - Orchestrates AnalyticsEngine for core reasoning
 * - Coordinates Langfuse tracing for observability
 * - Performs self-evaluation of reasoning quality
 *
 * The agent works in three phases:
 * 1. Generate basic briefing using rule-based analytics
 * 2. Enhance with LLM for sophisticated explanations (optional)
 * 3. Self-evaluate reasoning quality
 *
 * @example
 * const agent = new AdvisorAgent();
 * const briefing = await agent.generateBriefing('PORTFOLIO_002');
 * console.log(briefing.reasoning_quality_score); // 0-1 normalized
 */
export class AdvisorAgent {
  private ai: OpenAI;
  private engine: AnalyticsEngine;
  private langfuse: Langfuse;

  constructor() {
    this.ai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: "https://openrouter.ai/api/v1",
    });
    this.engine = new AnalyticsEngine();
    this.langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
      secretKey: process.env.LANGFUSE_SECRET_KEY || '',
      baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"
    });
  }

  public async generateBriefing(portfolioId: string): Promise<AgentBriefing> {
    const trace = this.langfuse.trace({ name: "Financial-Briefing-Generation", userId: portfolioId });

  
    const basicBriefing = this.engine.generateAgentBriefing(portfolioId);

   
    let enhancedBriefing = basicBriefing;
    try {
      if (process.env.OPENROUTER_API_KEY) {
        enhancedBriefing = await this.enhanceWithLLM(basicBriefing, trace);
      }
    } catch (error) {
      console.warn('LLM enhancement failed, using basic briefing:', error instanceof Error ? error.message : String(error));
    }

  
    let evaluation = { score: 7, reason: "LLM not available, default score" };
    try {
      if (process.env.OPENROUTER_API_KEY) {
        evaluation = await this.selfEvaluate(enhancedBriefing, trace);
      }
    } catch (error) {
      console.warn('Self-evaluation failed:', error instanceof Error ? error.message : String(error));
    }

    await this.langfuse.flushAsync();

    return {
      ...enhancedBriefing,
      reasoning_quality_score: evaluation.score / 10 // Convert to 0-1 scale
    };
  }

  private async enhanceWithLLM(briefing: AgentBriefing, trace: any): Promise<AgentBriefing> {
    const portfolio = this.engine.getPortfolio(briefing.portfolio_id);
    const marketSentiment = this.engine.analyzeMarketSentiment();
    const sectorTrends = this.engine.getSectorTrends();
    const relevantNews = this.engine.getRelevantNews(portfolio, this.engine.getNews());

    const prompt = `
You are an expert financial advisor AI. Based on the following data, enhance the portfolio briefing with deeper causal analysis.

Portfolio: ${portfolio.user_name} (${portfolio.portfolio_type})
Market Sentiment: ${marketSentiment.overall} (Confidence: ${(marketSentiment.confidence * 100).toFixed(1)}%)
Key Market Drivers: ${marketSentiment.key_drivers.join(', ')}

Sector Trends:
${sectorTrends.slice(0, 5).map(t => `${t.sector}: ${t.change_percent.toFixed(2)}% (${t.sentiment})`).join('\n')}

Relevant News Headlines:
${relevantNews.slice(0, 5).map(n => `- ${n.headline} (${n.sentiment}, ${n.scope})`).join('\n')}

Current Basic Summary: ${briefing.summary}

Task: Enhance this summary with:
1. Clear causal chains linking news to sector movements to portfolio impact
2. Handle any conflicting signals (e.g., positive news but negative price action)
3. Provide specific explanations for top performers and laggards
4. Maintain professional, concise tone

Return only the enhanced summary paragraph.
`;

    const generation = trace.generation({
      name: "briefing-enhancement",
      model: "microsoft/wizardlm-2-8x22b"
    });

    const response = await this.ai.chat.completions.create({
      model: "microsoft/wizardlm-2-8x22b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const enhancedSummary = response.choices[0]?.message?.content?.trim() || briefing.summary;

    generation.end({ output: enhancedSummary });

    return {
      ...briefing,
      summary: enhancedSummary
    };
  }

  public async chatWithUser(
    portfolioId: string,
    userQuestion: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
  ): Promise<string> {
    const trace = this.langfuse.trace({ name: 'Financial-Advisor-Chat', userId: portfolioId });
    const portfolio = this.engine.getPortfolio(portfolioId);
    const briefing = this.engine.generateAgentBriefing(portfolioId);
    const marketSentiment = this.engine.analyzeMarketSentiment();
    const sectorTrends = this.engine.getSectorTrends();
    const relevantNews = this.engine.getRelevantNews(portfolio, this.engine.getNews()).slice(0, 5);

    const context = `Portfolio Owner: ${portfolio.user_name}\nPortfolio Type: ${portfolio.portfolio_type}\nRisk Profile: ${portfolio.risk_profile}\nInvestment Horizon: ${portfolio.investment_horizon}\nCurrent Value: ₹${portfolio.current_value.toLocaleString()}\nOverall P&L: ${portfolio.overall_gain_loss_percent.toFixed(2)}%\n\nMarket Sentiment: ${marketSentiment.overall} (${(marketSentiment.confidence * 100).toFixed(1)}% confidence)\nKey Drivers: ${marketSentiment.key_drivers.join(', ') || 'N/A'}\n\nTop Insights: ${briefing.key_insights.join('; ') || 'N/A'}\nPrimary Causal Link: ${briefing.causal_links[0]?.explanation || 'N/A'}\nRecommendations: ${briefing.recommendations.join('; ') || 'N/A'}\n\nSector Trends:\n${sectorTrends.slice(0, 4).map(t => `- ${t.sector}: ${t.change_percent.toFixed(2)}% (${t.sentiment})`).join('\n')}\n\nRelevant News:\n${relevantNews.map(n => `- ${n.headline} (${n.scope}, ${n.sentiment})`).join('\n')}`;

    const systemMessage = {
      role: 'system' as const,
      content: `You are an autonomous wealth advisor interacting with a user in a conversational, professional, and concise manner. Use the provided portfolio context to answer questions about performance, risk, causal drivers, and recommendations. If the user asks for a summary, deliver a brief high-level overview. Avoid speculative claims and stay grounded in the data.`
    };

    const assistantContext = {
      role: 'system' as const,
      content: `Context:\n${context}`
    };

    const messages = [systemMessage, assistantContext, ...history, { role: 'user' as const, content: userQuestion }];

    if (!process.env.OPENROUTER_API_KEY) {
      return this.generateFallbackChatResponse(briefing, userQuestion);
    }

    try {
      const generation = trace.generation({
        name: 'advisor-chat-response',
        model: 'microsoft/wizardlm-2-8x22b'
      });

      const response = await this.ai.chat.completions.create({
        model: 'microsoft/wizardlm-2-8x22b',
        messages,
        max_tokens: 300,
        temperature: 0.7
      });

      const answer = response.choices[0]?.message?.content?.trim() || this.generateFallbackChatResponse(briefing, userQuestion);
      generation.end({ output: answer });
      await this.langfuse.flushAsync();
      return answer;
    } catch (error) {
      console.warn('Chat response failed, using fallback answer:', error instanceof Error ? error.message : String(error));
      return this.generateFallbackChatResponse(briefing, userQuestion);
    }
  }

  private generateFallbackChatResponse(briefing: AgentBriefing, userQuestion: string): string {
    const normalized = userQuestion.toLowerCase();
    if (normalized.includes('why') || normalized.includes('cause') || normalized.includes('reason')) {
      const primary = briefing.causal_links[0];
      return primary
        ? `${briefing.summary} The main driver was ${primary.explanation} with an impact score of ${primary.impact.toFixed(2)}.`
        : `${briefing.summary} I recommend reviewing the most relevant news and sector trends for the portfolio.`;
    }
    if (normalized.includes('risk') || normalized.includes('concentration')) {
      if (briefing.recommendations.length > 0) {
        return `Risk observation: ${briefing.recommendations.join(' ')} ${briefing.summary}`;
      }
      return `${briefing.summary} No major concentration risk was detected in the current analysis.`;
    }
    if (normalized.includes('recommend')) {
      return briefing.recommendations.length > 0
        ? `Recommendations: ${briefing.recommendations.join(' ')} `
          + `Overall, the portfolio is being impacted by the current market trend: ${briefing.summary}`
        : `The portfolio is stable based on the current data. ${briefing.summary}`;
    }
    if (normalized.includes('summary') || normalized.includes('overview') || normalized.includes('status')) {
      return briefing.summary;
    }

    return `${briefing.summary} If you want more detail, ask about risk, the cause of changes, or specific sector exposure.`;
  }

  private async selfEvaluate(briefing: AgentBriefing, trace: any): Promise<{ score: number; reason: string }> {
    const evalPrompt = `
Evaluate the quality of this financial portfolio briefing on a scale of 1-10.

Briefing: ${briefing.summary}

Key Insights: ${briefing.key_insights.join('; ')}

Causal Links: ${briefing.causal_links.map(l => `${l.sector}: ${l.explanation}`).join('; ')}

Evaluation Criteria:
- Causal Depth: How well it links macro news → sector trends → portfolio impact
- Clarity: Clear and understandable explanations
- Completeness: Covers major impacts and risks
- Objectivity: Balanced view of positive and negative factors

Return JSON: {"score": number, "reason": "brief explanation"}
`;

    const generation = trace.generation({
      name: "briefing-evaluation",
      model: "microsoft/wizardlm-2-8x22b",
      prompt: evalPrompt
    });

    const response = await this.ai.chat.completions.create({
      model: "microsoft/wizardlm-2-8x22b",
      messages: [{ role: "user", content: evalPrompt }],
      max_tokens: 200,
      temperature: 0.3,
    });

    const responseText = response.choices[0]?.message?.content?.trim() || '{"score": 7, "reason": "Evaluation failed"}';

    generation.end({ output: responseText });

    try {
      const evaluation = JSON.parse(responseText);
      return evaluation;
    } catch (e) {
      // Fallback
      return { score: 7, reason: "Evaluation parsing failed, using default score" };
    }
  }
}