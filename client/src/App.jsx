import React, { useState, useEffect } from 'react';
import './App.css';

const SAMPLE_QUESTIONS = [
  {
    id: 'rev',
    label: 'Revenue Contraction in Q2',
    question: 'Why did total revenue drop between Q1 2024 and Q2 2024, and which category contributed the most?'
  },
  {
    id: 'cost',
    label: 'Apparel Cost Surge',
    question: 'Why did our costs in Apparel jump in Q2 2024? Was it due to higher unit volume or higher cost per unit?'
  },
  {
    id: 'ret',
    label: 'Return Window Policy Impact',
    question: 'Did the new return policy enacted in May 2024 increase customer returns in Electronics compared to other categories?'
  }
];

export default function App() {
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0].question);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [health, setHealth] = useState(null);
  const [forceMock, setForceMock] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      // Backend might be offline or on custom port
      setHealth(null);
    }
  };

  const handleInvestigate = async (overrideQ) => {
    const q = overrideQ || question;
    if (!q || !q.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim(), forceMock })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete investigation');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Find tool outputs for UI rendering
  const compareTool = result?.executedTools?.find(t => t.tool === 'compare_metric')?.output;
  const breakdownTool = result?.executedTools?.find(t => t.tool === 'breakdown_metric')?.output;
  const docTool = result?.executedTools?.find(t => t.tool === 'retrieve_business_context')?.output;
  const verifyTool = result?.executedTools?.find(t => t.tool === 'verify_hypothesis')?.output;

  return (
    <div className="agent-container">
      {/* Top Header */}
      <header className="navbar">
        <div className="brand">
          <div className="logo-badge">IA</div>
          <div>
            <h1 className="title">InsightAgent</h1>
            <p className="subtitle">AI Business Investigation Assistant</p>
          </div>
        </div>

        <div className="header-badges">
          <span className={`badge ${health?.database?.connected ? 'badge-success' : 'badge-warning'}`}>
            DB: {health?.database?.engine || 'PostgreSQL'}
          </span>
          <span className={`badge ${result?.mode === 'LIVE_AI' ? 'badge-live' : 'badge-mock'}`}>
            Mode: {result?.mode || (health?.aiMode === 'LIVE_OPENAI' ? 'LIVE' : 'Mock')}
          </span>
          <label className="mock-toggle">
            <input
              type="checkbox"
              checked={forceMock}
              onChange={(e) => setForceMock(e.target.checked)}
            />
            <span>Force Mock</span>
          </label>
        </div>
      </header>

      {/* Main Body */}
      <main className="content">
        {/* Question Panel */}
        <section className="card query-card">
          <h2 className="section-title">Business Inquiry</h2>
          <div className="sample-chips">
            <span className="chips-label">Sample Investigations:</span>
            {SAMPLE_QUESTIONS.map(sq => (
              <button
                key={sq.id}
                className="chip-btn"
                onClick={() => {
                  setQuestion(sq.question);
                  handleInvestigate(sq.question);
                }}
              >
                {sq.label}
              </button>
            ))}
          </div>

          <div className="input-group">
            <textarea
              className="text-input"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter a business query regarding revenue changes, cost anomalies, or policy impacts..."
            />
            <button
              className="btn btn-primary"
              disabled={loading}
              onClick={() => handleInvestigate()}
            >
              {loading ? 'Investigating...' : 'Run Investigation'}
            </button>
          </div>
        </section>

        {/* Loading / Error States */}
        {loading && (
          <div className="card loading-card">
            <div className="spinner"></div>
            <p>Iterating tool loop: comparing metrics, segmenting dimensions, querying policy chunks...</p>
          </div>
        )}

        {error && (
          <div className="card error-card">
            <h3>Investigation Error</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Investigation Results */}
        {result && (
          <div className="results-wrapper">
            {/* Structured Evidence Cards */}
            <div className="evidence-grid">
              {/* Card 1: Metric Comparison */}
              {compareTool && (
                <div className="card metric-card">
                  <div className="card-header">
                    <span className="card-tag">WHAT CHANGED</span>
                    <span className="metric-name">{compareTool.metric.toUpperCase()}</span>
                  </div>
                  <div className="metric-comparison">
                    <div className="metric-box">
                      <span className="period-lbl">{compareTool.period1.start} → {compareTool.period1.end}</span>
                      <span className="val-lbl">
                        {compareTool.metric.includes('rate') ? `${compareTool.period1.value}%` : `₹${compareTool.period1.value.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="delta-arrow">➔</div>
                    <div className="metric-box">
                      <span className="period-lbl">{compareTool.period2.start} → {compareTool.period2.end}</span>
                      <span className="val-lbl">
                        {compareTool.metric.includes('rate') ? `${compareTool.period2.value}%` : `₹${compareTool.period2.value.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                  <div className={`metric-delta ${compareTool.absoluteChange < 0 ? 'delta-neg' : 'delta-pos'}`}>
                    <span>Change: {compareTool.absoluteChange > 0 ? '+' : ''}{compareTool.absoluteChange} ({compareTool.percentageChange > 0 ? '+' : ''}{compareTool.percentageChange}%)</span>
                  </div>
                </div>
              )}

              {/* Card 2: Hypothesis Check */}
              {verifyTool && (
                <div className="card hypothesis-card">
                  <div className="card-header">
                    <span className="card-tag">EMPIRICAL HYPOTHESIS CHECK</span>
                    <span className={`status-pill ${verifyTool.timing_supports_hypothesis ? 'status-pass' : 'status-fail'}`}>
                      {verifyTool.verification_status}
                    </span>
                  </div>
                  <div className="check-body">
                    <p className="check-detail">
                      <strong>Target:</strong> {verifyTool.target_segment} | <strong>Policy Date:</strong> {verifyTool.policy_date}
                    </p>
                    <p className="check-delta">
                      Pre-rate: <strong>{verifyTool.evidence?.target?.prePolicy?.ratePct}%</strong> ➔ Post-rate: <strong>{verifyTool.evidence?.target?.postPolicy?.ratePct}%</strong> (+{verifyTool.evidence?.target?.percentagePointDifference} pp)
                    </p>
                    <p className="disclaimer-txt">
                      ⚠️ <em>{verifyTool.causality_disclaimer}</em>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Segment Breakdown Table */}
            {breakdownTool && (
              <div className="card breakdown-card">
                <div className="card-header">
                  <h3 className="card-heading">Segment Breakdown ({breakdownTool.dimension})</h3>
                  <span className="reconcile-pill">
                    {breakdownTool.reconciliation?.isReconciled ? '✓ 100% Reconciled to Total' : 'Unreconciled'}
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Baseline</th>
                        <th>Comparison</th>
                        <th>Absolute Delta</th>
                        <th>% Change</th>
                        <th>Share of Total Contraction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdownTool.segments.map((seg, idx) => (
                        <tr key={idx} className={seg.shareOfTotalChangePct === 100 ? 'highlight-row' : ''}>
                          <td><strong>{seg.segment}</strong></td>
                          <td>₹{seg.period1_value.toLocaleString()}</td>
                          <td>₹{seg.period2_value.toLocaleString()}</td>
                          <td className={seg.absolute_change < 0 ? 'text-red' : 'text-green'}>
                            {seg.absolute_change > 0 ? '+' : ''}{seg.absolute_change.toLocaleString()}
                          </td>
                          <td>{seg.percentage_change !== null ? `${seg.percentage_change}%` : 'N/A'}</td>
                          <td>
                            {seg.shareOfTotalChangePct !== null ? (
                              <span className="share-pill">{seg.shareOfTotalChangePct}%</span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Document Sources Panel */}
            {docTool && docTool.documents?.length > 0 && (
              <div className="card docs-card">
                <div className="card-header">
                  <h3 className="card-heading">Retrieved Business Context & Policy Excerpts</h3>
                  <span className="source-count">{docTool.documents.length} document chunk(s)</span>
                </div>
                <div className="doc-list">
                  {docTool.documents.map((doc, idx) => (
                    <div key={idx} className="doc-item">
                      <div className="doc-meta">
                        <span className="doc-id">[{doc.source_id}]</span>
                        <strong className="doc-title">{doc.title}</strong>
                        <span className="doc-sec">({doc.section})</span>
                        {doc.effective_date && <span className="doc-date">Effective: {doc.effective_date}</span>}
                      </div>
                      <blockquote className="doc-excerpt">
                        "{doc.excerpt}"
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answer & Observability Tabs */}
            <div className="card tabs-card">
              <div className="tab-nav">
                <button
                  className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('summary')}
                >
                  Executive Report
                </button>
                <button
                  className={`tab-btn ${activeTab === 'traces' ? 'active' : ''}`}
                  onClick={() => setActiveTab('traces')}
                >
                  Investigation Tool Traces ({result.executedTools?.length || 0})
                </button>
              </div>

              {activeTab === 'summary' && (
                <div className="tab-content report-content">
                  <pre className="report-markdown">{result.answer}</pre>
                </div>
              )}

              {activeTab === 'traces' && (
                <div className="tab-content trace-content">
                  <p className="trace-intro">
                    The OpenAI model invoked <strong>{result.executedTools?.length}</strong> tool round(s) sequentially with server-side SQL validation:
                  </p>
                  <div className="trace-list">
                    {result.executedTools?.map((t, idx) => (
                      <details key={idx} className="trace-item" open={idx === 0}>
                        <summary className="trace-summary">
                          <span className="step-num">Step {idx + 1}</span>
                          <span className="tool-name">{t.tool}</span>
                          <span className="args-preview">{JSON.stringify(t.args)}</span>
                        </summary>
                        <div className="trace-details">
                          <div className="trace-block">
                            <strong>Arguments:</strong>
                            <pre>{JSON.stringify(t.args, null, 2)}</pre>
                          </div>
                          <div className="trace-block">
                            <strong>Server Output:</strong>
                            <pre>{JSON.stringify(t.output, null, 2)}</pre>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
