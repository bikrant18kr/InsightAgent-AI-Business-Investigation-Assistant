// server/agent/investigationEngine.js
import OpenAI from 'openai';
import { TOOL_DEFINITIONS } from '../tools/toolDefinitions.js';
import {
  compareMetric,
  breakdownMetric,
  retrieveBusinessContext,
  verifyHypothesis
} from '../tools/analyticsTools.js';

const SYSTEM_PROMPT = `You are InsightAgent, an expert Business Investigation Assistant.
Your goal is to investigate business questions by methodically combining SQL-backed analytics tools and policy context.

Follow these strict guidelines:
1. Always start by measuring top-level changes using "compare_metric".
2. If a significant change is observed, drill into segments using "breakdown_metric" across appropriate dimensions (e.g., category, region, channel) to identify the primary contributor.
3. If the user asks why something changed or if policies apply, call "retrieve_business_context" to find documented business events, cost updates, or policy changes.
4. When a policy or operational shift is uncovered, use "verify_hypothesis" to check whether empirical database timing matches the suspected explanation, checking both affected and unaffected control segments.
5. In your final answer, clearly separate:
   - WHAT CHANGED: Top-level numbers, periods, and percentage changes.
   - LARGEST CONTRIBUTORS: The segments driving the change and their share of change.
   - POLICY / BUSINESS CONTEXT: Explicitly cite document IDs (e.g. DOC-POLICY-01) and effective dates.
   - HYPOTHESIS & EMPIRICAL VERIFICATION: Detail whether timing supports the hypothesis and state why correlation does not prove single-factor causation.
   - LIMITATIONS: State sample limitations, unmeasured variables, or assumptions.

Never invent data or document citations. Only cite information returned from the tool executions.`;

export async function runInvestigation(dbPool, userQuestion, options = {}) {
  const { isMock = false } = options;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Mode detection: if explicitly mock OR no API key provided, run deterministic Mock Engine
  if (isMock || !apiKey || apiKey.trim() === '' || apiKey === 'your_openai_api_key_here') {
    return runMockInvestigation(dbPool, userQuestion);
  }

  const openai = new OpenAI({ apiKey });
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userQuestion }
  ];

  const executedTools = [];
  let rounds = 0;
  const MAX_ROUNDS = 5;

  while (rounds < MAX_ROUNDS) {
    rounds++;

    const response = await openai.chat.completions.create({
      model,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: 0.1
    });

    const choice = response.choices[0];
    const message = choice.message;
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      // Final response produced
      return {
        mode: 'LIVE_AI',
        model,
        question: userQuestion,
        answer: message.content,
        executedTools,
        rounds
      };
    }

    // Execute requested tools
    for (const toolCall of message.tool_calls) {
      const { id: callId, function: fn } = toolCall;
      const fnName = fn.name;
      let args = {};
      try {
        args = JSON.parse(fn.arguments);
      } catch (err) {
        args = { parseError: err.message, raw: fn.arguments };
      }

      let toolOutput = null;
      let error = null;

      try {
        if (fnName === 'compare_metric') {
          toolOutput = await compareMetric(dbPool, args);
        } else if (fnName === 'breakdown_metric') {
          toolOutput = await breakdownMetric(dbPool, args);
        } else if (fnName === 'retrieve_business_context') {
          toolOutput = await retrieveBusinessContext(dbPool, args);
        } else if (fnName === 'verify_hypothesis') {
          toolOutput = await verifyHypothesis(dbPool, args);
        } else {
          throw new Error(`Unrecognized tool: ${fnName}`);
        }
      } catch (err) {
        error = err.message;
        toolOutput = { error: err.message };
      }

      executedTools.push({
        callId,
        tool: fnName,
        args,
        output: toolOutput,
        error
      });

      messages.push({
        role: 'tool',
        tool_call_id: callId,
        content: JSON.stringify(toolOutput)
      });
    }
  }

  return {
    mode: 'LIVE_AI',
    model,
    question: userQuestion,
    answer: 'Investigation reached maximum permitted tool execution rounds.',
    executedTools,
    rounds
  };
}

/**
 * Deterministic Mock Engine for offline demonstration, verification, and tests
 */
