'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RuntimeIssue {
  code: string;
  severity: 'fatal' | 'warning';
  message: string;
}

interface RuntimeState {
  ready: boolean;
  issues: RuntimeIssue[];
}

function installAbortSignalTimeoutPolyfill(): void {
  if (typeof AbortSignal === 'undefined' || typeof AbortController === 'undefined') return;
  if (typeof AbortSignal.timeout === 'function') return;

  AbortSignal.timeout = (ms: number) => {
    const controller = new AbortController();
    window.setTimeout(() => {
      const reason = typeof DOMException === 'function'
        ? new DOMException('TimeoutError', 'TimeoutError')
        : undefined;
      controller.abort(reason);
    }, ms);
    return controller.signal;
  };
}

function probeLocalStorage(): boolean {
  try {
    const key = `nexus:runtime:${Date.now()}`;
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function hasRequiredBrowserApis(): boolean {
  return (
    typeof fetch === 'function' &&
    typeof Promise === 'function' &&
    typeof URL === 'function' &&
    typeof Blob === 'function' &&
    typeof AbortController === 'function'
  );
}

function assessRuntime(): RuntimeIssue[] {
  const issues: RuntimeIssue[] = [];
  const protocol = window.location.protocol;

  installAbortSignalTimeoutPolyfill();

  if (protocol === 'file:') {
    issues.push({
      code: 'file-protocol',
      severity: 'fatal',
      message: 'This build must run from an http or https origin. Browser storage, service workers, auth popups, and provider calls are not reliable from file URLs.',
    });
  } else if (protocol !== 'http:' && protocol !== 'https:') {
    issues.push({
      code: 'unsupported-protocol',
      severity: 'fatal',
      message: `Unsupported browser protocol: ${protocol}`,
    });
  }

  if (!hasRequiredBrowserApis()) {
    issues.push({
      code: 'missing-browser-apis',
      severity: 'fatal',
      message: 'This browser is missing required runtime APIs for NexusAI.',
    });
  }

  if (!probeLocalStorage()) {
    issues.push({
      code: 'storage-blocked',
      severity: 'fatal',
      message: 'Site storage is blocked. Enable browser site data or use a normal hosted/dev URL before starting NexusAI.',
    });
  }

  if (!('serviceWorker' in navigator)) {
    issues.push({
      code: 'service-worker-unavailable',
      severity: 'warning',
      message: 'Service workers are unavailable in this browser context. Live app behavior can still run, but offline recovery is limited.',
    });
  }

  if (!('indexedDB' in window)) {
    issues.push({
      code: 'indexeddb-unavailable',
      severity: 'warning',
      message: 'IndexedDB is unavailable in this browser context.',
    });
  }

  return issues;
}

export default function RuntimeReadinessGate({ children }: { children: ReactNode }) {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    ready: false,
    issues: [],
  });

  useEffect(() => {
    const issues = assessRuntime();
    document.documentElement.dataset.nexusAppReady = 'true';
    setRuntimeState({ ready: true, issues });

    const warnings = issues.filter((issue) => issue.severity === 'warning');
    if (warnings.length > 0) {
      console.warn('[RuntimeReadinessGate] Non-fatal runtime limitations:', warnings);
    }
  }, []);

  const fatalIssues = useMemo(
    () => runtimeState.issues.filter((issue) => issue.severity === 'fatal'),
    [runtimeState.issues]
  );

  if (!runtimeState.ready) {
    return (
      <div
        data-nexus-runtime-gate
        className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"
      >
        <div className="text-sm text-muted-foreground">Starting NexusAI...</div>
      </div>
    );
  }

  if (fatalIssues.length > 0) {
    return (
      <div
        data-nexus-runtime-gate
        className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"
      >
        <div className="w-full max-w-xl rounded-lg border border-destructive/30 bg-card p-6 shadow-lg">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-md bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">NexusAI cannot start here</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                The browser context is blocking a required production runtime dependency.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {fatalIssues.map((issue) => (
              <div key={issue.code} className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                {issue.message}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
