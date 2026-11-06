// server/db/index.js
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { categories, products, orders, orderItems, orderReturns, documentChunks } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let pool = null;
let inMemoryInstance = null;
let isInMemory = false;

export async function getDb() {
  if (pool) return { pool, isInMemory };

  const connectionString = process.env.DATABASE_URL;

  if (connectionString && connectionString.trim() !== '') {
    try {
      pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
      await pool.query('SELECT 1');
      console.log('Connected to external PostgreSQL database.');
      isInMemory = false;
      return { pool, isInMemory };
    } catch (err) {
      console.warn('Failed connecting to external PostgreSQL:', err.message);
      console.log('Falling back to isolated in-memory PostgreSQL engine (pg-mem)...');
    }
  }

  // Fallback to high-performance in-memory PostgreSQL instance using pg-mem
  const { newDb } = await import('pg-mem');
  inMemoryInstance = newDb();

  const pgAdapter = inMemoryInstance.adapters.createPg();
  pool = new pgAdapter.Pool();
  isInMemory = true;
  console.log('Initialized isolated in-memory PostgreSQL engine (pg-mem).');

  // Auto-migrate and seed in-memory DB
  await runMigrationsAndSeed(pool);

  return { pool, isInMemory };
}

export async function runMigrationsAndSeed(dbPool = pool) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Split into individual statements
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await dbPool.query(stmt);
  }

  // Deterministic idempotent seed: clear and insert records
  await dbPool.query('DELETE FROM order_returns;');
  await dbPool.query('DELETE FROM order_items;');
  await dbPool.query('DELETE FROM orders;');
  await dbPool.query('DELETE FROM products;');
  await dbPool.query('DELETE FROM categories;');
  await dbPool.query('DELETE FROM document_chunks;');

  for (const cat of categories) {
    await dbPool.query('INSERT INTO categories (id, name) VALUES ($1, $2);', [cat.id, cat.name]);
  }

  for (const prod of products) {
    await dbPool.query('INSERT INTO products (id, name, category_id) VALUES ($1, $2, $3);', [prod.id, prod.name, prod.category_id]);
  }

  for (const ord of orders) {
    await dbPool.query(
      'INSERT INTO orders (id, order_date, region, channel, customer_id) VALUES ($1, $2, $3, $4, $5);',
      [ord.id, ord.order_date, ord.region, ord.channel, ord.customer_id]
    );
  }

  for (const item of orderItems) {
    await dbPool.query(
      'INSERT INTO order_items (id, order_id, product_id, category_id, quantity, unit_price, unit_cost, revenue, total_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);',
      [item.id, item.order_id, item.product_id, item.category_id, item.quantity, item.unit_price, item.unit_cost, item.revenue, item.total_cost]
    );
  }

  for (const ret of orderReturns) {
    await dbPool.query(
      'INSERT INTO order_returns (id, order_id, order_item_id, return_date, reason, refund_amount) VALUES ($1, $2, $3, $4, $5, $6);',
      [ret.id, ret.order_id, ret.order_item_id, ret.return_date, ret.reason, ret.refund_amount]
    );
  }

  for (const doc of documentChunks) {
    await dbPool.query(
      'INSERT INTO document_chunks (id, title, section, category, effective_date, content) VALUES ($1, $2, $3, $4, $5, $6);',
      [doc.id, doc.title, doc.section, doc.category, doc.effective_date, doc.content]
    );
  }

  console.log('Deterministic schema migration & seed completed successfully.');
}
