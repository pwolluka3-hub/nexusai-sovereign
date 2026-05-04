import test from 'node:test';
import assert from 'node:assert/strict';
import { combineStructuredOutputs, parseCriticVerdict } from '../lib/services/orchestrationPrimitives.ts';

test('parseCriticVerdict accepts valid approve schema', () => {
  const verdict = parseCriticVerdict(`VERDICT: APPROVE
SCORE: 91
CRITIQUE: Strong hook, niche match, and clear pacing.
FIXES:
- Tighten line 3 wording`);

  assert.equal(verdict.schemaValid, true);
  assert.equal(verdict.verdict, 'approve');
  assert.equal(verdict.score, 91);
  assert.match(verdict.critique, /Strong hook/);
  assert.equal(verdict.fixes.length, 1);
});

test('parseCriticVerdict marks invalid schema when required fields are missing', () => {
  const verdict = parseCriticVerdict('Looks good overall, maybe improve tone.');

  assert.equal(verdict.schemaValid, false);
  assert.equal(verdict.verdict, 'unknown');
  assert.equal(verdict.score, null);
});

test('combineStructuredOutputs returns structured orchestration sections when specialized roles exist', () => {
  const outputs = [
    { agentId: '1', agentRole: 'planner', content: 'Plan A', score: 90, reasoning: '', metadata: {} },
    { agentId: '2', agentRole: 'identity', content: 'Identity B', score: 89, reasoning: '', metadata: {} },
    { agentId: '3', agentRole: 'rules', content: 'Rules C', score: 88, reasoning: '', metadata: {} },
    { agentId: '4', agentRole: 'structure', content: 'Structure D', score: 87, reasoning: '', metadata: {} },
    { agentId: '5', agentRole: 'generator', content: 'Content E', score: 92, reasoning: '', metadata: {} },
    { agentId: '6', agentRole: 'visual', content: 'Visual F', score: 86, reasoning: '', metadata: {} },
    { agentId: '7', agentRole: 'distribution', content: 'Distribution G', score: 85, reasoning: '', metadata: {} },
    { agentId: '8', agentRole: 'critic', content: 'VERDICT: APPROVE', score: 93, reasoning: '', metadata: {} },
  ];

  const merged = combineStructuredOutputs(outputs, 'merge');
  assert.match(merged, /Execution Plan/);
  assert.match(merged, /Identity/);
  assert.match(merged, /Rules/);
  assert.match(merged, /Structure/);
  assert.match(merged, /Content/);
  assert.match(merged, /Visual Prompts/);
  assert.match(merged, /Captions & Distribution/);
  assert.match(merged, /Critic Verdict/);
});
