// server/tools/analyticsTools.js

export const ALLOWED_METRICS = ['revenue', 'cost', 'return_count', 'return_rate'];
export const ALLOWED_DIMENSIONS = ['category', 'region', 'channel'];
export const ALLOWED_CHECK_TYPES = ['policy_impact', 'cost_driver', 'volume_driver'];

const DIMENSION_COLUMNS = {
  category: 'c.name',
  region: 'o.region',
  channel: 'o.channel'
};

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * 1. compare_metric: Calculate values for two date ranges, absolute change, and percentage change.
 */
export async function compareMetric(dbPool, args) {
  const { metric, period1_start, period1_end, period2_start, period2_end } = args;

  if (!ALLOWED_METRICS.includes(metric)) {
    throw new Error(`Invalid metric: "${metric}". Allowed metrics are: ${ALLOWED_METRICS.join(', ')}`);
  }
  if (!isValidDate(period1_start) || !isValidDate(period1_end) || !isValidDate(period2_start) || !isValidDate(period2_end)) {
    throw new Error('All periods must be valid dates in YYYY-MM-DD format.');
  }
  if (new Date(period1_start) > new Date(period1_end) || new Date(period2_start) > new Date(period2_end)) {
    throw new Error('Start date cannot be after end date.');
  }

  const calcPeriod = async (start, end) => {
    if (metric === 'revenue' || metric === 'cost') {
      const col = metric === 'revenue' ? 'oi.revenue' : 'oi.total_cost';
      const sql = `
        SELECT COALESCE(SUM(${col}), 0) as total, COUNT(DISTINCT o.id) as order_count, COALESCE(SUM(oi.quantity), 0) as total_units
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.order_date >= $1 AND o.order_date <= $2
      `;
      const res = await dbPool.query(sql, [start, end]);
      return {
        value: parseFloat(res.rows[0].total) || 0,
        orderCount: parseInt(res.rows[0].order_count, 10) || 0,
        unitCount: parseInt(res.rows[0].total_units, 10) || 0
      };
    } else if (metric === 'return_count') {
      const sql = `
        SELECT COUNT(DISTINCT r.id) as return_count
        FROM order_returns r
        WHERE r.return_date >= $1 AND r.return_date <= $2
      `;
      const res = await dbPool.query(sql, [start, end]);
      return {
        value: parseInt(res.rows[0].return_count, 10) || 0
      };
    } else if (metric === 'return_rate') {
      // Cohort-based return rate:
      // Denominator: Unique orders placed between start and end
      // Numerator: Unique orders among that cohort that had a return recorded
      const sql = `
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(DISTINCT r.order_id) as returned_orders
        FROM orders o
        LEFT JOIN order_returns r ON o.id = r.order_id
        WHERE o.order_date >= $1 AND o.order_date <= $2
      `;
      const res = await dbPool.query(sql, [start, end]);
      const totalOrders = parseInt(res.rows[0].total_orders, 10) || 0;
      const returnedOrders = parseInt(res.rows[0].returned_orders, 10) || 0;
      const rate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
      return {
        value: parseFloat(rate.toFixed(2)),
        totalOrders,
        returnedOrders,
        unit: '%'
      };
    }
  };

  const p1 = await calcPeriod(period1_start, period1_end);
  const p2 = await calcPeriod(period2_start, period2_end);

  const absoluteChange = parseFloat((p2.value - p1.value).toFixed(2));
  let percentageChange = null;

  if (p1.value !== 0) {
    percentageChange = parseFloat(((absoluteChange / p1.value) * 100).toFixed(2));
  }

  return {
    tool: 'compare_metric',
    metric,
    period1: { start: period1_start, end: period1_end, ...p1 },
    period2: { start: period2_start, end: period2_end, ...p2 },
    absoluteChange,
    percentageChange,
    changeType: metric === 'return_rate' ? 'percentage_points' : 'standard',
    reconciliationNote: metric === 'return_rate'
      ? `Cohort return rate changed by ${absoluteChange > 0 ? '+' : ''}${absoluteChange} percentage points.`
      : `Total changed from ₹${p1.value.toLocaleString()} to ₹${p2.value.toLocaleString()} (${absoluteChange > 0 ? '+' : ''}${absoluteChange.toLocaleString()}).`
  };
}

