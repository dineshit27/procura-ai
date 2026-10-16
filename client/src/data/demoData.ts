import { CatalogItem, PurchaseRequest, ActivityItem, ProcurementSettings, ComparisonOption } from '../types';

export const INITIAL_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'CAT-101',
    name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
    category: 'IT & Hardware',
    supplier: 'Apex Business Hardware (Demo Supplier)',
    price: 529.00,
    currency: 'USD',
    rating: 4.8,
    reviewsCount: 142,
    deliveryDays: 3,
    inStock: true,
    stockUnits: 28,
    specs: {
      'Panel': 'IPS Black Technology',
      'Resolution': '3840 x 2160 (4K UHD)',
      'Connectivity': 'USB-C 90W PD, RJ45, DP 1.4, HDMI',
      'Warranty': '3 Years Advanced Exchange'
    },
    description: 'Premier productivity monitor with built-in KVM switch and 90W single-cable power delivery for laptops.',
    badge: 'Popular Choice'
  },
  {
    id: 'CAT-102',
    name: 'Logitech MX Master 3S Wireless Performance Mouse',
    category: 'IT & Hardware',
    supplier: 'Apex Business Hardware (Demo Supplier)',
    price: 99.00,
    currency: 'USD',
    rating: 4.9,
    reviewsCount: 310,
    deliveryDays: 2,
    inStock: true,
    stockUnits: 75,
    specs: {
      'Sensor': 'Darkfield 8000 DPI',
      'Connectivity': 'Bluetooth Low Energy & Logi Bolt',
      'Battery': 'Up to 70 days per charge',
      'Quiet Clicks': '90% noise reduction'
    },
    description: 'Ergonomic performance mouse engineered for precision, quiet workflow, and cross-computer flow.',
    badge: 'Top Rated'
  },
  {
    id: 'CAT-103',
    name: 'ErgoPro Electric Height-Adjustable Standing Desk (60" x 30")',
    category: 'Office Ergonomics',
    supplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
    price: 489.00,
    currency: 'USD',
    rating: 4.7,
    reviewsCount: 88,
    deliveryDays: 5,
    inStock: true,
    stockUnits: 14,
    specs: {
      'Height Range': '28" to 48" dual motor',
      'Weight Capacity': '280 lbs',
      'Desktop': 'FSC-Certified Solid Bamboo',
      'Controller': '4 memory presets + USB-A charging'
    },
    description: 'Commercial-grade dual-motor electric sit-stand workstation with anti-collision sensors and cable management tray.',
    badge: 'Eco Choice'
  },
  {
    id: 'CAT-104',
    name: 'Herman Miller Aeron Chair (Size B - Fully Loaded)',
    category: 'Office Ergonomics',
    supplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
    price: 1195.00,
    currency: 'USD',
    rating: 4.9,
    reviewsCount: 220,
    deliveryDays: 7,
    inStock: true,
    stockUnits: 9,
    specs: {
      'Material': 'Pellicle 8Z breathable suspension',
      'Support': 'PostureFit SL adjustable sacral/lumbar',
      'Armrests': 'Fully adjustable (height, angle, depth)',
      'Warranty': '12-year official manufacturer warranty'
    },
    description: 'The gold standard in ergonomic office seating. Designed to keep the body cool and properly supported during long work shifts.',
    badge: 'Premium Tier'
  },
  {
    id: 'CAT-105',
    name: 'Steelcase Gesture Ergonomic Office Task Chair',
    category: 'Office Ergonomics',
    supplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
    price: 940.00,
    currency: 'USD',
    rating: 4.7,
    reviewsCount: 94,
    deliveryDays: 4,
    inStock: true,
    stockUnits: 18,
    specs: {
      'Core Equalizer': 'LiveBack technology adapts to posture',
      'Arms': '360-degree rotating arms for tablet/phone use',
      'Weight Limit': '400 lbs',
      'Fabric': 'High-durability commercial woven yarn'
    },
    description: 'Ergonomic task chair crafted for modern multi-device postures with comprehensive back support.'
  },
  {
    id: 'CAT-106',
    name: 'Slack Business+ Enterprise Workspace (Annual Seat)',
    category: 'Software & Cloud',
    supplier: 'CloudScale Distribution (Demo Supplier)',
    price: 180.00,
    currency: 'USD',
    rating: 4.8,
    reviewsCount: 512,
    deliveryDays: 1,
    inStock: true,
    stockUnits: 999,
    specs: {
      'SLA': '99.99% guaranteed uptime',
      'Compliance': 'SAML-based SSO & custom data retention',
      'Integrations': 'Unlimited apps + Slack Connect',
      'Billing': 'Annual per-seat prepaid voucher'
    },
    description: 'Collaborative messaging platform designed to connect teams with advanced security and audit logging.',
    badge: 'Instant Provisioning'
  },
  {
    id: 'CAT-107',
    name: 'GitHub Enterprise Cloud (Annual Organization Seat)',
    category: 'Software & Cloud',
    supplier: 'CloudScale Distribution (Demo Supplier)',
    price: 252.00,
    currency: 'USD',
    rating: 4.9,
    reviewsCount: 380,
    deliveryDays: 1,
    inStock: true,
    stockUnits: 999,
    specs: {
      'Storage': '50GB Git LFS included',
      'CI/CD': '50,000 GitHub Actions build minutes/month',
      'Security': 'Secret scanning & automated code scanning alerts',
      'Support': 'Enterprise 24/7 priority SLA'
    },
    description: 'Complete developer platform with automated security checks, code scanning, and team governance.',
    badge: 'Essential DevOps'
  },
  {
    id: 'CAT-108',
    name: 'Lenovo ThinkPad Universal Thunderbolt 4 Dock',
    category: 'IT & Hardware',
    supplier: 'Apex Business Hardware (Demo Supplier)',
    price: 279.00,
    currency: 'USD',
    rating: 4.6,
    reviewsCount: 67,
    deliveryDays: 3,
    inStock: true,
    stockUnits: 32,
    specs: {
      'Max Displays': 'Up to four 4K @ 60Hz screens',
      'Host Power': 'Up to 100W PD passthrough',
      'Ports': 'Thunderbolt 4, 4x USB-A 3.2, Gigabit Ethernet, 3.5mm audio',
      'Compatibility': 'Universal Windows, macOS & Linux support'
    },
    description: 'Enterprise grade docking hub supporting 8K output or quad 4K monitors with single cable connectivity.'
  },
  {
    id: 'CAT-109',
    name: 'EcoCare Commercial 100% Recycled Breakroom Essentials Kit',
    category: 'Facility Supplies',
    supplier: 'EcoClean Operations (Demo Supplier)',
    price: 135.00,
    currency: 'USD',
    rating: 4.5,
    reviewsCount: 45,
    deliveryDays: 2,
    inStock: true,
    stockUnits: 60,
    specs: {
      'Contents': '12 rolls 2-ply towels, 48 multi-fold packs, 100% compostable cups',
      'Certifications': 'FSC & Green Seal certified',
      'Packaging': 'Zero plastic packaging',
      'Shelf Life': 'Indefinite'
    },
    description: 'Sustainable commercial consumable bundle tailored for small business offices of 15-30 people.'
  },
  {
    id: 'CAT-110',
    name: 'Sanitaire Commercial Heavy-Duty QuietClean Vacuum Cleaner',
    category: 'Facility Supplies',
    supplier: 'EcoClean Operations (Demo Supplier)',
    price: 319.00,
    currency: 'USD',
    rating: 4.6,
    reviewsCount: 31,
    deliveryDays: 4,
    inStock: true,
    stockUnits: 12,
    specs: {
      'Filtration': 'Clean-drop sealed HEPA system',
      'Noise Level': '68 dBA quiet daytime operation',
      'Cord Length': '50 ft commercial quick-change power cord',
      'Certification': 'CRI Gold certified'
    },
    description: 'High-durability commercial upright vacuum certified for daytime building cleaning with sealed HEPA filtration.'
  }
];

