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
  console.log('║   Intelligent portfolio analysis with causal reasoning     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

function printMenu() {
  console.log('\n📊 Available Portfolios:\n');
  portfolios.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name}`);
  });
  console.log(`  ${portfolios.length + 1}. View All Analysis Results`);
  console.log(`  ${portfolios.length + 2}. Exit\n`);
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

async function main() {
  printHeader();
  
  const askQuestion = () => {
    printMenu();
    rl.question('👉 Select an option (1-5): ', async (answer: string) => {
      const choice = parseInt(answer);
      
      if (choice >= 1 && choice <= portfolios.length) {
        const selectedPortfolio = portfolios[choice - 1];
        if (selectedPortfolio) {
          await analyzePortfolio(selectedPortfolio.id);
        } else {
          console.log('\n❌ Invalid portfolio selection.');
          askQuestion();
          return;
        }
        rl.question('\n📌 Press Enter to continue...', () => {
          printHeader();
          askQuestion();
        });
      } else if (choice === portfolios.length + 1) {
        viewAllResults();
        rl.question('\n📌 Press Enter to continue...', () => {
          printHeader();
          askQuestion();
        });
      } else if (choice === portfolios.length + 2) {
        console.log('\n👋 Thank you for using Financial Advisor Agent!\n');
        rl.close();
        process.exit(0);
      } else {
        console.log('\n❌ Invalid option. Please try again.');
        askQuestion();
      }
    });
  };
  
  askQuestion();
}

main().catch(console.error);