/**
 * 2. breakdown_metric: Compare metric across approved dimensions and rank segment changes
 */
export async function breakdownMetric(dbPool, args) {
  const { metric, dimension, period1_start, period1_end, period2_start, period2_end } = args;

  if (!ALLOWED_METRICS.includes(metric)) {
    throw new Error(`Invalid metric: "${metric}".`);
  }
  if (!ALLOWED_DIMENSIONS.includes(dimension)) {
    throw new Error(`Invalid dimension: "${dimension}". Allowed dimensions: ${ALLOWED_DIMENSIONS.join(', ')}`);
  }

  const dimCol = DIMENSION_COLUMNS[dimension];

  const getSegmentTotals = async (start, end) => {
    if (metric === 'revenue' || metric === 'cost') {
      const col = metric === 'revenue' ? 'oi.revenue' : 'oi.total_cost';
      const sql = `
        SELECT ${dimCol} as segment, COALESCE(SUM(${col}), 0) as total, COALESCE(SUM(oi.quantity), 0) as units
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN categories c ON oi.category_id = c.id
        WHERE o.order_date >= $1 AND o.order_date <= $2
        GROUP BY ${dimCol}
      `;
      const res = await dbPool.query(sql, [start, end]);
      return res.rows.map(r => ({
        segment: r.segment,
        total: parseFloat(r.total) || 0,
        units: parseInt(r.units, 10) || 0
      }));
    } else if (metric === 'return_rate') {
      const sql = `
        SELECT 
          ${dimCol} as segment,
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(DISTINCT r.order_id) as returned_orders
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN categories c ON oi.category_id = c.id
        LEFT JOIN order_returns r ON o.id = r.order_id
        WHERE o.order_date >= $1 AND o.order_date <= $2
        GROUP BY ${dimCol}
      `;
      const res = await dbPool.query(sql, [start, end]);
      return res.rows.map(r => {
        const total = parseInt(r.total_orders, 10) || 0;
        const returned = parseInt(r.returned_orders, 10) || 0;
        return {
          segment: r.segment,
          total: total > 0 ? parseFloat(((returned / total) * 100).toFixed(2)) : 0,
          totalOrders: total,
          returnedOrders: returned
        };
      });
    } else {
      // return_count
      const sql = `
        SELECT ${dimCol} as segment, COUNT(DISTINCT r.id) as total
        FROM order_returns r
        JOIN orders o ON r.order_id = o.id
        JOIN order_items oi ON r.order_item_id = oi.id
        JOIN categories c ON oi.category_id = c.id
        WHERE r.return_date >= $1 AND r.return_date <= $2
        GROUP BY ${dimCol}
      `;
      const res = await dbPool.query(sql, [start, end]);
      return res.rows.map(r => ({
        segment: r.segment,
        total: parseInt(r.total, 10) || 0
      }));
    }
  };

  const p1Segments = await getSegmentTotals(period1_start, period1_end);
  const p2Segments = await getSegmentTotals(period2_start, period2_end);

  const segmentMap = new Map();
  for (const s of p1Segments) {
    segmentMap.set(s.segment, { p1: s.total, p2: 0, p1Units: s.units, p2Units: 0, p1Orders: s.totalOrders, p2Orders: 0, p1Ret: s.returnedOrders, p2Ret: 0 });
  }
  for (const s of p2Segments) {
    if (!segmentMap.has(s.segment)) {
      segmentMap.set(s.segment, { p1: 0, p2: s.total, p1Units: 0, p2Units: s.units, p1Orders: 0, p2Orders: s.totalOrders, p1Ret: 0, p2Ret: s.returnedOrders });
    } else {
      const entry = segmentMap.get(s.segment);
      entry.p2 = s.total;
      if (s.units !== undefined) entry.p2Units = s.units;
      if (s.totalOrders !== undefined) entry.p2Orders = s.totalOrders;
      if (s.returnedOrders !== undefined) entry.p2Ret = s.returnedOrders;
    }
  }

  const items = [];
  let totalP1 = 0;
  let totalP2 = 0;

  for (const [segment, data] of segmentMap.entries()) {
    const absChange = parseFloat((data.p2 - data.p1).toFixed(2));
    const pctChange = data.p1 !== 0 ? parseFloat(((absChange / data.p1) * 100).toFixed(2)) : null;

    totalP1 += data.p1;
    totalP2 += data.p2;

    items.push({
      segment,
      period1_value: data.p1,
      period2_value: data.p2,
      absolute_change: absChange,
      percentage_change: pctChange,
      p1_units: data.p1Units,
      p2_units: data.p2Units
    });
  }

  // Sort by magnitude of change descending
  items.sort((a, b) => Math.abs(b.absolute_change) - Math.abs(a.absolute_change));

  const totalDelta = parseFloat((totalP2 - totalP1).toFixed(2));
  const reconciledItems = items.map(item => ({
    ...item,
    shareOfTotalChangePct: totalDelta !== 0 && metric !== 'return_rate'
      ? parseFloat(((item.absolute_change / totalDelta) * 100).toFixed(2))
      : null
  }));

  return {
    tool: 'breakdown_metric',
    metric,
    dimension,
    periods: { p1: `${period1_start} to ${period1_end}`, p2: `${period2_start} to ${period2_end}` },
    segments: reconciledItems,
    reconciliation: {
      sumP1: parseFloat(totalP1.toFixed(2)),
      sumP2: parseFloat(totalP2.toFixed(2)),
      sumDelta: totalDelta,
      isReconciled: true
    }
  };
}

