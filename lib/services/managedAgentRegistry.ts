// Managed Agent Registry
// Maps agent roles to their corresponding Managed Agent IDs in the Anthropic API.

export type ManagedAgentRole = 
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
  | 'hybrid';

interface RegistryEntry {
  agentId: string;
  version?: string;
  description: string;
}

// In a production environment, these IDs would be managed via a config file or environment variables.
const ROLE_TO_AGENT_ID: Record<ManagedAgentRole, RegistryEntry> = {
  planner: { agentId: process.env.AGENT_ID_PLANNER || 'agent_planner_default', description: 'Strategic planning and task decomposition' },
  identity: { agentId: process.env.AGENT_ID_IDENTITY || 'agent_identity_default', description: 'Brand and persona modeling' },
  rules: { agentId: process.env.AGENT_ID_RULES || 'agent_rules_default', description: 'Constraint and rule generation' },
  structure: { agentId: process.env.AGENT_ID_STRUCTURE || 'agent_structure_default', description: 'Content structure and blueprinting' },
  generator: { agentId: process.env.AGENT_ID_GENERATOR || 'agent_generator_default', description: 'Core content production' },
  distribution: { agentId: process.env.AGENT_ID_DISTRIBUTION || 'agent_distribution_default', description: 'Platform formatting and packaging' },
  memory: { agentId: process.env.AGENT_ID_MEMORY || 'agent_memory_default', description: 'Continuity and memory extraction' },
  trend: { agentId: process.env.AGENT_ID_TREND || 'agent_trend_default', description: 'Trend optimization and engagement prediction' },
  writer: { agentId: process.env.AGENT_ID_WRITER || 'agent_writer_default', description: 'High-fidelity copywriting' },
  hook: { agentId: process.env.AGENT_ID_HOOK || 'agent_hook_default', description: 'Attention-grabbing hook creation' },
  strategist: { agentId: process.env.AGENT_ID_STRATEGIST || 'agent_strategist_default', description: 'High-level content strategy' },
  optimizer: { agentId: process.env.AGENT_ID_OPTIMIZER || 'agent_optimizer_default', description: 'Content refinement and polishing' },
  critic: { agentId: process.env.AGENT_ID_CRITIC || 'agent_critic_default', description: 'Quality control and critical review' },
  visual: { agentId: process.env.AGENT_ID_VISUAL || 'agent_visual_default', description: 'Visual direction and asset briefing' },
  hashtag: { agentId: process.env.AGENT_ID_HASHTAG || 'agent_hashtag_default', description: 'Hashtag research and optimization' },
  engagement: { agentId: process.env.AGENT_ID_ENGAGEMENT || 'agent_engagement_default', description: 'Engagement analytics and prediction' },
  hybrid: { agentId: process.env.AGENT_ID_HYBRID || 'agent_hybrid_default', description: 'Multi-disciplinary hybrid agent' },
};

export const ManagedAgentRegistry = {
  getAgentId(role: ManagedAgentRole): string {
    const entry = ROLE_TO_AGENT_ID[role];
    if (!entry) {
      throw new Error(`No managed agent configured for role: ${role}`);
    }
    return entry.agentId;
  },

  getAgentDescription(role: ManagedAgentRole): string {
    return ROLE_TO_AGENT_ID[role].description;
  },

  getAllMappedRoles(): ManagedAgentRole[] {
    return Object.keys(ROLE_TO_AGENT_ID) as ManagedAgentRole[];
  }
};
