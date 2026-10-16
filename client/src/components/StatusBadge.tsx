import React from 'react';
import { RequestStatus } from '../types';
import { Clock, CheckCircle2, AlertCircle, FileText, XCircle, CreditCard } from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configMap: Record<
    RequestStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    draft: {
      label: 'Draft',
      bg: 'bg-neutral-100',
      text: 'text-neutral-800',
      border: 'border-neutral-800',
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    pending_approval: {
      label: 'Pending Approval',
      bg: 'bg-amber-100',
      text: 'text-amber-950',
      border: 'border-amber-900',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    approved: {
      label: 'Approved',
      bg: 'bg-cobalt-100',
      text: 'text-cobalt-900',
      border: 'border-cobalt-800',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    paid: {
      label: 'Paid (Demo)',
      bg: 'bg-emerald-100',
      text: 'text-emerald-950',
      border: 'border-emerald-900',
      icon: <CreditCard className="w-3.5 h-3.5" />,
    },
    failed: {
      label: 'Failed',
      bg: 'bg-rose-100',
      text: 'text-rose-950',
      border: 'border-rose-900',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-stone-200',
      text: 'text-stone-700',
      border: 'border-stone-500',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const current = configMap[status] || configMap.draft;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-none border-2 ${current.border} ${current.bg} ${current.text} shadow-brutal-xs uppercase tracking-wider font-mono`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
