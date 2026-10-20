import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Building,
  Check,
  BookmarkPlus,
  Send,
  Ban,
  Scale,
} from 'lucide-react';
import {
  PurchaseRequest,
  RequestStatus,
  ComparisonOption,
  NavigationTab,
  CatalogItem,
  PolicyEvaluationResult,
} from '../types';
import { generateDemoAnalysis } from '../data/demoData';
import { analyzePurchase, evaluatePurchasePolicy, syncPurchaseRequestToServer } from '../services/api';

interface NewRequestViewProps {
  onAddRequest: (req: PurchaseRequest) => void;
  onNavigate: (tab: NavigationTab) => void;
  approvedSuppliers: string[];
  prefilledItem?: CatalogItem | null;
}

export const NewRequestView: React.FC<NewRequestViewProps> = ({
  onAddRequest,
  onNavigate,
  approvedSuppliers,
  prefilledItem,
}) => {
  // Form State
  const [prompt, setPrompt] = useState<string>('');
  const [category, setCategory] = useState<string>('IT & Hardware');
  const [budget, setBudget] = useState<string>('1200');
  const [quantity, setQuantity] = useState<number>(2);
  const [preferredSupplier, setPreferredSupplier] = useState<string>('');
  const [urgency, setUrgency] = useState<'standard' | 'expedited' | 'flexible'>('standard');
  const [constraints, setConstraints] = useState<string>('');

  useEffect(() => {
    if (prefilledItem) {
      setPrompt(`Procure ${prefilledItem.name} for office workstation deployment.`);
      setCategory(prefilledItem.category);
      setBudget((prefilledItem.price * 2).toFixed(2));
      setPreferredSupplier(prefilledItem.supplier);
    }
  }, [prefilledItem]);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Analysis Result State
  const [analysisResult, setAnalysisResult] = useState<ComparisonOption[] | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'rules-engine'>('gemini');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');
  const [analysisLatency, setAnalysisLatency] = useState<number>(0);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Policy Evaluation State
  const [policyResult, setPolicyResult] = useState<PolicyEvaluationResult | null>(null);
  const [evaluatingPolicy, setEvaluatingPolicy] = useState<boolean>(false);
  const [, setPolicyError] = useState<string | null>(null);

  // Quick prompt templates for effortless testing
  const promptTemplates = [
    {
      label: '4K Developer Monitors',
      text: 'Need two 27-inch color-calibrated 4K monitors with single-cable USB-C power delivery for our engineering workstations.',
      cat: 'IT & Hardware',
      budget: '1200',
      qty: 2,
    },
    {
      label: 'Ergonomic Task Chairs',
      text: 'Looking for high-durability ergonomic lumbar-support chairs to support back health during long support shifts.',
      cat: 'Office Ergonomics',
      budget: '1000',
      qty: 1,
    },
    {
      label: 'DevOps Cloud Seats',
      text: 'Annual renewal for 5 team member organization licenses with automated security scanning and continuous integration.',
      cat: 'Software & Cloud',
      budget: '1300',
      qty: 5,
    },
  ];

  const handleApplyTemplate = (tmpl: typeof promptTemplates[0]) => {
    setPrompt(tmpl.text);
    setCategory(tmpl.cat);
    setBudget(tmpl.budget);
    setQuantity(tmpl.qty);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!prompt.trim() || prompt.trim().length < 10) {
      newErrors.prompt = 'Please describe your purchasing need with at least 10 characters.';
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      newErrors.budget = 'Please enter a valid budget amount greater than $0.00.';
    } else if (budgetNum > 50000) {
      newErrors.budget = 'Budget exceeds the maximum demo order threshold of $50,000.';
    }

    if (!quantity || quantity < 1 || quantity > 500) {
      newErrors.quantity = 'Quantity must be between 1 and 500.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setAiNotice(null);

    const budgetNum = parseFloat(budget);

    try {
      const response = await analyzePurchase({
        prompt: prompt.trim(),
        budget: budgetNum,
        quantity,
        category,
        preferredSupplier: preferredSupplier || undefined,
        urgency,
        constraints: constraints || undefined,
      });

      if (response.data && response.data.options.length > 0) {
        setAnalysisResult(response.data.options);
        setAiSummary(response.data.summary);
        setAiProvider(response.data.provider);
        setAiModel(response.data.model);
        setAnalysisLatency(response.latencyMs);
        setSelectedOptionIndex(0);
      } else {
        // Fallback to local evaluation
        const fallbackResults = generateDemoAnalysis(
          prompt,
          budgetNum,
          quantity,
          category,
          preferredSupplier || undefined
        );
        setAnalysisResult(fallbackResults);
        setAiSummary('Deterministic rules-engine evaluation against approved catalog.');
        setAiProvider('rules-engine');
        setAiModel('local-rules-v1');
        setAnalysisLatency(response.latencyMs);
        setSelectedOptionIndex(0);
        if (response.error) {
          setAiNotice(`Procurement Engine Notice: ${response.error}`);
        }
      }
    } catch {
      const fallbackResults = generateDemoAnalysis(
        prompt,
        budgetNum,
        quantity,
        category,
        preferredSupplier || undefined
      );
      setAnalysisResult(fallbackResults);
      setAiSummary('Deterministic rules-engine evaluation against approved catalog.');
      setAiProvider('rules-engine');
      setAiModel('client-fallback');
      setAnalysisLatency(0);
      setSelectedOptionIndex(0);
      setAiNotice('Unable to reach backend API. Switched to offline deterministic evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Evaluate Server-Side Procurement Policy whenever option or parameters change
  useEffect(() => {
    if (!analysisResult || analysisResult.length === 0) {
      setPolicyResult(null);
      return;
    }

    const selectedOption = analysisResult[selectedOptionIndex];
    if (!selectedOption) return;

    let isMounted = true;
    setEvaluatingPolicy(true);
    setPolicyError(null);

    const budgetNum = parseFloat(budget) || undefined;

    evaluatePurchasePolicy({
      catalogItemId: selectedOption.catalogItem.id,
      quantity,
      userSpecifiedBudget: budgetNum,
      urgency,
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setPolicyResult(res.data);
        } else {
          setPolicyError(res.error || 'Server policy check failed');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setPolicyError(err instanceof Error ? err.message : 'Policy connection error');
      })
      .finally(() => {
        if (isMounted) setEvaluatingPolicy(false);
      });

    return () => {
      isMounted = false;
    };
  }, [analysisResult, selectedOptionIndex, quantity, budget, urgency]);

  const handleSaveDraft = async () => {
    const budgetNum = parseFloat(budget) || 0;
    const selected = analysisResult ? analysisResult[selectedOptionIndex] : null;
    const authoritativeTotal =
      policyResult?.itemizedCost.subtotal ?? (selected ? selected.estimatedTotal : budgetNum);

    const localReq: PurchaseRequest = {
      id: `REQ-${Date.now()}`,
      title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
      category,
      prompt,
      budgetLimit: budgetNum,
      quantity,
      preferredSupplier: preferredSupplier || undefined,
      constraints: constraints || undefined,
      createdAt: new Date().toISOString(),
      status: 'draft',
      estimatedTotal: authoritativeTotal,
      selectedSupplier: selected?.catalogItem.supplier,
      selectedItemName: selected?.catalogItem.name,
      selectedItemId: selected?.catalogItem.id,
      catalogItemId: selected?.catalogItem.id,
      urgency,
      complianceNotes: policyResult
        ? `Saved draft with policy status: ${policyResult.decision}. ${policyResult.reasons.join(' ')}`
        : 'Saved as draft for team review.',
      policyDecision: policyResult?.decision,
      policyResult: policyResult || undefined,
    };

    try {
      // Persist to authoritative server store so checkout can find it later
      const serverReq = await syncPurchaseRequestToServer(localReq);
      onAddRequest(serverReq);
    } catch (err) {
      console.warn('[NewRequestView] Failed to persist draft to server, using local record:', err);
      onAddRequest(localReq);
    }
    onNavigate('history');
  };

  const handleSubmitForApproval = async () => {
    // SECURITY GATEKEEPER: A BLOCKED purchase cannot be submitted
    if (policyResult?.decision === 'BLOCKED') {
      alert('This purchase is BLOCKED by organizational policy and cannot be submitted.');
      return;
    }

    const budgetNum = parseFloat(budget) || 0;
    const selected = analysisResult ? analysisResult[selectedOptionIndex] : null;
    const authoritativeTotal =
      policyResult?.itemizedCost.subtotal ?? (selected ? selected.estimatedTotal : budgetNum);

    // If policy is ALLOWED, order is auto-approved; if NEEDS_APPROVAL, set pending_approval
    const newStatus: RequestStatus =
      policyResult?.decision === 'ALLOWED' ? 'approved' : 'pending_approval';

    const localReq: PurchaseRequest = {
      id: `REQ-${Date.now()}`,
      title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
      category,
      prompt,
      budgetLimit: budgetNum,
      quantity,
      preferredSupplier: preferredSupplier || undefined,
      constraints: constraints || undefined,
      createdAt: new Date().toISOString(),
      status: newStatus,
      estimatedTotal: authoritativeTotal,
      selectedSupplier: selected?.catalogItem.supplier,
      selectedItemName: selected?.catalogItem.name,
      selectedItemId: selected?.catalogItem.id,
      catalogItemId: selected?.catalogItem.id,
      urgency,
      complianceNotes: policyResult
        ? `[Policy: ${policyResult.decision}] ${policyResult.reasons.join(' ')}`
        : (aiSummary ? `${aiSummary} Recommendation: ${selected?.pros.join('. ')}` : selected?.pros.join('. ')),
      policyDecision: policyResult?.decision,
      policyResult: policyResult || undefined,
    };

    try {
      // Persist to authoritative server store so checkout and approval can find it
      const serverReq = await syncPurchaseRequestToServer(localReq);
      onAddRequest(serverReq);
    } catch (err) {
      console.warn('[NewRequestView] Failed to persist request to server, using local record:', err);
      onAddRequest(localReq);
    }
    onNavigate('history');
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setPolicyResult(null);
    setAiSummary('');
    setAiNotice(null);
    setAnalysisLatency(0);
    setPrompt('');
    setBudget('1200');
    setQuantity(2);
    setConstraints('');
    setErrors({});
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Editorial Form or Analysis View */}
      {!analysisResult ? (
        <div className="bg-white border-2 border-neutral-900 p-4 sm:p-8 shadow-brutal space-y-6">
          <div className="border-b-2 border-neutral-900 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cobalt-700 bg-cobalt-50 px-2 py-0.5 border border-cobalt-600">
                  Step 1: Requirement Specification
                </span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-2">
                  Create Purchase Request
                </h2>
              </div>
              <span className="text-xs font-mono text-neutral-500 hidden sm:inline-block">
                Gemini Purchasing Intelligence
              </span>
            </div>
            <p className="text-sm text-neutral-600 mt-1">
              Provide natural-language requirements and budget limits. Procura AI queries Gemini to evaluate trade-offs against approved vendor catalogs.
            </p>
          </div>

          {/* Quick-fill Templates */}
          <div>
            <div className="text-xs font-bold text-neutral-800 uppercase tracking-wide mb-2">
              Quick test templates:
            </div>
            <div className="flex flex-wrap gap-2">
              {promptTemplates.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(t)}
                  className="px-3 py-1.5 text-xs font-semibold bg-paper-100 hover:bg-paper-200 border-2 border-neutral-900 shadow-brutal-xs brutal-btn"
                >
                  ⚡ {t.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleRunAnalysis} className="space-y-6" id="procurement-request-form">
            {/* Natural Language Prompt */}
            <div>
              <label htmlFor="req-prompt" className="block text-sm font-bold text-neutral-900 mb-1.5">
                Purchasing Requirement & Context <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="req-prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. We require 2 color-accurate 27-inch 4K monitors with USB-C single cable docking for newly hired engineers..."
                className={`w-full p-3.5 border-2 ${
                  errors.prompt ? 'border-rose-600' : 'border-neutral-900'
                } bg-[#FDFCFB] text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs font-sans`}
              />
              {errors.prompt && (
                <p className="mt-1.5 text-xs text-rose-700 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.prompt}
                </p>
              )}
            </div>

            {/* Grid: Category & Budget & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Category */}
              <div>
                <label htmlFor="req-category" className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Category
                </label>
                <select
                  id="req-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border-2 border-neutral-900 bg-white text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs"
                >
                  <option value="IT & Hardware">IT & Hardware</option>
                  <option value="Office Ergonomics">Office Ergonomics</option>
                  <option value="Software & Cloud">Software & Cloud</option>
                  <option value="Facility Supplies">Facility Supplies</option>
                </select>
              </div>

              {/* Target Budget */}
              <div>
                <label htmlFor="req-budget" className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Target Budget ($ USD) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 font-mono font-bold text-neutral-500">$</span>
                  <input
                    id="req-budget"
                    type="number"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="1200.00"
                    className={`w-full pl-8 pr-3 py-3 border-2 ${
                      errors.budget ? 'border-rose-600' : 'border-neutral-900'
                    } bg-white text-sm font-mono font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs`}
                  />
                </div>
                {errors.budget && (
                  <p className="mt-1.5 text-xs text-rose-700 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.budget}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="req-quantity" className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Quantity <span className="text-rose-600">*</span>
                </label>
                <input
                  id="req-quantity"
                  type="number"
                  min="1"
                  max="500"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className={`w-full p-3 border-2 ${
                    errors.quantity ? 'border-rose-600' : 'border-neutral-900'
                  } bg-white text-sm font-mono font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs`}
                />
                {errors.quantity && (
                  <p className="mt-1.5 text-xs text-rose-700 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.quantity}
                  </p>
                )}
              </div>
            </div>

            {/* Grid: Preferred Supplier & Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Optional Preferred Supplier */}
              <div>
                <label htmlFor="req-supplier" className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Preferred Supplier (Optional)
                </label>
                <select
                  id="req-supplier"
                  value={preferredSupplier}
                  onChange={(e) => setPreferredSupplier(e.target.value)}
                  className="w-full p-3 border-2 border-neutral-900 bg-white text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs"
                >
                  <option value="">No preference (Evaluate all approved vendors)</option>
                  {approvedSuppliers.map((supp, i) => (
                    <option key={i} value={supp}>
                      {supp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label htmlFor="req-urgency" className="block text-sm font-bold text-neutral-900 mb-1.5">
                  Delivery Urgency
                </label>
                <select
                  id="req-urgency"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full p-3 border-2 border-neutral-900 bg-white text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs"
                >
                  <option value="standard">Standard (3–7 Business Days)</option>
                  <option value="expedited">Expedited (1–2 Business Days)</option>
                  <option value="flexible">Flexible (No strict deadline)</option>
                </select>
              </div>
            </div>

            {/* Constraints */}
            <div>
              <label htmlFor="req-constraints" className="block text-sm font-bold text-neutral-900 mb-1.5">
                Additional Constraints & Notes (Optional)
              </label>
              <input
                id="req-constraints"
                type="text"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="e.g. Must include at least 3-year commercial replacement warranty"
                className="w-full p-3 border-2 border-neutral-900 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-cobalt-700 shadow-brutal-xs"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t-2 border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-neutral-600 font-mono">
                Evaluates with Gemini 2.5 Flash • Catalog grounded
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3.5 bg-cobalt-700 hover:bg-cobalt-800 text-white font-extrabold text-sm border-2 border-neutral-900 shadow-brutal-cobalt brutal-btn disabled:opacity-50"
                id="btn-evaluate-catalog-options"
              >
                <Sparkles className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                <span>{submitting ? 'Analyzing with Gemini AI...' : 'Evaluate with Gemini AI'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Analysis Results View */
        <div className="space-y-6">
          {/* Analysis Header Banner */}
          <div className="bg-paper-200 border-2 border-neutral-900 p-4 sm:p-6 shadow-brutal flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-neutral-900 ${
                    aiProvider === 'gemini'
                      ? 'bg-cobalt-700 text-white'
                      : 'bg-amber-100 text-amber-900 border-amber-900'
                  }`}
                >
                  {aiProvider === 'gemini' ? `✨ Gemini AI (${aiModel})` : `⚙️ Rules Engine (${aiModel})`}
                </span>
                <span className="text-xs font-mono text-neutral-500">•</span>
                <span className="text-xs font-mono text-neutral-700">{analysisResult.length} options ranked</span>
                {analysisLatency > 0 && (
                  <>
                    <span className="text-xs font-mono text-neutral-500">•</span>
                    <span className="text-xs font-mono text-neutral-600">{analysisLatency}ms response</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900">
                Purchasing Trade-Off Comparison
              </h2>
              <p className="text-xs text-neutral-600">
                Grounded in verified vendor catalogs. Review specifications, pricing compliance, and fulfillment timelines before submission.
              </p>

              {aiNotice && (
                <div className="p-2.5 bg-amber-50 border-2 border-amber-800 text-amber-900 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>{aiNotice}</span>
                </div>
              )}

              {aiSummary && (
                <div className="mt-3 p-3.5 bg-white border-2 border-neutral-900 shadow-brutal-xs flex items-start gap-3">
                  <div className="p-1.5 bg-cobalt-50 border border-cobalt-700 text-cobalt-700 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-neutral-900 font-mono">
                      AI Procurement Officer Summary
                    </div>
                    <p className="text-sm text-neutral-800 mt-0.5 font-medium leading-relaxed">
                      {aiSummary}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold border-2 border-neutral-900 bg-white hover:bg-paper-100 shadow-brutal-xs brutal-btn self-start shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Modify Inputs</span>
            </button>
          </div>

          {/* 3 Ranked Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analysisResult.map((option, idx) => {
              const isSelected = selectedOptionIndex === idx;
              const isWithinBudget = option.estimatedTotal <= parseFloat(budget);

              return (
                <div
                  key={option.catalogItem.id}
                  onClick={() => setSelectedOptionIndex(idx)}
                  className={`cursor-pointer bg-white border-2 border-neutral-900 p-4 sm:p-6 flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'shadow-brutal-lg ring-2 ring-cobalt-700 -translate-y-1'
                      : 'shadow-brutal hover:shadow-brutal-sm'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Tier Badge & Match Score */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono uppercase font-extrabold px-2 py-0.5 border border-neutral-900 ${
                          option.isRecommended
                            ? 'bg-cobalt-700 text-white'
                            : 'bg-paper-200 text-neutral-900'
                        }`}
                      >
                        {option.isRecommended ? '★ Recommended' : `Option ${idx + 1}`}
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-700 bg-paper-100 px-2 py-0.5 border border-neutral-300">
                        Match {option.matchScore}%
                      </span>
                    </div>

                    {/* Product Title & Supplier */}
                    <div>
                      <h3 className="font-extrabold text-base text-neutral-900 leading-snug">
                        {option.catalogItem.name}
                      </h3>
                      <div className="text-xs font-mono text-neutral-500 mt-1 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        <span>{option.catalogItem.supplier}</span>
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="p-3 bg-paper-100 border border-neutral-900 space-y-1 text-xs">
                      <div className="flex justify-between font-mono">
                        <span className="text-neutral-600">Unit Price:</span>
                        <span className="font-bold text-neutral-900">
                          ${option.catalogItem.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-neutral-600">Quantity:</span>
                        <span className="font-bold text-neutral-900">{quantity}</span>
                      </div>
                      <div className="pt-1 border-t border-neutral-300 flex justify-between font-mono font-bold text-sm">
                        <span>Estimated Total:</span>
                        <span
                          className={isWithinBudget ? 'text-emerald-700' : 'text-rose-700'}
                        >
                          ${option.estimatedTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Compliance Indicator */}
                    <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                      {isWithinBudget ? (
                        <div className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Within ${budget} limit</span>
                        </div>
                      ) : (
                        <div className="text-rose-700 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Over budget by ${(option.estimatedTotal - parseFloat(budget)).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Pros & Cons */}
                    <div className="space-y-2 pt-2 border-t border-neutral-200 text-xs">
                      <div className="font-bold text-neutral-900 uppercase text-[11px] font-mono">
                        Strengths:
                      </div>
                      <ul className="space-y-1">
                        {option.pros.map((p, pIdx) => (
                          <li key={pIdx} className="text-neutral-700 flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>

                      {option.cons.length > 0 && (
                        <>
                          <div className="font-bold text-neutral-900 uppercase text-[11px] font-mono pt-1">
                            Trade-offs:
                          </div>
                          <ul className="space-y-1">
                            {option.cons.map((c, cIdx) => (
                              <li key={cIdx} className="text-neutral-600 flex items-start gap-1.5">
                                <span className="text-neutral-400">•</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selection Button */}
                  <div className="pt-4 mt-4 border-t-2 border-neutral-900">
                    <button
                      type="button"
                      onClick={() => setSelectedOptionIndex(idx)}
                      className={`w-full py-2.5 text-xs font-extrabold uppercase tracking-wide border-2 border-neutral-900 ${
                        isSelected
                          ? 'bg-cobalt-700 text-white shadow-brutal-xs'
                          : 'bg-paper-100 text-neutral-900 hover:bg-neutral-900 hover:text-white'
                      }`}
                    >
                      {isSelected ? '✓ Selected for Request' : 'Select Option'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Deterministic Server Policy Engine Verification Card */}
          <div className="bg-white border-2 border-neutral-900 p-6 shadow-brutal space-y-5" id="policy-verification-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-neutral-900 gap-2">
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-cobalt-700" />
                <h3 className="text-lg font-black text-neutral-900 tracking-tight">
                  Server Policy Engine Verification
                </h3>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                Independent Server-Side Validation (v{policyResult?.policyVersion || '2026.1-dev'})
              </span>
            </div>

            {evaluatingPolicy ? (
              <div className="py-6 flex items-center justify-center space-x-3 text-neutral-600 font-mono text-xs">
                <div className="w-4 h-4 border-2 border-cobalt-700 border-t-transparent animate-spin rounded-full" />
                <span>Evaluating authoritative spending limits & supplier constraints...</span>
              </div>
            ) : policyResult ? (
              <div className="space-y-5">
                {/* Decision Banner */}
                <div
                  className={`p-4 border-2 border-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    policyResult.decision === 'ALLOWED'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-900'
                      : policyResult.decision === 'NEEDS_APPROVAL'
                      ? 'bg-amber-50 text-amber-950 border-amber-900'
                      : 'bg-rose-50 text-rose-950 border-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {policyResult.decision === 'ALLOWED' && (
                      <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                    )}
                    {policyResult.decision === 'NEEDS_APPROVAL' && (
                      <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                    )}
                    {policyResult.decision === 'BLOCKED' && (
                      <Ban className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-mono font-extrabold uppercase px-2 py-0.5 border ${
                            policyResult.decision === 'ALLOWED'
                              ? 'bg-emerald-700 text-white border-emerald-900'
                              : policyResult.decision === 'NEEDS_APPROVAL'
                              ? 'bg-amber-500 text-neutral-950 border-amber-800'
                              : 'bg-rose-700 text-white border-rose-900'
                          }`}
                        >
                          {policyResult.decision}
                        </span>
                        <span className="font-extrabold text-sm text-neutral-900">
                          {policyResult.decision === 'ALLOWED'
                            ? 'Eligible for Instant Approval'
                            : policyResult.decision === 'NEEDS_APPROVAL'
                            ? 'Human Managerial Signoff Required'
                            : 'Purchase Order Blocked by Policy'}
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-neutral-700 font-medium">
                        {policyResult.reasons.join(' ')}
                      </p>
                    </div>
                  </div>

                  {/* Authoritative Verified Cost Pill */}
                  <div className="bg-white border-2 border-neutral-900 p-2.5 text-right font-mono shrink-0 shadow-brutal-xs">
                    <div className="text-[10px] uppercase font-bold text-neutral-500">
                      Authoritative Total
                    </div>
                    <div className="text-base font-black text-neutral-900">
                      ${policyResult.itemizedCost.subtotal.toFixed(2)} USD
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {policyResult.itemizedCost.requestedQuantity} × ${policyResult.itemizedCost.authoritativeUnitPrice.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Evaluated Rules Checklist */}
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-600 mb-2">
                    Deterministic Rules Audit ({policyResult.rules.length} Evaluated)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    {policyResult.rules.map((rule) => (
                      <div
                        key={rule.ruleId}
                        className={`p-2.5 border border-neutral-900 flex items-start gap-2 ${
                          rule.status === 'PASSED'
                            ? 'bg-emerald-50/50'
                            : rule.status === 'FLAGGED'
                            ? 'bg-amber-50/60'
                            : 'bg-rose-50/60'
                        }`}
                      >
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-black uppercase border shrink-0 ${
                            rule.status === 'PASSED'
                              ? 'bg-emerald-600 text-white border-emerald-800'
                              : rule.status === 'FLAGGED'
                              ? 'bg-amber-500 text-neutral-900 border-amber-800'
                              : 'bg-rose-600 text-white border-rose-800'
                          }`}
                        >
                          {rule.status}
                        </span>
                        <div>
                          <span className="font-bold text-neutral-900 block leading-tight">
                            {rule.ruleName}
                          </span>
                          <span className="text-[11px] text-neutral-600 mt-0.5 block leading-tight">
                            {rule.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-500 font-mono">
                Select an option above to trigger server policy evaluation.
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="bg-white border-2 border-neutral-900 p-6 shadow-brutal flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-neutral-700 font-mono">
              <ShieldCheck className="w-4 h-4 text-cobalt-700" />
              <span>
                Selected: <strong>{analysisResult[selectedOptionIndex]?.catalogItem.name}</strong> (Verified: $
                {(policyResult?.itemizedCost.subtotal ?? analysisResult[selectedOptionIndex]?.estimatedTotal ?? 0).toFixed(2)})
              </span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-3 bg-paper-100 hover:bg-paper-200 text-neutral-900 font-bold text-xs border-2 border-neutral-900 shadow-brutal-xs brutal-btn"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Save Draft</span>
              </button>

              {policyResult?.decision === 'BLOCKED' ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-6 py-3 bg-neutral-200 text-neutral-500 font-extrabold text-xs border-2 border-neutral-400 cursor-not-allowed shadow-none"
                  title="This purchase violates procurement policy and cannot be submitted."
                >
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>Blocked by Policy</span>
                </button>
              ) : policyResult?.decision === 'ALLOWED' ? (
                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs border-2 border-neutral-900 shadow-brutal brutal-btn"
                  id="btn-submit-for-approval"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Instant Approve & Record</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-6 py-3 bg-cobalt-700 hover:bg-cobalt-800 text-white font-extrabold text-xs border-2 border-neutral-900 shadow-brutal-cobalt brutal-btn"
                  id="btn-submit-for-approval"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit for Review</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
