# InsightAgent — Complete Project Master Reference & Documentation

**InsightAgent — AI Business Investigation Assistant**  
**Repository:** [https://github.com/bikrant18kr/InsightAgent-AI-Business-Investigation-Assistant](https://github.com/bikrant18kr/InsightAgent-AI-Business-Investigation-Assistant)  
**Location on PC:** `C:\Users\bikra\OneDrive\Desktop\InsightAgent-AI-Business-Investigation-Assistant`

---

## Table of Contents
1. [Project Overview & Core Philosophy](#1-project-overview--core-philosophy)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Metric & Accounting Definitions](#3-metric--accounting-definitions)
4. [Deterministic Seed Data & Known Expected Results](#4-deterministic-seed-data--known-expected-results)
5. [Server-Controlled Analytics Tools](#5-server-controlled-analytics-tools)
6. [OpenAI Function Calling Loop & Guardrails](#6-openai-function-calling-loop--guardrails)
7. [PostgreSQL Schema & RAG Documents](#7-postgresql-schema--rag-documents)
8. [React Frontend Overview](#8-react-frontend-overview)
9. [Automated Test Suite & Verification Results](#9-automated-test-suite--verification-results)
10. [Local Run & Setup Guide](#10-local-run--setup-guide)
11. [Interview Walkthrough & Key Questions](#11-interview-walkthrough--key-questions)

---

## 1. Project Overview & Core Philosophy

**InsightAgent** is an AI business analytics assistant built to investigate changes in operational metrics (revenue declines, cost surges, and return-rate increases) through structured empirical evidence.

### Why not let the AI write SQL?
In conventional LLM analytics workflows, models are prompted to generate raw SQL text. In a business or interview setting, this is inherently fragile and insecure:
- **Security Vulnerabilities:** Direct SQL generation creates injection surfaces and bypasses application-level access controls.
- **Arithmetic & Schema Hallucinations:** Language models frequently hallucinate column names, perform inaccurate groupings, or write malformed `JOIN` conditions that double-count line items.
- **Unverified Root Causes:** Generative models often invent persuasive but unfounded business explanations for numerical fluctuations.

### InsightAgent's Solution: Controlled Function Calling
InsightAgent treats the LLM strictly as a **reasoning planner**. The model selects high-level analytical tools (`compare_metric`, `breakdown_metric`, `retrieve_business_context`, `verify_hypothesis`), while the **Express application server owns and validates all SQL queries**. Parameters are strictly validated against allowlists, values are safely parameterized (`$1`, `$2`), additive contributions are reconciled to 100%, and policy timing is verified against empirical cohort data.

---

## 2. Tech Stack & Architecture

- **Backend:** Node.js (v20+), Express.js (v4.21), ES Modules.
- **Database:** PostgreSQL (with `pg` driver) + zero-dependency in-memory PostgreSQL engine (`pg-mem`) for instantaneous, isolated local testing and offline demos.
- **AI / LLM Integration:** Official OpenAI SDK (`openai` v4), using iterative tool calling (`tools` parameter) with gpt-4o-mini (configurable via `.env`).
- **Frontend:** React 18, Vite 5, CSS3 with responsive card layouts, contributor tables, and expandable observable execution traces.
- **Testing:** Node.js built-in test runner (`node:test`, `node:assert/strict`).

### High-Level Request Pipeline

```
[ User Inquiry in React Frontend ]
                │
                ▼ HTTP POST /api/investigate
[ Express Application Server (server/index.js) ]
                │
                ▼ Investigation Engine (server/agent/investigationEngine.js)
┌────────────────────────────────────────────────────────────────────────┐
│                        Iterative Tool Loop                             │
│                                                                        │
│  Round 1: compare_metric(metric, period1, period2)                     │
│           ➔ Queries baseline vs comparison totals                      │
│                                                                        │
│  Round 2: breakdown_metric(metric, dimension, periods)                 │
│           ➔ Decomposes variance by category/region/channel             │
│                                                                        │
│  Round 3: retrieve_business_context(query)                             │
│           ➔ Full-text search over document_chunks in PostgreSQL        │
│                                                                        │
│  Round 4: verify_hypothesis(check_type, target_segment, policy_date)   │
│           ➔ Evaluates pre/post cohort return rates with control group  │
│                                                                        │
│  Round 5: Final Report Generation (What Changed, Contributors,         │
│           Policy Context, Verification, and Limitations)               │
└────────────────────────────────────────────────────────────────────────┘
                │
                ▼ Structured JSON Response
[ React Client Renders Metric Cards, Contributor Tables, & Tool Traces ]
```

---

## 3. Metric & Accounting Definitions

| Metric | Formula / Calculation | Timestamp / Window | Handling Rules |
|---|---|---|---|
| **Revenue** | `SUM(order_items.quantity * order_items.unit_price)` | Evaluated on `orders.order_date` | Evaluates gross revenue across completed orders. Refunds are tracked in `order_returns`. |
| **Cost (COGS)** | `SUM(order_items.quantity * order_items.unit_cost)` | Evaluated on `orders.order_date` | Enables decomposition between unit volume (`quantity`) and acquisition cost (`unit_cost`). |
| **Return Count** | `COUNT(DISTINCT order_returns.id)` | Evaluated on `order_returns.return_date` | Count of discrete returned items/orders. |
| **Return Rate** | `(COUNT(DISTINCT order_returns.order_id) / COUNT(DISTINCT orders.id)) * 100` | Evaluated on `orders.order_date` (Cohort Window) | **Cohort-based:** Numerator and denominator evaluate the *exact same order cohort*. Changes reported in percentage points (`pp`). Zero denominators yield `0.0%`. |

---

## 4. Deterministic Seed Data & Known Expected Results

The dataset (`server/db/seedData.js`) contains 3 deterministic benchmark cases designed to verify accuracy:

### Case 1: Revenue Decline (Q1 2024 vs Q2 2024)
- **Q1 Total Revenue:** ₹12,000.00 (Jan 1, 2024 – Mar 31, 2024)
- **Q2 Total Revenue:** ₹9,000.00 (Apr 1, 2024 – Jun 30, 2024)
- **Change:** **-₹3,000.00 (-25.00%)**
- **Category Breakdown:**
  - *Electronics:* ₹6,000.00 ➔ ₹3,000.00 (**-₹3,000.00, -50.0%**, explaining **100% of company revenue decline**).
  - *Apparel:* ₹4,000.00 ➔ ₹4,000.00 (₹0.00 change).
  - *Home & Kitchen:* ₹2,000.00 ➔ ₹2,000.00 (₹0.00 change).

### Case 2: Apparel Cost Increase (Volume vs Unit Cost Decomposition)
- **Q1 Apparel Cost:** ₹1,600.00 (4 units @ ₹400.00 unit cost)
- **Q2 Apparel Cost:** ₹2,600.00 (4 units @ ₹650.00 unit cost)
- **Change:** **+₹1,000.00 (+62.50%)**
- **Decomposition Finding:** Volume remained identical (4 units in Q1 vs 4 units in Q2). The entire cost surge was driven by a **+62.5% increase in unit cost** due to an imported synthetic fabric surcharge (`DOC-METRIC-02`).

### Case 3: Return Window Policy Impact (May 1, 2024)
- **Policy Event:** On 2024-05-01, Electronics return window extended from 14 to 45 days (`DOC-POLICY-01`). Apparel remained unchanged at 14 days.
- **Pre-Policy Cohort (2024-03-01 to 2024-04-30):**
  - Electronics: 3 orders, 0 returns (Return Rate: **0.0%**)
  - Apparel (Control): 3 orders, 0 returns (Return Rate: **0.0%**)
- **Post-Policy Cohort (2024-05-01 to 2024-06-30):**
  - Electronics (Target): 2 orders, 2 returns (Return Rate: **100.0%**, **+100.0 pp increase**)
  - Apparel (Control): 3 orders, 0 returns (Return Rate: **0.0%**, **0.0 pp change**)
- **Guardrail:** Labeled as `SUPPORTS_TIMING_PATTERN`, noting that observational timing supports the hypothesis but cannot prove single-factor causation.

---

## 5. Server-Controlled Analytics Tools

All analytical execution logic is housed in [`server/tools/analyticsTools.js`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/server/tools/analyticsTools.js):

1. **`compare_metric`:**
   - Validates metric from `['revenue', 'cost', 'return_count', 'return_rate']`.
   - Computes baseline period value, comparison period value, absolute difference, and percentage change.
2. **`breakdown_metric`:**
   - Validates dimension from `['category', 'region', 'channel']` mapped to static SQL column names (`c.name`, `o.region`, `o.channel`).
   - Calculates segment contribution and checks if the sum of segment variances reconciles with the total variance (`isReconciled: true`).
3. **`retrieve_business_context`:**
   - Runs text matching against the `document_chunks` table in PostgreSQL.
   - Returns citations with document ID (`DOC-POLICY-01`), title, section, and effective dates.
4. **`verify_hypothesis`:**
   - Executes empirical pre/post cohort tests comparing affected segments with control segments.
   - Appends explicit causality disclaimers.

---

## 6. OpenAI Function Calling Loop & Guardrails

Located in [`server/agent/investigationEngine.js`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/server/agent/investigationEngine.js):

- **Tool Definitions:** Passed as structured JSON schemas ([`server/tools/toolDefinitions.js`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/server/tools/toolDefinitions.js)).
- **Multi-Round Execution:** While loop with `MAX_ROUNDS = 5`.
- **Dual-Engine Architecture:**
  - **Live AI Mode:** Uses OpenAI Chat Completions API with valid `OPENAI_API_KEY`.
  - **Deterministic Mock Mode:** Runs automatically if the API key is omitted or when "Force Mock" is toggled in the UI. Executes the exact same database queries and outputs verified traces without network latency or external costs.

---

## 7. PostgreSQL Schema & RAG Documents

### Schema ([`server/db/schema.sql`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/server/db/schema.sql))
- `categories`: `(id, name)`
- `products`: `(id, name, category_id)`
- `orders`: `(id, order_date, region, channel, customer_id)`
- `order_items`: `(id, order_id, product_id, category_id, quantity, unit_price, unit_cost, revenue, total_cost)`
- `order_returns`: `(id, order_id, order_item_id, return_date, reason, refund_amount)`
- `document_chunks`: `(id, title, section, category, effective_date, content)`

### Document Repository
- **`DOC-METRIC-01`:** Financial & Operating Metric Definitions Manual (Gross Revenue calculation on order date).
- **`DOC-METRIC-02`:** Cost Accounting Guidelines (Direct COGS, textile raw cotton and synthetic fabric import surcharge starting April 1, 2024).
- **`DOC-POLICY-01`:** Customer Satisfaction and Return Window Policy 2024 (Electronics return window extended to 45 days on May 1, 2024).
- **`DOC-OPS-01`:** Regional Logistics & Marketing Memo Q2 (40% ad spend reduction for Electronics in Northern and Western regions).

---

## 8. React Frontend Overview

Located in [`client/src/App.jsx`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/client/src/App.jsx) and styled with clean CSS in [`client/src/App.css`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/client/src/App.css):

- **Business Inquiry Box:** Accepts natural-language questions and includes one-click sample query chips.
- **Top Metric Card:** Displays baseline vs comparison periods, absolute change, and percentage shift.
- **Empirical Hypothesis Card:** Displays target segment status, pre/post percentage points, and causality disclaimers.
- **Reconciled Contributor Table:** Displays segment values, absolute changes, percentage changes, and share of total variance.
- **Document Sources Panel:** Highlights retrieved policy excerpts, document IDs, and effective dates.
- **Investigation Tool Traces Tab:** Visualizes each discrete function call, argument payload, and database output.

---

## 9. Automated Test Suite & Verification Results

All 10 automated test cases run via Node's native test runner without third-party frameworks:

```powershell
npm test
```

### Actual Test Run Results:
```
TAP version 13
ok 1 - Case 1: Revenue decline from ₹12,000 to ₹9,000 (-25%) with Electronics contributing 100%
ok 2 - Case 2: Cost increase in Apparel reflects higher unit cost (+62.5%) rather than volume
ok 3 - Case 3: Policy document retrieval and return rate hypothesis verification
ok 4 - Security & Boundary validation: Rejects invalid metrics and parameters safely
ok 5 - API Integration: GET /api/health returns database and mode status
ok 6 - API Integration: POST /api/investigate performs end-to-end mock investigation
ok 7 - API Integration: POST /api/investigate rejects empty questions with 400
ok 8 - Investigation Engine: executes Revenue decline query and produces structured evidence
ok 9 - Investigation Engine: executes Cost surge query with unit cost decomposition
ok 10 - Investigation Engine: executes Return rate policy hypothesis verification
1..10
# tests 10
# pass 10
# fail 0
```

---

## 10. Local Run & Setup Guide

### 1. Requirements
- Node.js v20.x or higher
- npm v10.x or higher

### 2. Environment Configuration
Create a `.env` file from `.env.example`:
```powershell
cp .env.example .env
```
Default configuration:
```ini
PORT=5000
NODE_ENV=development
DATABASE_URL=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```
*(Leave `DATABASE_URL` blank to use the built-in isolated in-memory PostgreSQL engine).*

### 3. Running the Server & Client
```powershell
# Run the full-stack app (serves React production build on port 5000)
npm start
```
Then open: **`http://localhost:5000`**

To run in development mode with React hot-reloading:
```powershell
# Terminal 1: Backend
npm run dev

# Terminal 2: React Vite Client
npm run client
```

---

## 11. Interview Walkthrough & Key Questions

### The First 5 Files to Open in an Interview:
1. [`server/tools/analyticsTools.js`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/server/tools/analyticsTools.js) — Shows server-side SQL security, allowlists, and mathematical reconciliation.
2. [`server/agent/investigationEngine.js`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/server/agent/investigationEngine.js) — Shows the iterative OpenAI function-calling loop and error handling.
3. [`server/tools/toolDefinitions.js`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/server/tools/toolDefinitions.js) — Shows structured JSON schemas for function calling.
4. [`server/db/schema.sql`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/server/db/schema.sql) — Shows the relational data model with indexed foreign keys.
5. [`docs/INTERVIEW_PREP.md`](file:///C:/Users/bikra/OneDrive/Desktop/InsightAgent-AI-Business-Investigation-Assistant/docs/INTERVIEW_PREP.md) — 60-second pitch and technical Q&A reference.

### Best Demo Question:
> *"Did the new return policy enacted in May 2024 increase customer returns in Electronics compared to other categories?"*
- Traces through: `compare_metric` (measures top-level shift) ➔ `breakdown_metric` (identifies Electronics as sole contributor) ➔ `retrieve_business_context` (retrieves `DOC-POLICY-01` 45-day return window) ➔ `verify_hypothesis` (validates timing pattern against Apparel control group with causality disclaimers).