export async function runMockInvestigation(dbPool, question) {
  const qLower = question.toLowerCase();
  const executedTools = [];

  let isRevenue = qLower.includes('revenue');
  let isCost = qLower.includes('cost');
  let isReturns = qLower.includes('return');

  // Default to revenue if ambiguous
  if (!isRevenue && !isCost && !isReturns) isRevenue = true;

  if (isReturns) {
    // 1. compare_metric
    const cmpArgs = { metric: 'return_rate', period1_start: '2024-03-01', period1_end: '2024-04-30', period2_start: '2024-05-01', period2_end: '2024-06-30' };
    const cmpRes = await compareMetric(dbPool, cmpArgs);
    executedTools.push({ tool: 'compare_metric', args: cmpArgs, output: cmpRes });

    // 2. breakdown_metric
    const brkArgs = { metric: 'return_rate', dimension: 'category', period1_start: '2024-03-01', period1_end: '2024-04-30', period2_start: '2024-05-01', period2_end: '2024-06-30' };
    const brkRes = await breakdownMetric(dbPool, brkArgs);
    executedTools.push({ tool: 'breakdown_metric', args: brkArgs, output: brkRes });

    // 3. retrieve_business_context
    const retArgs = { query: 'return policy electronics window' };
    const retRes = await retrieveBusinessContext(dbPool, retArgs);
    executedTools.push({ tool: 'retrieve_business_context', args: retArgs, output: retRes });

    // 4. verify_hypothesis
    const verArgs = { check_type: 'policy_impact', target_segment: 'Electronics', policy_date: '2024-05-01', pre_window_days: 60, post_window_days: 60 };
    const verRes = await verifyHypothesis(dbPool, verArgs);
    executedTools.push({ tool: 'verify_hypothesis', args: verArgs, output: verRes });

    const finalAnswer = `### Executive Investigation Summary: Return Rate Surge

**1. WHAT CHANGED**
Between the pre-policy window (2024-03-01 to 2024-04-30) and post-policy window (2024-05-01 to 2024-06-30), the overall order return rate rose from **0.0% to 28.57%** (+28.57 percentage points), with 2 returns recorded against 7 placed orders in the post-policy cohort.

**2. LARGEST CONTRIBUTORS**
- **Electronics**: Return rate increased from **0.0%** (0/4 orders) to **50.0%** (2/4 orders returned, +50.0 percentage points).
- **Apparel**: Return rate remained unchanged at **0.0%** (0/3 orders).
- **Home & Kitchen**: No returns recorded.
Electronics was the exclusive driver of the surge.

**3. POLICY & BUSINESS CONTEXT**
Retrieved Document **[DOC-POLICY-01]** (*Customer Satisfaction and Return Window Policy 2024*, Section 4, Effective 2024-05-01):
> "Effective May 1, 2024, the allowable return window for the Electronics category was extended from 14 calendar days to 45 calendar days to remain competitive with consumer marketplace guarantees."

**4. HYPOTHESIS & EMPIRICAL VERIFICATION**
- **Hypothesis**: The return rate spike in Electronics was caused or enabled by the extended 45-day return window.
- **Empirical Check**: A pre/post policy comparative analysis confirms that Electronics returns surged exclusively after May 1, 2024 (+50.0 pp), while the unaffected control category (Apparel, 14-day window) exhibited **0.0%** return rate across both periods.
- **Status**: **SUPPORTS_TIMING_PATTERN**. While the timing pattern aligns with the policy enactment, observational data alone cannot rule out concurrent factors (e.g., product defects or buyer remorse).

**5. LIMITATIONS & UNCERTAINTIES**
- Cohort sample is small (4 orders in Electronics post-change).
- Return reasons cite extended window trial returns ("dissatisfied" and "found cheaper"), consistent with policy influence.`;

    return {
      mode: 'MOCK',
      model: 'DeterministicMockEngine',
      question,
      answer: finalAnswer,
      executedTools,
      rounds: 4
    };
  }

  if (isCost) {
    const cmpArgs = { metric: 'cost', period1_start: '2024-01-01', period1_end: '2024-03-31', period2_start: '2024-04-01', period2_end: '2024-06-30' };
    const cmpRes = await compareMetric(dbPool, cmpArgs);
    executedTools.push({ tool: 'compare_metric', args: cmpArgs, output: cmpRes });

    const brkArgs = { metric: 'cost', dimension: 'category', period1_start: '2024-01-01', period1_end: '2024-03-31', period2_start: '2024-04-01', period2_end: '2024-06-30' };
    const brkRes = await breakdownMetric(dbPool, brkArgs);
    executedTools.push({ tool: 'breakdown_metric', args: brkArgs, output: brkRes });

    const retArgs = { query: 'cost supplier surcharge cogs apparel' };
    const retRes = await retrieveBusinessContext(dbPool, retArgs);
    executedTools.push({ tool: 'retrieve_business_context', args: retArgs, output: retRes });

    const finalAnswer = `### Executive Investigation Summary: Cost Increase in Apparel

**1. WHAT CHANGED**
Total cost in Q1 2024 was ₹5,500.00 and shifted to ₹5,000.00 in Q2 2024. While overall company COGS dropped due to lower unit volume in Electronics, **Apparel COGS underwent a severe spike**.

**2. LARGEST CONTRIBUTORS**
- **Apparel**: Total cost increased from **₹1,600.00 to ₹2,600.00** (+₹1,000.00 or +62.50%).
- **Volume vs. Unit Cost Analysis**:
  - Q1 Apparel: 4 units ordered at ₹400.00 average unit cost.
  - Q2 Apparel: 4 units ordered at ₹650.00 average unit cost.
  - The volume (units) remained strictly constant at 4 units. Therefore, 100% of the ₹1,000 cost surge was driven by **higher cost per unit (+62.5%)**, not unit volume growth.

**3. POLICY & BUSINESS CONTEXT**
Retrieved Document **[DOC-METRIC-02]** (*Cost Accounting Guidelines*, Section 2.3, Effective 2024-01-01):
> "Effective April 1, 2024, our primary textile supplier instituted a raw cotton and synthetic fabric import surcharge, elevating baseline unit costs for the Apparel category by approximately 60%."

**4. HYPOTHESIS & EMPIRICAL VERIFICATION**
- **Verification Status**: **CONFIRMED_UNIT_COST_DRIVER**. The supplier surcharge document directly accounts for the shift from ₹400 to ₹650 per unit.

**5. LIMITATIONS**
- Supplier contract negotiations and freight breakout data are not recorded in this ledger.`;

    return {
      mode: 'MOCK',
      model: 'DeterministicMockEngine',
      question,
      answer: finalAnswer,
      executedTools,
      rounds: 3
    };
  }

  // Default: Revenue Investigation
  const cmpArgs = { metric: 'revenue', period1_start: '2024-01-01', period1_end: '2024-03-31', period2_start: '2024-04-01', period2_end: '2024-06-30' };
  const cmpRes = await compareMetric(dbPool, cmpArgs);
  executedTools.push({ tool: 'compare_metric', args: cmpArgs, output: cmpRes });

  const brkArgs = { metric: 'revenue', dimension: 'category', period1_start: '2024-01-01', period1_end: '2024-03-31', period2_start: '2024-04-01', period2_end: '2024-06-30' };
  const brkRes = await breakdownMetric(dbPool, brkArgs);
  executedTools.push({ tool: 'breakdown_metric', args: brkArgs, output: brkRes });

  const retArgs = { query: 'marketing spend electronics reduction' };
  const retRes = await retrieveBusinessContext(dbPool, retArgs);
  executedTools.push({ tool: 'retrieve_business_context', args: retArgs, output: retRes });

  const finalAnswer = `### Executive Investigation Summary: Q2 Revenue Decline

**1. WHAT CHANGED**
Total Revenue fell from **₹12,000.00** in Q1 2024 (Jan 1 - Mar 31) to **₹9,000.00** in Q2 2024 (Apr 1 - Jun 30), representing an absolute decline of **-₹3,000.00 (-25.0%)**.

**2. LARGEST CONTRIBUTORS**
Segment breakdown by Category reconciles 100% of the decline:
- **Electronics**: Declined from **₹6,000.00 to ₹3,000.00** (-₹3,000.00, -50.0%). Electronics accounted for **100% of the total revenue drop**.
- **Apparel**: ₹4,000.00 in Q1 vs ₹4,000.00 in Q2 (0.0% change).
- **Home & Kitchen**: ₹2,000.00 in Q1 vs ₹2,000.00 in Q2 (0.0% change).

**3. POLICY & BUSINESS CONTEXT**
Retrieved Document **[DOC-OPS-01]** (*Regional Logistics & Marketing Memo Q2*, Section 3, Effective 2024-04-01):
> "During Q2 2024, paid ad spend for Electronics was temporarily reduced by 40% in Northern and Western territories to fund summer promotional campaigns for Home and Garden, resulting in lower customer acquisition and order volume for consumer gadgets."

**4. HYPOTHESIS & EMPIRICAL VERIFICATION**
- **Hypothesis**: The ₹3,000 revenue contraction in Electronics was caused by a reduction in unit volume rather than discounting.
- **Empirical Check**: In Q1, 6 units of Electronics were sold at ₹1,000. In Q2, exactly 3 units were sold at ₹1,000. Pricing remained unchanged, verifying that the drop was purely driven by reduced order volume (-50%), matching the ad spend reduction timing.

**5. LIMITATIONS**
- Competitor pricing shifts in Q2 were unmeasured in customer logs.`;

  return {
    mode: 'MOCK',
    model: 'DeterministicMockEngine',
    question,
    answer: finalAnswer,
    executedTools,
    rounds: 3
  };
}
