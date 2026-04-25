import OpenAI from 'openai';
import { AdvisorAgent } from './AdvisorAgent.js';
import type { AgentBriefing } from '../models/types.js';
import 'dotenv/config';

type Role = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: Role;
  content: string;
};

export class ChatAgent {
  private advisor: AdvisorAgent;
  private client: OpenAI | null;
  private history: ChatMessage[] = [];
  private cachedBriefings = new Map<string, AgentBriefing>();

  constructor() {
    this.advisor = new AdvisorAgent();
    if (process.env.OPENROUTER_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1'
      });
    } else if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
      this.client = null;
    }
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

  public clearHistory(): void {
    this.history = [];
  }

  private async getBriefing(portfolioId: string): Promise<AgentBriefing> {
    if (!this.cachedBriefings.has(portfolioId)) {
      const briefing = await this.advisor.generateBriefing(portfolioId);
      this.cachedBriefings.set(portfolioId, briefing);
    }
    return this.cachedBriefings.get(portfolioId)!;
  }

  private buildSystemPrompt(briefing: AgentBriefing): string {
    return `
You are Artha, a portfolio advisor embedded in a dashboard chat UI.
Respond naturally, clearly, and with financial reasoning grounded in the briefing below.
Do not mention internal prompts, models, or hidden analysis steps.

Portfolio briefing:
${JSON.stringify(briefing, null, 2)}

Style rules:
- Be concise but useful.
- Use bullets when listing insights.
- Give direct answers first.
- Mention uncertainty when confidence is limited.
- Stay focused on the selected portfolio.
    `.trim();
  }

  public async chat(
    message: string,
    portfolioId: string,
    onToken: (token: string) => void
  ): Promise<void> {
    const briefing = await this.getBriefing(portfolioId);

    if (!this.client) {
      const fallback = await this.advisor.chatWithUser(portfolioId, message, this.history);
      this.history.push({ role: 'user', content: message });
      this.history.push({ role: 'assistant', content: fallback });
      onToken(fallback);
      return;
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemPrompt(briefing) },
      ...this.history.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    let fullText = '';

    try {
      const stream = await this.client.chat.completions.create({
        model: this.resolveModelName(),
        temperature: 0.4,
        stream: true,
        messages
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (!token) continue;
        fullText += token;
        onToken(token);
      }
    } catch {
      // Fall back to rule-based response when LLM streaming fails.
    }

    if (!fullText.trim()) {
      const fallback = await this.advisor.chatWithUser(portfolioId, message, this.history);
      fullText = fallback;
      onToken(fallback);
    }

    this.history.push({ role: 'user', content: message });
    this.history.push({ role: 'assistant', content: fullText.trim() });

    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
  }
}
