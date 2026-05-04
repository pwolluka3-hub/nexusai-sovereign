'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { LoadingPulse } from '@/components/nexus/LoadingPulse';
import Link from 'next/link';
import { loadBrandKit, loadSchedule } from '@/lib/services/memoryService';
import type { BrandKit } from '@/lib/types';

interface QuickAction {
  title: string;
  description: string;
  action: string;
}

function buildQuickActions(brand: BrandKit | null, scheduledCount: number): QuickAction[] {
  const actions: QuickAction[] = [];

  if (!brand?.brandName || !brand?.niche || (brand?.contentPillars?.length || 0) === 0) {
    actions.push({
      title: 'Complete Brand Setup',
      description: 'Finish configuring your brand profile and content pillars',
      action: '/brand',
    });
  }

  actions.push({
    title: 'Generate Content',
    description: scheduledCount > 0
      ? `Create your next post (${scheduledCount} already scheduled)`
      : 'Create your first post for your primary platform',
    action: '/studio',
  });

  actions.push({
    title: scheduledCount > 0 ? 'Manage Schedule' : 'Plan Schedule',
    description: scheduledCount > 0
      ? 'Review and adjust upcoming scheduled posts'
      : 'Set up your first scheduled post in the calendar',
    action: '/calendar',
  });

  if (actions.length < 3) {
    actions.push({
      title: 'Connect Publishing',
      description: 'Configure Ayrshare and provider keys in Settings',
      action: '/settings',
    });
  }

  return actions.slice(0, 3);
}

export default function DashboardPage() {
  const { user, isGuest, login } = useAuth();
  const [dailyActions, setDailyActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [isConnectingPuter, setIsConnectingPuter] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [brand, schedule] = await Promise.all([
          loadBrandKit(),
          loadSchedule(),
        ]);
        setBrandKit(brand);
        setDailyActions(buildQuickActions(brand, schedule.length));
      } catch (error) {
        console.error('[v0] Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleConnectPuter = async () => {
    if (isConnectingPuter) return;

    setIsConnectingPuter(true);
    try {
      await login();
    } catch (error) {
      console.error('[Dashboard] Puter connect failed:', error);
    } finally {
      setIsConnectingPuter(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-primary to-violet-900/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Welcome back, <span className="text-cyan">{brandKit?.brandName || user?.username || 'Guest'}</span>
          </h1>
          <p className="text-gray-400">Your AI content command center</p>
        </div>

        {isGuest && (
          <GlassCard className="p-6 mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Connect Puter Later</h2>
                <p className="text-sm text-gray-400 max-w-2xl">
                  You entered in guest mode. Core setup works, but Puter-backed storage and account features stay limited until you connect it.
                </p>
              </div>
              <NeonButton
                onClick={handleConnectPuter}
                loading={isConnectingPuter}
                className="md:min-w-48"
              >
                {isConnectingPuter ? 'Connecting...' : 'Connect Puter'}
              </NeonButton>
            </div>
          </GlassCard>
        )}

        {/* Quick Stats */}
        {brandKit && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <GlassCard className="p-6">
              <div className="text-cyan text-sm font-semibold mb-2">BRAND NICHE</div>
              <p className="text-2xl font-bold text-white">{brandKit.niche}</p>
            </GlassCard>
            <GlassCard className="p-6">
              <div className="text-violet text-sm font-semibold mb-2">TONE</div>
              <p className="text-2xl font-bold text-white capitalize">{brandKit.tone}</p>
            </GlassCard>
            <GlassCard className="p-6">
              <div className="text-success text-sm font-semibold mb-2">CONTENT PILLARS</div>
              <p className="text-xl font-bold text-white">{brandKit.contentPillars?.length || 0}</p>
            </GlassCard>
          </div>
        )}

        {/* Daily Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <LoadingPulse />
            ) : (
              dailyActions.map((action, idx) => (
                <GlassCard key={idx} className="p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 flex-1">{action.description}</p>
                  <Link href={action.action} className="w-full">
                    <NeonButton className="w-full">
                      Go
                    </NeonButton>
                  </Link>
                </GlassCard>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Getting Started</h2>
          <GlassCard className="p-8">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-cyan/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-cyan text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Set up your brand kit</h3>
                  <p className="text-gray-400 text-sm">Define your niche, tone, and content pillars</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-violet/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-violet text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Connect your social platforms</h3>
                  <p className="text-gray-400 text-sm">Head to Settings to add your Ayrshare API key</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-success text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Generate your first post</h3>
                  <p className="text-gray-400 text-sm">Visit Content Studio to create AI-powered content</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
