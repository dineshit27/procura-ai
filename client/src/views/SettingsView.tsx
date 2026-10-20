import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  CheckCircle,
  Building,
  Plus,
  Trash2,
  Lock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { ProcurementSettings } from '../types';
import { fetchCurrentPolicy, updatePolicySettings, resetPolicySettings } from '../services/api';

interface SettingsViewProps {
  settings: ProcurementSettings;
  onSaveSettings: (newSettings: ProcurementSettings) => void;
  onResetSettings: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetSettings,
}) => {
  const [formState, setFormState] = useState<ProcurementSettings>({
    ...settings,
    cumulativeBudgetLimit: settings.cumulativeBudgetLimit ?? 20000.0,
    spendingPeriod: settings.spendingPeriod ?? 'monthly',
    budgetAlertThresholdPercent: settings.budgetAlertThresholdPercent ?? 80,
    maxQuantityPerOrder: settings.maxQuantityPerOrder ?? 250,
  });
  const [newSupplierInput, setNewSupplierInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronize on mount with authoritative backend policy
  useEffect(() => {
    let mounted = true;
    fetchCurrentPolicy()
      .then((livePolicy) => {
        if (!mounted || !livePolicy) return;
        setFormState((prev) => ({
          ...prev,
          departmentName: livePolicy.departmentName || prev.departmentName,
          defaultBudgetLimit: livePolicy.maxSingleOrderBudget || prev.defaultBudgetLimit,
          cumulativeBudgetLimit: livePolicy.cumulativeBudgetLimit || 20000.0,
          spendingPeriod: livePolicy.spendingPeriod || 'monthly',
          budgetAlertThresholdPercent: livePolicy.budgetAlertThresholdPercent || 80,
          maxQuantityPerOrder: livePolicy.maxQuantityPerOrder || 250,
          autoApproveThreshold: livePolicy.autoApproveThreshold || prev.autoApproveThreshold,
          approvedSuppliers: livePolicy.approvedSuppliers || prev.approvedSuppliers,
          requirePreferredSupplier: livePolicy.requirePreferredSupplier ?? prev.requirePreferredSupplier,
        }));
      })
      .catch((err) => console.debug('[SettingsView] Error loading live policy:', err));

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Authoritatively persist updates to backend server store
      const backendPayload = {
        departmentName: formState.departmentName,
        maxSingleOrderBudget: Number(formState.defaultBudgetLimit),
        cumulativeBudgetLimit: Number(formState.cumulativeBudgetLimit),
        spendingPeriod: formState.spendingPeriod || 'monthly',
        budgetAlertThresholdPercent: Number(formState.budgetAlertThresholdPercent),
        maxQuantityPerOrder: Number(formState.maxQuantityPerOrder),
        autoApproveThreshold: Number(formState.autoApproveThreshold),
        approvedSuppliers: formState.approvedSuppliers,
        requirePreferredSupplier: formState.requirePreferredSupplier,
      };

      await updatePolicySettings(backendPayload);

      onSaveSettings(formState);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('[SettingsView] Failed to save policy settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save policy settings to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetPolicySettings();
      onResetSettings();
      const fresh = await fetchCurrentPolicy();
      if (fresh) {
        setFormState({
          ...settings,
          departmentName: fresh.departmentName,
          defaultBudgetLimit: fresh.maxSingleOrderBudget,
          cumulativeBudgetLimit: fresh.cumulativeBudgetLimit || 20000.0,
          spendingPeriod: fresh.spendingPeriod || 'monthly',
          budgetAlertThresholdPercent: fresh.budgetAlertThresholdPercent || 80,
          maxQuantityPerOrder: fresh.maxQuantityPerOrder || 250,
          autoApproveThreshold: fresh.autoApproveThreshold,
          approvedSuppliers: fresh.approvedSuppliers,
        });
      }
    } catch (err) {
      console.error('[SettingsView] Reset failed:', err);
    }
  };

  const handleAddSupplier = () => {
    if (!newSupplierInput.trim()) return;
    if (formState.approvedSuppliers.includes(newSupplierInput.trim())) return;

    setFormState({
      ...formState,
      approvedSuppliers: [...formState.approvedSuppliers, newSupplierInput.trim()],
    });
    setNewSupplierInput('');
  };

  const handleRemoveSupplier = (supp: string) => {
    setFormState({
      ...formState,
      approvedSuppliers: formState.approvedSuppliers.filter((s) => s !== supp),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Settings Form Card */}
      <div className="bg-white border-2 border-neutral-900 p-4 sm:p-8 shadow-brutal space-y-6">
        <div className="border-b-2 border-neutral-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cobalt-700 bg-cobalt-50 px-2 py-0.5 border border-cobalt-600">
                SpendGuard Governance & Policy Control
              </span>
              <span className="bg-emerald-100 border border-emerald-700 text-emerald-900 text-[10px] font-mono font-bold px-1.5 py-0.5">
                BACKEND ENFORCED
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-neutral-900 mt-2">
              SpendGuard Spending Policies & Limits
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Configure organizational spending caps, cumulative budget period allowances, automated approval thresholds,
              and pre-vetted vendor directories.
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-100 border-2 border-emerald-900 text-emerald-950 font-bold text-xs shadow-brutal-xs">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              <span>Policy Saved to Server!</span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border-2 border-rose-900 text-xs text-rose-900 flex items-center space-x-2 shadow-brutal-xs">
            <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6" id="procurement-settings-form">
          {/* Department Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-900 pb-1 border-b border-neutral-200">
              1. Department & Notification Setup
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-neutral-900 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={formState.departmentName}
                  onChange={(e) =>
                    setFormState({ ...formState, departmentName: e.target.value })
                  }
                  className="w-full p-2.5 border-2 border-neutral-900 text-sm bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-900 mb-1">
                  Compliance Notification Email
                </label>
                <input
                  type="email"
                  value={formState.notificationEmail}
                  onChange={(e) =>
                    setFormState({ ...formState, notificationEmail: e.target.value })
                  }
                  className="w-full p-2.5 border-2 border-neutral-900 text-sm bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
                />
              </div>
            </div>
          </div>

          {/* SpendGuard Cumulative Budget Protection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-1 border-b border-neutral-200">
              <ShieldCheck className="w-4 h-4 text-cobalt-700" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-900">
                2. SpendGuard Cumulative Budget & Allowance
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-neutral-900 mb-1">
                  Cumulative Period Budget ($ USD)
                </label>
                <input
                  type="number"
                  step="500"
                  min="1000"
                  max="10000000"
                  value={formState.cumulativeBudgetLimit || 20000}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      cumulativeBudgetLimit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2.5 border-2 border-neutral-900 text-sm font-mono font-bold bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Hard spending ceiling for the chosen period.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-900 mb-1">
                  Spending Cycle Period
                </label>
                <select
                  value={formState.spendingPeriod || 'monthly'}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      spendingPeriod: e.target.value as 'monthly' | 'quarterly' | 'annual',
                    })
                  }
                  className="w-full p-2.5 border-2 border-neutral-900 text-sm font-mono font-bold bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
                >
                  <option value="monthly">Monthly Cycle</option>
                  <option value="quarterly">Quarterly Cycle</option>
                  <option value="annual">Annual Fiscal Year</option>
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Cycle reset window for cumulative spend tracking.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-900 mb-1">
                  Warning Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="99"
                  value={formState.budgetAlertThresholdPercent || 80}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      budgetAlertThresholdPercent: parseInt(e.target.value, 10) || 80,
                    })
                  }
                  className="w-full p-2.5 border-2 border-neutral-900 text-sm font-mono font-bold bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Triggers warning alert when spend utilization reaches this %.
                </p>
              </div>
            </div>
          </div>

          {/* Single-Order Caps & Auto-Approval Thresholds */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-900 pb-1 border-b border-neutral-200">
              3. Single-Order Caps & Automation Rules
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-neutral-900 mb-1">
                  Max Single-Order Budget ($ USD)
                </label>
                <input
                  type="number"
                  step="100"
                  value={formState.defaultBudgetLimit}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      defaultBudgetLimit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2.5 border-2 border-neutral-900 text-sm font-mono font-bold bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Hard cap per individual PO. Exceeding orders are blocked.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-900 mb-1">
                  Auto-Approval Max Cap ($ USD)
                </label>
                <input
                  type="number"
                  step="50"
                  value={formState.autoApproveThreshold}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      autoApproveThreshold: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2.5 border-2 border-neutral-900 text-sm font-mono font-bold bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Orders below this cap qualify for instant automated approval.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-900 mb-1">
                  Max Quantity Per Order (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={formState.maxQuantityPerOrder || 250}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      maxQuantityPerOrder: parseInt(e.target.value, 10) || 250,
                    })
                  }
                  className="w-full p-2.5 border-2 border-neutral-900 text-sm font-mono font-bold bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Bulk purchase volume limit per purchase order.
                </p>
              </div>
            </div>
          </div>

          {/* Approved Demo Suppliers Management */}
          <div className="space-y-3">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-900 pb-1 border-b border-neutral-200">
              4. Approved Vendor Directory
            </h3>
            <p className="text-xs text-neutral-600">
              SpendGuard and the AI engine restrict purchasing exclusively to pre-vetted vendors.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSupplierInput}
                onChange={(e) => setNewSupplierInput(e.target.value)}
                placeholder="Enter new supplier name..."
                className="flex-1 p-2.5 border-2 border-neutral-900 text-sm bg-white shadow-brutal-xs focus:outline-none focus:ring-2 focus:ring-cobalt-700"
              />
              <button
                type="button"
                onClick={handleAddSupplier}
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs border-2 border-neutral-900 shadow-brutal-xs brutal-btn inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vendor</span>
              </button>
            </div>

            <div className="bg-paper-100 border-2 border-neutral-900 p-3 divide-y divide-neutral-200">
              {formState.approvedSuppliers.map((supp, index) => (
                <div key={index} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 font-medium text-neutral-900">
                    <Building className="w-3.5 h-3.5 text-cobalt-700" />
                    <span>{supp}</span>
                  </div>
                  {formState.approvedSuppliers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSupplier(supp)}
                      className="text-neutral-400 hover:text-rose-600 transition p-1"
                      title="Remove supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Security & Secrets Architecture Notice */}
          <div className="p-4 bg-paper-200 border-2 border-neutral-900 flex items-start space-x-3">
            <Lock className="w-5 h-5 text-neutral-800 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-800 leading-relaxed">
              <strong className="font-bold text-neutral-950 uppercase tracking-wide">
                Security & Credential Integrity:
              </strong>{' '}
              All financial thresholds are authoritatively validated and enforced by the backend server.
              Sensitive payment credentials (PayPal Client ID & Secret) are stored strictly in environment variables
              and are never exposed or editable from client applications.
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t-2 border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold border-2 border-neutral-900 bg-white hover:bg-paper-200 shadow-brutal-xs brutal-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-cobalt-700 hover:bg-cobalt-800 text-white font-extrabold text-xs border-2 border-neutral-900 shadow-brutal-cobalt brutal-btn disabled:opacity-50"
              id="settings-save-btn"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Server...' : 'Save Policy Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