export const INITIAL_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 'REQ-2026-081',
    title: 'Dual 4K Workstation Monitors for New Senior Frontend Dev',
    category: 'IT & Hardware',
    prompt: 'Need two 27-inch 4K color-calibrated monitors with USB-C single cable dock connection for onboarding workstation.',
    budgetLimit: 1200.00,
    quantity: 2,
    preferredSupplier: 'Apex Business Hardware (Demo Supplier)',
    createdAt: '2026-10-12T14:32:00Z',
    status: 'approved',
    estimatedTotal: 1058.00,
    selectedSupplier: 'Apex Business Hardware (Demo Supplier)',
    selectedItemName: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
    urgency: 'standard',
    complianceNotes: 'Within $1,200 budget limit ($142 savings). Approved by Engineering Lead.'
  },
  {
    id: 'REQ-2026-080',
    title: 'Ergonomic Task Seating for Remote Operations Manager',
    category: 'Office Ergonomics',
    prompt: 'Require high-back ergonomic lumbar support chair for remote home office setup with heavy daily usage.',
    budgetLimit: 1000.00,
    quantity: 1,
    preferredSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
    createdAt: '2026-10-11T09:15:00Z',
    status: 'pending_approval',
    estimatedTotal: 940.00,
    selectedSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
    selectedItemName: 'Steelcase Gesture Ergonomic Office Task Chair',
    urgency: 'flexible',
    complianceNotes: 'Matches $1,000 threshold. Awaiting Finance department final signoff.'
  },
  {
    id: 'REQ-2026-079',
    title: 'Q4 Annual Cloud Developer Seat Subscriptions (5 seats)',
    category: 'Software & Cloud',
    prompt: 'Annual renewal for 5 GitHub Enterprise developer seats to maintain automated code scanning and CI/CD pipelines.',
    budgetLimit: 1300.00,
    quantity: 5,
    preferredSupplier: 'CloudScale Distribution (Demo Supplier)',
    createdAt: '2026-10-09T11:20:00Z',
    status: 'paid',
    estimatedTotal: 1260.00,
    selectedSupplier: 'CloudScale Distribution (Demo Supplier)',
    selectedItemName: 'GitHub Enterprise Cloud (Annual Organization Seat)',
    urgency: 'standard',
    complianceNotes: 'Processed via PayPal Sandbox Mock Settlement. Verification ref: #DEMO-PAY-9812.'
  },
  {
    id: 'REQ-2026-078',
    title: 'Standing Desk Setup for Customer Support Pod',
    category: 'Office Ergonomics',
    prompt: 'Two motorized height-adjustable desks with cable trays for rotating support reps.',
    budgetLimit: 950.00,
    quantity: 2,
    preferredSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
    createdAt: '2026-10-05T16:45:00Z',
    status: 'draft',
    estimatedTotal: 978.00,
    selectedSupplier: 'Kinetic Workspaces Ltd. (Demo Supplier)',
    selectedItemName: 'ErgoPro Electric Height-Adjustable Standing Desk',
    urgency: 'flexible',
    complianceNotes: 'Exceeds target budget by $28. Draft preserved for budget revision.'
  },
  {
    id: 'REQ-2026-077',
    title: 'High-Speed Wireless Peripherals Kit (Mice & Docks)',
    category: 'IT & Hardware',
    prompt: 'Bundle of 3 performance mice and 1 universal dock for conference room hot-desking station.',
    budgetLimit: 550.00,
    quantity: 1,
    preferredSupplier: 'Apex Business Hardware (Demo Supplier)',
    createdAt: '2026-10-01T10:00:00Z',
    status: 'cancelled',
    estimatedTotal: 576.00,
    selectedSupplier: 'Apex Business Hardware (Demo Supplier)',
    selectedItemName: 'Logitech MX Master 3S + Lenovo TB4 Dock',
    urgency: 'standard',
    complianceNotes: 'Cancelled by requester due to office layout redesign.'
  },
  {
    id: 'REQ-2026-076',
    title: 'Custom Fabric Acoustic Desk Divider Panels',
    category: 'Office Ergonomics',
    prompt: '4 acoustic dampening modular screens for open floorplan meeting zones.',
    budgetLimit: 400.00,
    quantity: 4,
    createdAt: '2026-09-28T13:10:00Z',
    status: 'failed',
    estimatedTotal: 460.00,
    urgency: 'expedited',
    complianceNotes: 'Vendor out of stock for requested dimensions during payment simulation.'
  }
];

