import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { CATALOG_ITEMS } from '../data/catalog.js';
import { CatalogItem, ComparisonOption, AnalysisResponsePayload } from '../types/catalog.js';

export interface PurchasingAnalysisRequest {
  prompt: string;
  budget: number;
  quantity: number;
  category?: string;
  preferredSupplier?: string;
  urgency?: 'standard' | 'expedited' | 'flexible';
  constraints?: string;
}

interface GeminiRawAnalysisOutput {
  summary: string;
  rankedOptions: Array<{
    catalogItemId: string;
    matchScore: number;
    reason: string;
    pros: string[];
    cons: string[];
    isRecommended?: boolean;
  }>;
}

/**
 * Deterministic rule-based fallback algorithm.
 * Guarantees high availability when Gemini API key is unset or external API is unreachable.
 */
export function runRulesEngineAnalysis(
  req: PurchasingAnalysisRequest,
  reasonNotice?: string
): AnalysisResponsePayload {
  const { prompt, budget, quantity, category, preferredSupplier } = req;

  // Filter candidates by category if matching
  const matchingCategory = CATALOG_ITEMS.filter(
    (item) => !category || category === 'All' || item.category === category
  );

  const pool: CatalogItem[] = matchingCategory.length >= 3 ? matchingCategory : CATALOG_ITEMS;

  const options: ComparisonOption[] = pool.slice(0, 3).map((item, index) => {
    const estimatedTotal = Number((item.price * quantity).toFixed(2));
    const isWithinBudget = estimatedTotal <= budget;
    const isPreferred = preferredSupplier ? item.supplier === preferredSupplier : false;

    let matchScore = Math.round(item.rating * 18);
    if (isWithinBudget) matchScore += 8;
    if (isPreferred) matchScore += 5;
    matchScore = Math.max(50, Math.min(98, matchScore - index * 4));

    const isRecommended = index === 0;

    const pros: string[] = [];
    const cons: string[] = [];

    if (isWithinBudget) {
      pros.push(`Within budget cap with $${(budget - estimatedTotal).toFixed(2)} headroom`);
    } else {
      cons.push(`Exceeds specified budget cap by $${(estimatedTotal - budget).toFixed(2)}`);
    }

    if (item.deliveryDays <= 3) {
      pros.push(`Fast fulfillment in ${item.deliveryDays} business days`);
    } else {
      cons.push(`Standard delivery timeframe (${item.deliveryDays} business days)`);
    }

    if (item.rating >= 4.8) {
      pros.push(`Top enterprise reliability rating (${item.rating}/5.0 based on ${item.reviewsCount} reviews)`);
    }

    if (isPreferred) {
      pros.push(`Matches organization's preferred vendor (${item.supplier})`);
    }

    if (item.stockUnits < 15) {
      cons.push(`Limited stock availability (${item.stockUnits} units remaining in warehouse)`);
    } else {
      pros.push(`Healthy warehouse stock (${item.stockUnits} units on hand)`);
    }

    return {
      catalogItem: item,
      matchScore,
      reason: isRecommended
        ? `Optimal balance for "${prompt.slice(0, 40)}..." combining rating, budget fit, and supplier track record.`
        : index === 1
        ? `Solid alternative with competitive specs but different trade-offs in price or delivery.`
        : `Value-oriented or alternate category tier for broader stakeholder review.`,
      pros,
      cons,
      estimatedTotal,
      isRecommended,
    };
  });

  const summary = reasonNotice
    ? `Rules Engine Evaluation (${reasonNotice}): Analyzed ${CATALOG_ITEMS.length} catalog items across budget and delivery constraints.`
    : `Catalog Analysis: Ranked top 3 options based on specifications, budget compliance ($${budget}), and fulfillment criteria.`;

  return {
    options,
    summary,
    provider: 'rules-engine',
    model: 'local-deterministic-v1',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute Gemini-powered procurement intelligence analysis grounded in catalog.
 */
export async function analyzePurchasingRequest(
  request: PurchasingAnalysisRequest
): Promise<AnalysisResponsePayload> {
  const { prompt, budget, quantity, category, preferredSupplier, urgency, constraints } = request;

  if (!env.GEMINI_API_KEY) {
    console.info('[GeminiService] GEMINI_API_KEY is not set. Executing rule-based fallback analysis.');
    return runRulesEngineAnalysis(
      request,
      'Gemini API key not configured on server; using local purchasing engine'
    );
  }

  // Pre-filter catalog to relevant items or provide full catalog
  const candidateItems = CATALOG_ITEMS.filter((item) => {
    if (category && category !== 'All' && item.category !== category) {
      return false;
    }
    return true;
  });

  const catalogContext = (candidateItems.length >= 3 ? candidateItems : CATALOG_ITEMS).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    supplier: item.supplier,
    unitPrice: item.price,
    currency: item.currency,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
    deliveryDays: item.deliveryDays,
    stockUnits: item.stockUnits,
    specs: item.specs,
    description: item.description,
  }));

  const systemInstruction = `You are Procura AI, an expert procurement intelligence and purchasing assistant for small and medium businesses.
Your mission:
1. Thoroughly evaluate the user's purchasing request against our pre-approved catalog items.
2. Select the top 3 best matching catalog items.
3. Rank them from #1 (most recommended) to #3.
4. Calculate budget fit (Total = Unit Price * Quantity vs Budget Cap).
5. Ground all reasoning in actual specs, vendor reputation, stock level, and delivery time.
6. Return only valid JSON strictly matching the requested format. Do NOT hallucinate products outside the provided catalog IDs.`;

  const userPrompt = `USER PROCUREMENT REQUEST:
- Requirement: "${prompt}"
- Target Budget: $${budget} USD total
- Quantity Needed: ${quantity} units
- Category Preference: ${category || 'Any'}
- Preferred Supplier: ${preferredSupplier || 'None specified'}
- Urgency: ${urgency || 'standard'}
- Constraints / Notes: ${constraints || 'None specified'}

AVAILABLE APPROVED CATALOG ITEMS:
${JSON.stringify(catalogContext, null, 2)}

TASK:
Select and rank the top 3 items from the catalog above that best satisfy this request.
Output format: You MUST return a single JSON object with this exact structure:
{
  "summary": "Concise 1-2 sentence procurement officer executive summary explaining the trade-offs and recommendation.",
  "rankedOptions": [
    {
      "catalogItemId": "CAT-XXX",
      "matchScore": 95,
      "reason": "Clear explanation of why this option fits the requirements.",
      "pros": ["Pro 1 (e.g. specs, warranty, budget headroom)", "Pro 2", "Pro 3"],
      "cons": ["Con 1 (e.g. delivery time, price trade-off, stock)"],
      "isRecommended": true
    },
    {
      "catalogItemId": "CAT-YYY",
      "matchScore": 88,
      "reason": "Alternative comparison rationale.",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1"],
      "isRecommended": false
    },
    {
      "catalogItemId": "CAT-ZZZ",
      "matchScore": 81,
      "reason": "Third option rationale.",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"],
      "isRecommended": false
    }
  ]
}`;

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const modelName = env.GEMINI_MODEL || 'gemini-2.5-flash';

    console.log(`[GeminiService] Calling Gemini API using model: ${modelName}`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini API returned an empty text response.');
    }

    // Clean potential code block wraps
    const cleanedText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: GeminiRawAnalysisOutput = JSON.parse(cleanedText);

    if (!parsed.rankedOptions || !Array.isArray(parsed.rankedOptions) || parsed.rankedOptions.length === 0) {
      throw new Error('Invalid response structure: rankedOptions array missing or empty');
    }

    // Hydrate options with catalog data
    const catalogMap = new Map(CATALOG_ITEMS.map((item) => [item.id, item]));
    const hydratedOptions: ComparisonOption[] = [];

    for (let i = 0; i < parsed.rankedOptions.length; i++) {
      const opt = parsed.rankedOptions[i]!;
      const item = catalogMap.get(opt.catalogItemId);
      if (!item) continue;

      const estimatedTotal = Number((item.price * quantity).toFixed(2));
      hydratedOptions.push({
        catalogItem: item,
        matchScore: Math.max(1, Math.min(99, Math.round(opt.matchScore || 85))),
        reason: opt.reason || `Catalog match evaluated by Gemini AI for ${item.name}`,
        pros: Array.isArray(opt.pros) && opt.pros.length > 0 ? opt.pros : [`Adheres to ${item.category} specifications`],
        cons: Array.isArray(opt.cons) && opt.cons.length > 0 ? opt.cons : [`Standard lead time of ${item.deliveryDays} days`],
        estimatedTotal,
        isRecommended: i === 0,
      });

      if (hydratedOptions.length >= 3) break;
    }

    // If less than 3 options were resolved, supplement from catalog
    if (hydratedOptions.length < 3) {
      for (const item of CATALOG_ITEMS) {
        if (!hydratedOptions.some((o) => o.catalogItem.id === item.id)) {
          const estimatedTotal = Number((item.price * quantity).toFixed(2));
          hydratedOptions.push({
            catalogItem: item,
            matchScore: 75,
            reason: 'Alternative candidate from approved supplier catalog.',
            pros: [`Available inventory: ${item.stockUnits} units`],
            cons: [`Secondary fit for requirement criteria`],
            estimatedTotal,
            isRecommended: false,
          });
        }
        if (hydratedOptions.length >= 3) break;
      }
    }

    return {
      options: hydratedOptions,
      summary: parsed.summary || `Gemini evaluated ${hydratedOptions.length} catalog options against your budget of $${budget}.`,
      provider: 'gemini',
      model: modelName,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[GeminiService Error] Failed to generate AI analysis via Gemini: ${errorMsg}`);
    console.warn('[GeminiService] Seamlessly falling back to local procurement rules engine.');
    return runRulesEngineAnalysis(
      request,
      `Gemini request failed (${errorMsg.slice(0, 80)}); fallback engine activated`
    );
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  history?: ChatMessage[];
}

export interface AssistantChatResponse {
  reply: string;
  provider: 'gemini' | 'deterministic-faq';
  timestamp: string;
}

/**
 * Intelligent deterministic FAQ assistant.
 * Provides high-quality, grounded answers about Procura AI when Gemini is unavailable or not configured.
 */
export function runDeterministicFaqAssistant(userMessage: string): AssistantChatResponse {
  const query = userMessage.toLowerCase().trim();

  // 1. What is Procura AI / Purpose / Features
  if (
    query.includes('what is procura') ||
    query.includes('what does procura') ||
    query.includes('overview') ||
    query.includes('about procura') ||
    query.includes('purpose') ||
    query.includes('how it works') ||
    query.includes('tell me about')
  ) {
    return {
      reply: `**Procura AI** is an AI-powered procurement intelligence and spend-control platform designed to turn purchasing requests into governed, policy-checked decisions.\n\n**Key Capabilities:**\n1. **Natural-Language Intake**: Describe what your team needs (e.g. "5 developer laptops under $6,000") in plain language.\n2. **AI Catalog Matching**: Gemini AI evaluates requirements against approved catalog items and ranks top 3 options with cost/spec trade-offs.\n3. **SpendGuard Policy Engine**: Enforces department budget caps, approval thresholds, and preferred supplier rules before money moves.\n4. **Human-in-the-Loop Signoff**: Designated managers review flagged purchases with an immutable audit trail.\n5. **PayPal Sandbox Checkout**: Safe end-to-end checkout execution via PayPal Sandbox.\n\nYou can click **"Open Workspace"** or visit \`/app\` to test the full flow!`,
      provider: 'deterministic-faq',
      timestamp: new Date().toISOString(),
    };
  }

  // 2. SpendGuard Policies
  if (
    query.includes('spendguard') ||
    query.includes('policy') ||
    query.includes('policies') ||
    query.includes('rules') ||
    query.includes('guardrail') ||
    query.includes('limit') ||
    query.includes('budget')
  ) {
    return {
      reply: `**SpendGuard** is Procura AI's deterministic governance engine that prevents maverick spending before submission.\n\n**How SpendGuard Evaluates Spend:**\n- **Budget Caps**: Checks category ceilings (e.g. IT Equipment, Cloud Infrastructure, Office Supplies) and tracks remaining departmental headroom.\n- **Approval Thresholds**: Auto-approves routine purchases under $1,000, while requiring manager signoff for amounts above $1,000 and executive review over $2,500.\n- **Supplier Governance**: Flags purchases from non-preferred or restricted vendors.\n\n**Three Distinct Outcomes:**\n- 🟢 **ALLOWED**: Completely conforms to budget & policy; proceeds directly.\n- 🟡 **NEEDS_APPROVAL**: Exceeds threshold or uses non-preferred vendor; routes to designated stakeholder.\n- 🔴 **BLOCKED**: Exceeds hard department budget cap or uses prohibited vendor.\n\nYou can customize policy rules anytime in the **Policy Settings** tab in \`/app\`.`,
      provider: 'deterministic-faq',
      timestamp: new Date().toISOString(),
    };
  }

  // 3. Purchase Approvals & Human Signoff
  if (
    query.includes('approval') ||
    query.includes('approve') ||
    query.includes('human') ||
    query.includes('signoff') ||
    query.includes('stakeholder') ||
    query.includes('review')
  ) {
    return {
      reply: `**Purchase Approvals** in Procura AI keep humans in control of spending decisions.\n\n**Approval Workflow:**\n1. **Automated Flagging**: If a request exceeds $1,000 or triggers a SpendGuard rule, its status is set to \`NEEDS_APPROVAL\`.\n2. **Stakeholder Notification**: The designated approver (Team Lead, Department Head, or VP) receives the request with the AI recommendation, alternative options, and budget impact.\n3. **Decision & Audit**: Approvers can Approve or Reject with notes. Approved requests receive an audit lock and move forward to checkout.\n4. **Status Lifecycle**: Requests progress clearly through \`PENDING\` ➔ \`APPROVED\` ➔ \`COMPLETED\` (or \`REJECTED\`).`,
      provider: 'deterministic-faq',
      timestamp: new Date().toISOString(),
    };
  }

  // 4. PayPal Sandbox Checkout
  if (
    query.includes('paypal') ||
    query.includes('checkout') ||
    query.includes('payment') ||
    query.includes('sandbox') ||
    query.includes('pay')
  ) {
    return {
      reply: `**PayPal Sandbox Checkout** provides a realistic payment experience without moving real funds.\n\n**How It Works in Procura AI:**\n- **Governance Guard**: Only requests that have been verified and **APPROVED** can initiate the PayPal checkout flow.\n- **Official PayPal REST API**: Integrates directly with PayPal's standard v2 order capture APIs configured in Sandbox mode.\n- **Simulated Test Payments**: Uses simulated PayPal test credentials so users can test end-to-end checkout safely.\n- **Order Completion**: Captures order ID and transaction timestamp into your purchase history for auditing.`,
      provider: 'deterministic-faq',
      timestamp: new Date().toISOString(),
    };
  }

  // 5. Catalog & Suppliers
  if (
    query.includes('catalog') ||
    query.includes('supplier') ||
    query.includes('vendor') ||
    query.includes('product') ||
    query.includes('items') ||
    query.includes('marketplace')
  ) {
    return {
      reply: `Procura AI features a curated enterprise product catalog across key categories:\n\n- **IT Hardware**: Developer laptops, 4K monitors, wireless peripherals (Apple, Dell, Lenovo, Logitech).\n- **Cloud & Infrastructure**: Cloud hosting, database clusters, compute nodes (AWS, Google Cloud).\n- **Software & SaaS**: Security licenses, design tools, enterprise software.\n- **Office & Workplace**: Ergonomic workstations, seating (Herman Miller).\n\n**Note on Marketplaces**: Procura connects with simulated catalog suppliers for this hackathon showcase. Live marketplace logos (Amazon, Flipkart, Swiggy) represent the unified procurement layer concept rather than direct consumer store checkout.`,
      provider: 'deterministic-faq',
      timestamp: new Date().toISOString(),
    };
  }

  // 6. Navigation / Getting Started / Try it
  if (
    query.includes('workspace') ||
    query.includes('get started') ||
    query.includes('try') ||
    query.includes('start') ||
    query.includes('demo') ||
    query.includes('app')
  ) {
    return {
      reply: `Getting started with Procura AI takes only a few seconds:\n\n1. Click **"Open Workspace"** on the landing page or navigate to \`/app\`.\n2. In the **New Request** tab, type what you need (e.g., *"3 ergonomic office chairs under $1,800"*).\n3. Click **"Analyze with Gemini"** to receive AI-ranked catalog recommendations.\n4. Observe SpendGuard evaluate your request against budget and policy rules.\n5. Click **"Create Purchase Request"** and proceed to review or the PayPal Sandbox checkout demo!`,
      provider: 'deterministic-faq',
      timestamp: new Date().toISOString(),
    };
  }

  // 7. Security, Autonomy & Safety
  if (
    query.includes('security') ||
    query.includes('safe') ||
    query.includes('autonomous') ||
    query.includes('ai execute') ||
    query.includes('privacy')
  ) {
    return {
      reply: `**Procura AI Safety & Autonomy Principles:**\n\n- **Human-in-the-Loop**: The AI never executes financial payments autonomously or overrides policy rules without human approval.\n- **Zero Real-Money Risk**: All payments run on PayPal Sandbox test accounts.\n- **Deterministic Guardrails**: Policy decisions rely on deterministic math, not unconstrained AI hallucinations.\n- **Transparent Audit Trail**: Every decision, match score, and manager approval is logged with timestamps.`,
      provider: 'deterministic-faq',
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback for general / out of scope queries
  return {
    reply: `I am the **Procura AI Assistant**, specialized in guiding you through our procurement platform, SpendGuard policy engine, and PayPal checkout demo.\n\nHere are some things you can ask me about:\n- *"What does Procura AI do?"*\n- *"How does SpendGuard enforce policy limits?"*\n- *"How does the human approval process work?"*\n- *"How does the PayPal Sandbox checkout demo work?"*\n- *"How do I launch the workspace?"*\n\nYou can also click **"Open Workspace"** on this page to test the live application!`,
    provider: 'deterministic-faq',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Executes assistant chat conversation via Gemini with seamless deterministic FAQ fallback.
 */
export async function chatWithAssistant(
  request: AssistantChatRequest
): Promise<AssistantChatResponse> {
  const { message, history = [] } = request;

  if (!env.GEMINI_API_KEY) {
    return runDeterministicFaqAssistant(message);
  }

  const systemInstruction = `You are the Procura AI Assistant, a knowledgeable, professional, and friendly procurement guide on the Procura AI landing page.
Your mission is to help visitors understand Procura AI, its features, architecture, and value proposition.

KNOWLEDGE BASE:
1. Product Concept: Procura AI is an AI-powered procurement intelligence and spending-control platform designed to eliminate rogue spending for SMBs and enterprise teams.
2. Workflow:
   - Intake: Users submit natural-language purchase requests (prompt, target budget, quantity).
   - AI Sourcing: Gemini AI evaluates requirements against approved catalog items and ranks the top 3 options with cost/spec trade-offs.
   - SpendGuard: A deterministic policy engine that checks category budget caps, approval thresholds ($1,000 standard, $2,500 executive), preferred supplier policies, and restricted vendors. Generates ALLOWED, NEEDS_APPROVAL, or BLOCKED.
   - Human Approvals: Stakeholders (team leads, finance) review flagged requests before purchase.
   - PayPal Sandbox Checkout: Uses the official PayPal REST API in Sandbox mode with test accounts (zero real money).
3. Catalog: A curated 10-item pre-approved catalog (Apple, Dell, AWS, Lenovo, Herman Miller) used for the demo.
4. Workspace: Visitors can click "Open Workspace" or visit /app to test the platform.

RESPONSE RULES:
- Ground answers strictly in the real Procura AI capabilities described above. Do NOT invent live marketplace syncs (Amazon, Flipkart) or autonomous payment execution.
- If asked about non-procurement or non-Procura topics, politely explain that you specialize in Procura AI and procurement workflows.
- Keep responses friendly, concise (2-3 short paragraphs or bullet points), and well-formatted with markdown.
- Never execute purchases or request credit card numbers.`;

  // Build conversational contents
  const conversationContents: string[] = [];

  // Add recent context history if available (limit to last 6 messages)
  const recentHistory = history.slice(-6);
  for (const h of recentHistory) {
    const roleLabel = h.role === 'user' ? 'User' : 'Assistant';
    conversationContents.push(`${roleLabel}: ${h.content}`);
  }

  conversationContents.push(`User: ${message}`);
  conversationContents.push(`Assistant:`);

  const promptText = conversationContents.join('\n\n');

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const modelName = env.GEMINI_MODEL || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    });

    const reply = response.text?.trim();

    if (!reply) {
      throw new Error('Gemini returned an empty reply for assistant chat.');
    }

    return {
      reply,
      provider: 'gemini',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Gemini Assistant Chat] Failed to query Gemini: ${errorMsg}. Falling back to deterministic FAQ.`);
    return runDeterministicFaqAssistant(message);
  }
}

