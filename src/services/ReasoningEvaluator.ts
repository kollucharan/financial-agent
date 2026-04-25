import type { AgentBriefing, ReasoningEvaluation } from '../models/types.js';

export class ReasoningEvaluator {
  public evaluate(briefing: AgentBriefing): ReasoningEvaluation {
    const hasCausalDepth = briefing.causal_links.length >= 3;
    const hasPrioritization = briefing.key_insights.length >= 3;
    const conflictMentions = briefing.causal_links.filter(link => Boolean(link.ambiguity_note)).length;
    const hasActionableAdvice = briefing.recommendations.length >= 1;

    const causality = hasCausalDepth ? 9 : briefing.causal_links.length >= 1 ? 7 : 4;
    const prioritization = hasPrioritization ? 8 : briefing.key_insights.length >= 1 ? 6 : 4;
    const conflictHandling = conflictMentions > 0 ? 9 : 6;
    const actionability = hasActionableAdvice ? 8 : 5;

    const total = (causality * 0.4 + prioritization * 0.25 + conflictHandling * 0.2 + actionability * 0.15);

    const rationale = this.buildRationale({
      hasCausalDepth,
      hasPrioritization,
      conflictMentions,
      hasActionableAdvice
    });

    return {
      score: Number(total.toFixed(1)),
      rationale,
      component_scores: {
        causality,
        prioritization,
        conflict_handling: conflictHandling,
        actionability
      }
    };
  }

  private buildRationale(input: {
    hasCausalDepth: boolean;
    hasPrioritization: boolean;
    conflictMentions: number;
    hasActionableAdvice: boolean;
  }): string {
    const notes: string[] = [];

    notes.push(
      input.hasCausalDepth
        ? 'Causal chain coverage is strong with multiple ranked links.'
        : 'Causal chain coverage is shallow and should include more links.'
    );
    notes.push(
      input.hasPrioritization
        ? 'High-impact items are prioritized in the top insights.'
        : 'Prioritization can improve by focusing on top impact drivers.'
    );
    notes.push(
      input.conflictMentions > 0
        ? 'Conflicting signal handling is explicitly explained.'
        : 'No explicit conflicting-signal explanation was detected.'
    );
    notes.push(
      input.hasActionableAdvice
        ? 'Recommendations are present and practical.'
        : 'Recommendations are weak or missing.'
    );

    return notes.join(' ');
  }
}
