import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Receipt,
  Settings,
  Server,
  Activity,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { NavigationTab } from '../types';
import { HealthCheckResult } from '../services/api';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  healthResult: HealthCheckResult | null;
  loadingHealth: boolean;
  onRefreshHealth: () => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  healthResult,
  loadingHealth,
  onRefreshHealth,
  mobileOpen,
  onToggleMobile,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'new-request',
      label: 'New Request',
      icon: <PlusCircle className="w-5 h-5" />,
      badge: 'Action',
    },
    {
      id: 'catalog',
      label: 'Catalog',
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'history',
      label: 'Purchase History',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const isHealthy = healthResult?.data?.status === 'healthy';

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#FBF9F5] border-b-2 border-neutral-900 sticky top-0 z-40">
        <a href="/" className="flex items-center space-x-3 group cursor-pointer" title="Return to Landing Page">
          <div className="w-10 h-10 rounded-lg border-2 border-neutral-900 bg-white p-0.5 shadow-brutal-xs flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
            <img
              src="/procura-icon.png"
              alt="Procura AI Logo"
              className="w-full h-full object-contain scale-120"
            />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-neutral-900 group-hover:text-cobalt-700 transition-colors">PROCURA AI</span>
            <span className="ml-2 text-[10px] font-mono font-bold uppercase bg-amber-200 text-amber-950 px-1.5 py-0.5 border border-neutral-900">
              Demo
            </span>
          </div>
        </a>
        <button
          onClick={onToggleMobile}
          className="p-2 border-2 border-neutral-900 bg-white shadow-brutal-xs brutal-btn"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar (Desktop Persistent & Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#FBF9F5] border-r-2 border-neutral-900 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between pb-6 border-b-2 border-neutral-900">
            <a href="/" className="flex items-center space-x-3 group cursor-pointer" title="Return to Landing Page">
              <div className="w-12 h-12 rounded-xl border-2 border-neutral-900 bg-white p-1 shadow-brutal-sm flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                <img
                  src="/procura-icon.png"
                  alt="Procura AI Logo"
                  className="w-full h-full object-contain scale-120"
                />
              </div>
              <div>
                <div className="font-extrabold text-lg tracking-tight text-neutral-900 group-hover:text-cobalt-700 transition-colors">PROCURA AI</div>
                <div className="text-[11px] font-mono text-neutral-600 tracking-wider">SMART PROCUREMENT</div>
              </div>
            </a>
            {mobileOpen && (
              <button
                onClick={onToggleMobile}
                className="lg:hidden p-1 border border-neutral-900 bg-white"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Environment Indicator Banner */}
          <div className="mt-4 p-3 bg-paper-200 border-2 border-neutral-900 shadow-brutal-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-amber-500 border border-neutral-900 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Demo Workspace
                </span>
              </div>
              <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 border border-neutral-900 text-neutral-700">
                Sandbox
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 mt-1 leading-tight">
              Preloaded simulated catalog & non-live demo records.
            </p>
          </div>

          {/* Nav Items */}
          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (mobileOpen) onToggleMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-bold border-2 transition-all ${
                    active
                      ? 'bg-cobalt-700 text-white border-neutral-900 shadow-brutal-sm translate-x-1'
                      : 'bg-white text-neutral-900 border-neutral-900 hover:bg-paper-200 shadow-brutal-xs hover:shadow-brutal-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${
                        active
                          ? 'bg-white text-cobalt-900 border-white'
                          : 'bg-cobalt-100 text-cobalt-900 border-cobalt-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Back to Landing Page CTA */}
          <div className="mt-4 pt-3 border-t border-neutral-900/15">
            <a
              href="/"
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-mono font-bold text-neutral-600 hover:text-neutral-900 bg-paper-100 hover:bg-paper-200 border border-neutral-900/20 shadow-brutal-xs transition-all"
              title="Return to Main Landing Page"
            >
              <div className="flex items-center space-x-2">
                <ArrowLeft className="w-3.5 h-3.5 text-cobalt-700" />
                <span>Return to Home</span>
              </div>
              <span className="text-[10px] uppercase text-neutral-400 font-semibold">Exit</span>
            </a>
          </div>
        </div>

        {/* Footer: Live Backend Status (Preserving Phase 1 Verification) */}
        <div className="p-4 m-4 bg-white border-2 border-neutral-900 shadow-brutal-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-cobalt-700" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-900">
                Backend API
              </span>
            </div>
            <button
              onClick={onRefreshHealth}
              disabled={loadingHealth}
              title="Ping backend GET /api/health"
              className="text-[11px] font-mono text-cobalt-700 hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              <Activity className={`w-3 h-3 ${loadingHealth ? 'animate-spin' : ''}`} />
              <span>Ping</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-200">
            <div className="flex items-center space-x-1.5">
              {loadingHealth ? (
                <div className="w-2.5 h-2.5 rounded-full border border-cobalt-700 border-t-transparent animate-spin" />
              ) : isHealthy ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span className="font-semibold text-neutral-800">
                {loadingHealth ? 'Checking...' : isHealthy ? 'Online (200 OK)' : 'Offline / Degraded'}
              </span>
            </div>
            {healthResult?.latencyMs !== undefined && (
              <span className="font-mono text-[11px] text-neutral-500">
                {healthResult.latencyMs}ms
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 truncate">
            Target: Express :5000 via Vite /api
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onToggleMobile}
          className="fixed inset-0 bg-neutral-900/40 z-40 lg:hidden"
        />
      )}
    </>
  );
};
