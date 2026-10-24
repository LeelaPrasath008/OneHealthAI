import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Filter,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import {
  AuditLogEntry,
  NavigationSection,
  NotificationItem,
  Patient,
  PublicHealthSignal,
  PublicHealthTimeSeriesPoint,
  SignalInvestigationStatus,
  UserRole,
} from '../types';

// ============================================================================
// 1. CROSS-HOSPITAL PUBLIC HEALTH INTELLIGENCE DASHBOARD (SCENARIO F)
// ============================================================================
interface PublicHealthDashboardProps {
  series: PublicHealthTimeSeriesPoint[];
  signals: PublicHealthSignal[];
  onRefreshState: () => Promise<void>;
}

export const PublicHealthDashboard: React.FC<PublicHealthDashboardProps> = ({
  series,
  signals,
  onRefreshState,
}) => {
  const [regionFilter, setRegionFilter] = useState<string>('South River Valley');
  const [categoryMetric, setCategoryMetric] = useState<
    'fever' | 'respiratory' | 'gi' | 'rash' | 'combined' | 's_form' | 'p_form' | 'l_form'
  >('fever');
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(1.75);
  const [selectedSignalId, setSelectedSignalId] = useState<string>(
    signals[0]?.id || 'SIG-901'
  );
  const [analystNotes, setAnalystNotes] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isUpdatingSignal, setIsUpdatingSignal] = useState(false);

  const filteredSeries = series.filter((pt) =>
    regionFilter === 'ALL' ? true : pt.region === regionFilter
  );

  const activeSignal =
    signals.find((s) => s.id === selectedSignalId) || signals[0];

  const getMetricValues = (pt: PublicHealthTimeSeriesPoint) => {
    switch (categoryMetric) {
      case 'fever':
        return {
          observed: pt.feverCount,
          baseline: pt.feverBaseline,
          label: 'Acute Fever Presentations (Syndromic + OPD)',
        };
      case 'respiratory':
        return {
          observed: pt.respiratoryCount,
          baseline: pt.respiratoryBaseline,
          label: 'Respiratory Syndrome Visits',
        };
      case 'gi':
        return {
          observed: pt.giCount,
          baseline: pt.giBaseline,
          label: 'Gastrointestinal Presentations',
        };
      case 'rash':
        return {
          observed: pt.rashCount,
          baseline: pt.rashBaseline,
          label: 'Exanthematous Rash Visits',
        };
      case 'combined':
        return {
          observed: pt.combinedClusterCount,
          baseline: pt.combinedClusterBaseline,
          label: 'Unusual Combination (Fever + Polyarthralgia)',
        };
      case 's_form':
        return {
          observed: pt.feverCount + pt.rashCount,
          baseline: pt.feverBaseline + pt.rashBaseline,
          label: 'IDSP S-Form (Syndromic Fever + Rash Stream)',
        };
      case 'p_form':
        return {
          observed: pt.presumptiveArboviralCount + pt.presumptiveInfluenzaCount,
          baseline: Math.round((pt.feverBaseline + pt.respiratoryBaseline) * 0.55),
          label: 'IDSP P-Form (Presumptive Clinical OPD Stream)',
        };
      case 'l_form':
        return {
          observed: pt.labConfirmedArboviralCount + pt.labConfirmedInfluenzaCount,
          baseline: Math.round((pt.feverBaseline + pt.respiratoryBaseline) * 0.2),
          label: 'IDSP L-Form (Laboratory-Confirmed Stream)',
        };
    }
  };

  const handleUpdateSignalStatus = async (
    signalId: string,
    newStatus: SignalInvestigationStatus
  ) => {
    setIsUpdatingSignal(true);
    setStatusFeedback(null);
    try {
      const res = await fetch(`/api/public-health/signals/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reviewNotes:
            analystNotes.trim() ||
            `Marked as ${newStatus} following aggregate baseline comparison.`,
          actorIdentity: 'Dr. Rohan Deshmukh, MPH',
        }),
      });
      if (res.ok) {
        await onRefreshState();
        setAnalystNotes('');
        setStatusFeedback(
          `Signal ${signalId} investigation status updated to "${newStatus}" and logged in the audit trail.`
        );
      }
    } finally {
      setIsUpdatingSignal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-1">
            <Activity className="w-4 h-4" />
            <span>SCENARIO F · CROSS-HOSPITAL PUBLIC HEALTH INTELLIGENCE</span>
            <span aria-hidden="true">·</span>
            <span>SIMULATED OUTBREAK-PATTERN DETECTION</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-emerald-800">ZERO PATIENT PII EXPOSED</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            De-Identified Syndromic & Diagnostic Trend Surveillance
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Analyzes strictly synthetic, aggregated symptom and diagnosis counts across participating regional hospitals against moving historical baselines. Anomaly detection identifies statistical signals for human epidemiological review—never confirmed outbreaks.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 shrink-0 self-start lg:self-center">
          Simulated Aggregate Data Only
        </div>
      </div>

      {statusFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 text-xs font-semibold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusFeedback}</span>
          </div>
          <button onClick={() => setStatusFeedback(null)} className="hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Time-Series Chart & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Weekly Aggregate Counts vs. Simulated Historical Baseline
            </h2>
            <p className="text-xs text-slate-500">
              Filter by simulated region and syndromic category. Solid teal line = observed aggregate count; dashed slate line = 4-week moving historical baseline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              aria-label="Select simulated surveillance region"
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
            >
              <option value="South River Valley">
                South River Valley (Seva Community Med)
              </option>
              <option value="North Metro Sector">
                North Metro Sector (Metro General)
              </option>
              <option value="East Harbor District">
                East Harbor District (City Apollo)
              </option>
            </select>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: 'fever', label: 'Fever' },
                { id: 'combined', label: 'Fever + Arthralgia' },
                { id: 's_form', label: 'IDSP S-Form (Syndromic)' },
                { id: 'p_form', label: 'IDSP P-Form (Presumptive)' },
                { id: 'l_form', label: 'IDSP L-Form (Lab)' },
                { id: 'respiratory', label: 'Respiratory' },
                { id: 'gi', label: 'GI' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryMetric(cat.id as any)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                    categoryMetric === cat.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Alert Threshold:</span>
              <select
                value={anomalyThreshold}
                onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                aria-label="Select statistical anomaly threshold ratio"
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-semibold text-slate-800"
              >
                <option value={1.5}>1.50x Baseline</option>
                <option value={1.75}>1.75x Baseline</option>
                <option value={2.0}>2.00x Baseline</option>
              </select>
            </div>
          </div>
        </div>

        {/* Regional Data Completeness & Reporting Lag Strip (IDSP/IHIP Governance) */}
        {filteredSeries.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-slate-600">Regional Reporting Completeness:</span>
              <span className="font-mono font-bold text-emerald-700">
                {filteredSeries[filteredSeries.length - 1].reportingCompletenessPct ?? 94}% Form Submission
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-slate-600">Mean Facility Reporting Delay:</span>
              <span className="font-mono font-bold text-slate-900">
                {filteredSeries[filteredSeries.length - 1].reportingDelayHours ?? 6.5} hrs (Batch Sync)
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-slate-600">Active Threshold Rule:</span>
              <span className="font-mono font-bold text-red-700">
                Flag ≥ {anomalyThreshold.toFixed(2)}x 4-Wk Baseline
              </span>
            </div>
          </div>
        )}

        {/* SVG Time-Series + Baseline Comparison */}
        {filteredSeries.length > 0 && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 p-4 rounded-xl border border-slate-200 bg-slate-50/40">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                <span className="font-bold text-slate-900">
                  {regionFilter} — {getMetricValues(filteredSeries[0]).label} (Synthetic Weekly Counts)
                </span>
                <span className="font-mono">
                  Teal = Observed · Dashed = Historical Baseline
                </span>
              </div>
              <svg viewBox="0 0 620 180" className="w-full h-44 overflow-visible">
                {(() => {
                  const pts = filteredSeries.map((p) => ({
                    week: p.weekLabel,
                    ...getMetricValues(p),
                  }));
                  const maxVal = Math.max(
                    ...pts.map((p) => Math.max(p.observed, p.baseline)),
                    20
                  ) * 1.15;

                  const coords = pts.map((p, idx) => {
                    const x =
                      45 + (idx / Math.max(1, pts.length - 1)) * 530;
                    const yObs = 145 - (p.observed / maxVal) * 115;
                    const yBase = 145 - (p.baseline / maxVal) * 115;
                    return { x, yObs, yBase, ...p };
                  });

                  const obsPath = coords
                    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.yObs}`)
                    .join(' ');
                  const basePath = coords
                    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.yBase}`)
                    .join(' ');

                  return (
                    <>
                      <line
                        x1="30"
                        y1="145"
                        x2="590"
                        y2="145"
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />
                      {/* Baseline Dashed Path */}
                      <path
                        d={basePath}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeDasharray="5 4"
                      />
                      {/* Observed Solid Path */}
                      <path
                        d={obsPath}
                        fill="none"
                        stroke="#0f766e"
                        strokeWidth="3"
                      />
                      {coords.map((c, idx) => {
                        const isSpike = c.observed >= c.baseline * anomalyThreshold;
                        return (
                          <g key={idx}>
                            <circle
                              cx={c.x}
                              cy={c.yBase}
                              r="3.5"
                              fill="#64748b"
                            />
                            <circle
                              cx={c.x}
                              cy={c.yObs}
                              r="5"
                              fill={isSpike ? '#b91c1c' : '#0f766e'}
                            />
                            <text
                              x={c.x}
                              y={c.yObs - 10}
                              textAnchor="middle"
                              className="text-[10px] font-mono font-bold fill-slate-900"
                            >
                              {c.observed}
                            </text>
                            <text
                              x={c.x}
                              y={163}
                              textAnchor="middle"
                              className="text-[10px] font-mono fill-slate-500"
                            >
                              {c.week.split(' ')[0]} {c.week.split(' ')[1]}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Aggregate Table Summary */}
            <div className="lg:col-span-4 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <th className="py-2 px-3">Week</th>
                    <th className="py-2 px-3 text-right">Observed</th>
                    <th className="py-2 px-3 text-right">Baseline</th>
                    <th className="py-2 px-3 text-right">Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  {filteredSeries.slice(-5).map((pt, i) => {
                    const m = getMetricValues(pt);
                    const ratio = m.observed / Math.max(1, m.baseline);
                    return (
                      <tr key={i}>
                        <td className="py-2 px-3 text-slate-800">{pt.weekLabel}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {m.observed}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {m.baseline}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            ratio >= 1.7 ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {ratio.toFixed(2)}x
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Potential Signal Review Queue & Detailed Evidence Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            Potential Signal Review Queue ({signals.length})
          </h2>
          <p className="text-xs text-slate-500">
            Select a statistical anomaly below to inspect aggregate evidence, limitations, and update investigation status
          </p>

          <div className="space-y-3 pt-1">
            {signals.map((sig) => {
              const isSelected = activeSignal?.id === sig.id;
              return (
                <button
                  key={sig.id}
                  onClick={() => setSelectedSignalId(sig.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/40'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">
                      {sig.id} · {sig.region}
                    </span>
                    <span className="font-semibold text-teal-800">
                      {sig.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-red-700 mt-1">
                    Potential signal — requires public-health review ({sig.statisticalRatio.toFixed(2)}x baseline)
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {sig.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Signal Evidence & Analyst Action Panel */}
        {activeSignal && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="pb-4 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-red-700 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Potential signal — requires public-health review</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-700">
                  {activeSignal.id} ({activeSignal.region})
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-teal-800">
                  Current Status: {activeSignal.status}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {activeSignal.title}
              </h2>
              <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                Detected: {activeSignal.detectedDate} · Comparison: {activeSignal.comparisonPeriod} · Participating Facilities: {activeSignal.participatingHospitalsCount}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500 font-sans">Observed Weekly Count</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {activeSignal.observedCount} cases
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500 font-sans">Historical Baseline</div>
                <div className="text-lg font-bold text-slate-700 mt-0.5">
                  {activeSignal.baselineAverage} cases
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-50/60 border border-red-200">
                <div className="text-red-900 font-sans">Threshold Ratio</div>
                <div className="text-lg font-bold text-red-700 mt-0.5">
                  {activeSignal.statisticalRatio.toFixed(2)}x Baseline
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs">
              <div className="font-bold text-slate-900 mb-1">
                Aggregate Trigger Explanation
              </div>
              <p className="text-slate-700 leading-relaxed">
                {activeSignal.triggerExplanation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/40">
                <div className="font-bold text-amber-900 mb-1">
                  Data Limitations & Possible Quality Confounders
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {activeSignal.limitationsAndConfonders.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <div className="font-bold text-slate-900 mb-1">
                  Non-Outbreak / Alternative Explanations
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {activeSignal.alternativeExplanations.map((alt, i) => (
                    <li key={i}>{alt}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Analyst Review Action Controls */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="font-bold text-slate-900">
                Record Public-Health Investigation Action (Logged to Audit Trail)
              </div>
              <input
                type="text"
                value={analystNotes}
                onChange={(e) => setAnalystNotes(e.target.value)}
                placeholder="Add epidemiological review notes (e.g., 'Requesting de-identified lab serology positivity rates')..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    'Under Review',
                    'Escalated',
                    'Dismissed',
                    'Resolved',
                  ] as SignalInvestigationStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    disabled={isUpdatingSignal}
                    onClick={() => handleUpdateSignalStatus(activeSignal.id, st)}
                    className={`px-3.5 py-2 rounded-lg font-semibold transition-colors ${
                      activeSignal.status === st
                        ? 'bg-teal-700 text-white'
                        : 'bg-white border border-slate-300 hover:border-teal-700 text-slate-800'
                    }`}
                  >
                    Mark as {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2. SHARING, CONSENT & PRIVACY MANAGER (SCENARIO G)
// ============================================================================
interface SharingAndPrivacyViewProps {
  role: UserRole;
  patient: Patient | undefined;
  auditLogs: AuditLogEntry[];
  onRefreshState: () => Promise<void>;
}

export const SharingAndPrivacyView: React.FC<SharingAndPrivacyViewProps> = ({
  role,
  patient,
  auditLogs,
  onRefreshState,
}) => {
  const [confirmTogglePerm, setConfirmTogglePerm] = useState<{
    id: string;
    entityName: string;
    targetStatus: 'Active' | 'Revoked';
  } | null>(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState<'Hospital' | 'Doctor'>('Hospital');
  const [newPurpose, setNewPurpose] = useState(
    'Diagnostic Consultation & Longitudinal Care'
  );
  const [newExpiresAt, setNewExpiresAt] = useState('2027-06-30');
  const [privacyBanner, setPrivacyBanner] = useState<string | null>(null);

  if (!patient) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center">
        <p className="text-sm text-slate-600">Select a patient to manage sharing permissions.</p>
      </div>
    );
  }

  const handleConfirmPermissionChange = async () => {
    if (!confirmTogglePerm) return;
    const res = await fetch(`/api/patients/${patient.id}/permissions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissionId: confirmTogglePerm.id,
        newStatus: confirmTogglePerm.targetStatus,
        actorRole: role,
        actorIdentity:
          role === 'patient' ? `${patient.fullName} (${patient.id})` : 'Demo Evaluator',
      }),
    });
    if (res.ok) {
      await onRefreshState();
      setPrivacyBanner(
        `Permission for "${confirmTogglePerm.entityName}" updated to ${confirmTogglePerm.targetStatus}. Subsequent Doctor/Copilot access checks immediately enforce this state.`
      );
      setConfirmTogglePerm(null);
    }
  };

  const handleGrantNewAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityName.trim()) return;
    const res = await fetch(`/api/patients/${patient.id}/permissions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newEntityName: newEntityName.trim(),
        newEntityType,
        newCategories: ['Lab Reports', 'Prescriptions', 'Discharge Summaries'],
        newPurpose,
        newExpiresAt,
        actorRole: role,
        actorIdentity: `${patient.fullName} (${patient.id})`,
      }),
    });
    if (res.ok) {
      await onRefreshState();
      setNewEntityName('');
      setPrivacyBanner(
        `Granted new sharing access to "${newEntityName.trim()}" and recorded the event in the access audit log.`
      );
    }
  };

  const accessHistory = auditLogs.filter(
    (a) =>
      a.targetIdentifier.includes(patient.id) ||
      a.actorIdentity.includes(patient.id) ||
      a.actorIdentity.includes(patient.fullName)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-1">
          <Lock className="w-4 h-4" />
          <span>SCENARIO G · PATIENT SHARING, CONSENT & PRIVACY GOVERNANCE</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-bold">
            {patient.id} ({patient.fullName})
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Connected Health Record Sharing & Consent Controls
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Review which doctors and hospitals can access {patient.fullName}&apos;s connected health records. Revoking access immediately updates the permission state and restricts subsequent clinician/AI access checks.
        </p>
      </div>

      {privacyBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 text-xs font-semibold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{privacyBanner}</span>
          </div>
          <button onClick={() => setPrivacyBanner(null)} className="hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Confirmation Modal Before Changing Sharing Permission */}
      {confirmTogglePerm && (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-amber-950">
            <div className="font-bold text-sm">
              Confirm Sharing Permission Change: {confirmTogglePerm.targetStatus === 'Revoked' ? 'Revoke Access' : 'Restore Access'}
            </div>
            <p className="mt-1">
              Are you sure you want to change data-sharing access for <strong>{confirmTogglePerm.entityName}</strong> to <strong>{confirmTogglePerm.targetStatus}</strong>? This action will immediately update clinician access checks and record an audit event.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirmTogglePerm(null)}
              className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPermissionChange}
              className={`px-4 py-2 rounded-lg text-xs font-semibold text-white ${
                confirmTogglePerm.targetStatus === 'Revoked'
                  ? 'bg-red-700 hover:bg-red-800'
                  : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              Confirm {confirmTogglePerm.targetStatus === 'Revoked' ? 'Revocation' : 'Grant'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Active & Revoked Permissions List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Current Authorized Doctors & Participating Hospitals
          </h2>
          <div className="space-y-3">
            {patient.sharingPermissions.map((perm) => (
              <div
                key={perm.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>{perm.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{perm.entityType}</span>
                    <span aria-hidden="true">·</span>
                    <span>Expires: {perm.expiresAt}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {perm.entityName}
                  </h3>
                  <div className="text-xs text-slate-600 mt-1">
                    <strong>Categories Shared:</strong> {perm.categoriesShared.join(', ')}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Purpose: {perm.purpose}
                    {perm.lastAccessedAt && ` · Last accessed: ${perm.lastAccessedAt}`}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-bold ${
                      perm.status === 'Active' ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {perm.status}
                  </span>
                  <button
                    onClick={() =>
                      setConfirmTogglePerm({
                        id: perm.id,
                        entityName: perm.entityName,
                        targetStatus: perm.status === 'Active' ? 'Revoked' : 'Active',
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      perm.status === 'Active'
                        ? 'bg-red-100 hover:bg-red-200 text-red-900'
                        : 'bg-teal-700 hover:bg-teal-800 text-white'
                    }`}
                  >
                    {perm.status === 'Active' ? 'Revoke Access' : 'Grant Access'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grant New Access Form + Prototype Disclaimer */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <form onSubmit={handleGrantNewAccess} className="space-y-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">
              Grant New Simulated Sharing Access
            </h2>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Doctor or Participating Hospital Name *
              </label>
              <input
                type="text"
                required
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                placeholder="e.g., Seva Community Medical Institute — Ophthalmology"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recipient Type
                </label>
                <select
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Hospital">Hospital</option>
                  <option value="Doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Simulated Expiration Date
                </label>
                <input
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Purpose of Sharing
              </label>
              <input
                type="text"
                value={newPurpose}
                onChange={(e) => setNewPurpose(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
            >
              Grant Sharing Permission
            </button>
          </form>

          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong>Prototype Consent Governance Notice:</strong> This prototype consent toggle demonstrates dynamic role-based access enforcement and audit logging. By itself, a UI toggle does not constitute production-grade legal HIPAA/DPDP authorization or cryptographic key revocation.
          </div>
        </div>
      </div>

      {/* Patient Access & Consent Audit History */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-bold text-slate-900 mb-3">
          Visible Access & Sharing History ({accessHistory.length} Recorded Events)
        </h2>
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {accessHistory.map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="font-mono font-bold text-slate-800">
                  {log.id} · {log.actorIdentity} ({log.actorRole.toUpperCase()})
                </span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {log.action} — <span className="text-teal-800">{log.targetIdentifier}</span>
                </div>
                <div className="text-slate-600 mt-0.5">{log.summary}</div>
              </div>
              <div className="text-right font-mono tabular-nums shrink-0">
                <div className="font-semibold text-slate-800">{log.outcome}</div>
                <div className="text-slate-500">{log.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. NOTIFICATION CENTER & SYSTEM AUDIT LOG
// ============================================================================
interface NotificationsAndAuditViewProps {
  mode: 'notifications' | 'audit';
  role: UserRole;
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  onNavigate: (section: NavigationSection) => void;
  onRefreshState: () => Promise<void>;
}

export const NotificationsAndAuditView: React.FC<
  NotificationsAndAuditViewProps
> = ({ mode, role, notifications, auditLogs, onNavigate, onRefreshState }) => {
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const handleMarkNotificationRead = async (notif: NotificationItem) => {
    await fetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' });
    await onRefreshState();
    onNavigate(notif.targetSection);
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    await onRefreshState();
  };

  if (mode === 'notifications') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Notification & Clinical Follow-Up Center ({notifications.length})
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              State-driven notifications for uploaded records, pending verifications, prescription reviews, consent updates, and public-health signals. Clicking any notification opens the relevant workspace.
            </p>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            Mark All as Read
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No notifications for the current role.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkNotificationRead(n)}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                  n.read ? 'bg-white hover:bg-slate-50' : 'bg-teal-50/40 hover:bg-teal-50/70'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>{n.timestamp}</span>
                    <span aria-hidden="true">·</span>
                    <span>{n.category.replace('_', ' ').toUpperCase()}</span>
                    {!n.read && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold text-teal-800">UNREAD</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {n.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                </div>
                <span className="text-xs font-semibold text-teal-700 whitespace-nowrap shrink-0">
                  Open {n.targetSection.toUpperCase()} →
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter((l) =>
    roleFilter === 'ALL' ? true : l.actorRole === roleFilter
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            System Audit & Governance Activity Log ({filteredLogs.length} Events)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Immutable record of actor roles, demo identities, actions performed, affected synthetic record identifiers, timestamps, and outcomes—without exposing unnecessary sensitive medical text.
          </p>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter audit logs by actor role"
          className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 self-start sm:self-center"
        >
          <option value="ALL">All Actor Roles</option>
          <option value="patient">Patient Actions</option>
          <option value="doctor">Doctor Actions</option>
          <option value="admin">Hospital Admin Actions</option>
          <option value="analyst">Public-Health Analyst Actions</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <th className="py-3 px-4">Audit ID & Timestamp</th>
              <th className="py-3 px-4">Actor Role & Demo Identity</th>
              <th className="py-3 px-4">Action Performed</th>
              <th className="py-3 px-4">Affected Identifier</th>
              <th className="py-3 px-4">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                  <div className="font-bold text-slate-800">{log.id}</div>
                  <div className="text-slate-500">{log.timestamp}</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900">
                    {log.actorIdentity}
                  </div>
                  <div className="text-slate-500 font-mono uppercase">
                    Role: {log.actorRole}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900">{log.action}</div>
                  <div className="text-slate-600 mt-0.5">{log.summary}</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-teal-800 font-semibold">
                  {log.targetIdentifier}
                </td>
                <td className="py-3.5 px-4 font-semibold">
                  <span
                    className={
                      log.outcome === 'Restricted / Denied'
                        ? 'text-red-700'
                        : log.outcome === 'Flagged for Review'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }
                  >
                    {log.outcome}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