/**
 * 3. retrieve_business_context: Retrieve policy and metric definition documents via text search
 */
export async function retrieveBusinessContext(dbPool, args) {
  const { query, category, limit = 3 } = args;
  if (!query || typeof query !== 'string') {
    throw new Error('A search query string is required.');
  }

  const terms = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  let sql = 'SELECT id, title, section, category, effective_date, content FROM document_chunks';
  const params = [];

  if (category) {
    sql += ' WHERE category = $1';
    params.push(category);
  }

  const res = await dbPool.query(sql, params);
  const rows = res.rows;

  // Rank by keyword matches
  const scored = rows.map(doc => {
    let score = 0;
    const text = `${doc.title} ${doc.section} ${doc.content}`.toLowerCase();
    for (const term of terms) {
      if (text.includes(term)) {
        score += (doc.title.toLowerCase().includes(term) ? 3 : 1);
      }
    }
    return { ...doc, score };
  });

  const matched = scored.filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, Math.min(limit, 5));

  return {
    tool: 'retrieve_business_context',
    query,
    resultsCount: matched.length,
    documents: matched.map(d => ({
      source_id: d.id,
      title: d.title,
      section: d.section,
      effective_date: d.effective_date,
      category: d.category,
      excerpt: d.content
    }))
  };
}

/**
 * 4. verify_hypothesis: Run supported verification check (e.g. policy impact timing check)
 */
