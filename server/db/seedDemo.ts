import { DatabaseSync } from 'node:sqlite';
import { generateId } from '../utils/crypto.ts';

export const DEMO_BUSINESS_ID = 'demo-biz-01';
export const DEMO_SEED_VERSION = 'demo_seed_v2';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function daysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function ensureDemoSeeded(db: DatabaseSync, forceReset = false): void {
  const existing = db
    .prepare('SELECT id FROM businesses WHERE id = ?')
    .get(DEMO_BUSINESS_ID) as { id: string } | undefined;

  const seedMigrated = db
    .prepare('SELECT version FROM schema_migrations WHERE version = ?')
    .get(DEMO_SEED_VERSION) as { version: string } | undefined;

  if (existing && !forceReset && seedMigrated) {
    return;
  }

  if (existing) {
    // Only refresh the isolated Demo Sandbox tenant; never touch Live Store accounts
    db.prepare('DELETE FROM businesses WHERE id = ?').run(DEMO_BUSINESS_ID);
  }

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO businesses (id, name, category, city, state, currency, timezone, preferred_language, store_url, mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      DEMO_BUSINESS_ID,
      'Mystic Spices & Naturals (Demo Store)',
      'Grocery, Tea & Ayurvedic D2C',
      'Ludhiana',
      'Punjab',
      'INR',
      'Asia/Kolkata',
      'en',
      'mysticspices-demo.sellvion.in',
      'demo'
    );

    db.prepare(
      `INSERT INTO business_settings (
        business_id, reorder_mode, cod_prepay_mode, udhaar_mode, winback_mode,
        max_daily_messages, quiet_hours_start, quiet_hours_end, min_confidence,
        max_discount_pct, daily_spend_cap_inr, emergency_pause_all
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      DEMO_BUSINESS_ID,
      'approval_required',
      'approval_required',
      'approval_required',
      'recommendation_only',
      1,
      '21:00',
      '09:00',
      85,
      10,
      2500,
      0
    );

    const providers: Array<'whatsapp' | 'shopify' | 'shiprocket' | 'razorpay' | 'gemini'> = [
      'whatsapp',
      'shopify',
      'shiprocket',
      'razorpay',
      'gemini',
    ];
    for (const provider of providers) {
      const geminiConfigured =
        provider === 'gemini' &&
        Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
      db.prepare(
        `INSERT INTO integration_accounts (id, business_id, provider, status, config_json, last_error)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        generateId('INT'),
        DEMO_BUSINESS_ID,
        provider,
        geminiConfigured ? 'connected' : 'not_configured',
        JSON.stringify({ mode: 'demo_sandbox' }),
        geminiConfigured ? '' : 'Demo mode uses simulated provider actions unless live credentials are configured.'
      );
    }

    const demoProducts = [
      { id: 'PROD-01', sku: 'TEA-DARJ-1KG', name: 'Darjeeling First Flush Gold Blend (1kg)', category: 'Beverages & Tea', price: 1450, cadence: 28, stock: 42 },
      { id: 'PROD-02', sku: 'WELL-SAF-10G', name: 'Pure Kashmiri Saffron 10g + Shilajit Resin', category: 'Ayurvedic Wellness', price: 4200, cadence: 45, stock: 18 },
      { id: 'PROD-03', sku: 'OIL-MUST-5L', name: 'Kachi Ghani Mustard Oil 5L Tin', category: 'Cooking & Oils', price: 1150, cadence: 21, stock: 64 },
      { id: 'PROD-04', sku: 'SPC-MAL-500', name: 'Whole Malabar Black Pepper & Cardamom', category: 'Spices & Masalas', price: 900, cadence: 35, stock: 55 },
      { id: 'PROD-05', sku: 'GRN-IND-10K', name: 'Indrayani Aromatic Rice 10kg', category: 'Organic Grains', price: 1450, cadence: 30, stock: 31 },
      { id: 'PROD-06', sku: 'SUP-HON-1K', name: 'Raw Forest Honey 1kg + Organic Amla Murabba', category: 'Immunity & Superfoods', price: 2850, cadence: 40, stock: 26 },
      { id: 'PROD-07', sku: 'TEA-COF-1K', name: 'South Indian Filter Coffee Roast (500g x 2)', category: 'Beverages & Tea', price: 1200, cadence: 25, stock: 39 },
      { id: 'PROD-08', sku: 'OIL-SES-2L', name: 'Organic Wood Pressed Sesame Oil 2L', category: 'Cooking & Oils', price: 925, cadence: 24, stock: 29 },
      { id: 'PROD-09', sku: 'GHEE-A2-1L', name: 'Bilona A2 Gir Cow Ghee (1L Glass Jar)', category: 'Dairy & Essentials', price: 1950, cadence: 30, stock: 22 },
      { id: 'PROD-10', sku: 'OIL-COC-2L', name: 'Cold-Pressed Virgin Coconut Oil 2L', category: 'Cooking & Oils', price: 1180, cadence: 28, stock: 47 },
      { id: 'PROD-11', sku: 'WELL-ASH-250', name: 'Organic Ashwagandha Root & Brahmi Mix', category: 'Ayurvedic Wellness', price: 890, cadence: 35, stock: 34 },
      { id: 'PROD-12', sku: 'JAG-POW-2K', name: 'Chemical-Free Kolhapur Jaggery Powder 2kg', category: 'Organic Grains', price: 680, cadence: 26, stock: 75 },
    ];

    const insertProd = db.prepare(
      `INSERT INTO products (id, business_id, sku, name, category, price, typical_cadence_days, stock_qty, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    for (const p of demoProducts) {
      insertProd.run(p.id, DEMO_BUSINESS_ID, p.sku, p.name, p.category, p.price, p.cadence, p.stock);
    }

    const demoCustomers = [
      {
        id: 'CUST-101',
        name: 'Priya Sharma',
        phone: '+91 98201 44521',
        city: 'Pune',
        state: 'Maharashtra',
        address: 'Flat 804, Koregaon Park Annexe, Pune',
        pincode: '411001',
        category: 'Beverages & Tea',
        lastProduct: 'Darjeeling First Flush Gold Blend (1kg)',
        firstOrder: daysAgo(320),
        lastOrder: daysAgo(28),
        totalOrders: 6,
        totalSpent: 8450,
        cadence: 28,
        daysSince: 28,
        codScore: 96,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'reorder_due',
        holdout: 0,
        notes: 'Repeat tea buyer. Prefers prepaid UPI and likes Assam samples.',
        insight: '28-day reorder window reached today based on 6 prior orders.',
      },
      {
        id: 'CUST-102',
        name: 'Vikramaditya Solanki',
        phone: '+91 97245 88910',
        city: 'Surat',
        state: 'Gujarat',
        address: 'Near Citylight Chowk, Surat',
        pincode: '395007',
        category: 'Ayurvedic Wellness',
        lastProduct: 'Pure Kashmiri Saffron 10g + Shilajit Resin',
        firstOrder: daysAgo(2),
        lastOrder: daysAgo(2),
        totalOrders: 1,
        totalSpent: 4200,
        cadence: 45,
        daysSince: 2,
        codScore: 32,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'first_time',
        holdout: 0,
        notes: 'First-time high-ticket COD order; address missing flat/house number.',
        insight: 'High COD risk (68%): first-time buyer, high order value, incomplete address.',
      },
      {
        id: 'CUST-103',
        name: 'Sunita Agarwal',
        phone: '+91 94140 33219',
        city: 'Jaipur',
        state: 'Rajasthan',
        address: 'B-42, Vaishali Nagar, Jaipur',
        pincode: '302021',
        category: 'Cooking & Oils',
        lastProduct: 'Kachi Ghani Mustard Oil 5L Tin',
        firstOrder: daysAgo(410),
        lastOrder: daysAgo(22),
        totalOrders: 9,
        totalSpent: 16800,
        cadence: 21,
        daysSince: 22,
        codScore: 88,
        udhaar: 3450,
        udhaarDue: daysAgo(9),
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'high_udhaar',
        holdout: 0,
        notes: 'Regular pantry customer with monthly khata account.',
        insight: '₹3,450 udhaar balance is 9 days past due date. Polite UPI reminder recommended.',
      },
      {
        id: 'CUST-104',
        name: 'Rajesh Nair',
        phone: '+91 98451 12093',
        city: 'Bengaluru',
        state: 'Karnataka',
        address: '12th Main, Indiranagar, Bengaluru',
        pincode: '560038',
        category: 'Spices & Masalas',
        lastProduct: 'Whole Malabar Black Pepper & Cardamom',
        firstOrder: daysAgo(520),
        lastOrder: daysAgo(101),
        totalOrders: 5,
        totalSpent: 6200,
        cadence: 35,
        daysSince: 101,
        codScore: 92,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'inactive',
        holdout: 0,
        notes: 'Previously loyal spice buyer; no orders for 101 days.',
        insight: 'Inactive for 101 days (usual cadence 35 days). Eligible for win-back offer.',
      },
      {
        id: 'CUST-105',
        name: 'Ananya Deshmukh',
        phone: '+91 98902 55670',
        city: 'Nagpur',
        state: 'Maharashtra',
        address: 'Plot 19, Dharampeth, Nagpur',
        pincode: '440010',
        category: 'Organic Grains',
        lastProduct: 'Indrayani Aromatic Rice 10kg',
        firstOrder: daysAgo(280),
        lastOrder: daysAgo(14),
        totalOrders: 4,
        totalSpent: 5100,
        cadence: 30,
        daysSince: 14,
        codScore: 94,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'loyal',
        holdout: 0,
        notes: 'Consistent prepaid UPI customer.',
        insight: 'Healthy cadence; next reorder expected in ~16 days.',
      },
      {
        id: 'CUST-106',
        name: 'Amanpreet Singh',
        phone: '+91 98150 99412',
        city: 'Ludhiana',
        state: 'Punjab',
        address: 'Model Town Extension, Ludhiana',
        pincode: '141001',
        category: 'Immunity & Superfoods',
        lastProduct: 'Raw Forest Honey 1kg + Organic Amla Murabba',
        firstOrder: daysAgo(1),
        lastOrder: daysAgo(1),
        totalOrders: 1,
        totalSpent: 2850,
        cadence: 40,
        daysSince: 1,
        codScore: 40,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'first_time',
        holdout: 0,
        notes: 'Late-night COD order (11:45 PM) in elevated RTO pincode 141001.',
        insight: 'COD risk 60%: first-time buyer, late-night order, missing house number.',
      },
      {
        id: 'CUST-107',
        name: 'Meenakshi Sundaram',
        phone: '+91 94440 88201',
        city: 'Chennai',
        state: 'Tamil Nadu',
        address: '14 Besant Avenue, Adyar, Chennai',
        pincode: '600020',
        category: 'Beverages & Tea',
        lastProduct: 'South Indian Filter Coffee Roast (500g x 2)',
        firstOrder: daysAgo(390),
        lastOrder: daysAgo(30),
        totalOrders: 7,
        totalSpent: 9600,
        cadence: 25,
        daysSince: 30,
        codScore: 98,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'reorder_due',
        holdout: 1,
        notes: 'Assigned to 10% uncontacted holdout control cohort for measurement.',
        insight: 'Reorder window open (30d vs 25d cadence). Currently in holdout control group.',
      },
      {
        id: 'CUST-108',
        name: 'Kavita Verma',
        phone: '+91 98711 34567',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        address: 'Sector D, Gomti Nagar, Lucknow',
        pincode: '226010',
        category: 'Cooking & Oils',
        lastProduct: 'Organic Wood Pressed Sesame Oil 2L',
        firstOrder: daysAgo(310),
        lastOrder: daysAgo(24),
        totalOrders: 5,
        totalSpent: 7350,
        cadence: 24,
        daysSince: 24,
        codScore: 82,
        udhaar: 1850,
        udhaarDue: daysAgo(13),
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'high_udhaar',
        holdout: 0,
        notes: 'Regular family khata customer.',
        insight: '₹1,850 balance overdue by 13 days. Gentle reminder scheduled.',
      },
      {
        id: 'CUST-109',
        name: 'Harpreet Kaur Gill',
        phone: '+91 98142 77019',
        city: 'Chandigarh',
        state: 'Chandigarh',
        address: 'H.No. 412, Sector 19-B, Chandigarh',
        pincode: '160019',
        category: 'Dairy & Essentials',
        lastProduct: 'Bilona A2 Gir Cow Ghee (1L Glass Jar)',
        firstOrder: daysAgo(260),
        lastOrder: daysAgo(5),
        totalOrders: 8,
        totalSpent: 15600,
        cadence: 30,
        daysSince: 5,
        codScore: 95,
        udhaar: 1400,
        udhaarDue: daysAgo(6),
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'high_udhaar',
        holdout: 0,
        notes: 'Paid ₹1,000 partial on khata; ₹1,400 remaining.',
        insight: 'Loyal A2 ghee subscriber with partial ₹1,400 khata balance.',
      },
      {
        id: 'CUST-110',
        name: 'Rohan Kulkarni',
        phone: '+91 97654 20981',
        city: 'Nashik',
        state: 'Maharashtra',
        address: 'Opposite Bus Stand, College Road, Nashik',
        pincode: '422005',
        category: 'Ayurvedic Wellness',
        lastProduct: 'Organic Ashwagandha Root & Brahmi Mix',
        firstOrder: daysAgo(3),
        lastOrder: daysAgo(3),
        totalOrders: 1,
        totalSpent: 1780,
        cadence: 35,
        daysSince: 3,
        codScore: 46,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'first_time',
        holdout: 0,
        notes: 'COD parcel awaiting landmark/flat verification before dispatch.',
        insight: 'Missing house/flat number on COD order ORD-9946.',
      },
      {
        id: 'CUST-111',
        name: 'Deepak Bansal',
        phone: '+91 98260 55418',
        city: 'Indore',
        state: 'Madhya Pradesh',
        address: '302 Scheme No 54, Vijay Nagar, Indore',
        pincode: '452010',
        category: 'Cooking & Oils',
        lastProduct: 'Cold-Pressed Virgin Coconut Oil 2L',
        firstOrder: daysAgo(195),
        lastOrder: daysAgo(4),
        totalOrders: 4,
        totalSpent: 5340,
        cadence: 28,
        daysSince: 4,
        codScore: 76,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'regular',
        holdout: 0,
        notes: 'Prefers morning delivery before 11 AM.',
        insight: 'Parcel currently in transit; COD confirmation message failed once and needs retry.',
      },
      {
        id: 'CUST-112',
        name: 'Farhan Merchant',
        phone: '+91 98211 66304',
        city: 'Mumbai',
        state: 'Maharashtra',
        address: '18 Pali Hill Lane, Bandra West, Mumbai',
        pincode: '400050',
        category: 'Beverages & Tea',
        lastProduct: 'Darjeeling First Flush Gold Blend (1kg)',
        firstOrder: daysAgo(340),
        lastOrder: daysAgo(19),
        totalOrders: 11,
        totalSpent: 21450,
        cadence: 25,
        daysSince: 19,
        codScore: 99,
        udhaar: 2150,
        udhaarDue: daysAgo(4),
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'high_udhaar',
        holdout: 0,
        notes: 'High-LTV corporate pantry buyer on monthly settlement.',
        insight: 'Top 5% buyer by spend with ₹2,150 due 4 days ago.',
      },
      {
        id: 'CUST-113',
        name: 'Lakshmi Narayanan',
        phone: '+91 98490 31876',
        city: 'Hyderabad',
        state: 'Telangana',
        address: 'Plot 77, Jubilee Hills Road 10, Hyderabad',
        pincode: '500033',
        category: 'Organic Grains',
        lastProduct: 'Chemical-Free Kolhapur Jaggery Powder 2kg',
        firstOrder: daysAgo(210),
        lastOrder: daysAgo(29),
        totalOrders: 6,
        totalSpent: 8120,
        cadence: 26,
        daysSince: 29,
        codScore: 93,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'reorder_due',
        holdout: 0,
        notes: 'Orders jaggery and rice together every 4 weeks.',
        insight: '29 days since last order (usual 26-day cycle). Ready for gentle reorder nudge.',
      },
      {
        id: 'CUST-114',
        name: 'Neha Patel',
        phone: '+91 98250 74129',
        city: 'Ahmedabad',
        state: 'Gujarat',
        address: 'B-12 Satellite Park, Bodakdev, Ahmedabad',
        pincode: '380054',
        category: 'Dairy & Essentials',
        lastProduct: 'Bilona A2 Gir Cow Ghee (1L Glass Jar)',
        firstOrder: daysAgo(170),
        lastOrder: daysAgo(52),
        totalOrders: 3,
        totalSpent: 5850,
        cadence: 30,
        daysSince: 52,
        codScore: 84,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'at_risk',
        holdout: 0,
        notes: 'Missed usual 30-day ghee cycle by 22 days.',
        insight: 'At-risk repeat buyer: 52 days since last order vs 30-day cadence.',
      },
      {
        id: 'CUST-115',
        name: 'Suresh Tiwari',
        phone: '+91 94250 18392',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        address: 'E-4/88 Arera Colony, Bhopal',
        pincode: '462016',
        category: 'Spices & Masalas',
        lastProduct: 'Whole Malabar Black Pepper & Cardamom',
        firstOrder: daysAgo(140),
        lastOrder: daysAgo(7),
        totalOrders: 4,
        totalSpent: 4980,
        cadence: 32,
        daysSince: 7,
        codScore: 90,
        udhaar: 1600,
        udhaarDue: daysAhead(4),
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'loyal',
        holdout: 0,
        notes: 'Always pays via UPI on due date.',
        insight: '₹1,600 khata balance due in 4 days (not overdue yet).',
      },
      {
        id: 'CUST-116',
        name: 'Arvind Menon',
        phone: '+91 98470 90321',
        city: 'Kochi',
        state: 'Kerala',
        address: '44 Panampilly Nagar, Kochi',
        pincode: '682036',
        category: 'Spices & Masalas',
        lastProduct: 'Whole Malabar Black Pepper & Cardamom',
        firstOrder: daysAgo(290),
        lastOrder: daysAgo(68),
        totalOrders: 3,
        totalSpent: 3450,
        cadence: 35,
        daysSince: 68,
        codScore: 89,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 0,
        optedOut: 1,
        segment: 'inactive',
        holdout: 0,
        notes: 'Replied STOP to promotional messages on WhatsApp. Policy Guard enforces opt-out.',
        insight: 'Opted out of WhatsApp outreach — Policy & Safety Guard blocks automated drafts.',
      },
      {
        id: 'CUST-117',
        name: 'Shruti Chatterjee',
        phone: '+91 98301 62814',
        city: 'Kolkata',
        state: 'West Bengal',
        address: '29 Ballygunge Circular Road, Kolkata',
        pincode: '700019',
        category: 'Beverages & Tea',
        lastProduct: 'Darjeeling First Flush Gold Blend (1kg)',
        firstOrder: daysAgo(240),
        lastOrder: daysAgo(11),
        totalOrders: 5,
        totalSpent: 7250,
        cadence: 28,
        daysSince: 11,
        codScore: 96,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'loyal',
        holdout: 1,
        notes: 'Holdout control group buyer for natural organic repeat measurement.',
        insight: 'Control group cohort member — organic repeat purchase tracked without messages.',
      },
      {
        id: 'CUST-118',
        name: 'Manish Joshi',
        phone: '+91 98240 44190',
        city: 'Vadodara',
        state: 'Gujarat',
        address: '15 Alkapuri Society, Vadodara',
        pincode: '390007',
        category: 'Cooking & Oils',
        lastProduct: 'Kachi Ghani Mustard Oil 5L Tin',
        firstOrder: daysAgo(180),
        lastOrder: daysAgo(6),
        totalOrders: 5,
        totalSpent: 6900,
        cadence: 24,
        daysSince: 6,
        codScore: 91,
        udhaar: 0,
        udhaarDue: '',
        consentWhatsapp: 1,
        optedOut: 0,
        segment: 'regular',
        holdout: 0,
        notes: 'Settled previous ₹1,200 khata balance via bank transfer.',
        insight: 'All khata dues settled on time; reliable repeat customer.',
      },
    ];

    const insertCust = db.prepare(
      `INSERT INTO customers (
        id, business_id, name, phone, city, state, address_line, pincode, primary_category,
        last_product_ordered, first_order_date, last_order_date, total_orders, total_spent,
        average_cadence_days, days_since_last_order, cod_reliability_score, outstanding_udhaar,
        udhaar_due_date, consent_whatsapp, opted_out, preferred_language, segment, holdout_group,
        notes, ai_insight, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'hinglish', ?, ?, ?, ?, 1)`
    );

    for (const c of demoCustomers) {
      insertCust.run(
        c.id,
        DEMO_BUSINESS_ID,
        c.name,
        c.phone,
        c.city,
        c.state,
        c.address,
        c.pincode,
        c.category,
        c.lastProduct,
        c.firstOrder,
        c.lastOrder,
        c.totalOrders,
        c.totalSpent,
        c.cadence,
        c.daysSince,
        c.codScore,
        c.udhaar,
        c.udhaarDue,
        c.consentWhatsapp,
        c.optedOut,
        c.segment,
        c.holdout,
        c.notes,
        c.insight
      );
    }

    const demoOrders = [
      {
        id: 'ORD-9941',
        customerId: 'CUST-106',
        num: 'ORD-9941',
        items: ['Raw Forest Honey 1kg', 'Organic Amla Murabba 500g'],
        amount: 2850,
        mode: 'COD',
        address: 'Model Town Extension, Ludhiana',
        pincode: '141001',
        status: 'Pending_Verification',
        risk: 60,
        reasons: ['Elevated pincode RTO history (141001)', 'First-time COD buyer', 'Missing house/flat number'],
        date: daysAgo(1),
        outcome: 'Awaiting merchant verification',
      },
      {
        id: 'ORD-9932',
        customerId: 'CUST-102',
        num: 'ORD-9932',
        items: ['Pure Kashmiri Saffron 10g', 'Shilajit Resin 20g'],
        amount: 4200,
        mode: 'COD',
        address: 'Near Citylight Chowk, Surat',
        pincode: '395007',
        status: 'Pending_Verification',
        risk: 68,
        reasons: ['Missing house/flat number', 'High COD order value (>₹3,000)', 'First-time buyer'],
        date: daysAgo(2),
        outcome: 'Awaiting merchant verification',
      },
      {
        id: 'ORD-9946',
        customerId: 'CUST-110',
        num: 'ORD-9946',
        items: ['Organic Ashwagandha Root & Brahmi Mix', 'Raw Forest Honey 1kg'],
        amount: 1780,
        mode: 'COD',
        address: 'Opposite Bus Stand, College Road, Nashik',
        pincode: '422005',
        status: 'Pending_Verification',
        risk: 54,
        reasons: ['First-time buyer', 'Missing house/flat number'],
        date: daysAgo(3),
        outcome: 'Awaiting address confirmation',
      },
      {
        id: 'ORD-9947',
        customerId: 'CUST-111',
        num: 'ORD-9947',
        items: ['Cold-Pressed Virgin Coconut Oil 2L', 'Chemical-Free Kolhapur Jaggery Powder 2kg'],
        amount: 1860,
        mode: 'COD',
        address: '302 Scheme No 54, Vijay Nagar, Indore',
        pincode: '452010',
        status: 'In_Transit',
        risk: 38,
        reasons: ['High COD ticket slightly above store average'],
        date: daysAgo(4),
        outcome: 'Dispatched via Delhivery Surface',
      },
      {
        id: 'ORD-9948',
        customerId: 'CUST-109',
        num: 'ORD-9948',
        items: ['Bilona A2 Gir Cow Ghee (1L Glass Jar)'],
        amount: 1950,
        mode: 'Prepaid_UPI',
        address: 'H.No. 412, Sector 19-B, Chandigarh',
        pincode: '160019',
        status: 'In_Transit',
        risk: 6,
        reasons: [],
        date: daysAgo(5),
        outcome: 'Out for delivery in Chandigarh hub',
      },
      {
        id: 'ORD-9949',
        customerId: 'CUST-118',
        num: 'ORD-9949',
        items: ['Kachi Ghani Mustard Oil 5L Tin', 'Whole Malabar Black Pepper & Cardamom'],
        amount: 2050,
        mode: 'COD',
        address: '15 Alkapuri Society, Vadodara',
        pincode: '390007',
        status: 'In_Transit',
        risk: 24,
        reasons: [],
        date: daysAgo(6),
        outcome: 'Dispatched via BlueDart Air',
      },
      {
        id: 'ORD-9950',
        customerId: 'CUST-115',
        num: 'ORD-9950',
        items: ['Whole Malabar Black Pepper & Cardamom', 'Chemical-Free Kolhapur Jaggery Powder 2kg'],
        amount: 1600,
        mode: 'Udhaar',
        address: 'E-4/88 Arera Colony, Bhopal',
        pincode: '462016',
        status: 'Delivered',
        risk: 12,
        reasons: [],
        date: daysAgo(7),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9951',
        customerId: 'CUST-117',
        num: 'ORD-9951',
        items: ['Darjeeling First Flush Gold Blend (1kg)'],
        amount: 1450,
        mode: 'Prepaid_Card',
        address: '29 Ballygunge Circular Road, Kolkata',
        pincode: '700019',
        status: 'Delivered',
        risk: 4,
        reasons: [],
        date: daysAgo(11),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9952',
        customerId: 'CUST-110',
        num: 'ORD-9952',
        items: ['Pure Kashmiri Saffron 10g'],
        amount: 2950,
        mode: 'COD',
        address: 'Near Railway Gate, Nashik',
        pincode: '422001',
        status: 'RTO_Returned',
        risk: 74,
        reasons: ['Buyer unreachable at doorstep (3 attempts)', 'Missing flat/building number'],
        date: daysAgo(12),
        outcome: 'Returned to Ludhiana warehouse (RTO)',
      },
      {
        id: 'ORD-9884',
        customerId: 'CUST-105',
        num: 'ORD-9884',
        items: ['Indrayani Aromatic Rice 10kg'],
        amount: 1450,
        mode: 'Prepaid_UPI',
        address: 'Plot 19, Dharampeth, Nagpur',
        pincode: '440010',
        status: 'Delivered',
        risk: 10,
        reasons: [],
        date: daysAgo(14),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9953',
        customerId: 'CUST-112',
        num: 'ORD-9953',
        items: ['Darjeeling First Flush Gold Blend (1kg)', 'Raw Forest Honey 1kg'],
        amount: 2150,
        mode: 'Udhaar',
        address: '18 Pali Hill Lane, Bandra West, Mumbai',
        pincode: '400050',
        status: 'Delivered',
        risk: 8,
        reasons: [],
        date: daysAgo(19),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9954',
        customerId: 'CUST-109',
        num: 'ORD-9954',
        items: ['Bilona A2 Gir Cow Ghee (1L Glass Jar)', 'Chemical-Free Kolhapur Jaggery Powder 2kg'],
        amount: 2630,
        mode: 'Prepaid_Card',
        address: 'H.No. 412, Sector 19-B, Chandigarh',
        pincode: '160019',
        status: 'Delivered',
        risk: 5,
        reasons: [],
        date: daysAgo(20),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9790',
        customerId: 'CUST-103',
        num: 'ORD-9790',
        items: ['Kachi Ghani Mustard Oil 5L Tin', 'Organic Turmeric 500g'],
        amount: 3450,
        mode: 'Udhaar',
        address: 'B-42, Vaishali Nagar, Jaipur',
        pincode: '302021',
        status: 'Delivered',
        risk: 15,
        reasons: [],
        date: daysAgo(22),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9955',
        customerId: 'CUST-108',
        num: 'ORD-9955',
        items: ['Organic Wood Pressed Sesame Oil 2L', 'Whole Malabar Black Pepper & Cardamom'],
        amount: 1850,
        mode: 'Udhaar',
        address: 'Sector D, Gomti Nagar, Lucknow',
        pincode: '226010',
        status: 'Delivered',
        risk: 14,
        reasons: [],
        date: daysAgo(24),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9956',
        customerId: 'CUST-106',
        num: 'ORD-9956',
        items: ['Raw Forest Honey 1kg'],
        amount: 1650,
        mode: 'COD',
        address: 'Bus Stand Chowk, Ludhiana',
        pincode: '141001',
        status: 'RTO_Returned',
        risk: 71,
        reasons: ['Elevated pincode RTO history (141001)', 'Customer refused COD delivery at door'],
        date: daysAgo(26),
        outcome: 'Returned to origin (RTO)',
      },
      {
        id: 'ORD-9821',
        customerId: 'CUST-101',
        num: 'ORD-9821',
        items: ['Darjeeling First Flush Gold Blend (1kg)'],
        amount: 1450,
        mode: 'Prepaid_UPI',
        address: 'Flat 804, Koregaon Park Annexe, Pune',
        pincode: '411001',
        status: 'Delivered',
        risk: 8,
        reasons: [],
        date: daysAgo(28),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9740',
        customerId: 'CUST-107',
        num: 'ORD-9740',
        items: ['South Indian Filter Coffee Roast (500g x 2)'],
        amount: 1200,
        mode: 'Prepaid_UPI',
        address: '14 Besant Avenue, Adyar, Chennai',
        pincode: '600020',
        status: 'Delivered',
        risk: 5,
        reasons: [],
        date: daysAgo(30),
        outcome: 'Delivered successfully',
      },
      {
        id: 'ORD-9945',
        customerId: 'CUST-113',
        num: 'ORD-9945',
        items: ['Chemical-Free Kolhapur Jaggery Powder 2kg', 'Indrayani Aromatic Rice 10kg'],
        amount: 2130,
        mode: 'COD',
        address: 'Plot 77, Jubilee Hills Road 10, Hyderabad',
        pincode: '500033',
        status: 'Delivered',
        risk: 18,
        reasons: [],
        date: daysAgo(29),
        outcome: 'COD cash collected on delivery',
      },
    ];

    const insertOrder = db.prepare(
      `INSERT INTO orders (
        id, business_id, customer_id, order_number, items_json, total_amount, payment_mode,
        delivery_address, pincode, status, cod_risk_score, risk_reasons_json, courier_cost, actual_outcome, is_demo, ordered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    );

    const insertCodAssessment = db.prepare(
      `INSERT INTO cod_risk_assessments (
        id, business_id, order_id, risk_score, risk_band, reasons_json, evidence_json, recommended_action, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const o of demoOrders) {
      const courierCost =
        o.status === 'RTO_Returned' ? 280 : o.status === 'Delivered' || o.status === 'In_Transit' ? 65 : 0;

      insertOrder.run(
        o.id,
        DEMO_BUSINESS_ID,
        o.customerId,
        o.num,
        JSON.stringify(o.items),
        o.amount,
        o.mode,
        o.address,
        o.pincode,
        o.status,
        o.risk,
        JSON.stringify(o.reasons),
        courierCost,
        o.outcome,
        o.date
      );

      if (o.mode === 'COD') {
        insertCodAssessment.run(
          generateId('COD'),
          DEMO_BUSINESS_ID,
          o.id,
          o.risk,
          o.risk >= 60 ? 'high' : o.risk >= 35 ? 'moderate' : 'low',
          JSON.stringify(o.reasons),
          JSON.stringify({
            addressHasUnitNumber: o.risk < 50,
            pincodeTier: o.pincode === '141001' ? 'elevated' : 'standard',
            orderStatus: o.status,
          }),
          o.risk >= 60
            ? 'Verify address or prepare optional UPI prepayment link'
            : o.risk >= 35
            ? 'Confirm landmark on WhatsApp before courier pickup'
            : 'Standard confirmation',
          o.status === 'Delivered' ? 'resolved' : o.risk >= 50 ? 'flagged' : 'safe'
        );
      }
    }

    // Udhaar ledger records covering overdue, partial, pending, and paid states
    const insertUdhaar = db.prepare(
      `INSERT INTO udhaar_records (id, business_id, customer_id, original_amount, remaining_amount, due_date, status, notes, settled_at, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    insertUdhaar.run('UDH-301', DEMO_BUSINESS_ID, 'CUST-103', 3450, 3450, daysAgo(9), 'overdue', 'Monthly pantry supply ledger', null);
    insertUdhaar.run('UDH-302', DEMO_BUSINESS_ID, 'CUST-108', 1850, 1850, daysAgo(13), 'overdue', 'Sesame oil & spices khata', null);
    insertUdhaar.run('UDH-303', DEMO_BUSINESS_ID, 'CUST-109', 2400, 1400, daysAgo(6), 'partial', 'A2 Ghee & pantry khata (₹1,000 paid)', null);
    insertUdhaar.run('UDH-304', DEMO_BUSINESS_ID, 'CUST-112', 2150, 2150, daysAgo(4), 'overdue', 'Corporate pantry tea & honey credit', null);
    insertUdhaar.run('UDH-305', DEMO_BUSINESS_ID, 'CUST-115', 1600, 1600, daysAhead(4), 'pending', 'Spices & jaggery khata due in 4 days', null);
    insertUdhaar.run('UDH-306', DEMO_BUSINESS_ID, 'CUST-118', 1200, 0, daysAgo(10), 'paid', 'Settled via NEFT bank transfer', daysAgo(3));

    // Demo captured payments across UPI, Cash, and Bank
    const insertPayment = db.prepare(
      `INSERT INTO payments (id, business_id, customer_id, order_id, amount, method, reference_id, status, recorded_by, is_demo, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'captured', 'system', 1, ?)`
    );
    insertPayment.run('PAY-401', DEMO_BUSINESS_ID, 'CUST-105', 'ORD-9884', 1450, 'UPI', 'UPI-REF-88412', daysAgo(14));
    insertPayment.run('PAY-402', DEMO_BUSINESS_ID, 'CUST-101', 'ORD-9821', 1450, 'UPI', 'UPI-REF-88219', daysAgo(28));
    insertPayment.run('PAY-403', DEMO_BUSINESS_ID, 'CUST-109', 'ORD-9948', 1950, 'UPI', 'UPI-REF-99481', daysAgo(5));
    insertPayment.run('PAY-404', DEMO_BUSINESS_ID, 'CUST-109', null, 1000, 'UPI', 'UPI-UDH-10901', daysAgo(4));
    insertPayment.run('PAY-405', DEMO_BUSINESS_ID, 'CUST-118', null, 1200, 'Bank', 'NEFT-UDH-1182', daysAgo(3));
    insertPayment.run('PAY-406', DEMO_BUSINESS_ID, 'CUST-117', 'ORD-9951', 1450, 'Card', 'CARD-AUTH-7721', daysAgo(11));
    insertPayment.run('PAY-407', DEMO_BUSINESS_ID, 'CUST-113', 'ORD-9945', 2130, 'Cash', 'COD-CASH-9945', daysAgo(29));

    // Seed Demo Workflows + Tasks + Approvals across all queue tabs
    const seedActions = [
      {
        id: 'ACT-901',
        wfId: 'WF-901',
        wfType: 'reactivation',
        wfStatus: 'awaiting_approval',
        wfStep: 'approval_checkpoint',
        wfError: '',
        customerId: 'CUST-101',
        orderId: null,
        type: 'reorder_reminder',
        title: 'Reorder Nudge: Darjeeling Gold Blend',
        reason: '28-day tea reorder cadence reached today (6 prior orders).',
        agent: 'Behaviour & Prediction Agent',
        confidence: 94,
        impact: 'Estimated +₹1,450 repeat order',
        msg: 'Namaste Priya ji! 🙏 Hope aapka din achha ja raha hai. Aapka favorite Darjeeling First Flush Gold Blend khatam hone wala hoga (~28 din pehle mangwaya tha). Kya hum ek fresh pack dispatch karein?',
        status: 'pending_approval',
        scheduledFor: '',
        meta: { productName: 'Darjeeling First Flush Gold Blend (1kg)', orderAmount: 1450 },
      },
      {
        id: 'ACT-902',
        wfId: 'WF-902',
        wfType: 'cod_protection',
        wfStatus: 'awaiting_approval',
        wfStep: 'approval_checkpoint',
        wfError: '',
        customerId: 'CUST-102',
        orderId: 'ORD-9932',
        type: 'cod_prepay',
        title: 'COD Verification & Prepay Option: ORD-9932',
        reason: 'First-time COD order (₹4,200) missing house/flat number. Estimated risk score: 68/100.',
        agent: 'Behaviour & Prediction Agent',
        confidence: 88,
        impact: 'Verify order before courier dispatch',
        msg: 'Namaste Vikramaditya ji! 🙏 Aapka order #ORD-9932 confirm karne ke liye please flat/house number share karein. Agar aap UPI se prepay karna chahein toh ₹100 instant discount mil sakta hai.',
        status: 'pending_approval',
        scheduledFor: '',
        meta: { orderId: 'ORD-9932', orderAmount: 4200, codRiskScore: 68 },
      },
      {
        id: 'ACT-903',
        wfId: 'WF-903',
        wfType: 'udhaar_collection',
        wfStatus: 'awaiting_approval',
        wfStep: 'approval_checkpoint',
        wfError: '',
        customerId: 'CUST-103',
        orderId: null,
        type: 'udhaar_reminder',
        title: 'Udhaar Payment Reminder: ₹3,450',
        reason: 'Balance ₹3,450 is 9 days past due date. Regular buyer with 9 completed orders.',
        agent: 'Customer Intelligence Agent',
        confidence: 91,
        impact: 'Collect ₹3,450 pending balance',
        msg: 'Namaste Sunita ji! 🙏 Asha hai sab theek hai. Aapka ₹3,450 ka monthly khata balance pending hai. Jab free hon toh UPI link se clear kar sakte hain. Dhanyawad!',
        status: 'pending_approval',
        scheduledFor: '',
        meta: { udhaarAmount: 3450, daysOverdue: 9 },
      },
      {
        id: 'ACT-904',
        wfId: 'WF-904',
        wfType: 'reactivation',
        wfStatus: 'awaiting_approval',
        wfStep: 'approval_checkpoint',
        wfError: '',
        customerId: 'CUST-104',
        orderId: null,
        type: 'winback_offer',
        title: 'Win-Back Inactive Customer: Rajesh Nair',
        reason: 'No purchase in 101 days (usual cadence 35 days). Lifetime spend ₹6,200.',
        agent: 'Engagement & Copy Agent',
        confidence: 86,
        impact: 'Estimated +₹1,800 win-back order',
        msg: 'Namaste Rajesh ji! 🌿 Kafi time ho gaya aapse baat kiye huye. Fresh Malabar Black Pepper & Cardamom lot aaya hai — aapke liye code FRESH15 par 15% off hai.',
        status: 'pending_approval',
        scheduledFor: '',
        meta: { productName: 'Whole Malabar Black Pepper & Cardamom', orderAmount: 1800 },
      },
      {
        id: 'ACT-905',
        wfId: 'WF-905',
        wfType: 'cod_protection',
        wfStatus: 'awaiting_approval',
        wfStep: 'approval_checkpoint',
        wfError: '',
        customerId: 'CUST-106',
        orderId: 'ORD-9941',
        type: 'cod_verify',
        title: 'COD Address Confirmation: ORD-9941',
        reason: 'Pincode 141001 elevated RTO tier + missing house number on ₹2,850 COD order.',
        agent: 'Policy & Safety Guard',
        confidence: 82,
        impact: 'Confirm delivery address before booking',
        msg: 'Sat Sri Akal Amanpreet ji! 🙏 Order #ORD-9941 dispatch karne se pehle please apna full house/gali number confirm kar dein.',
        status: 'pending_approval',
        scheduledFor: '',
        meta: { orderId: 'ORD-9941', orderAmount: 2850, codRiskScore: 60 },
      },
      {
        id: 'ACT-911',
        wfId: 'WF-911',
        wfType: 'cod_protection',
        wfStatus: 'awaiting_approval',
        wfStep: 'approval_checkpoint',
        wfError: '',
        customerId: 'CUST-110',
        orderId: 'ORD-9946',
        type: 'cod_verify',
        title: 'COD Landmark Confirmation: ORD-9946',
        reason: 'First-time COD buyer in Nashik with incomplete house/building number (risk 54/100).',
        agent: 'Behaviour & Prediction Agent',
        confidence: 85,
        impact: 'Prevent ₹280 two-way RTO courier loss',
        msg: 'Namaste Rohan ji! 🙏 Aapka order #ORD-9946 dispatch ke liye ready hai. Smooth delivery ke liye please apna flat ya house number reply kar dein.',
        status: 'pending_approval',
        scheduledFor: '',
        meta: { orderId: 'ORD-9946', orderAmount: 1780, codRiskScore: 54 },
      },
      {
        id: 'ACT-906',
        wfId: 'WF-906',
        wfType: 'udhaar_collection',
        wfStatus: 'awaiting_approval',
        wfStep: 'approval_checkpoint',
        wfError: '',
        customerId: 'CUST-108',
        orderId: null,
        type: 'udhaar_reminder',
        title: 'Scheduled Udhaar Follow-Up: Kavita Verma',
        reason: '₹1,850 khata balance overdue by 13 days; scheduled for morning 10:30 AM slot.',
        agent: 'Customer Intelligence Agent',
        confidence: 89,
        impact: 'Collect ₹1,850 pending khata',
        msg: 'Namaste Kavita ji! 🙏 Aapka ₹1,850 ka sesame oil khata balance pending hai. Convenience ke hisaab se UPI se clear kar dijiyega. Dhanyawad!',
        status: 'snoozed',
        scheduledFor: `${daysAhead(1)}T10:30`,
        meta: { udhaarAmount: 1850, daysOverdue: 13 },
      },
      {
        id: 'ACT-907',
        wfId: 'WF-907',
        wfType: 'reactivation',
        wfStatus: 'completed',
        wfStep: 'measure',
        wfError: '',
        customerId: 'CUST-109',
        orderId: 'ORD-9948',
        type: 'reorder_reminder',
        title: 'Reorder Nudge Completed: Bilona A2 Ghee',
        reason: '30-day ghee cycle reached; buyer replied YES and placed prepaid UPI order ORD-9948.',
        agent: 'Execution & Measurement Agent',
        confidence: 96,
        impact: '+₹1,950 verified repeat order',
        msg: 'Sat Sri Akal Harpreet ji! 🙏 Aapka Bilona A2 Gir Cow Ghee jar khatam hone wala hoga. Fresh batch ready hai — kya aaj dispatch karein?',
        status: 'executed',
        scheduledFor: '',
        meta: { productName: 'Bilona A2 Gir Cow Ghee (1L Glass Jar)', orderAmount: 1950 },
      },
      {
        id: 'ACT-908',
        wfId: 'WF-908',
        wfType: 'cod_protection',
        wfStatus: 'failed',
        wfStep: 'execute',
        wfError: 'Simulated gateway timeout on first delivery attempt — ready for retry.',
        customerId: 'CUST-111',
        orderId: 'ORD-9947',
        type: 'cod_prepay',
        title: 'COD Prepay Link Retry Needed: ORD-9947',
        reason: 'Courier booking flagged moderate COD risk (38/100); gateway timed out before confirmation.',
        agent: 'Execution & Measurement Agent',
        confidence: 83,
        impact: 'Retry delivery slot & UPI option confirmation',
        msg: 'Namaste Deepak ji! 🙏 Aapka order #ORD-9947 Indore ke liye nikalne wala hai. Delivery morning 11 AM se pehle chahiye toh CONFIRM likhein.',
        status: 'failed',
        scheduledFor: '',
        meta: { orderId: 'ORD-9947', orderAmount: 1860, codRiskScore: 38 },
      },
      {
        id: 'ACT-909',
        wfId: 'WF-909',
        wfType: 'reactivation',
        wfStatus: 'escalated',
        wfStep: 'policy_guard',
        wfError: 'Blocked automatically by Policy & Safety Guard: customer opted out of WhatsApp outreach.',
        customerId: 'CUST-116',
        orderId: null,
        type: 'winback_offer',
        title: 'Policy Guard Blocked: Arvind Menon (Opted Out)',
        reason: 'Customer inactive 68 days, but opted_out = 1 on WhatsApp. Escalated for manual check.',
        agent: 'Policy & Safety Guard',
        confidence: 78,
        impact: 'Compliance protected (zero unsolicited messages)',
        msg: 'Namaste Arvind ji — fresh Malabar pepper harvest is available whenever you wish to reorder.',
        status: 'escalated',
        scheduledFor: '',
        meta: { blockedByPolicyGuard: true, reason: 'Customer opted out' },
      },
      {
        id: 'ACT-910',
        wfId: 'WF-910',
        wfType: 'reactivation',
        wfStatus: 'completed',
        wfStep: 'rejected_by_merchant',
        wfError: '',
        customerId: 'CUST-114',
        orderId: null,
        type: 'reorder_reminder',
        title: 'Ghee Reorder Nudge: Neha Patel',
        reason: '52 days since last Bilona A2 Ghee order; merchant chose to call personally instead.',
        agent: 'Engagement & Copy Agent',
        confidence: 87,
        impact: 'Dismissed after phone confirmation',
        msg: 'Namaste Neha ji! 🙏 Fresh Bilona A2 Ghee stock aa gaya hai, kya is week 1L jar bhej dein?',
        status: 'rejected',
        scheduledFor: '',
        meta: {
          productName: 'Bilona A2 Gir Cow Ghee (1L Glass Jar)',
          orderAmount: 1950,
          rejectionReason: 'Merchant spoke with buyer on phone directly',
        },
      },
    ];

    const insertWf = db.prepare(
      `INSERT INTO agent_workflows (id, business_id, workflow_type, trigger_source, target_type, target_id, status, current_step, input_json, result_json, error_message, is_demo)
       VALUES (?, ?, ?, 'scheduled_scan', ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    const insertTask = db.prepare(
      `INSERT INTO agent_tasks (id, workflow_id, business_id, agent_name, step_order, status, input_json, output_json, reason, confidence, duration_ms, error_message, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    );
    const insertApp = db.prepare(
      `INSERT INTO approvals (
        id, business_id, workflow_id, customer_id, order_id, action_type, title, reason,
        agent_name, required_permission, confidence, potential_impact, suggested_message,
        channel, status, scheduled_for, metadata_json, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'whatsapp_send', ?, ?, ?, 'WhatsApp', ?, ?, ?, 1)`
    );

    for (const act of seedActions) {
      insertWf.run(
        act.wfId,
        DEMO_BUSINESS_ID,
        act.wfType,
        act.orderId ? 'order' : 'customer',
        act.orderId || act.customerId,
        act.wfStatus,
        act.wfStep,
        JSON.stringify(act.meta),
        JSON.stringify({ approvalId: act.id }),
        act.wfError
      );

      const agents = [
        'Customer Intelligence Agent',
        'Behaviour & Prediction Agent',
        'Engagement & Copy Agent',
        'Policy & Safety Guard',
      ];
      agents.forEach((agName, idx) => {
        const isPolicyBlock = act.id === 'ACT-909' && agName === 'Policy & Safety Guard';
        const taskStatus = isPolicyBlock ? 'failed' : 'completed';
        const taskReason = isPolicyBlock
          ? 'Blocked: customer opted out of WhatsApp messages (consent_whatsapp = 0).'
          : act.reason;
        insertTask.run(
          generateId('TSK'),
          act.wfId,
          DEMO_BUSINESS_ID,
          agName,
          idx + 1,
          taskStatus,
          JSON.stringify({ targetId: act.orderId || act.customerId }),
          JSON.stringify({ status: taskStatus, step: agName }),
          taskReason,
          act.confidence,
          42 + idx * 16,
          isPolicyBlock ? 'Opt-out safeguard triggered' : ''
        );
      });

      if (act.id === 'ACT-907') {
        insertTask.run(
          generateId('TSK'),
          act.wfId,
          DEMO_BUSINESS_ID,
          'Execution & Measurement Agent',
          5,
          'completed',
          JSON.stringify({ approvalId: act.id }),
          JSON.stringify({ status: 'simulated', providerMessageId: 'SIM-MSG-907' }),
          'Dispatched simulated WhatsApp message and recorded customer reply.',
          96,
          78,
          ''
        );
        insertTask.run(
          generateId('TSK'),
          act.wfId,
          DEMO_BUSINESS_ID,
          'Execution & Measurement Agent',
          6,
          'completed',
          JSON.stringify({ orderId: 'ORD-9948' }),
          JSON.stringify({ verifiedRevenue: 1950 }),
          'Verified closed-loop repeat order ORD-9948 (₹1,950 Prepaid UPI).',
          98,
          34,
          ''
        );
      } else if (act.id === 'ACT-908') {
        insertTask.run(
          generateId('TSK'),
          act.wfId,
          DEMO_BUSINESS_ID,
          'Execution & Measurement Agent',
          5,
          'failed',
          JSON.stringify({ approvalId: act.id }),
          JSON.stringify({ status: 'failed' }),
          'Gateway request timed out on initial dispatch; awaiting merchant retry.',
          83,
          610,
          'Simulated gateway timeout on first delivery attempt'
        );
      }

      insertApp.run(
        act.id,
        DEMO_BUSINESS_ID,
        act.wfId,
        act.customerId,
        act.orderId,
        act.type,
        act.title,
        act.reason,
        act.agent,
        act.confidence,
        act.impact,
        act.msg,
        act.status,
        act.scheduledFor,
        JSON.stringify(act.meta)
      );
    }

    // Historical executed action + message history + inbound replies + analytics events
    db.prepare(
      `INSERT INTO approvals (
        id, business_id, workflow_id, customer_id, order_id, action_type, title, reason,
        agent_name, required_permission, confidence, potential_impact, suggested_message,
        channel, status, metadata_json, is_demo
      ) VALUES ('ACT-899', ?, NULL, 'CUST-105', 'ORD-9884', 'reorder_reminder', 'Reorder Nudge: Indrayani Rice 10kg', '30-day grain cadence completed.', 'Execution & Measurement Agent', 'whatsapp_send', 95, '+₹1,450 observed repeat order', 'Namaste Ananya ji! Aapka Indrayani Rice pack ready hai.', 'WhatsApp', 'executed', '{"orderAmount":1450}', 1)`
    ).run(DEMO_BUSINESS_ID);

    const insertMsg = db.prepare(
      `INSERT INTO message_history (id, business_id, customer_id, approval_id, channel, direction, body, status, provider_message_id, error_message, is_demo)
       VALUES (?, ?, ?, ?, 'WhatsApp', ?, ?, ?, ?, ?, 1)`
    );
    insertMsg.run(
      'MSG-101',
      DEMO_BUSINESS_ID,
      'CUST-105',
      'ACT-899',
      'outbound',
      'Namaste Ananya ji! Aapka Indrayani Rice pack ready hai.',
      'simulated',
      'SIM-MSG-101',
      ''
    );
    insertMsg.run(
      'MSG-102',
      DEMO_BUSINESS_ID,
      'CUST-105',
      'ACT-899',
      'inbound',
      'Yes please send 10kg pack, paying via UPI now.',
      'read',
      'IN-MSG-102',
      ''
    );
    insertMsg.run(
      'MSG-103',
      DEMO_BUSINESS_ID,
      'CUST-109',
      'ACT-907',
      'outbound',
      'Sat Sri Akal Harpreet ji! 🙏 Aapka Bilona A2 Gir Cow Ghee jar khatam hone wala hoga. Fresh batch ready hai — kya aaj dispatch karein?',
      'simulated',
      'SIM-MSG-907',
      ''
    );
    insertMsg.run(
      'MSG-104',
      DEMO_BUSINESS_ID,
      'CUST-109',
      'ACT-907',
      'inbound',
      'Haan ji bhej dijiye, UPI kar diya hai.',
      'read',
      'IN-MSG-104',
      ''
    );
    insertMsg.run(
      'MSG-105',
      DEMO_BUSINESS_ID,
      'CUST-111',
      'ACT-908',
      'outbound',
      'Namaste Deepak ji! 🙏 Aapka order #ORD-9947 Indore ke liye nikalne wala hai.',
      'failed',
      '',
      'Simulated gateway timeout on first delivery attempt'
    );

    const insertEvt = db.prepare(
      `INSERT INTO analytics_events (id, business_id, event_type, customer_id, order_id, amount, holdout_group, metadata_json, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    insertEvt.run('EVT-101', DEMO_BUSINESS_ID, 'repeat_order_observed', 'CUST-105', 'ORD-9884', 1450, 0, '{"source":"engaged_cohort"}');
    insertEvt.run('EVT-102', DEMO_BUSINESS_ID, 'holdout_order_observed', 'CUST-107', 'ORD-9740', 1200, 1, '{"source":"holdout_control"}');
    insertEvt.run('EVT-103', DEMO_BUSINESS_ID, 'repeat_order_observed', 'CUST-109', 'ORD-9948', 1950, 0, '{"source":"engaged_cohort"}');
    insertEvt.run('EVT-104', DEMO_BUSINESS_ID, 'holdout_order_observed', 'CUST-117', 'ORD-9951', 1450, 1, '{"source":"holdout_control"}');
    insertEvt.run('EVT-105', DEMO_BUSINESS_ID, 'udhaar_collected', 'CUST-109', null, 1000, 0, '{"method":"UPI"}');
    insertEvt.run('EVT-106', DEMO_BUSINESS_ID, 'udhaar_collected', 'CUST-118', null, 1200, 0, '{"method":"Bank"}');

    // Audit trail entries for Demo Store Settings -> Activity Log
    const insertAudit = db.prepare(
      `INSERT INTO audit_logs (id, business_id, user_id, actor_type, action, entity_type, entity_id, details_json)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`
    );
    insertAudit.run('AUD-101', DEMO_BUSINESS_ID, 'system', 'demo_sandbox_initialized', 'business', DEMO_BUSINESS_ID, '{"version":"demo_seed_v2"}');
    insertAudit.run('AUD-102', DEMO_BUSINESS_ID, 'agent', 'workflow_executed', 'workflow', 'WF-907', '{"customerId":"CUST-109","outcome":"repeat_order_verified"}');
    insertAudit.run('AUD-103', DEMO_BUSINESS_ID, 'agent', 'policy_guard_blocked', 'customer', 'CUST-116', '{"reason":"opted_out_whatsapp"}');
    insertAudit.run('AUD-104', DEMO_BUSINESS_ID, 'merchant', 'payment_recorded', 'customer', 'CUST-109', '{"amount":1000,"method":"UPI"}');
    insertAudit.run('AUD-105', DEMO_BUSINESS_ID, 'merchant', 'payment_recorded', 'customer', 'CUST-118', '{"amount":1200,"method":"Bank"}');
    insertAudit.run('AUD-106', DEMO_BUSINESS_ID, 'agent', 'cod_risk_scored', 'order', 'ORD-9932', '{"score":68,"band":"high"}');
    insertAudit.run('AUD-107', DEMO_BUSINESS_ID, 'merchant', 'approval_scheduled', 'approval', 'ACT-906', `{"scheduledFor":"${daysAhead(1)}T10:30"}`);
    insertAudit.run('AUD-108', DEMO_BUSINESS_ID, 'merchant', 'approval_rejected', 'approval', 'ACT-910', '{"reason":"Merchant spoke with buyer directly"}');

    db.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)').run(DEMO_SEED_VERSION);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function createBusinessScaffold(
  db: DatabaseSync,
  params: {
    businessId: string;
    name: string;
    category: string;
    city: string;
    state: string;
    preferredLanguage: string;
    storeUrl?: string;
    userId: string;
  }
): void {
  db.prepare(
    `INSERT INTO businesses (id, name, category, city, state, currency, timezone, preferred_language, store_url, mode)
     VALUES (?, ?, ?, ?, ?, 'INR', 'Asia/Kolkata', ?, ?, 'live')`
  ).run(
    params.businessId,
    params.name,
    params.category || 'Retail & D2C',
    params.city || '',
    params.state || '',
    params.preferredLanguage || 'en',
    params.storeUrl || ''
  );

  db.prepare(
    `INSERT INTO business_members (id, business_id, user_id, role)
     VALUES (?, ?, ?, 'owner')`
  ).run(generateId('MEM'), params.businessId, params.userId);

  db.prepare(
    `INSERT INTO business_settings (business_id) VALUES (?)`
  ).run(params.businessId);

  const providers: Array<'whatsapp' | 'shopify' | 'shiprocket' | 'razorpay' | 'gemini'> = [
    'whatsapp',
    'shopify',
    'shiprocket',
    'razorpay',
    'gemini',
  ];
  for (const provider of providers) {
    const isGeminiReady =
      provider === 'gemini' &&
      Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    db.prepare(
      `INSERT INTO integration_accounts (id, business_id, provider, status, config_json, last_error)
       VALUES (?, ?, ?, ?, '{}', ?)`
    ).run(
      generateId('INT'),
      params.businessId,
      provider,
      isGeminiReady ? 'connected' : 'not_configured',
      isGeminiReady ? '' : 'Credentials not configured yet.'
    );
  }
}
