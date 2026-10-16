import React from 'react';
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { HealthCheckResult } from '../services/api';

interface HealthBadgeProps {
  result: HealthCheckResult | null;
  loading: boolean;
  onRefresh: () => void;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ result, loading, onRefresh }) => {
  const isHealthy = result?.data?.status === 'healthy';
  const hasError = !!result?.error;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl" id="backend-health-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${
            loading ? 'bg-indigo-500/10 text-indigo-400' :
            isHealthy ? 'bg-emerald-500/10 text-emerald-400' : 
            'bg-rose-500/10 text-rose-400'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
              Backend Health Status
              <span className="text-xs font-mono font-normal text-slate-400 px-2 py-0.5 rounded-full bg-slate-800/60">
                GET /api/health
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified through Vite development reverse proxy
            </p>
          </div>
        </div>

        <button
          id="btn-refresh-health"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-600/20"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Checking...' : 'Ping Endpoint'}</span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Pill */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center space-x-3.5">
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          ) : isHealthy ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <div>
            <div className="text-xs font-medium text-slate-400">Connection</div>
            <div className="text-sm font-semibold capitalize mt-0.5 flex items-center gap-2">
              <span className={
                loading ? 'text-indigo-400' : 
                isHealthy ? 'text-emerald-400' : 'text-rose-400'
              }>
                {loading ? 'Connecting...' : isHealthy ? 'API Online (200 OK)' : 'Offline / Error'}
              </span>
            </div>
          </div>
        </div>

        {/* Latency */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Roundtrip Latency</div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">
            {result ? `${result.latencyMs} ms` : '—'}
          </div>
        </div>

        {/* Service & Environment */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Service / Env</div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">
            {result?.data ? `${result.data.service} (${result.data.environment})` : '—'}
          </div>
        </div>
      </div>

      {/* Diagnostics / Details */}
      {result?.data && (
        <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900/30">
            <span className="text-slate-400">Uptime:</span>{' '}
            <span className="font-mono text-slate-200">{result.data.uptimeSeconds}s</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/30">
            <span className="text-slate-400">Node:</span>{' '}
            <span className="font-mono text-slate-200">{result.data.system.nodeVersion}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/30">
            <span className="text-slate-400">Platform:</span>{' '}
            <span className="font-mono text-slate-200">{result.data.system.platform}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/30">
            <span className="text-slate-400">Heap Used:</span>{' '}
            <span className="font-mono text-slate-200">{result.data.system.memoryMb.heapUsed} MB</span>
          </div>
        </div>
      )}

      {hasError && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Error connecting to backend: <strong>{result?.error}</strong>. Ensure the server is running on port 5000.</span>
        </div>
      )}
    </div>
  );
};
