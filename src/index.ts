#!/usr/bin/env node

import { AdvisorAgent } from './agent/AdvisorAgent.js';

async function main() {
  const portfolioId = process.argv[2] || 'PORTFOLIO_001';
  const agent = new AdvisorAgent();

  try {
    const briefing = await agent.generateBriefing(portfolioId);

    console.log('\n=== FINANCIAL ADVISOR BRIEFING ===');
    console.log(`\nPortfolio: ${briefing.portfolio_id}`);
    console.log(`\nSummary:\n${briefing.summary}`);

    console.log('\nKey Insights:');
    briefing.key_insights.forEach(item => {
      console.log(`- ${item}`);
    });

    console.log('\nCausal Links:');
    briefing.causal_links.forEach(link => {
      console.log(
        `- ${link.sector}: ${link.explanation} | impact ${link.impact.toFixed(2)} | confidence ${(link.confidence * 100).toFixed(1)}%`
      );
      if (link.ambiguity_note) {
        console.log(`  ambiguity: ${link.ambiguity_note}`);
      }
    });

    console.log('\nRecommendations:');
    briefing.recommendations.forEach(item => {
      console.log(`- ${item}`);
    });

    console.log(`\nConfidence Score: ${(briefing.confidence_score * 100).toFixed(1)}%`);
    console.log(`Reasoning Quality Score: ${(briefing.reasoning_quality_score * 10).toFixed(1)}/10`);
    if (briefing.reasoning_evaluation) {
      console.log(`Evaluation Rationale: ${briefing.reasoning_evaluation.rationale}`);
    }
    console.log('');
  } catch (error) {
    console.error('Error generating briefing:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