export const INITIAL_ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'ACT-501',
    title: 'Purchase Request Approved',
    description: 'REQ-2026-081 (Dual 4K Monitors) approved by Procurement Admin.',
    timestamp: '2 hours ago',
    type: 'approval_granted',
    amount: 1058.00
  },
  {
    id: 'ACT-502',
    title: 'New Request Queued for Review',
    description: 'REQ-2026-080 (Steelcase Gesture) submitted with compliance analysis.',
    timestamp: 'Yesterday at 09:15',
    type: 'request_created',
    amount: 940.00
  },
  {
    id: 'ACT-503',
    title: 'Catalog Price Synchronized',
    description: 'Apex Business Hardware updated inventory for U2723QE (28 units).',
    timestamp: '2 days ago',
    type: 'catalog_updated'
  },
  {
    id: 'ACT-504',
    title: 'Demo Settlement Completed',
    description: 'REQ-2026-079 settled in PayPal Sandbox Mock environment.',
    timestamp: '5 days ago',
    type: 'status_changed',
    amount: 1260.00
  },
  {
    id: 'ACT-505',
    title: 'Procurement Policy Updated',
    description: 'Single-order auto-approval threshold set to $500.00.',
    timestamp: '1 week ago',
    type: 'settings_saved'
  }
];

export const INITIAL_SETTINGS: ProcurementSettings = {
  departmentName: 'Engineering & Operations',
  defaultBudgetLimit: 1500.00,
  autoApproveThreshold: 500.00,
  currency: 'USD',
  requirePreferredSupplier: true,
  approvedSuppliers: [
    'Apex Business Hardware (Demo Supplier)',
    'Kinetic Workspaces Ltd. (Demo Supplier)',
    'CloudScale Distribution (Demo Supplier)',
    'EcoClean Operations (Demo Supplier)'
  ],
  notificationEmail: 'procurement-team@acme-corp.demo'
};

