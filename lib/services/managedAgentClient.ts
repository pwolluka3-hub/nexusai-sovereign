// Managed Agent API Client
// Handles interactions with Anthropic's Managed Agents API (beta)

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface ManagedSession {
  id: string;
  agentId: string;
  status: 'active' | 'idle' | 'terminated';
  createdAt: string;
}

export interface ManagedAgentResponse {
  content: string;
  reasoning: string;
  metadata: Record<string, unknown>;
  session_id: string;
}

export const ManagedAgentClient = {
  /**
   * Creates a new managed session for a specific agent and executes a prompt.
   * This is a high-level wrapper that handles session creation and messaging in one go.
   */
  async executeInSession(agentId: string, prompt: string, options: Record<string, any> = {}): Promise<ManagedAgentResponse> {
    try {
      // 1. Create a session for the agent
      // Note: In a real implementation, this calls POST /v1/sessions
      const sessionResponse = await fetch('/api/ai/managed-sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, ...options }),
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create managed session: ${sessionResponse.statusText}`);
      }

      const { sessionId } = await sessionResponse.json();

      // 2. Execute the prompt in the session
      // Note: In a real implementation, this calls POST /v1/sessions/{id}/messages
      const messageResponse = await fetch(`/api/ai/managed-sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!messageResponse.ok) {
        throw new Error(`Managed agent execution failed: ${messageResponse.statusText}`);
      }

      const data = await messageResponse.json();

      return {
        content: data.content,
        reasoning: data.reasoning || 'Managed agent execution',
        metadata: data.metadata || {},
        session_id: sessionId,
      };
    } catch (error) {
      // Throw error to be caught by the fallback mechanism in multiAgentService.ts
      throw error;
    }
  },

  /**
   * Terminates a session to free up ressources.
   */
  async terminateSession(sessionId: string): Promise<void> {
    await fetch(`/api/ai/managed-sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }
};
