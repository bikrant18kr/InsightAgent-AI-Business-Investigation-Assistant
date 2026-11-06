# System Architecture

## Overview
InsightAgent bridges the gap between conversational business queries and rigorous quantitative analysis. Instead of allowing the language model to write raw SQL (which often leads to schema hallucinations, arithmetic errors, and injection vulnerabilities), the application uses an **orchestrated function-calling architecture**.

---

## Detailed Request Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Business Analyst
    participant Client as React Dashboard (Vite)
    participant API as Express API Server (/api/investigate)
    participant Engine as Investigation Engine
    participant OpenAI as OpenAI Chat Completions API
    participant Tools as Analytics & RAG Tools
    participant DB as PostgreSQL / pg-mem Database

    User->>Client: Enters question (e.g. "Why did revenue drop in Q2?")
    Client->>API: POST /api/investigate { question }
    API->>Engine: runInvestigation(dbPool, question)

    rect rgb(240, 248, 255)
        Note over Engine,OpenAI: Round 1: Top-level Metric Comparison
        Engine->>OpenAI: Prompt + Tool Definitions (compare_metric, breakdown_metric, etc.)
        OpenAI-->>Engine: Tool Call: compare_metric(metric='revenue', period1, period2)
        Engine->>Tools: compareMetric(dbPool, args)
        Tools->>DB: Parameterized SELECT query (Q1 vs Q2 total)
        DB-->>Tools: Period totals (₹12,000 vs ₹9,000)
        Tools-->>Engine: Reconciled comparison result (-25% decline)
    end

    rect rgb(245, 255, 250)
        Note over Engine,OpenAI: Round 2: Segment Breakdown
        Engine->>OpenAI: Tool Result (compare_metric output)
        OpenAI-->>Engine: Tool Call: breakdown_metric(metric='revenue', dimension='category')
        Engine->>Tools: breakdownMetric(dbPool, args)
        Tools->>DB: Parameterized GROUP BY category query
        DB-->>Tools: Category subtotals
        Tools-->>Engine: Ranked breakdown (Electronics: -₹3,000, 100% share)
    end

    rect rgb(255, 250, 240)
        Note over Engine,OpenAI: Round 3: Document Retrieval & Verification
        Engine->>OpenAI: Tool Result (breakdown_metric output)
        OpenAI-->>Engine: Tool Call: retrieve_business_context(query='electronics revenue reduction')
        Engine->>Tools: retrieveBusinessContext(dbPool, args)
        Tools->>DB: Query document_chunks table
        DB-->>Tools: Document chunk [DOC-OPS-01]
        Tools-->>Engine: Excerpt on 40% ad spend cut in Q2
    end

    rect rgb(255, 245, 245)
        Note over Engine,OpenAI: Round 4: Executive Report Synthesis
        Engine->>OpenAI: Tool Result (retrieve_business_context output)
        OpenAI-->>Engine: Final narrative report with structured sections
    end

    Engine-->>API: Synthesized report + executed tool traces
    API-->>Client: JSON Response (report, metric comparison, breakdown table, traces)
    Client-->>User: Renders metrics cards, breakdown table, citations, and expandable trace logs
```

---

## Code Walkthrough: First Files to Open in an Interview

When explaining the project during an interview, open these core files in order:

1. **`server/tools/analyticsTools.js`**
   - *Why:* Demonstrates how analytics logic is strictly isolated in server-controlled functions. Show how dimensions are mapped from allowlists (`DIMENSION_COLUMNS`), parameters are sanitized, and exact numeric reconciliations are computed.
2. **`server/tools/toolDefinitions.js`**
   - *Why:* Shows the exact JSON Schema specifications provided to OpenAI function calling (`compare_metric`, `breakdown_metric`, `retrieve_business_context`, `verify_hypothesis`).
3. **`server/agent/investigationEngine.js`**
   - *Why:* Contains the core multi-turn tool execution loop. Explain how the agent receives tool calls, invokes the SQL layer, injects outputs back into conversation history, and handles round limits and fallback mock modes.
4. **`server/db/schema.sql` and `server/db/seedData.js`**
   - *Why:* Shows the relational database schema (orders, items, returns, document chunks) and deterministic synthetic benchmark data with known mathematical outcomes.
5. **`client/src/App.jsx`**
   - *Why:* Highlights the user interface: renders numbers from structured backend evidence rather than trusting generative LLM markdown alone, provides document excerpts with citation IDs, and visualizes raw execution steps.

---

## Database Schema & Indexing Strategy

- **`categories` & `products`**: Dimensional hierarchy.
- **`orders`**: Fact table storing transaction timestamps, sales channel (`Online`, `Retail`, `Direct`), and geographic regions (`North`, `South`, `East`, `West`).
  - Indexed on: `orders(order_date)`.
- **`order_items`**: Line items tracking unit selling price, unit cost, quantity, and pre-computed gross revenue and total cost.
  - Indexed on: `order_items(order_id)` and `order_items(category_id)`.
- **`order_returns`**: Return events linked to order items, refund amounts, return dates, and customer reasons.
  - Indexed on: `order_returns(order_id)` and `order_returns(return_date)`.
- **`document_chunks`**: Document repository storing policy sections, operational memos, and accounting rules for in-database text retrieval.
