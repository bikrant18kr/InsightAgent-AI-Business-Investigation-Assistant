// server/db/seedData.js
// Deterministic synthetic business dataset designed with exact known figures

export const categories = [
  { id: 'cat-electronics', name: 'Electronics' },
  { id: 'cat-apparel', name: 'Apparel' },
  { id: 'cat-home', name: 'Home & Kitchen' }
];

export const products = [
  { id: 'prod-headphones', name: 'Wireless Headphones', category_id: 'cat-electronics' },
  { id: 'prod-smartwatch', name: 'Fitness Smartwatch', category_id: 'cat-electronics' },
  { id: 'prod-jacket', name: 'Winter Parka', category_id: 'cat-apparel' },
  { id: 'prod-shoes', name: 'Running Shoes', category_id: 'cat-apparel' },
  { id: 'prod-blender', name: 'High-Speed Blender', category_id: 'cat-home' }
];

/*
DEMO CASE 1: Revenue decline
Q1 2024 (Jan 1 - Mar 31):
  Total Revenue: ₹12,000.00
  Breakdown by Category:
    - Electronics: ₹6,000.00 (6 orders of ₹1,000 each)
    - Apparel: ₹4,000.00 (4 orders of ₹1,000 each)
    - Home & Kitchen: ₹2,000.00 (2 orders of ₹1,000 each)

Q2 2024 (Apr 1 - Jun 30):
  Total Revenue: ₹9,000.00 (Decline of ₹3,000.00 or -25.0%)
  Breakdown by Category:
    - Electronics: ₹3,000.00 (Decline of ₹3,000.00, 100% contribution to total revenue drop!)
    - Apparel: ₹4,000.00 (Unchanged)
    - Home & Kitchen: ₹2,000.00 (Unchanged)

DEMO CASE 2: Cost increase
Apparel segment:
Q1 2024 (Jan 1 - Mar 31):
  - 4 units ordered at unit_cost ₹400.00 => Total Cost = ₹1,600.00
Q2 2024 (Apr 1 - Jun 30):
  - 4 units ordered at unit_cost ₹650.00 (Supplier fabric surcharge) => Total Cost = ₹2,600.00
  Total Cost increased by ₹1,000.00 (+62.5%) even though units remained constant (4 units vs 4 units).
  Unit cost jumped from ₹400 to ₹650.

DEMO CASE 3: Return Window Policy Effect
Policy effective date: 2024-05-01
Electronics return window extended from 14 days to 45 days. Apparel left unchanged at 14 days.
Pre-policy cohort (Orders placed 2024-03-01 to 2024-04-30):
  Electronics:
    - 4 orders placed
    - 0 returned (Return rate: 0.0%)
  Apparel:
    - 3 orders placed
    - 0 returned (Return rate: 0.0%)

Post-policy cohort (Orders placed 2024-05-01 to 2024-06-30):
  Electronics (Affected segment):
    - 4 orders placed
    - 2 returned (Return rate: 50.0%, an increase of +50.0 percentage points)
  Apparel (Control / Unaffected segment):
    - 3 orders placed
    - 0 returned (Return rate: 0.0%, unchanged)
*/

