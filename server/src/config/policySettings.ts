import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

/**
 * Zod schema defining the structure and validation constraints for server-side procurement policies.
 */
export const procurementPolicySchema = z.object({
  departmentName: z.string().min(1).default('Engineering & Operations'),
  maxSingleOrderBudget: z
    .number()
    .positive('maxSingleOrderBudget must be positive')
    .max(1_000_000, 'maxSingleOrderBudget cannot exceed $1,000,000')
    .default(10000.0),
  cumulativeBudgetLimit: z
    .number()
    .positive('cumulativeBudgetLimit must be positive')
    .max(10_000_000, 'cumulativeBudgetLimit cannot exceed $10,000,000')
    .default(20000.0),
  spendingPeriod: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
  budgetAlertThresholdPercent: z
    .number()
    .min(1, 'Alert threshold must be at least 1%')
    .max(100, 'Alert threshold cannot exceed 100%')
    .default(80),
  autoApproveThreshold: z
    .number()
    .nonnegative('autoApproveThreshold must be non-negative')
    .default(500.0),
  maxQuantityPerOrder: z
    .number()
    .int()
    .positive('maxQuantityPerOrder must be a positive integer')
    .default(250),
  requirePreferredSupplier: z.boolean().default(true),
  approvedSuppliers: z
    .array(z.string().min(1))
    .min(1, 'At least one approved supplier must be configured'),
  enforceCatalogStock: z.boolean().default(true),
  policyVersion: z.string().default('2026.1-dev'),
});

export type ServerProcurementPolicy = z.infer<typeof procurementPolicySchema>;

export const DEFAULT_PROCUREMENT_POLICY: ServerProcurementPolicy = {
  departmentName: 'Engineering & Operations',
  maxSingleOrderBudget: 10000.0,
  cumulativeBudgetLimit: 20000.0,
  spendingPeriod: 'monthly',
  budgetAlertThresholdPercent: 80,
  autoApproveThreshold: 500.0,
  maxQuantityPerOrder: 250,
  requirePreferredSupplier: true,
  approvedSuppliers: [
    'Apex Business Hardware (Demo Supplier)',
    'Kinetic Workspaces Ltd. (Demo Supplier)',
    'CloudScale Distribution (Demo Supplier)',
    'EcoClean Operations (Demo Supplier)',
  ],
  enforceCatalogStock: true,
  policyVersion: '2026.1-dev',
};

function getPolicyPersistenceFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'server', 'data', 'policySettings.json'),
    path.resolve(process.cwd(), 'data', 'policySettings.json'),
    path.resolve(__dirname, '../../../data/policySettings.json'),
  ];
  const existing = candidates.find((c) => fs.existsSync(c));
  if (existing) return existing;

  if (fs.existsSync(path.resolve(process.cwd(), 'server'))) {
    return path.resolve(process.cwd(), 'server', 'data', 'policySettings.json');
  }
  return path.resolve(process.cwd(), 'data', 'policySettings.json');
}

function savePolicyToDisk(policy: ServerProcurementPolicy): void {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const filePath = getPolicyPersistenceFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(policy, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Policy] Warning: Failed to persist policy to disk:', err);
  }
}

function loadPolicyFromDisk(): ServerProcurementPolicy | null {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    const filePath = getPolicyPersistenceFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      const validated = procurementPolicySchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
    }
  } catch (err) {
    console.warn('[Policy] Warning: Failed to load persisted policy:', err);
  }
  return null;
}

// In-memory state initialized from disk or defaults
let currentPolicy: ServerProcurementPolicy = loadPolicyFromDisk() || { ...DEFAULT_PROCUREMENT_POLICY };

/**
 * Retrieve the active server-side procurement policy.
 */
export function getActivePolicy(): ServerProcurementPolicy {
  return { ...currentPolicy };
}

/**
 * Safely update in-memory policy settings (validated by Zod).
 * Used during runtime or automated integration test suites.
 */
export function updateActivePolicy(
  updates: Partial<ServerProcurementPolicy>
): ServerProcurementPolicy {
  const merged = { ...currentPolicy, ...updates };
  const validated = procurementPolicySchema.parse(merged);
  currentPolicy = validated;
  savePolicyToDisk(currentPolicy);
  return { ...currentPolicy };
}

/**
 * Reset policy back to initial development defaults.
 */
export function resetPolicyToDefault(): void {
  currentPolicy = { ...DEFAULT_PROCUREMENT_POLICY };
  if (process.env.NODE_ENV !== 'test') {
    savePolicyToDisk(currentPolicy);
  }
}

