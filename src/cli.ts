#!/usr/bin/env node

import * as readline from 'readline';
import { AdvisorAgent } from './agent/AdvisorAgent.js';
import { AnalyticsEngine } from './services/AnalyticsEngine.js';

const portfolios = [
  { id: 'PORTFOLIO_001', name: 'Diversified Portfolio (Rahul Sharma)' },
  { id: 'PORTFOLIO_002', name: 'Banking-Heavy Portfolio (Priya Patel)' },
  { id: 'PORTFOLIO_003', name: 'Conservative Portfolio (Arun Krishnamurthy)' }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function printHeader() {
  console.clear();
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Autonomous Financial Advisor Agent                       ║');
  console.log('║   Chat with me about your portfolios and investments       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

function printMenu() {
  console.log('\n� Chat-Based Wealth Advisor Interface:\n');
  portfolios.forEach((p, i) => {
    console.log(`  ${i + 1}. Chat with advisor for ${p.name}`);
  });
  console.log(`  ${portfolios.length + 1}. View All Analysis Results`);
  console.log(`  ${portfolios.length + 2}. Exit\n`);
}

function ask(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function chatWithPortfolio(portfolioId: string) {
  const agent = new AdvisorAgent();
  const selectedPortfolio = portfolios.find(p => p.id === portfolioId);
  console.log(`\n👋 You are now chatting with the autonomous wealth advisor for ${selectedPortfolio?.name}.`);
  console.log('Type your question, or enter "exit" to return to the main menu.\n');

  const history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

  while (true) {
    const userInput = (await ask('You: ')).trim();
    if (!userInput) {
      continue;
    }
    const lowered = userInput.toLowerCase();
    if (lowered === 'exit' || lowered === 'back' || lowered === 'menu' || lowered === 'quit') {
      console.log('\nReturning to the main menu...\n');
      return;
    }

    try {
      const assistantResponse = await agent.chatWithUser(portfolioId, userInput, history);
      console.log(`\nAdvisor: ${assistantResponse}\n`);
      history.push({ role: 'user', content: userInput });
      history.push({ role: 'assistant', content: assistantResponse });
    } catch (error) {
      console.error('❌ Failed to generate answer:', error instanceof Error ? error.message : String(error));
    }
  }
}

async function analyzePortfolio(portfolioId: string) {
  console.log('\n⏳ Analyzing portfolio... (this may take a moment)\n');
  
  try {
    const agent = new AdvisorAgent();
    const briefing = await agent.generateBriefing(portfolioId);
    
    displayBriefing(briefing);
  } catch (error) {
    console.error('\n❌ Error analyzing portfolio:', error instanceof Error ? error.message : String(error));
  }
}

function displayBriefing(briefing: any) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  FINANCIAL BRIEFING                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📈 Portfolio: ${briefing.portfolio_id}\n`);
  
  console.log('📝 Summary:');
  console.log('─'.repeat(60));
  console.log(briefing.summary);
  console.log();

  if (briefing.key_insights.length > 0) {
    console.log('💡 Key Insights:');
    console.log('─'.repeat(60));
    briefing.key_insights.forEach((insight: string) => console.log(`  • ${insight}`));
    console.log();
  }

  if (briefing.causal_links.length > 0) {
    console.log('🔗 Causal Links (Top 3):');
    console.log('─'.repeat(60));
    briefing.causal_links.slice(0, 3).forEach((link: any) => {
      console.log(`  • ${link.sector}`);
      console.log(`    └─ ${link.explanation}`);
      console.log(`       Impact: ${link.impact.toFixed(2)} | Confidence: ${(link.confidence * 100).toFixed(1)}%\n`);
    });
  }

  if (briefing.recommendations.length > 0) {
    console.log('💼 Recommendations:');
    console.log('─'.repeat(60));
    briefing.recommendations.forEach((rec: string) => console.log(`  • ${rec}`));
    console.log();
  }

  console.log('📊 Metrics:');
  console.log('─'.repeat(60));
  console.log(`  Confidence Score: ${(briefing.confidence_score * 100).toFixed(1)}%`);
  console.log(`  Reasoning Quality: ${(briefing.reasoning_quality_score * 10).toFixed(1)}/10`);
  console.log();
}

function viewAllResults() {
  console.log('\n⏳ Generating comprehensive analysis for all portfolios...\n');
  
  const engine = new AnalyticsEngine();
  
  try {
    portfolios.forEach(p => {
      const portfolio = engine.getPortfolio(p.id);
      const analysis = engine.analyzePortfolio(portfolio);
      
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`Portfolio: ${p.name}`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`  User: ${portfolio.user_name}`);
      console.log(`  Type: ${portfolio.portfolio_type}`);
      console.log(`  Current Value: ₹${portfolio.current_value.toLocaleString()}`);
      console.log(`  Overall P&L: ₹${portfolio.overall_gain_loss.toLocaleString()} (${portfolio.overall_gain_loss_percent.toFixed(2)}%)`);
      console.log(`  Daily Change: ${analysis.total_day_change_percent.toFixed(2)}%`);
      
      const riskLevel = analysis.concentration_risks.length > 0 
        ? `⚠️  CRITICAL - ${analysis.concentration_risks.join(', ')}`
        : '✅ BALANCED';
      console.log(`  Risk Level: ${riskLevel}`);
      
      console.log(`  Sector Allocation:`);
      Object.entries(analysis.sector_allocation).forEach(([sector, weight]) => {
        console.log(`    - ${sector}: ${(weight as number).toFixed(1)}%`);
      });
    });
    
    console.log(`\n${'═'.repeat(60)}\n`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

function getPortfolioFromMessage(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('diversified') || lower.includes('rahul') || lower.includes('portfolio 1')) {
    return 'PORTFOLIO_001';
  }
  if (lower.includes('banking') || lower.includes('priya') || lower.includes('portfolio 2')) {
    return 'PORTFOLIO_002';
  }
  if (lower.includes('conservative') || lower.includes('arun') || lower.includes('portfolio 3')) {
    return 'PORTFOLIO_003';
  }
  return null;
}

async function main() {
  printHeader();
  console.log('👋 Welcome to your personal wealth advisor!');
  console.log('You can ask me questions about your portfolios, market trends, or investment advice.');
  console.log('Mention a portfolio by name (e.g., "diversified portfolio", "banking portfolio") to focus the conversation.');
  console.log('Type "exit" or "quit" to end the session.\n');

  const agent = new AdvisorAgent();
  const history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  let currentPortfolioId: string | null = null;

  while (true) {
    const userInput = (await ask('You: ')).trim();
    if (!userInput) {
      continue;
    }
    const lowered = userInput.toLowerCase();
    if (lowered === 'exit' || lowered === 'quit' || lowered === 'bye') {
      console.log('\n👋 Thank you for chatting! Have a great day with your investments.\n');
      rl.close();
      process.exit(0);
    }

    // Check if user is switching portfolios
    const newPortfolioId = getPortfolioFromMessage(userInput);
    if (newPortfolioId && newPortfolioId !== currentPortfolioId) {
      currentPortfolioId = newPortfolioId;
      const portfolio = portfolios.find(p => p.id === currentPortfolioId);
      console.log(`\n🔄 Switching context to ${portfolio?.name}\n`);
      history.push({ role: 'system', content: `Switched to portfolio ${currentPortfolioId}` });
    }

    try {
      let response: string;
      if (currentPortfolioId) {
        response = await agent.chatWithUser(currentPortfolioId, userInput, history);
      } else {
        // General response without portfolio context
        response = await agent.chatWithUser('PORTFOLIO_001', userInput, history); // Default to first portfolio
      }
      console.log(`Advisor: ${response}\n`);
      history.push({ role: 'user', content: userInput });
      history.push({ role: 'assistant', content: response });

      // Keep history manageable
      if (history.length > 20) {
        history.splice(0, 2); // Remove oldest pair
      }
    } catch (error) {
      console.error('❌ Sorry, I encountered an error processing your request:', error instanceof Error ? error.message : String(error));
    }
  }
}

main().catch(console.error);