export const orders = [
  // --- Q1 2024 Orders (Jan 1 - Mar 31) ---
  // Electronics Q1 (6 orders, ₹1,000 revenue each, unit_cost ₹500)
  { id: 'ord-101', order_date: '2024-01-15', region: 'North', channel: 'Online', customer_id: 'cust-1' },
  { id: 'ord-102', order_date: '2024-01-28', region: 'South', channel: 'Retail', customer_id: 'cust-2' },
  { id: 'ord-103', order_date: '2024-02-10', region: 'West', channel: 'Online', customer_id: 'cust-3' },
  { id: 'ord-104', order_date: '2024-02-22', region: 'North', channel: 'Direct', customer_id: 'cust-4' },
  { id: 'ord-105', order_date: '2024-03-12', region: 'South', channel: 'Online', customer_id: 'cust-5' },
  { id: 'ord-106', order_date: '2024-03-25', region: 'West', channel: 'Retail', customer_id: 'cust-6' },

  // Apparel Q1 (4 orders, ₹1,000 revenue each, unit_cost ₹400)
  { id: 'ord-107', order_date: '2024-01-20', region: 'North', channel: 'Online', customer_id: 'cust-7' },
  { id: 'ord-108', order_date: '2024-02-14', region: 'South', channel: 'Retail', customer_id: 'cust-8' },
  { id: 'ord-109', order_date: '2024-03-05', region: 'North', channel: 'Online', customer_id: 'cust-9' },
  { id: 'ord-110', order_date: '2024-03-20', region: 'West', channel: 'Direct', customer_id: 'cust-10' },

  // Home Q1 (2 orders, ₹1,000 revenue each, unit_cost ₹450)
  { id: 'ord-111', order_date: '2024-01-10', region: 'North', channel: 'Online', customer_id: 'cust-11' },
  { id: 'ord-112', order_date: '2024-02-18', region: 'East', channel: 'Retail', customer_id: 'cust-12' },

  // --- Q2 2024 Orders (Apr 1 - Jun 30) ---
  // Electronics Q2 (Only 3 orders, ₹1,000 revenue each => ₹3,000 total)
  { id: 'ord-201', order_date: '2024-04-10', region: 'North', channel: 'Online', customer_id: 'cust-13' },
  { id: 'ord-202', order_date: '2024-05-15', region: 'South', channel: 'Retail', customer_id: 'cust-14' },
  { id: 'ord-203', order_date: '2024-06-08', region: 'West', channel: 'Online', customer_id: 'cust-15' },

  // Apparel Q2 (4 orders, ₹1,000 revenue each => ₹4,000 total, but unit_cost is ₹650!)
  { id: 'ord-204', order_date: '2024-04-12', region: 'North', channel: 'Online', customer_id: 'cust-16' },
  { id: 'ord-205', order_date: '2024-05-02', region: 'South', channel: 'Retail', customer_id: 'cust-17' },
  { id: 'ord-206', order_date: '2024-05-24', region: 'East', channel: 'Online', customer_id: 'cust-18' },
  { id: 'ord-207', order_date: '2024-06-19', region: 'West', channel: 'Direct', customer_id: 'cust-19' },

  // Home Q2 (2 orders, ₹1,000 revenue each => ₹2,000 total)
  { id: 'ord-208', order_date: '2024-04-20', region: 'North', channel: 'Online', customer_id: 'cust-20' },
  { id: 'ord-209', order_date: '2024-06-02', region: 'East', channel: 'Retail', customer_id: 'cust-21' }
];

export const orderItems = [
  // Q1 Electronics
  { id: 'item-101', order_id: 'ord-101', product_id: 'prod-headphones', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },
  { id: 'item-102', order_id: 'ord-102', product_id: 'prod-smartwatch', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },
  { id: 'item-103', order_id: 'ord-103', product_id: 'prod-headphones', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },
  { id: 'item-104', order_id: 'ord-104', product_id: 'prod-smartwatch', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },
  { id: 'item-105', order_id: 'ord-105', product_id: 'prod-headphones', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },
  { id: 'item-106', order_id: 'ord-106', product_id: 'prod-smartwatch', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },

  // Q1 Apparel
  { id: 'item-107', order_id: 'ord-107', product_id: 'prod-jacket', category_id: 'cat-apparel', quantity: 1, unit_price: 1000.00, unit_cost: 400.00, revenue: 1000.00, total_cost: 400.00 },
  { id: 'item-108', order_id: 'ord-108', product_id: 'prod-shoes', category_id: 'cat-apparel', quantity: 1, unit_price: 1000.00, unit_cost: 400.00, revenue: 1000.00, total_cost: 400.00 },
  { id: 'item-109', order_id: 'ord-109', product_id: 'prod-jacket', category_id: 'cat-apparel', quantity: 1, unit_price: 1000.00, unit_cost: 400.00, revenue: 1000.00, total_cost: 400.00 },
  { id: 'item-110', order_id: 'ord-110', product_id: 'prod-shoes', category_id: 'cat-apparel', quantity: 1, unit_price: 1000.00, unit_cost: 400.00, revenue: 1000.00, total_cost: 400.00 },

  // Q1 Home
  { id: 'item-111', order_id: 'ord-111', product_id: 'prod-blender', category_id: 'cat-home', quantity: 1, unit_price: 1000.00, unit_cost: 450.00, revenue: 1000.00, total_cost: 450.00 },
  { id: 'item-112', order_id: 'ord-112', product_id: 'prod-blender', category_id: 'cat-home', quantity: 1, unit_price: 1000.00, unit_cost: 450.00, revenue: 1000.00, total_cost: 450.00 },

  // Q2 Electronics
  { id: 'item-201', order_id: 'ord-201', product_id: 'prod-headphones', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },
  { id: 'item-202', order_id: 'ord-202', product_id: 'prod-smartwatch', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },
  { id: 'item-203', order_id: 'ord-203', product_id: 'prod-headphones', category_id: 'cat-electronics', quantity: 1, unit_price: 1000.00, unit_cost: 500.00, revenue: 1000.00, total_cost: 500.00 },

  // Q2 Apparel (unit_cost increased to ₹650)
  { id: 'item-204', order_id: 'ord-204', product_id: 'prod-jacket', category_id: 'cat-apparel', quantity: 1, unit_price: 1000.00, unit_cost: 650.00, revenue: 1000.00, total_cost: 650.00 },
  { id: 'item-205', order_id: 'ord-205', product_id: 'prod-shoes', category_id: 'cat-apparel', quantity: 1, unit_price: 1000.00, unit_cost: 650.00, revenue: 1000.00, total_cost: 650.00 },
  { id: 'item-206', order_id: 'ord-206', product_id: 'prod-jacket', category_id: 'cat-apparel', quantity: 1, unit_price: 1000.00, unit_cost: 650.00, revenue: 1000.00, total_cost: 650.00 },
  { id: 'item-207', order_id: 'ord-207', product_id: 'prod-shoes', category_id: 'cat-apparel', quantity: 1, unit_price: 1000.00, unit_cost: 650.00, revenue: 1000.00, total_cost: 650.00 },

  // Q2 Home
  { id: 'item-208', order_id: 'ord-208', product_id: 'prod-blender', category_id: 'cat-home', quantity: 1, unit_price: 1000.00, unit_cost: 450.00, revenue: 1000.00, total_cost: 450.00 },
  { id: 'item-209', order_id: 'ord-209', product_id: 'prod-blender', category_id: 'cat-home', quantity: 1, unit_price: 1000.00, unit_cost: 450.00, revenue: 1000.00, total_cost: 450.00 }
];

