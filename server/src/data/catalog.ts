import { CatalogItem } from '../types/catalog.js';

export const CATALOG_ITEMS: CatalogItem[] = [
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
