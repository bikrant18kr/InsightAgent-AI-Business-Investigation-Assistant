# Engineering Build & Verification Log

This log documents the implementation, key design decisions, and verification steps performed.

---

## 1. Environment & Setup
- **OS Platform:** Windows 11 (PowerShell terminal).
- **Desktop Target Directory:** Verified via `[Environment]::GetFolderPath('Desktop')` as `C:\Users\bikra\OneDrive\Desktop\InsightAgent-AI-Business-Investigation-Assistant`.
- **Node & Package Environment:** Node.js `v20.18.3`, npm `10.8.2`.
- **Git Repository:** Cloned target remote `https://github.com/bikrant18kr/InsightAgent-AI-Business-Investigation-Assistant.git` on branch `main`.

---

## 2. Key Architecture Decisions

1. **Dual PostgreSQL Engine Strategy:**
   - Designed the database layer (`server/db/index.js`) to support both remote PostgreSQL connection strings (`DATABASE_URL`) and an isolated, in-memory PostgreSQL engine (`pg-mem`). This allows instant, deterministic unit testing and local offline demos without external daemon dependencies.
2. **Controlled Analytics Function Calling:**
   - Strictly prohibited raw SQL generation by the language model.
   - Defined 4 server-owned tools: `compare_metric`, `breakdown_metric`, `retrieve_business_context`, and `verify_hypothesis`.
   - All dimensions are validated against an allowlist and mapped to trusted database column expressions.
3. **Cohort-Aligned Return Rate Metric:**
   - Modeled return rates using cohort-based order windows where both numerator (returned orders) and denominator (total orders placed) share the same order cohort.
4. **Vite 5 React Client:**
   - Scaffolded client using React and Vite 5 with proxy integration to port 5000. Built production bundle directly into `client/dist` which Express serves in production mode.

---

## 3. Automated Verification & Test Results

Executed test command:
```powershell
npm test
```

### Test Suite Execution Output:
```
TAP version 13
# Subtest: Case 1: Revenue decline from ₹12,000 to ₹9,000 (-25%) with Electronics contributing 100%
ok 1 - Case 1: Revenue decline from ₹12,000 to ₹9,000 (-25%) with Electronics contributing 100%
# Subtest: Case 2: Cost increase in Apparel reflects higher unit cost (+62.5%) rather than volume
ok 2 - Case 2: Cost increase in Apparel reflects higher unit cost (+62.5%) rather than volume
# Subtest: Case 3: Policy document retrieval and return rate hypothesis verification
ok 3 - Case 3: Policy document retrieval and return rate hypothesis verification
# Subtest: Security & Boundary validation: Rejects invalid metrics and parameters safely
ok 4 - Security & Boundary validation: Rejects invalid metrics and parameters safely
# Subtest: API Integration: GET /api/health returns database and mode status
ok 5 - API Integration: GET /api/health returns database and mode status
# Subtest: API Integration: POST /api/investigate performs end-to-end mock investigation
ok 6 - API Integration: POST /api/investigate performs end-to-end mock investigation
# Subtest: API Integration: POST /api/investigate rejects empty questions with 400
ok 7 - API Integration: POST /api/investigate rejects empty questions with 400
# Subtest: Investigation Engine: executes Revenue decline query and produces structured evidence
ok 8 - Investigation Engine: executes Revenue decline query and produces structured evidence
# Subtest: Investigation Engine: executes Cost surge query with unit cost decomposition
ok 9 - Investigation Engine: executes Cost surge query with unit cost decomposition
# Subtest: Investigation Engine: executes Return rate policy hypothesis verification
ok 10 - Investigation Engine: executes Return rate policy hypothesis verification
1..10
# tests 10
# suites 0
# pass 10
# fail 0
```

---

## 4. Production Build Verification
- Frontend build executed: `npm run build`
- Output: `dist/index.html` (0.46 kB), `dist/assets/index.js` (232.60 kB), `dist/assets/index.css` (8.85 kB).
- Built cleanly with zero errors.
