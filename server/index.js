// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, runMigrationsAndSeed } from './db/index.js';
import { runInvestigation } from './agent/investigationEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with optional configuration
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Initialize database
let dbPool = null;
let isInMemoryDb = false;

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const hasDb = !!dbPool;
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '' && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here');
    res.json({
      status: 'ok',
      service: 'InsightAgent API',
      database: {
        connected: hasDb,
        engine: isInMemoryDb ? 'pg-mem (isolated in-memory)' : 'PostgreSQL'
      },
      aiMode: hasOpenAI ? 'LIVE_OPENAI' : 'MOCK_ENGINE',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Run migrations and reset/seed
app.post('/api/seed', async (req, res) => {
  try {
    await runMigrationsAndSeed(dbPool);
    res.json({ success: true, message: 'Database migrated and seeded with deterministic demo data.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Main investigation endpoint
app.post('/api/investigate', async (req, res) => {
  const { question, forceMock = false } = req.body;

  if (!question || typeof question !== 'string' || question.trim() === '') {
    return res.status(400).json({ error: 'A valid natural-language question is required.' });
  }

  // Rate limiting / query length protection
  if (question.length > 500) {
    return res.status(400).json({ error: 'Question exceeds maximum permitted length (500 characters).' });
  }

  try {
    const startTime = Date.now();
    const result = await runInvestigation(dbPool, question.trim(), { isMock: forceMock });
    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      durationMs,
      ...result
    });
  } catch (err) {
    console.error('Investigation error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'An unexpected error occurred during the investigation.'
    });
  }
});

// Serve frontend in production if built
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) res.status(404).send('InsightAgent Backend Running. (Frontend client build not present at /client/dist)');
  });
});

async function startServer() {
  const db = await getDb();
  dbPool = db.pool;
  isInMemoryDb = db.isInMemory;

  app.listen(PORT, () => {
    console.log(`InsightAgent server listening on port ${PORT}`);
    console.log(`Database engine: ${isInMemoryDb ? 'pg-mem' : 'PostgreSQL'}`);
    console.log(`OpenAI API configured: ${Boolean(process.env.OPENAI_API_KEY)}`);
  });
}

// Start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, startServer };
