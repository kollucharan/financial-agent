import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { ReasoningEvaluator } from '../services/ReasoningEvaluator.js';
import { Observability } from '../services/Observability.js';
import type { AgentBriefing } from '../models/types.js';
import 'dotenv/config';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class AdvisorAgent {
  private engine: AnalyticsEngine;
  private evaluator: ReasoningEvaluator;
  private observability: Observability;
  private client: OpenAI | null;

  constructor() {
    this.engine = new AnalyticsEngine();
    this.evaluator = new ReasoningEvaluator();
    this.observability = new Observability();
    this.client = this.createClient();
  }

  private resolveModelName(): string {
    if (process.env.OPENROUTER_API_KEY) {
      return process.env.OPENROUTER_MODEL || 'openrouter/free';
    }

    if (process.env.OPENAI_API_KEY) {
      return process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    return 'gpt-4o-mini';
  }

  private createClient(): OpenAI | null {
    const openAiKey = process.env.OPENAI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (openRouterKey) {
      return new OpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1'
      });
    }

    if (openAiKey) {
      return new OpenAI({ apiKey: openAiKey });
    }

    return null;
  }

  public getRuntimeStatus(): { llm_configured: boolean; tracing_enabled: boolean; model: string } {
    return {
      llm_configured: Boolean(this.client),
      tracing_enabled: this.observability.getStatus().enabled,
      model: this.resolveModelName()
    };
  }

  public async generateBriefing(portfolioId: string): Promise<AgentBriefing> {
    const traceId = randomUUID();
    const baseBriefing = this.engine.generateAgentBriefing(portfolioId);
    const evaluation = this.evaluator.evaluate(baseBriefing);

    const finalBriefing: AgentBriefing = {
      ...baseBriefing,
      reasoning_quality_score: evaluation.score / 10,
      reasoning_evaluation: evaluation
    };

    await this.observability.trace({
      traceId,
      name: 'briefing.generate',
      input: { portfolioId },
      output: {
        portfolio_id: finalBriefing.portfolio_id,
        confidence_score: finalBriefing.confidence_score,
        reasoning_quality_score: finalBriefing.reasoning_quality_score
      },
      metadata: {
        causal_links_count: finalBriefing.causal_links.length,
        key_insights_count: finalBriefing.key_insights.length
      }
    });

    return finalBriefing;
  }

  public async chatWithUser(
    portfolioId: string,
    message: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    const briefing = await this.generateBriefing(portfolioId);
    return this.generateResponse(briefing, message, history);
  }

  private buildSystemPrompt(briefing: AgentBriefing): string {
    return `
You are Artha, a concise and insightful financial advisor assistant.
Use the provided portfolio briefing to answer the user.
Be practical, explain risks clearly, and avoid generic filler.
Do not invent holdings or news beyond the briefing.

Portfolio ID: ${briefing.portfolio_id}

Summary:
${briefing.summary}

Key Insights:
${briefing.key_insights.map(i => `- ${i}`).join('\n')}

Causal Links:
${briefing.causal_links
  .map(
    l =>
      `- Sector: ${l.sector}, Impact: ${l.impact.toFixed(2)}, Confidence: ${(l.confidence * 100).toFixed(1)}%, Explanation: ${l.explanation}${l.ambiguity_note ? `, Ambiguity: ${l.ambiguity_note}` : ''}`
  )
  .join('\n')}

Recommendations:
${briefing.recommendations.map(r => `- ${r}`).join('\n')}

Confidence Score: ${(briefing.confidence_score * 100).toFixed(1)}%
Reasoning Quality Score: ${(briefing.reasoning_quality_score * 10).toFixed(1)}/10

Rules:
- Keep responses grounded in the portfolio context.
- Prefer short paragraphs and bullets when useful.
- If the user asks for risk, focus on concentration, laggards, and sector/news exposure.
- If the user asks for summary, give the most material 3-5 points.
- Mention ambiguity when signals conflict.
    `.trim();
  }

  private async generateResponse(
    briefing: AgentBriefing,
    userMessage: string,
    history: ChatMessage[]
  ): Promise<string> {
    if (!this.client) {
      return this.generateFallbackResponse(briefing, userMessage);
    }

    const trimmedHistory = history.slice(-8);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(briefing)
      },
      ...trimmedHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];

    const modelName = this.resolveModelName();

    try {
      const completion = await this.client.chat.completions.create({
        model: modelName,
        temperature: 0.4,
        messages
      });

      const output =
        completion.choices[0]?.message?.content?.trim() || this.generateFallbackResponse(briefing, userMessage);

      await this.observability.trace({
        traceId: randomUUID(),
        name: 'chat.response',
        input: {
          portfolioId: briefing.portfolio_id,
          message: userMessage
        },
        output: {
          text: output
        },
        metadata: {
          model: modelName,
          prompt_tokens: completion.usage?.prompt_tokens,
          completion_tokens: completion.usage?.completion_tokens
        }
      });

      return output;
    } catch {
      return this.generateFallbackResponse(briefing, userMessage);
    }
  }

  private generateFallbackResponse(briefing: AgentBriefing, userMessage: string): string {
    const q = userMessage.toLowerCase();

    if (q.includes('summary') || q.includes('brief')) {
      return [
        briefing.summary,
        '',
        'Key points:',
        ...briefing.key_insights.slice(0, 4).map(i => `- ${i}`)
      ].join('\n');
    }

    if (q.includes('risk')) {
      return [
        briefing.summary,
        '',
        'Main risk signals:',
        ...briefing.recommendations.map(r => `- ${r}`),
        ...briefing.causal_links.slice(0, 2).map(l => `- ${l.explanation} (impact ${l.impact.toFixed(2)})`)
      ].join('\n');
    }

    return [
      briefing.summary,
      '',
      'Key insights:',
      ...briefing.key_insights.slice(0, 4).map(i => `- ${i}`),
      '',
      'Suggested actions:',
      ...briefing.recommendations.map(r => `- ${r}`)
    ].join('\n');
  }
}
