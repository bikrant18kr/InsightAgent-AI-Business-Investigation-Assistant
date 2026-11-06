// tests/apiIntegration.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../server/index.js';
import { getDb } from '../server/db/index.js';

let server;
let baseUrl;

test.before(async () => {
  await getDb();
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('API Integration: GET /api/health returns database and mode status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'InsightAgent API');
  assert.equal(data.database.connected, true);
});

test('API Integration: POST /api/investigate performs end-to-end mock investigation', async () => {
  const res = await fetch(`${baseUrl}/api/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'Why did total revenue drop between Q1 2024 and Q2 2024?',
      forceMock: true
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.mode, 'MOCK');
  assert.ok(data.executedTools.length >= 2);
  assert.match(data.answer, /₹12,000/);
});

test('API Integration: POST /api/investigate rejects empty questions with 400', async () => {
  const res = await fetch(`${baseUrl}/api/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '   ' })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /valid natural-language question/);
});
