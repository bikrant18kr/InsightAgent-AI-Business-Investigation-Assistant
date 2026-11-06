// tests/analytics.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDb, runMigrationsAndSeed } from '../server/db/index.js';
import {
  compareMetric,
  breakdownMetric,
  retrieveBusinessContext,
  verifyHypothesis
} from '../server/tools/analyticsTools.js';

let dbPool;

test.before(async () => {
  const db = await getDb();
  dbPool = db.pool;
  // Database is already auto-migrated and deterministically seeded by getDb()
});

test('Case 1: Revenue decline from ₹12,000 to ₹9,000 (-25%) with Electronics contributing 100%', async () => {
  // 1. Compare Revenue Q1 vs Q2
  const comp = await compareMetric(dbPool, {
    metric: 'revenue',
    period1_start: '2024-01-01',
    period1_end: '2024-03-31',
    period2_start: '2024-04-01',
    period2_end: '2024-06-30'
  });

  assert.equal(comp.period1.value, 12000.00, 'Q1 Revenue must be 12,000.00');
  assert.equal(comp.period2.value, 9000.00, 'Q2 Revenue must be 9,000.00');
  assert.equal(comp.absoluteChange, -3000.00, 'Revenue absolute change must be -3,000.00');
  assert.equal(comp.percentageChange, -25.00, 'Revenue % change must be -25%');

  // 2. Breakdown Revenue by Category
  const brk = await breakdownMetric(dbPool, {
    metric: 'revenue',
    dimension: 'category',
    period1_start: '2024-01-01',
    period1_end: '2024-03-31',
    period2_start: '2024-04-01',
    period2_end: '2024-06-30'
  });

  assert.equal(brk.reconciliation.isReconciled, true);
  assert.equal(brk.reconciliation.sumDelta, -3000.00);

  const electronics = brk.segments.find(s => s.segment === 'Electronics');
  assert.ok(electronics, 'Electronics segment must exist');
  assert.equal(electronics.period1_value, 6000.00);
  assert.equal(electronics.period2_value, 3000.00);
  assert.equal(electronics.absolute_change, -3000.00);
  assert.equal(electronics.shareOfTotalChangePct, 100.00, 'Electronics accounts for 100% of the revenue contraction');

  const apparel = brk.segments.find(s => s.segment === 'Apparel');
  assert.equal(apparel.absolute_change, 0);

  const home = brk.segments.find(s => s.segment === 'Home & Kitchen');
  assert.equal(home.absolute_change, 0);
});

test('Case 2: Cost increase in Apparel reflects higher unit cost (+62.5%) rather than volume', async () => {
  const brk = await breakdownMetric(dbPool, {
    metric: 'cost',
    dimension: 'category',
    period1_start: '2024-01-01',
    period1_end: '2024-03-31',
    period2_start: '2024-04-01',
    period2_end: '2024-06-30'
  });

  const apparel = brk.segments.find(s => s.segment === 'Apparel');
  assert.ok(apparel);
  assert.equal(apparel.period1_value, 1600.00);
  assert.equal(apparel.period2_value, 2600.00);
  assert.equal(apparel.absolute_change, 1000.00);
  assert.equal(apparel.percentage_change, 62.50);
  assert.equal(apparel.p1_units, 4, 'Units ordered in Q1 was 4');
  assert.equal(apparel.p2_units, 4, 'Units ordered in Q2 was 4');
});

test('Case 3: Policy document retrieval and return rate hypothesis verification', async () => {
  // Document retrieval
  const ret = await retrieveBusinessContext(dbPool, {
    query: 'electronics return window days policy',
    limit: 2
  });

  assert.ok(ret.documents.length > 0);
  assert.equal(ret.documents[0].source_id, 'DOC-POLICY-01');
  assert.match(ret.documents[0].title, /Return Window Policy/);

  // Return rate hypothesis test
  const hyp = await verifyHypothesis(dbPool, {
    check_type: 'policy_impact',
    target_segment: 'Electronics',
    policy_date: '2024-05-01',
    pre_window_days: 60,
    post_window_days: 60
  });

  assert.equal(hyp.timing_supports_hypothesis, true);
  assert.equal(hyp.verification_status, 'SUPPORTS_TIMING_PATTERN');
  assert.equal(hyp.evidence.target.category, 'Electronics');
  assert.equal(hyp.evidence.target.prePolicy.ratePct, 0);
  assert.equal(hyp.evidence.target.postPolicy.ratePct, 100.0);
  assert.equal(hyp.evidence.target.percentagePointDifference, 100.0);
});

test('Security & Boundary validation: Rejects invalid metrics and parameters safely', async () => {
  await assert.rejects(
    async () => {
      await compareMetric(dbPool, {
        metric: 'unauthorized_metric; DROP TABLE orders;--',
        period1_start: '2024-01-01',
        period1_end: '2024-03-31',
        period2_start: '2024-04-01',
        period2_end: '2024-06-30'
      });
    },
    /Invalid metric/
  );

  await assert.rejects(
    async () => {
      await breakdownMetric(dbPool, {
        metric: 'revenue',
        dimension: 'malicious_column_injection',
        period1_start: '2024-01-01',
        period1_end: '2024-03-31',
        period2_start: '2024-04-01',
        period2_end: '2024-06-30'
      });
    },
    /Invalid dimension/
  );
});
