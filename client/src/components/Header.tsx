import React from 'react';
import { PlusCircle, Sparkles } from 'lucide-react';
import { NavigationTab } from '../types';

interface HeaderProps {
  activeTab: NavigationTab;
  onNewRequestClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onNewRequestClick }) => {
  const titles: Record<NavigationTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Procurement Overview',
      subtitle: 'Monitor active purchase requests, budget allocation, and recent workflow audits.',
    },
    'new-request': {
      title: 'New Purchase Request',
      subtitle: 'Specify purchasing requirements to trigger catalog option evaluation & trade-off analysis.',
    },
    catalog: {
      title: 'Vendor Product Catalog',
      subtitle: 'Explore pre-negotiated demo supplier products, hardware inventory, and commercial subscriptions.',
    },
    history: {
      title: 'Purchase History & Audits',
      subtitle: 'Track lifecycle states from initial drafting to approval and simulated payment settlement.',
    },
    settings: {
      title: 'Procurement Settings & Policy',
      subtitle: 'Configure departmental spending caps, preferred suppliers, and auto-approval thresholds.',
    },
  };

  const current = titles[activeTab];

  return (
    <header className="bg-[#FBF9F5] border-b-2 border-neutral-900 px-4 py-4 sm:px-8 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex min-w-0 items-start sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cobalt-700 bg-cobalt-50 px-2 py-0.5 border border-cobalt-600">
                PayPal AI Hackathon
              </span>
              <span className="text-xs font-mono text-neutral-500">•</span>
              <span className="hidden sm:inline text-xs font-mono text-neutral-600">Demo Organization Workspace</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              {current.title}
            </h1>
            <p className="text-sm text-neutral-600 mt-1 max-w-2xl leading-snug">{current.subtitle}</p>
          </div>
        </div>

        {activeTab !== 'new-request' && (
          <button
            onClick={onNewRequestClick}
            className="inline-flex w-full sm:w-auto items-center justify-center space-x-2 px-5 py-2.5 bg-cobalt-700 text-white font-bold text-sm border-2 border-neutral-900 shadow-brutal brutal-btn hover:bg-cobalt-800"
            id="header-create-request-btn"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Purchase Request</span>
          </button>
        )}

        {activeTab === 'new-request' && (
          <div className="hidden sm:flex items-center space-x-2 px-3.5 py-2 bg-amber-50 border-2 border-neutral-900 text-xs font-medium text-amber-950 shadow-brutal-xs">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Pre-evaluation against local demo catalog</span>
          </div>
        )}
      </div>
    </header>
  );
};
