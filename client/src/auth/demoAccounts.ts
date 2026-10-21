export type DemoRole = 'admin' | 'procurement_manager' | 'finance_manager' | 'requester';

export interface DemoAccount {
  role: DemoRole;
  label: string;
  description: string;
  email?: string;
  /** Optional and intentionally public only for disposable demo tenants. */
  password?: string;
}

const value = (name: string): string | undefined => {
  const configured = import.meta.env[name];
  return typeof configured === 'string' && configured.trim() ? configured.trim() : undefined;
};

export const demoAccounts: DemoAccount[] = [
  { role: 'admin', label: 'Admin Demo', description: 'System administration and permitted settings.', email: value('VITE_DEMO_ADMIN_EMAIL'), password: value('VITE_DEMO_ADMIN_PASSWORD') },
  { role: 'procurement_manager', label: 'Procurement Demo', description: 'Purchase review and authorized approvals.', email: value('VITE_DEMO_PROCUREMENT_EMAIL'), password: value('VITE_DEMO_PROCUREMENT_PASSWORD') },
  { role: 'finance_manager', label: 'Finance Demo', description: 'Budget visibility and finance permissions.', email: value('VITE_DEMO_FINANCE_EMAIL'), password: value('VITE_DEMO_FINANCE_PASSWORD') },
  { role: 'requester', label: 'Requester Demo', description: 'Create requests and view permitted status.', email: value('VITE_DEMO_REQUESTER_EMAIL'), password: value('VITE_DEMO_REQUESTER_PASSWORD') },
];
