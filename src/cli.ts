#!/usr/bin/env node

import * as readline from 'readline';
import { AdvisorAgent } from './agent/AdvisorAgent.js';

const portfolios = [
  { id: 'PORTFOLIO_001', name: 'Diversified Portfolio (Rahul Sharma)' },
  { id: 'PORTFOLIO_002', name: 'Banking-Heavy Portfolio (Priya Patel)' },
  { id: 'PORTFOLIO_003', name: 'Conservative Portfolio (Arun Krishnamurthy)' }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

function detectPortfolio(message: string, current: string | null): string | null {
  const lower = message.toLowerCase();

  if (lower.includes('rahul') || lower.includes('diversified') || lower.includes('portfolio 1')) {
    return 'PORTFOLIO_001';
  }
  if (lower.includes('priya') || lower.includes('banking') || lower.includes('portfolio 2')) {
    return 'PORTFOLIO_002';
  }
  if (lower.includes('arun') || lower.includes('conservative') || lower.includes('portfolio 3')) {
    return 'PORTFOLIO_003';
  }

  return current;
}

async function main() {
  const agent = new AdvisorAgent();
  let currentPortfolioId: string | null = null;
  const history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

  console.log('\nArtha Advisor CLI');
  console.log('Type exit to quit.');
  console.log('Mention Rahul / Priya / Arun or portfolio 1 / 2 / 3 to switch context.\n');

  while (true) {
    const input = (await ask('You: ')).trim();

    if (!input) continue;

    if (['exit', 'quit', 'bye'].includes(input.toLowerCase())) {
      console.log('\nGoodbye.\n');
      rl.close();
      process.exit(0);
    }

    const nextPortfolio = detectPortfolio(input, currentPortfolioId);
    if (nextPortfolio !== currentPortfolioId) {
      currentPortfolioId = nextPortfolio;
      const portfolio = portfolios.find(p => p.id === currentPortfolioId);
      console.log(`\nSwitched to ${portfolio?.name}\n`);
      history.push({ role: 'system', content: `Switched to ${currentPortfolioId}` });
    }

    const portfolioId = currentPortfolioId || 'PORTFOLIO_001';

    try {
      const reply = await agent.chatWithUser(portfolioId, input, history);
      console.log(`\nAdvisor: ${reply}\n`);
      history.push({ role: 'user', content: input });
      history.push({ role: 'assistant', content: reply });

      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }
  }
}

main().catch(console.error);