export const orderReturns = [
  // In Q2, post May 1 policy change, Electronics ord-202 and ord-203 are returned
  { id: 'ret-001', order_id: 'ord-202', order_item_id: 'item-202', return_date: '2024-05-30', reason: 'Extended window trial return - dissatisfied', refund_amount: 1000.00 },
  { id: 'ret-002', order_id: 'ord-203', order_item_id: 'item-203', return_date: '2024-06-25', reason: 'Extended window trial return - found cheaper', refund_amount: 1000.00 }
];

export const documentChunks = [
  {
    id: 'DOC-METRIC-01',
    title: 'Financial & Operating Metric Definitions Manual',
    section: 'Section 1.1: Gross and Net Revenue Reporting',
    category: 'definitions',
    effective_date: '2024-01-01',
    content: 'Gross Revenue is calculated as the sum of order item quantity multiplied by unit selling price (quantity * unit_price) recognized on the order date. Net Revenue deducts approved customer refunds. Unless otherwise specified in investigation queries, standard revenue reporting evaluates recognized gross revenue across all completed customer orders within the date window.'
  },
  {
    id: 'DOC-METRIC-02',
    title: 'Cost Accounting Guidelines',
    section: 'Section 2.3: Cost of Goods Sold (COGS) & Supplier Surcharges',
    category: 'definitions',
    effective_date: '2024-01-01',
    content: 'Total Cost represents direct Cost of Goods Sold (COGS) computed as quantity multiplied by unit acquisition cost. Effective April 1, 2024, our primary textile supplier instituted a raw cotton and synthetic fabric import surcharge, elevating baseline unit costs for the Apparel category by approximately 60%.'
  },
  {
    id: 'DOC-POLICY-01',
    title: 'Customer Satisfaction and Return Window Policy 2024',
    section: 'Section 4: Category Return Windows',
    category: 'policy',
    effective_date: '2024-05-01',
    content: 'Effective May 1, 2024, the allowable return window for the Electronics category was extended from 14 calendar days to 45 calendar days to remain competitive with consumer marketplace guarantees. Apparel and Home & Kitchen retain the standard 14-day return window. Return rate is monitored as total returned orders divided by total cohort orders placed within the matching observation period.'
  },
  {
    id: 'DOC-OPS-01',
    title: 'Regional Logistics & Marketing Memo Q2',
    section: 'Section 3: Regional Marketing Reallocation',
    category: 'operations',
    effective_date: '2024-04-01',
    content: 'During Q2 2024, paid ad spend for Electronics was temporarily reduced by 40% in Northern and Western territories to fund summer promotional campaigns for Home and Garden, resulting in lower customer acquisition and order volume for consumer gadgets.'
  }
];
