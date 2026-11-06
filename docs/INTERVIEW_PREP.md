# Technical Interview Preparation Guide

This guide gives you clear, concise, and technically grounded answers to the most common interview questions about InsightAgent.

---

## 1. The 60-Second Elevator Pitch
> *"InsightAgent is an AI business analytics assistant built with Node.js, Express, PostgreSQL, and React. When business leaders ask questions like 'Why did our revenue drop in Q2?', standard LLMs either hallucinate numbers or try to write error-prone raw SQL that risks database corruption and security breaches.*
>
> *I designed InsightAgent around a controlled OpenAI function-calling loop with four specialized tools: top-level metric comparisons, multidimensional breakdowns with exact reconciliation, policy document retrieval via PostgreSQL full-text search, and empirical hypothesis verification. The model never writes SQL; it orchestrates high-level investigation steps while our application server enforces allowlists, exact numeric arithmetic, and causal guardrails."*

---

## 2. Frequently Asked Technical Questions

### Q1: "Why use Function Calling instead of letting the model generate raw SQL?"
**Answer:**
1. **Security (SQL Injection & Access Control):** Allowing a language model to emit arbitrary SQL strings opens severe attack surfaces (e.g. unintended `DROP`, schema tampering, data exfiltration).
2. **Schema Hallucinations & Join Errors:** LLMs frequently invent columns or write incorrect `JOIN` conditions that cause silent duplicate counting across line items and returns.
3. **Controlled Business Logic:** Metric formulas (e.g. cohort-based return rates or COGS decompositions) require consistent business definitions that belong in the application code, not in prompts.
4. **Separation of Concerns:** The model decides *what* investigation question to pursue; our application server controls *how* queries are safely parameterized and executed.

---

### Q2: "What is RAG in this project? Did you use a Vector Database?"
**Answer:**
> *"RAG (Retrieval-Augmented Generation) here is implemented directly inside PostgreSQL using keyword and full-text search over structured `document_chunks`.
> For business policy retrieval (such as customer return windows, supplier cost updates, and metric definitions), domain documents are small, exact, and date-sensitive. Traditional vector embeddings often struggle with exact dates, numerical thresholds, or specific policy clauses. Storing document chunks in relational tables with metadata (`effective_date`, `category`, `section`) allows deterministic, low-latency retrieval without the operational overhead of a vector database like Pinecone or Milvus."*

---

### Q3: "How do you distinguish a contributing segment from a proven root cause?"
**Answer:**
> *"In business analytics, a segment variance is an additive contributor, not a proven root cause. For example, when Electronics revenue dropped by ₹3,000, Electronics is the 100% mathematical contributor to the decline. However, that alone does not explain why customers stopped buying.
> Our system enforces two guardrails:
> 1. It decomposes additive metrics and checks that segment contributions reconcile to 100% of the total variance.
> 2. It explicitly labels hypotheses as 'SUPPORTS_TIMING_PATTERN' rather than 'PROVEN_CAUSE', warning that observational correlation with policy or campaign dates cannot eliminate external confounding factors like competitor discounts or seasonal demand shifts."*

---

### Q4: "How does your Return Rate calculation avoid denominator mismatch?"
**Answer:**
> *"If you calculate return rate by dividing returns that occurred in May by orders placed in May, you create a severe timing mismatch because items returned in May might have been ordered in March or April.
> InsightAgent uses a **cohort-based definition**: the denominator is the count of distinct orders placed within the observation window, and the numerator is the count of those exact orders that subsequently experienced a return event. Furthermore, segment return rates are compared using percentage-point (pp) changes rather than misleading additive sums."*

---

### Q5: "How does the system handle missing API credentials or offline environments?"
**Answer:**
> *"The backend includes an automatic dual-engine architecture. In production with credentials, it invokes OpenAI and live PostgreSQL. If credentials are unset or the user toggles 'Force Mock', the application executes a deterministic Mock Investigation Engine that runs the exact same SQL queries and returns authentic, reproducible results with identical structured trace observability."*
