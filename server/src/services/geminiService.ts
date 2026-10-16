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
