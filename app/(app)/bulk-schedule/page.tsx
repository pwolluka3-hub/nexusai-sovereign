'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { scheduleBulkPosts, parseBulkCSV, type BulkScheduleInput } from '@/lib/services/bulkScheduleService';

export default function BulkSchedulePage() {
  const [parsedPosts, setParsedPosts] = useState<Array<BulkScheduleInput & { schedule_date?: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const downloadTemplate = () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const isoDate = (date: Date) => date.toISOString().slice(0, 10);

    const template = `text,image_url,platforms,schedule_date,time,hashtags
"Your post text here","https://example.com/image.jpg","twitter,instagram,linkedin","${isoDate(tomorrow)}","10:00","#marketing #ai"
"Another post","","twitter","${isoDate(dayAfter)}","14:00","#content"`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_schedule_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;

      try {
        const { posts, validationErrors } = await parseBulkCSV(csv);
        setParsedPosts(posts);
        setErrors(validationErrors);
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Failed to parse CSV']);
      }
    };
    reader.readAsText(file);
  };

  const handleScheduleAll = async () => {
    if (parsedPosts.length === 0) return;

    setUploading(true);
    try {
      const normalizedPosts = parsedPosts.map((post, index) => {
        const fallbackDate = post.schedule_date ? new Date(post.schedule_date) : null;
        return {
          id: post.id || `bulk_${Date.now()}_${index}`,
          content: post.content || post.text || '',
          text: post.text || post.content || '',
          platforms: post.platforms,
          scheduledAt:
            post.scheduledAt ||
            (fallbackDate && !Number.isNaN(fallbackDate.getTime()) ? fallbackDate.toISOString() : undefined),
          imageUrl: post.imageUrl,
          hashtags: post.hashtags,
          status: post.status || 'pending',
        };
      });
      const results = await scheduleBulkPosts(normalizedPosts);
      setErrors([
        `Provider accepted ${results.successful} out of ${results.total} posts.${results.failed > 0 ? ` ${results.failed} failed.` : ''}`,
        ...results.errors,
      ]);
      if (results.failed === 0) {
        setParsedPosts([]);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to schedule posts']);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Upload className="w-8 h-8 text-[var(--nexus-cyan)]" />
          Bulk Schedule
        </h1>
        <p className="text-muted-foreground mt-1">Schedule multiple posts at once using CSV</p>
      </div>

      <GlassCard className="p-6 border border-[var(--nexus-cyan)]/30">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Upload CSV File</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Download the template below, fill in your posts, and upload to schedule them all at once.
            </p>
          </div>

          <div className="flex gap-2">
            <NeonButton onClick={downloadTemplate} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </NeonButton>
          </div>

          <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-[var(--nexus-cyan)]/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm font-medium">Click to upload CSV or drag and drop</p>
            </label>
          </div>
        </div>
      </GlassCard>

      {errors.length > 0 && (
        <GlassCard className={`p-4 border ${errors[0].includes('Provider accepted') && !errors[0].includes('failed') ? 'border-[var(--nexus-success)]/30 bg-[var(--nexus-success)]/5' : 'border-[var(--nexus-error)]/30 bg-[var(--nexus-error)]/5'}`}>
          <div className="flex gap-2">
            {errors[0].includes('Provider accepted') && !errors[0].includes('failed') ? (
              <CheckCircle2 className="w-5 h-5 text-[var(--nexus-success)]" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[var(--nexus-error)]" />
            )}
            <div className="flex-1">
              {errors.map((error, i) => (
                <p key={i} className="text-sm">{error}</p>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {parsedPosts.length > 0 && (
        <GlassCard className="p-6 border border-border/50">
          <h2 className="text-lg font-semibold mb-4">Preview ({parsedPosts.length} posts)</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {parsedPosts.map((post, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm mb-2">{post.text}</p>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-[var(--nexus-cyan)]/20 text-[var(--nexus-cyan)]">
                    {post.platforms.join(', ')}
                  </span>
                  <span className="px-2 py-1 rounded bg-muted/50 text-muted-foreground">
                    {post.schedule_date
                      ? new Date(post.schedule_date).toLocaleDateString()
                      : post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleDateString()
                      : 'No date'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <NeonButton
            onClick={handleScheduleAll}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? 'Scheduling...' : `Schedule All ${parsedPosts.length} Posts`}
          </NeonButton>
        </GlassCard>
      )}
    </div>
  );
}
