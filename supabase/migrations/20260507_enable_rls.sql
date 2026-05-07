-- Security Migration: Enable RLS and implement user-based access control
-- This migration addresses candidates identified in the security scan report.

DO $$ 
DECLARE 
    table_list text[] := ARRAY[
        'workspaces', 'brand_kits', 'drafts', 'app_settings', 'chat_threads', 
        'user_state', 'system_configs', 'evolution_logs', 'approval_queue', 
        'orchestration_plans', 'content_performance', 'performance_insights', 
        'autonomous_plans', 'plan_steps', 'agent_action_logs', 'agent_vector_memory', 
        'social_posts', 'user_secrets', 'posts_queue'
    ];
    t text;
BEGIN 
    FOREACH t IN ARRAY table_list LOOP
        -- 1. Enable RLS if the table exists
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = t) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            
            -- 2. Check if user_id column exists before applying policy
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = t AND column_name = 'user_id'
            ) THEN
                -- Drop existing policy if it exists to avoid duplicates
                EXECUTE format('DROP POLICY IF EXISTS "User can only access their own data" ON %I', t);
                
                -- Create policy using auth.uid() cast to text to match the user_id column type
                EXECUTE format('CREATE POLICY "User can only access their own data" ON %I FOR ALL USING (auth.uid()::text = user_id)', t);
            END IF;
        END IF;
    END LOOP;
END $$;
