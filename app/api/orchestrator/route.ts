// Orchestrator Service Entrypoint
// This wraps the orchestration engine into a standalone Vercel Service.

import { orchestrate, type OrchestrationOptions } from '@/lib/services/orchestrationEngine';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function handler(request: NextRequest) {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // 1. Authentication Guard
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userRequest, options } = body;

    if (!userRequest) {
      return NextResponse.json({ error: 'userRequest is required' }, { status: 400 });
    }

    // The orchestrate function should ideally also take the userId for context-aware orchestration
    const result = await orchestrate(userRequest, options || { requestType: 'content' });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Orchestration Error' }, { status: 500 });
  }
}
