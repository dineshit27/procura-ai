export type DemoRole = 'admin' | 'procurement_manager' | 'finance_manager' | 'requester';

export interface DemoAccount {
  role: DemoRole;
  label: string;
  description: string;
  emailVariable: string;
  email?: string;
}

const value = (name: string): string | undefined => {
  const configured = import.meta.env[name];
  return typeof configured === 'string' && configured.trim() ? configured.trim() : undefined;
};

export const demoAccounts: DemoAccount[] = [
  { role: 'admin', label: 'Admin Demo', description: 'System administration and permitted settings.', emailVariable: 'VITE_DEMO_ADMIN_EMAIL', email: value('VITE_DEMO_ADMIN_EMAIL') },
  { role: 'procurement_manager', label: 'Procurement Demo', description: 'Purchase review and authorized approvals.', emailVariable: 'VITE_DEMO_PROCUREMENT_EMAIL', email: value('VITE_DEMO_PROCUREMENT_EMAIL') },
  { role: 'finance_manager', label: 'Finance Demo', description: 'Budget visibility and finance permissions.', emailVariable: 'VITE_DEMO_FINANCE_EMAIL', email: value('VITE_DEMO_FINANCE_EMAIL') },
  { role: 'requester', label: 'Requester Demo', description: 'Create requests and view permitted status.', emailVariable: 'VITE_DEMO_REQUESTER_EMAIL', email: value('VITE_DEMO_REQUESTER_EMAIL') },
];