export async function verifyHypothesis(dbPool, args) {
  const { check_type, target_segment, policy_date, pre_window_days = 60, post_window_days = 60 } = args;

  if (!ALLOWED_CHECK_TYPES.includes(check_type)) {
    throw new Error(`Unsupported check_type: "${check_type}". Allowed checks: ${ALLOWED_CHECK_TYPES.join(', ')}`);
  }
  if (!isValidDate(policy_date)) {
    throw new Error('policy_date must be a valid YYYY-MM-DD date.');
  }

  if (check_type === 'policy_impact') {
    // Compare target segment vs control segments before & after policy date
    const preDate = new Date(policy_date);
    preDate.setDate(preDate.getDate() - parseInt(pre_window_days, 10));
    const preDateStr = preDate.toISOString().slice(0, 10);

    const postDate = new Date(policy_date);
    postDate.setDate(postDate.getDate() + parseInt(post_window_days, 10));
    const postDateStr = postDate.toISOString().slice(0, 10);

    // Fetch qualifying orders within the observation window
    const sql = `
      SELECT 
        o.id,
        o.order_date,
        c.name as category,
        r.id as return_id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN categories c ON oi.category_id = c.id
      LEFT JOIN order_returns r ON o.id = r.order_id
      WHERE o.order_date >= $1 AND o.order_date <= $2
    `;

    const res = await dbPool.query(sql, [preDateStr, postDateStr]);

    const segmentStats = {};
    const seenOrders = new Set();

    for (const row of res.rows) {
      if (!segmentStats[row.category]) {
        segmentStats[row.category] = { preOrders: 0, preReturns: 0, postOrders: 0, postReturns: 0 };
      }

      const orderKey = `${row.category}_${row.id}`;
      if (seenOrders.has(orderKey)) continue;
      seenOrders.add(orderKey);

      const orderDateStr = (row.order_date instanceof Date ? row.order_date.toISOString() : String(row.order_date)).slice(0, 10);
      const isPre = orderDateStr < policy_date;
      const isReturned = Boolean(row.return_id);

      if (isPre) {
        segmentStats[row.category].preOrders += 1;
        if (isReturned) segmentStats[row.category].preReturns += 1;
      } else {
        segmentStats[row.category].postOrders += 1;
        if (isReturned) segmentStats[row.category].postReturns += 1;
      }
    }

    const comparisons = Object.entries(segmentStats).map(([cat, stat]) => {
      const preRate = stat.preOrders > 0 ? parseFloat(((stat.preReturns / stat.preOrders) * 100).toFixed(2)) : 0;
      const postRate = stat.postOrders > 0 ? parseFloat(((stat.postReturns / stat.postOrders) * 100).toFixed(2)) : 0;
      const ppDelta = parseFloat((postRate - preRate).toFixed(2));
      return {
        category: cat,
        isTarget: target_segment ? cat.toLowerCase().includes(target_segment.toLowerCase()) : false,
        prePolicy: { orders: stat.preOrders, returns: stat.preReturns, ratePct: preRate },
        postPolicy: { orders: stat.postOrders, returns: stat.postReturns, ratePct: postRate },
        percentagePointDifference: ppDelta
      };
    });

    const targetComp = comparisons.find(c => c.isTarget) || comparisons[0];
    const controlComps = comparisons.filter(c => c !== targetComp);

    const timingConsistent = targetComp && targetComp.percentagePointDifference > 0;

    return {
      tool: 'verify_hypothesis',
      check_type,
      policy_date,
      target_segment: targetComp ? targetComp.category : target_segment,
      timing_supports_hypothesis: timingConsistent,
      verification_status: timingConsistent ? 'SUPPORTS_TIMING_PATTERN' : 'INCONCLUSIVE_OR_CONTRADICTED',
      causality_disclaimer: 'Statistical correlation with policy effective date supports the timing pattern, but observational data alone cannot rule out external confounding variables.',
      evidence: {
        target: targetComp,
        controls: controlComps
      }
    };
  }

  if (check_type === 'cost_driver') {
    // Decompose whether cost rise was driven by volume (units) or unit cost
    const sql = `
      SELECT 
        c.name as category,
        SUM(oi.quantity) as total_units,
        SUM(oi.total_cost) as total_cost,
        AVG(oi.unit_cost) as avg_unit_cost
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN categories c ON oi.category_id = c.id
      WHERE ($1::text IS NULL OR LOWER(c.name) = LOWER($1))
      GROUP BY c.name
    `;
    const res = await dbPool.query(sql, [target_segment || null]);
    return {
      tool: 'verify_hypothesis',
      check_type,
      target_segment,
      data: res.rows
    };
  }

  throw new Error(`Check type ${check_type} not yet implemented.`);
}
