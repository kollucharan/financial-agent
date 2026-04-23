import { AdvisorAgent } from './agent/AdvisorAgent.js';

async function main() {
  const portfolioId = process.argv[2] || 'PORTFOLIO_002';
  console.log(`\nAnalyzing ${portfolioId}...\n`);

  const agent = new AdvisorAgent();
  const briefing = await agent.generateBriefing(portfolioId);

  console.log("=== FINANCIAL ADVISOR BRIEFING ===\n");
  console.log(`Portfolio: ${briefing.portfolio_id}\n`);
  console.log(`Summary:\n${briefing.summary}\n`);

  if (briefing.key_insights.length > 0) {
    console.log("Key Insights:");
    briefing.key_insights.forEach(insight => console.log(`• ${insight}`));
    console.log();
  }

  if (briefing.causal_links.length > 0) {
    console.log("Causal Links:");
    briefing.causal_links.slice(0, 3).forEach(link => {
      console.log(`• ${link.sector}: ${link.explanation} (Impact: ${link.impact.toFixed(2)}, Confidence: ${(link.confidence * 100).toFixed(1)}%)`);
    });
    console.log();
  }

  if (briefing.recommendations.length > 0) {
    console.log("Recommendations:");
    briefing.recommendations.forEach(rec => console.log(`• ${rec}`));
    console.log();
  }

  console.log(`Confidence Score: ${(briefing.confidence_score * 100).toFixed(1)}%`);
  console.log(`Reasoning Quality Score: ${(briefing.reasoning_quality_score * 10).toFixed(1)}/10`);
}

main().catch(console.error);