// server/tools/toolDefinitions.js

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'compare_metric',
      description: 'Calculate top-level metric values for two distinct date periods, absolute change, and percentage change. Use this first when investigating changes over time.',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: ['revenue', 'cost', 'return_count', 'return_rate'],
            description: 'The business metric to compare'
          },
          period1_start: {
            type: 'string',
            description: 'Baseline period start date (YYYY-MM-DD)'
          },
          period1_end: {
            type: 'string',
            description: 'Baseline period end date (YYYY-MM-DD)'
          },
          period2_start: {
            type: 'string',
            description: 'Comparison period start date (YYYY-MM-DD)'
          },
          period2_end: {
            type: 'string',
            description: 'Comparison period end date (YYYY-MM-DD)'
          }
        },
        required: ['metric', 'period1_start', 'period1_end', 'period2_start', 'period2_end']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'breakdown_metric',
      description: 'Decompose changes in a metric across an approved dimension (category, region, channel) to identify the largest contributing segments and evaluate whether segments reconcile with the total.',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: ['revenue', 'cost', 'return_count', 'return_rate'],
            description: 'The business metric to break down'
          },
          dimension: {
            type: 'string',
            enum: ['category', 'region', 'channel'],
            description: 'The dimension to segment by'
          },
          period1_start: {
            type: 'string',
            description: 'Baseline period start date (YYYY-MM-DD)'
          },
          period1_end: {
            type: 'string',
            description: 'Baseline period end date (YYYY-MM-DD)'
          },
          period2_start: {
            type: 'string',
            description: 'Comparison period start date (YYYY-MM-DD)'
          },
          period2_end: {
            type: 'string',
            description: 'Comparison period end date (YYYY-MM-DD)'
          }
        },
        required: ['metric', 'dimension', 'period1_start', 'period1_end', 'period2_start', 'period2_end']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'retrieve_business_context',
      description: 'Search policy documents, accounting definitions, and operational memos to find potential business explanations or definitions.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search keywords or phrases (e.g. "return policy", "electronics return window", "supplier surcharge")'
          },
          category: {
            type: 'string',
            description: 'Optional filter by document category (e.g. "policy", "definitions", "operations")'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of chunks to return (default 3, max 5)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'verify_hypothesis',
      description: 'Run a verification check to test if empirical database patterns support a suspected business hypothesis (e.g., comparing return rates before/after a policy change for affected vs control categories).',
      parameters: {
        type: 'object',
        properties: {
          check_type: {
            type: 'string',
            enum: ['policy_impact', 'cost_driver', 'volume_driver'],
            description: 'The type of hypothesis test to execute'
          },
          target_segment: {
            type: 'string',
            description: 'The target segment under evaluation (e.g. "Electronics" or "Apparel")'
          },
          policy_date: {
            type: 'string',
            description: 'Effective date of policy or change (YYYY-MM-DD)'
          },
          pre_window_days: {
            type: 'integer',
            description: 'Observation window in days prior to policy date'
          },
          post_window_days: {
            type: 'integer',
            description: 'Observation window in days following policy date'
          }
        },
        required: ['check_type', 'target_segment', 'policy_date']
      }
    }
  }
];
