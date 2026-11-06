# Resume Claims to Code Mapping

This document provides a line-by-line verification mapping each resume bullet point to its exact code implementation, automated tests, and live demonstration query.

---

### Resume Bullet 1: Controlled Business Analytics & Dimension Breakdown
> *"Engineered an AI business analytics assistant using Node.js, Express, and PostgreSQL to investigate shifts in revenue, costs, and returns across dimensions (category, region, channel) with mathematical reconciliation."*

- **Implementation Files:**
  - `server/tools/analyticsTools.js` (see `compareMetric()` lines 20–108 and `breakdownMetric()` lines 112–270).
  - `server/db/schema.sql` (schema tables: `orders`, `order_items`, `order_returns`).
- **Mathematical Reconciliation Logic:**
  - For additive metrics (`revenue`, `cost`), the server calculates `sumDelta` across all segments and computes `shareOfTotalChangePct`. It verifies that segment changes sum to 100% of the total variance (`isReconciled: true`).
  - For ratio metrics (`return_rate`), changes are calculated strictly in percentage points against matching order cohorts to prevent denominator mismatch.
- **Automated Tests:**
  - `tests/analytics.test.js`:
    - `Case 1: Revenue decline from ₹12,000 to ₹9,000 (-25%) with Electronics contributing 100%`
    - `Security & Boundary validation: Rejects invalid metrics and parameters safely`
- **Demo Query:**
  - *"Why did total revenue drop between Q1 2024 and Q2 2024, and which category contributed the most?"*

---

### Resume Bullet 2: Iterative OpenAI Function Calling Loop
> *"Implemented an iterative OpenAI function calling engine with bounded multi-round execution, dynamic parameter validation, and observable investigation traces."*

- **Implementation Files:**
  - `server/tools/toolDefinitions.js` (JSON Schema specifications for tools).
  - `server/agent/investigationEngine.js` (lines 40–120: multi-round `while` loop handling `message.tool_calls`, structured argument parsing, tool execution, and injecting tool outputs back with `tool_call_id`).
  - `client/src/App.jsx` (Expandable **Investigation Tool Traces** tab visualizing Step 1 to N with arguments and outputs).
- **Execution Safeguards:**
  - Maximum round bound (`MAX_ROUNDS = 5`) to prevent infinite recursion and runaway costs.
  - Arguments parsed inside `try/catch` with structured server errors delivered back to the model.
  - Zero SQL generation by the model; queries use server-side parameterization.
- **Automated Tests:**
  - `tests/investigationEngine.test.js`:
    - `Investigation Engine: executes Revenue decline query and produces structured evidence`
- **Demo Query:**
  - Any demo question will show the multi-step trace: `compare_metric` ➔ `breakdown_metric` ➔ `retrieve_business_context` ➔ Final narrative.

---

### Resume Bullet 3: Grounded Business Explanations & Policy Verification
> *"Developed a grounded RAG and hypothesis verification pipeline combining PostgreSQL document retrieval with pre/post policy impact checks, separating empirical correlation from single-factor causation."*

- **Implementation Files:**
  - `server/tools/analyticsTools.js`:
    - `retrieveBusinessContext()` (lines 272–310): In-database text search over `document_chunks` (policies, operational memos, cost guidelines).
    - `verifyHypothesis()` (lines 314–395): Evaluates empirical cohorts before and after policy enactments for both target and control segments.
- **Causality Guardrail:**
  - Explicit server-enforced disclaimer: *"Statistical correlation with policy effective date supports the timing pattern, but observational data alone cannot rule out external confounding variables."*
- **Automated Tests:**
  - `tests/analytics.test.js`:
    - `Case 3: Policy document retrieval and return rate hypothesis verification`
  - `tests/investigationEngine.test.js`:
    - `Investigation Engine: executes Return rate policy hypothesis verification`
- **Demo Query:**
  - *"Did the new return policy enacted in May 2024 increase customer returns in Electronics compared to other categories?"*
