# InsightAgent — AI Business Investigation Assistant

InsightAgent is an AI-powered business analytics and investigation assistant that investigates changes in business metrics (such as revenue decline, cost surges, and return rate shifts).

Instead of letting language models write raw SQL—which introduces critical security, syntax, and hallucination risks—InsightAgent uses a controlled tool-calling loop. The language model chooses which high-level investigation step to perform (`compare_metric`, `breakdown_metric`, `retrieve_business_context`, `verify_hypothesis`), and the application server validates arguments, chooses SQL templates from an allowlist, executes parameterized queries against PostgreSQL, reconciles numerical evidence, and returns verifiable business explanations.

---

## Key Highlights

- **Controlled Analytics Execution:** Models never generate SQL statements. Metrics, dimensions, and date ranges are validated against allowlists, and all SQL arguments are bound as query parameters.
- **Iterative Investigation Tool Loop:** Implements real OpenAI function calling with multi-turn tool loops (Comparison ➔ Breakdown ➔ Document Context ➔ Empirical Hypothesis Verification).
- **Exact Numeric Reconciliations:** Computes period-over-period absolute deltas, percentage changes, segment contribution shares (must sum to 100% of additive variance), and cohort-level return rates.
- **Domain Document RAG:** Retrieves policy chunks, operational memos, and accounting definitions stored in PostgreSQL to identify why an anomaly occurred.
- **Grounded Verification & Causality Guardrails:** Tests timing alignment before and after policy enactments against both affected and control segments, explicitly separating empirical correlation from proven single-factor causation.
- **Dual-Engine Operation:** Runs out of the box with zero external dependencies via an isolated, in-memory PostgreSQL engine (`pg-mem`), or seamlessly connects to standard PostgreSQL via `DATABASE_URL`. Includes an authentic Mock Engine for offline development, integration tests, and interview demos.

---

## Metric & Accounting Definitions

1. **Revenue (Gross Revenue):**
   - **Formula:** `SUM(order_items.quantity * order_items.unit_price)`
   - **Timing:** Recognized on the order placement date (`orders.order_date`).
   - Refunds are recorded separately in `order_returns` and evaluated under net revenue analysis.
2. **Cost (Cost of Goods Sold - COGS):**
   - **Formula:** `SUM(order_items.quantity * order_items.unit_cost)`
   - **Timing:** Recognized on `orders.order_date`. Allows decomposition between unit volume changes (`quantity`) and price/cost changes (`unit_cost`).
3. **Return Count:**
   - **Formula:** `COUNT(DISTINCT order_returns.id)`
   - **Timing:** Evaluated on `order_returns.return_date`.
4. **Return Rate (Cohort-Based):**
   - **Formula:** `(COUNT(DISTINCT order_returns.order_id) / COUNT(DISTINCT orders.id)) * 100`
   - **Timing & Denominator:** Both numerator and denominator evaluate orders placed within the specified order-date window (`orders.order_date`).
   - Changes are reported in **percentage points (pp)**, never summed across segments. Zero denominators default safely to `0.0%`.

---

## Seeded Benchmark Test Cases

The application includes a deterministic seed script with exact expected results:

| Benchmark Case | Description | Baseline | Comparison | Key Observation / Contributor |
|---|---|---|---|---|
| **Case 1: Revenue Decline** | Revenue drop from Q1 to Q2 2024 | ₹12,000.00 (Q1) | ₹9,000.00 (Q2) | **-₹3,000.00 (-25.0%)**. Electronics dropped from ₹6,000 to ₹3,000, explaining **100% of total company decline**. Apparel and Home & Kitchen were completely unchanged. |
| **Case 2: Cost Increase** | Apparel segment cost surge in Q2 2024 | ₹1,600.00 (Q1) | ₹2,600.00 (Q2) | **+₹1,000.00 (+62.5%)**. Both periods sold 4 units. Decomposition verifies volume remained identical (4 vs 4), while average unit cost jumped from ₹400 to ₹650 due to an imported fabric surcharge (`DOC-METRIC-02`). |
| **Case 3: Policy Impact** | Return window extended on May 1, 2024 | 0.0% (Pre-window) | 28.57% (Post-window) | Electronics return window extended from 14 to 45 days (`DOC-POLICY-01`). Post-policy return rate in Electronics surged to 100% (2 of 2 cohort orders returned), while Apparel remained at 0% (0 of 3 orders returned). |

---

## System Architecture

```
[ User Browser / React Vite Client ]
             │
             ▼ HTTP POST /api/investigate
[ Express Application Server ]
             │
             ├──► OpenAI Function Calling Loop (max 5 rounds)
             │        │
             │        ├─► compare_metric
             │        ├─► breakdown_metric
             │        ├─► retrieve_business_context
             │        └─► verify_hypothesis
             │
             ▼ Strict Parameter Validation & Query Routing
[ PostgreSQL / pg-mem Database ]
      ├── orders & order_items
      ├── order_returns
      └── document_chunks (Policies & Definitions)
```

---

## Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v20.x or later
- **npm**: v10.x or later
- Optional: Local PostgreSQL instance (if not provided, an in-memory PostgreSQL engine is automatically spun up)

### 2. Installation
Clone the repository and install dependencies:

```powershell
# In PowerShell or Command Prompt
git clone https://github.com/bikrant18kr/InsightAgent-AI-Business-Investigation-Assistant.git
cd InsightAgent-AI-Business-Investigation-Assistant

# Install backend dependencies
npm install

# Install frontend dependencies
npm run build
```

### 3. Environment Variables
Copy `.env.example` to `.env`:

```powershell
cp .env.example .env
```

Available configuration options in `.env`:
```ini
PORT=5000
NODE_ENV=development

# Optional: PostgreSQL Connection string
# If left blank, InsightAgent automatically boots the isolated pg-mem database
DATABASE_URL=

# Optional: OpenAI API Key
# If omitted or left empty, InsightAgent runs in Mock Mode
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

### 4. Running the Application

**Option A: Run Full Stack Server (serves React frontend on port 5000):**
```powershell
npm start
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

**Option B: Run Development Mode with Hot-Reloading:**
```powershell
# Terminal 1 (Backend API)
npm run dev

# Terminal 2 (Vite React Client)
npm run client
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Automated Tests

Run the complete automated test suite (including mathematical reconciliation tests, dimension allowlist security tests, hypothesis tests, and API integration tests):

```powershell
npm test
```

Expected output:
```
1..10
# tests 10
# suites 0
# pass 10
# fail 0
```

---

## Security & Reliability Design

1. **No LLM-Generated SQL:** The system strictly rejects free-form SQL generation. The model can only request high-level operations with discrete parameters.
2. **Dimension & Metric Allowlists:** Dimension identifiers are mapped server-side to static column definitions (`category` ➔ `c.name`, `region` ➔ `o.region`, `channel` ➔ `o.channel`).
3. **Parametric Sanitization:** Date values, periods, and IDs are checked against strict regular expressions and passed to PostgreSQL via parameterized query placeholders (`$1`, `$2`).
4. **Untrusted RAG Context:** Document excerpts retrieved from `document_chunks` are treated as informational context only; they have no ability to execute commands or override database rules.
5. **Observability:** All tool arguments and server responses are captured in structured execution traces visible on the dashboard.