/**
 * Deterministic local catalog evaluation matching algorithm.
 * Evaluates the user's natural language request, category, budget and quantity
 * against local demo items and produces a ranked comparison matrix.
 * Note: Clearly labelled as a demo simulation.
 */
export function generateDemoAnalysis(
  _prompt: string,
  budget: number,
  quantity: number,
  category: string,
  preferredSupplier?: string
): ComparisonOption[] {
  // Filter catalog by category if specified, otherwise consider relevant items
  const candidates = INITIAL_CATALOG_ITEMS.filter((item) => {
    if (category && category !== 'All' && item.category !== category) {
      return false;
    }
    return true;
  });

  const pool = candidates.length >= 3 ? candidates : INITIAL_CATALOG_ITEMS;

  return pool.slice(0, 3).map((item, index) => {
    const estimatedTotal = item.price * quantity;
    const isWithinBudget = estimatedTotal <= budget;
    const isPreferred = preferredSupplier ? item.supplier === preferredSupplier : true;

    // Calculate match score based on budget fit, rating, and supplier alignment
    let matchScore = Math.round(item.rating * 18); // base ~80-90
    if (isWithinBudget) matchScore += 8;
    if (isPreferred) matchScore += 4;
    matchScore = Math.min(matchScore, 98) - (index * 4);

    const isRecommended = index === 0 && isWithinBudget;

    const pros: string[] = [];
    const cons: string[] = [];

    if (isWithinBudget) {
      pros.push(`Fits target budget with $${(budget - estimatedTotal).toFixed(2)} headroom`);
    } else {
      cons.push(`Exceeds specified budget cap by $${(estimatedTotal - budget).toFixed(2)}`);
    }

    if (item.deliveryDays <= 3) {
      pros.push(`Fast fulfillment (${item.deliveryDays} business days)`);
    } else {
      cons.push(`Standard shipping timeline (${item.deliveryDays} days)`);
    }

    if (item.rating >= 4.8) {
      pros.push(`Top-rated enterprise reliability (${item.rating}/5.0 from ${item.reviewsCount} reviews)`);
    }

    if (item.stockUnits < 15) {
      cons.push(`Limited availability (${item.stockUnits} units left in stock)`);
    } else {
      pros.push(`Healthy warehouse stock (${item.stockUnits} units available)`);
    }

    return {
      catalogItem: item,
      matchScore,
      reason: isRecommended
        ? 'Optimal balance of specification adherence, supplier rating, and budget headroom.'
        : index === 1
        ? 'Secondary alternative with high satisfaction score but tighter delivery buffer.'
        : 'Value or alternate configuration tier for consideration.',
      pros,
      cons,
      estimatedTotal,
      isRecommended: index === 0
    };
  });
}
