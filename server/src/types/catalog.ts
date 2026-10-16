export interface CatalogItem {
  id: string;
  name: string;
  category: 'IT & Hardware' | 'Office Ergonomics' | 'Software & Cloud' | 'Facility Supplies';
  supplier: string;
  price: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  deliveryDays: number;
  inStock: boolean;
  stockUnits: number;
  specs: Record<string, string>;
  description: string;
  badge?: string;
}

export interface ComparisonOption {
  catalogItem: CatalogItem;
  matchScore: number;
  reason: string;
  pros: string[];
  cons: string[];
  estimatedTotal: number;
  isRecommended: boolean;
}

export interface AnalysisResponsePayload {
  options: ComparisonOption[];
  summary: string;
  provider: 'gemini' | 'rules-engine';
  model: string;
  timestamp: string;
}
