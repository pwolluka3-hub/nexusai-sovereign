export type OrchestrationAgentRole =
  | 'planner'
  | 'identity'
  | 'rules'
  | 'structure'
  | 'generator'
  | 'distribution'
  | 'memory'
  | 'trend'
  | 'writer'
  | 'hook'
  | 'strategist'
  | 'optimizer'
  | 'critic'
  | 'visual'
  | 'hashtag'
  | 'engagement'
  | 'hybrid'
  | 'automation';

export interface OrchestrationAgentOutput {
  agentRole: OrchestrationAgentRole;
  content: string;
  score: number;
}

export interface CriticVerdict {
  verdict: 'approve' | 'reject' | 'unknown';
  score: number | null;
  critique: string;
  fixes: string[];
}

export const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['approve', 'reject', 'unknown'] },
    score: { type: 'number', description: 'Quality score 0-100' },
    critique: { type: 'string', description: 'Detailed critique of the content' },
    fixes: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'List of specific required fixes' 
    },
  },
  required: ['verdict', 'score', 'critique', 'fixes'],
};

export interface PlanSchema {
  userRequest: string;
  subtasks: {
    id: string;
    type: OrchestrationAgentRole;
    input: string;
    dependencies: string[];
  }[];
  parallelGroups: string[][];
  aggregationStrategy: 'best_score' | 'combine' | 'vote' | 'weighted';
}

export const PLANNER_SCHEMA = {
  type: 'object',
  properties: {
    userRequest: { type: 'string' },
    subtasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: Object.values(getAgentRoles()).join(',') }, // Note: This is conceptual, will use actual roles
          input: { type: 'string' },
          dependencies: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'type', 'input', 'dependencies'],
      },
    },
    parallelGroups: {
      type: 'array',
      items: { type: 'array', items: { type: 'string' } },
    },
    aggregationStrategy: { type: 'string', enum: ['best_score', 'combine', 'vote', 'weighted'] },
  },
  required: ['userRequest', 'subtasks', 'parallelGroups', 'aggregationStrategy'],
};

// Helper for the schema enum
function getAgentRoles() {
  return {
    planner: 'planner', identity: 'identity', rules: 'rules', structure: 'structure',
    generator: 'generator', distribution: 'distribution', memory: 'memory', trend: 'trend',
    writer: 'writer', hook: 'hook', strategist: 'strategist', optimizer: 'optimizer',
    critic: 'critic', visual: 'visual', hashtag: 'hashtag', engagement: 'engagement',
    hybrid: 'hybrid', automation: 'automation'
  };
}

export function parseCriticVerdict(content: string): CriticVerdict & { schemaValid: boolean } {
  try {
    const parsed = JSON.parse(content);
    return {
      ...parsed,
      schemaValid: true,
    };
  } catch {
    // Fallback to old regex parser for backward compatibility during migration
    const raw = (content || '').trim();
    if (!raw) return { verdict: 'unknown', score: null, critique: '', fixes: [], schemaValid: false };

    const verdictMatch = raw.match(/(?:^|\n)\s*(?:verdict|final verdict)\s*:\s*(approve|reject)\b/i);
    const scoreMatch = raw.match(/(?:^|\n)\s*score\s*:\s*(\d{1,3})\b/i);
    const critiqueMatch = raw.match(/(?:^|\n)\s*critique\s*:\s*([\s\S]*?)(?=\n\s*fixes\s*:|$)/i);
    const fixesMatch = raw.match(/(?:^|\n)\s*fixes\s*:\s*([\s\S]*)$/i);

    const verdict = (verdictMatch?.[1] || '').toLowerCase() as 'approve' | 'reject' | '';
    const score = scoreMatch ? Number.parseInt(scoreMatch[1], 10) : null;
    const critique = (critiqueMatch?.[1] || '').trim();
    const fixesRaw = (fixesMatch?.[1] || '').trim();
    const fixes = fixesRaw.split('\n').map((line) => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);

    return {
      verdict: verdict || 'unknown',
      score: Number.isFinite(score) ? score : null,
      critique,
      fixes,
      schemaValid: false,
    };
  }
}

export function combineStructuredOutputs(
  outputs: OrchestrationAgentOutput[],
  strategy: 'merge' | 'sections'
): string {
  if (outputs.length === 0) return '';
  if (outputs.length === 1) return outputs[0].content;

  const bestByRole = (role: OrchestrationAgentRole): OrchestrationAgentOutput | undefined =>
    outputs
      .filter((output) => output.agentRole === role && output.content.trim().length > 0)
      .sort((a, b) => b.score - a.score)[0];

  const planner = bestByRole('planner');
  const identity = bestByRole('identity');
  const rules = bestByRole('rules');
  const structure = bestByRole('structure');
  const generator = bestByRole('generator') || bestByRole('writer');
  const visual = bestByRole('visual');
  const distribution = bestByRole('distribution') || bestByRole('hashtag');
  const critic = bestByRole('critic');

  if (planner || identity || rules || structure || generator || distribution || visual || critic) {
    const sections: string[] = [];
    if (planner?.content) sections.push(`Execution Plan\n${planner.content}`);
    if (identity?.content) sections.push(`Identity\n${identity.content}`);
    if (rules?.content) sections.push(`Rules\n${rules.content}`);
    if (structure?.content) sections.push(`Structure\n${structure.content}`);
    if (generator?.content) sections.push(`Content\n${generator.content}`);
    if (visual?.content) sections.push(`Visual Prompts\n${visual.content}`);
    if (distribution?.content) sections.push(`Captions & Distribution\n${distribution.content}`);
    if (critic?.content) sections.push(`Critic Verdict\n${critic.content}`);
    if (sections.length > 0) return sections.join('\n\n');
  }

  if (strategy === 'sections') {
    return outputs.map((output) => `[${output.agentRole.toUpperCase()}]\n${output.content}`).join('\n\n');
  }

  const hookOutput = outputs.find((output) => output.agentRole === 'hook');
  const bodyOutput = outputs.find((output) => output.agentRole === 'writer');
  const hashtagOutput = outputs.find((output) => output.agentRole === 'hashtag');

  let result = '';
  if (hookOutput) result += `${hookOutput.content}\n\n`;
  if (bodyOutput) result += bodyOutput.content;
  if (hashtagOutput) result += `\n\n${hashtagOutput.content}`;

  return result.trim();
}
