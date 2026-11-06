// tests/investigationEngine.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../server/db/index.js';
import { runInvestigation } from '../server/agent/investigationEngine.js';

let dbPool;

test.before(async () => {
  const db = await getDb();
  dbPool = db.pool;
});

test('Investigation Engine: executes Revenue decline query and produces structured evidence', async () => {
  const result = await runInvestigation(dbPool, 'Why did revenue drop in Q2 2024 compared to Q1 2024?', { isMock: true });

  assert.equal(result.mode, 'MOCK');
  assert.ok(result.executedTools.length >= 2, 'Must have executed compare and breakdown tools');
  assert.equal(result.executedTools[0].tool, 'compare_metric');
  assert.equal(result.executedTools[1].tool, 'breakdown_metric');

  // Verify compare output numbers
  const cmpOut = result.executedTools[0].output;
  assert.equal(cmpOut.period1.value, 12000.00);
  assert.equal(cmpOut.period2.value, 9000.00);
  assert.equal(cmpOut.absoluteChange, -3000.00);
  assert.equal(cmpOut.percentageChange, -25.00);

  // Verify breakdown identifies Electronics
  const brkOut = result.executedTools[1].output;
  const electronics = brkOut.segments.find(s => s.segment === 'Electronics');
  assert.equal(electronics.absolute_change, -3000.00);
  assert.equal(electronics.shareOfTotalChangePct, 100.00);

  assert.match(result.answer, /₹12,000/);
  assert.match(result.answer, /₹9,000/);
  assert.match(result.answer, /Electronics/);
});

test('Investigation Engine: executes Cost surge query with unit cost decomposition', async () => {
  const result = await runInvestigation(dbPool, 'Investigate the cost surge in Apparel during Q2 2024', { isMock: true });

  assert.equal(result.mode, 'MOCK');
  assert.ok(result.executedTools.some(t => t.tool === 'retrieve_business_context'));
  assert.match(result.answer, /DOC-METRIC-02/);
  assert.match(result.answer, /62\.5/);
});

test('Investigation Engine: executes Return rate policy hypothesis verification', async () => {
  const result = await runInvestigation(dbPool, 'Did the new return policy affect our return rates in May 2024?', { isMock: true });

  assert.equal(result.mode, 'MOCK');
  assert.ok(result.executedTools.some(t => t.tool === 'verify_hypothesis'));
  assert.match(result.answer, /DOC-POLICY-01/);
  assert.match(result.answer, /SUPPORTS_TIMING_PATTERN/);
});
