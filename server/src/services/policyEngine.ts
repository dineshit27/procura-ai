import { CATALOG_ITEMS } from '../data/catalog.js';
import { getActivePolicy, ServerProcurementPolicy } from '../config/policySettings.js';
import {
  PolicyDecision,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  RuleEvaluation,
  ItemizedCost,
  PolicyEvaluationContext,
} from '../types/policy.js';
import { canCommitSpend } from './spendGuardService.js';

/**
 * Deterministic Server-Side Procurement Policy Engine
 *
 * Enforces business spending rules independently of any client input or AI outputs.
 * Uses authoritative server-side catalog data for prices, stock levels, and suppliers.
 */
export function evaluatePurchasingPolicy(
  request: PolicyEvaluationRequest,
  customPolicy?: ServerProcurementPolicy,
  context?: PolicyEvaluationContext
): PolicyEvaluationResult {

  // If customPolicy is explicitly passed (e.g. null or invalid), do not silently fall back
  const policy = customPolicy !== undefined ? customPolicy : getActivePolicy();

  // Fail-safe: Ensure policy configuration is present and valid
  if (!policy || typeof policy !== 'object' || typeof policy.maxSingleOrderBudget !== 'number') {
    throw new Error('Policy configuration is missing or invalid. Refusing to evaluate.');
  }

  const rules: RuleEvaluation[] = [];
  const reasons: string[] = [];
  let requiresHumanApproval = false;
  let isBlocked = false;

  const { catalogItemId, quantity, userSpecifiedBudget } = request;

  // 1. Authoritative Catalog Product Validation
  const catalogItem = CATALOG_ITEMS.find((item) => item.id === catalogItemId);

  if (!catalogItem) {
    rules.push({
      ruleId: 'CATALOG_PRODUCT_VALIDATION',
      ruleName: 'Valid Catalog Product ID',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Product ID "${catalogItemId}" does not exist in the authoritative vendor catalog.`,
    });
    reasons.push(`Unknown catalog product identifier: ${catalogItemId}`);
    isBlocked = true;

    // Return blocked immediately with a zeroed itemized record
    return {
      decision: 'BLOCKED',
      requiresHumanApproval: false,
      reasons,
      itemizedCost: {
        catalogItemId,
        name: 'Unknown Catalog Item',
        category: 'Unclassified',
        supplier: 'Unknown Supplier',
        authoritativeUnitPrice: 0,
        requestedQuantity: quantity,
        subtotal: 0,
        currency: 'USD',
      },
      rules,
      evaluatedAt: new Date().toISOString(),
      policyVersion: policy.policyVersion,
    };
  }

  rules.push({
    ruleId: 'CATALOG_PRODUCT_VALIDATION',
    ruleName: 'Valid Catalog Product ID',
    status: 'PASSED',
    severity: 'INFO',
    message: `Verified product "${catalogItem.name}" (${catalogItem.id}) in catalog.`,
  });

  // 2. Authoritative Price Calculation (NEVER trust frontend price/total)
  const authoritativeUnitPrice = catalogItem.price;
  const verifiedSubtotal = Number((authoritativeUnitPrice * quantity).toFixed(2));
  const verifiedTotal = verifiedSubtotal;

  const itemizedCost: ItemizedCost = {
    catalogItemId: catalogItem.id,
    name: catalogItem.name,
    category: catalogItem.category,
    supplier: catalogItem.supplier,
    authoritativeUnitPrice,
    requestedQuantity: quantity,
    subtotal: verifiedTotal,
    currency: catalogItem.currency || 'USD',
  };

  // 3. Catalog Inventory & Stock Availability Check
  if (!catalogItem.inStock) {
    rules.push({
      ruleId: 'CATALOG_STOCK_VALIDATION',
      ruleName: 'Catalog Item Stock Status',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Product "${catalogItem.name}" is marked as currently out of stock.`,
    });
    reasons.push('Requested item is out of stock.');
    isBlocked = true;
  } else if (policy.enforceCatalogStock && quantity > catalogItem.stockUnits) {
    rules.push({
      ruleId: 'CATALOG_STOCK_VALIDATION',
      ruleName: 'Catalog Item Stock Status',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Requested quantity (${quantity}) exceeds supplier stock on hand (${catalogItem.stockUnits} units).`,
    });
    reasons.push(
      `Insufficient supplier inventory: requested ${quantity} units, but only ${catalogItem.stockUnits} are available.`
    );
    isBlocked = true;
  } else {
    rules.push({
      ruleId: 'CATALOG_STOCK_VALIDATION',
      ruleName: 'Catalog Item Stock Status',
      status: 'PASSED',
      severity: 'INFO',
      message: `Supplier inventory confirmed (${catalogItem.stockUnits} units available for ${quantity} requested).`,
    });
  }

  // 4. Quantity Limit Check
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    rules.push({
      ruleId: 'QUANTITY_LIMIT_CHECK',
      ruleName: 'Order Quantity Limits',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Requested quantity (${quantity}) must be a positive integer.`,
    });
    reasons.push('Order quantity must be a positive whole number.');
    isBlocked = true;
  } else if (quantity > policy.maxQuantityPerOrder) {
    rules.push({
      ruleId: 'QUANTITY_LIMIT_CHECK',
      ruleName: 'Order Quantity Limits',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Quantity (${quantity}) exceeds maximum order volume of ${policy.maxQuantityPerOrder} units.`,
    });
    reasons.push(
      `Bulk purchase limit exceeded: maximum allowed is ${policy.maxQuantityPerOrder} units per purchase order.`
    );
    isBlocked = true;
  } else {
    rules.push({
      ruleId: 'QUANTITY_LIMIT_CHECK',
      ruleName: 'Order Quantity Limits',
      status: 'PASSED',
      severity: 'INFO',
      message: `Quantity (${quantity}) satisfies order volume constraints (max: ${policy.maxQuantityPerOrder}).`,
    });
  }

  // 5. Approved Supplier Restriction Check
  if (policy.requirePreferredSupplier) {
    const isApproved = policy.approvedSuppliers.some(
      (supplier) => supplier.toLowerCase() === catalogItem.supplier.toLowerCase()
    );

    if (!isApproved) {
      rules.push({
        ruleId: 'APPROVED_SUPPLIER_CHECK',
        ruleName: 'Approved Vendor Policy',
        status: 'FAILED',
        severity: 'CRITICAL',
        message: `Supplier "${catalogItem.supplier}" is not in the approved vendor registry.`,
      });
      reasons.push(
        `Supplier restriction violation: "${catalogItem.supplier}" is unapproved for organizational purchases.`
      );
      isBlocked = true;
    } else {
      rules.push({
        ruleId: 'APPROVED_SUPPLIER_CHECK',
        ruleName: 'Approved Vendor Policy',
        status: 'PASSED',
        severity: 'INFO',
        message: `Supplier "${catalogItem.supplier}" is verified in the approved vendor list.`,
      });
    }
  } else {
    rules.push({
      ruleId: 'APPROVED_SUPPLIER_CHECK',
      ruleName: 'Approved Vendor Policy',
      status: 'PASSED',
      severity: 'INFO',
      message: 'Approved vendor policy enforcement is currently optional in this configuration.',
    });
  }

  // 6. Hard Maximum Single-Order Budget Check
  if (verifiedTotal > policy.maxSingleOrderBudget) {
    rules.push({
      ruleId: 'MAX_SINGLE_ORDER_BUDGET',
      ruleName: 'Single Order Budget Ceiling',
      status: 'FAILED',
      severity: 'CRITICAL',
      message: `Order total ($${verifiedTotal.toFixed(2)}) exceeds maximum allowable single-order budget of $${policy.maxSingleOrderBudget.toFixed(2)}.`,
    });
    reasons.push(
      `Hard spending limit exceeded: verified total ($${verifiedTotal.toFixed(2)}) is higher than the single-order limit of $${policy.maxSingleOrderBudget.toFixed(2)}.`
    );
    isBlocked = true;
  } else {
    rules.push({
      ruleId: 'MAX_SINGLE_ORDER_BUDGET',
      ruleName: 'Single Order Budget Ceiling',
      status: 'PASSED',
      severity: 'INFO',
      message: `Order total ($${verifiedTotal.toFixed(2)}) is within the $${policy.maxSingleOrderBudget.toFixed(2)} maximum single-order ceiling.`,
    });
  }

  // 7. Cumulative Spend Budget Check (SpendGuard Enforcement)
  const shouldCheckCumulative =
    context?.checkCumulativeSpend === true ||
    request.checkCumulativeSpend === true ||
    context?.currentCommittedSpend !== undefined;

  if (shouldCheckCumulative) {
    if (context?.currentCommittedSpend !== undefined) {
      const projected = Number((context.currentCommittedSpend + verifiedTotal).toFixed(2));
      if (projected > policy.cumulativeBudgetLimit) {
        rules.push({
          ruleId: 'CUMULATIVE_PERIOD_BUDGET',
          ruleName: 'Cumulative Period Spend Ceiling',
          status: 'FAILED',
          severity: 'CRITICAL',
          message: `Order total ($${verifiedTotal.toFixed(2)}) would cause cumulative spending ($${projected.toFixed(2)}) to exceed the ${policy.spendingPeriod} limit of $${policy.cumulativeBudgetLimit.toFixed(2)}.`,
        });
        reasons.push(
          `Cumulative spending limit exceeded: adding $${verifiedTotal.toFixed(2)} to committed $${context.currentCommittedSpend.toFixed(2)} exceeds the ${policy.spendingPeriod} budget of $${policy.cumulativeBudgetLimit.toFixed(2)}.`
        );
        isBlocked = true;
      } else {
        rules.push({
          ruleId: 'CUMULATIVE_PERIOD_BUDGET',
          ruleName: 'Cumulative Period Spend Ceiling',
          status: 'PASSED',
          severity: 'INFO',
          message: `Order total ($${verifiedTotal.toFixed(2)}) fits within cumulative budget (projected: $${projected.toFixed(2)} / $${policy.cumulativeBudgetLimit.toFixed(2)}).`,
        });
      }
    } else {
      const excludeId = context?.excludeRequestId || request.excludeRequestId;
      const spendCheck = canCommitSpend(verifiedTotal, excludeId, policy);
      if (!spendCheck.allowed) {
        rules.push({
          ruleId: 'CUMULATIVE_PERIOD_BUDGET',
          ruleName: 'Cumulative Period Spend Ceiling',
          status: 'FAILED',
          severity: 'CRITICAL',
          message: spendCheck.reason || `Cumulative spending limit of $${policy.cumulativeBudgetLimit.toFixed(2)} exceeded.`,
        });
        reasons.push(spendCheck.reason || 'Cumulative spending limit exceeded.');
        isBlocked = true;
      } else {
        rules.push({
          ruleId: 'CUMULATIVE_PERIOD_BUDGET',
          ruleName: 'Cumulative Period Spend Ceiling',
          status: 'PASSED',
          severity: 'INFO',
          message: `Cumulative budget confirmed ($${spendCheck.remainingBudget.toFixed(2)} remaining before this order).`,
        });
      }
    }
  }

  // 8. Requester Target Budget Check (if user specified a target budget)

  if (userSpecifiedBudget !== undefined) {
    if (verifiedTotal > userSpecifiedBudget) {
      rules.push({
        ruleId: 'USER_TARGET_BUDGET',
        ruleName: 'Requester Specified Budget Fit',
        status: 'FLAGGED',
        severity: 'WARNING',
        message: `Order total ($${verifiedTotal.toFixed(2)}) exceeds target budget ($${userSpecifiedBudget.toFixed(2)}) by $${(verifiedTotal - userSpecifiedBudget).toFixed(2)}.`,
      });
      reasons.push(
        `Over requester target budget by $${(verifiedTotal - userSpecifiedBudget).toFixed(2)}; requires manager review.`
      );
      requiresHumanApproval = true;
    } else {
      rules.push({
        ruleId: 'USER_TARGET_BUDGET',
        ruleName: 'Requester Specified Budget Fit',
        status: 'PASSED',
        severity: 'INFO',
        message: `Order total ($${verifiedTotal.toFixed(2)}) satisfies requester target budget ($${userSpecifiedBudget.toFixed(2)}).`,
      });
    }
  }

  // 8. Auto-Approval Threshold Check
  if (verifiedTotal > policy.autoApproveThreshold) {
    rules.push({
      ruleId: 'AUTO_APPROVAL_THRESHOLD',
      ruleName: 'Automated Approval Threshold',
      status: 'FLAGGED',
      severity: 'WARNING',
      message: `Order total ($${verifiedTotal.toFixed(2)}) exceeds the $${policy.autoApproveThreshold.toFixed(2)} automated signoff threshold.`,
    });
    reasons.push(
      `Amount ($${verifiedTotal.toFixed(2)}) exceeds auto-approval cap of $${policy.autoApproveThreshold.toFixed(2)}. Human managerial approval is required.`
    );
    requiresHumanApproval = true;
  } else {
    rules.push({
      ruleId: 'AUTO_APPROVAL_THRESHOLD',
      ruleName: 'Automated Approval Threshold',
      status: 'PASSED',
      severity: 'INFO',
      message: `Order total ($${verifiedTotal.toFixed(2)}) qualifies for automated approval (cap: $${policy.autoApproveThreshold.toFixed(2)}).`,
    });
  }

  // 9. Urgency Review Flag
  if (request.urgency === 'expedited') {
    rules.push({
      ruleId: 'EXPEDITED_ORDER_REVIEW',
      ruleName: 'Expedited Fulfillment Check',
      status: 'FLAGGED',
      severity: 'INFO',
      message: 'Expedited shipping requested. Flagged for review by departmental logistics.',
    });
    // Expedited flag noted in audit
  }

  // Determine Final Policy Decision
  let decision: PolicyDecision;

  if (isBlocked) {
    decision = 'BLOCKED';
    requiresHumanApproval = false; // Blocked orders cannot be sent for approval
  } else if (requiresHumanApproval) {
    decision = 'NEEDS_APPROVAL';
  } else {
    decision = 'ALLOWED';
    reasons.push('All mandatory procurement rules passed. Eligible for instant approval.');
  }

  return {
    decision,
    requiresHumanApproval,
    reasons,
    itemizedCost,
    rules,
    evaluatedAt: new Date().toISOString(),
    policyVersion: policy.policyVersion,
  };
}
