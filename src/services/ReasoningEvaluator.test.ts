import test from 'node:test';
import assert from 'node:assert/strict';
import type { AgentBriefing } from '../models/types.js';
import { ReasoningEvaluator } from './ReasoningEvaluator.js';

function makeBriefing(overrides: Partial<AgentBriefing> = {}): AgentBriefing {
  return {
    portfolio_id: 'PORTFOLIO_001',
    summary: 'Test summary',
    key_insights: ['a', 'b', 'c'],
    causal_links: [
      {
        news_id: 'N1',
        sector: 'BANKING',
        impact: 1.2,
        explanation: 'link1',
        confidence: 0.8
      },
      {
        news_id: 'N2',
        sector: 'IT',
        impact: -0.8,
        explanation: 'link2',
        confidence: 0.7
      },
      {
        news_id: 'N3',
        sector: 'ENERGY',
        impact: 0.5,
        explanation: 'link3',
        confidence: 0.6
      }
    ],
    recommendations: ['Do X'],
    confidence_score: 0.5,
    reasoning_quality_score: 0.8,
    ...overrides
  };
}

test('ReasoningEvaluator returns strong score for rich causal briefing', () => {
  const evaluator = new ReasoningEvaluator();
  const evalResult = evaluator.evaluate(makeBriefing());

  assert.ok(evalResult.score >= 8.0);
  assert.equal(evalResult.component_scores.causality, 9);
  assert.equal(evalResult.component_scores.prioritization, 8);
});

test('ReasoningEvaluator identifies weak causal depth', () => {
  const evaluator = new ReasoningEvaluator();
  const evalResult = evaluator.evaluate(
    makeBriefing({
      causal_links: [],
      key_insights: ['one'],
      recommendations: []
    })
  );

  assert.ok(evalResult.score < 7.0);
  assert.equal(evalResult.component_scores.causality, 4);
  assert.match(evalResult.rationale, /shallow/i);
});

test('ReasoningEvaluator rewards conflict handling when ambiguity exists', () => {
  const evaluator = new ReasoningEvaluator();
  const evalResult = evaluator.evaluate(
    makeBriefing({
      causal_links: [
        {
          news_id: 'N1',
          sector: 'BANKING',
          impact: 1.2,
          explanation: 'link1',
          confidence: 0.8,
          ambiguity_note: 'signal conflict'
        },
        {
          news_id: 'N2',
          sector: 'BANKING',
          impact: -0.8,
          explanation: 'link2',
          confidence: 0.7
        },
        {
          news_id: 'N3',
          sector: 'IT',
          impact: 0.5,
          explanation: 'link3',
          confidence: 0.6
        }
      ]
    })
  );

  assert.equal(evalResult.component_scores.conflict_handling, 9);
  assert.match(evalResult.rationale, /conflicting signal handling/i);
});
