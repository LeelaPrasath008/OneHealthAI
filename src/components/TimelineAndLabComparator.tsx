import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  FlaskConical,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../apiFallback';
import {
  LongitudinalSummaryResponse,
  MedicalRecord,
  Patient,
  RecordCategory,
  UserRole,
} from '../types';

interface TimelineAndLabComparatorProps {
  role: UserRole;
  patient: Patient | undefined;
  records: MedicalRecord[];
  onInspectRecord: (record: MedicalRecord) => void;
  onOpenUploadModal: () => void;
}

export const TimelineAndLabComparator: React.FC<TimelineAndLabComparatorProps> = ({
  role,
  patient,
  records,
  onInspectRecord,
  onOpenUploadModal,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [hospitalFilter, setHospitalFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRecordIds, setExpandedRecordIds] = useState<Record<string, boolean>>({
    'REC-106': true,
    'REC-107': true,
  });
  const [selectedLabGroup, setSelectedLabGroup] = useState<string>('HbA1c_%');

  const [aiSummary, setAiSummary] = useState<LongitudinalSummaryResponse | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (patient) {
      if (patient.aiSummaryCache) {
        setAiSummary(patient.aiSummaryCache);
      } else {
        handleGenerateSummary(patient.id);
      }
    }
  }, [patient?.id]);

  const handleGenerateSummary = async (targetPatientId?: string) => {
    const pid = targetPatientId || patient?.id;
    if (!pid) return;
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const response = await apiFetch('/api/ai/timeline-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: pid,
          actorRole: role,
          actorIdentity:
            role === 'doctor'
              ? 'Dr. Vikram Mehta, MD'
              : role === 'patient'
              ? patient?.fullName
              : 'Priya Nair, MHA',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSummaryError(data.error || 'Could not generate timeline summary.');
      } else {
        setAiSummary(data.summary);
      }
    } catch (err) {
      setSummaryError('Network error while generating longitudinal summary.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center">
        <p className="text-sm text-slate-600">Select a patient to view their health timeline.</p>
      </div>
    );
  }

  // Enforce patient consent if viewed as Doctor
  const doctorHasConsent =
    role !== 'doctor' ||
    patient.sharingPermissions.some((p) => p.status === 'Active');

  if (!doctorHasConsent) {
    return (
      <div className="p-8 bg-red-50/50 border border-red-200 rounded-xl text-center space-y-2">
        <Lock className="w-8 h-8 text-red-700 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">
          Longitudinal Timeline Access Restricted by Patient Consent
        </h2>
        <p className="text-xs text-slate-600 max-w-lg mx-auto">
          {patient.fullName} ({patient.id}) has revoked data-sharing access. Timeline records and AI summaries are blocked until consent is restored.
        </p>
      </div>
    );
  }

  const patientRecords = records
    .filter((r) => r.patientId === patient.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const hospitals = Array.from(new Set(patientRecords.map((r) => r.hospital)));
  const categories = Array.from(new Set(patientRecords.map((r) => r.category)));

  const filteredRecords = patientRecords.filter((r) => {
    if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
    if (hospitalFilter !== 'ALL' && r.hospital !== hospitalFilter) return false;
    if (statusFilter !== 'ALL' && r.reviewStatus !== statusFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${r.id} ${r.title} ${r.hospital} ${r.clinician} ${r.summaryNotes} ${
        r.documentedDiagnosis || ''
      } ${(r.labResults || []).map((l) => l.testName).join(' ')} ${(
        r.prescribedMedications || []
      )
        .map((m) => m.name)
        .join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const toggleExpandRecord = (recId: string) => {
    setExpandedRecordIds((prev) => ({ ...prev, [recId]: !prev[recId] }));
  };

  const openRecordById = (recId: string) => {
    const found = patientRecords.find((r) => r.id === recId);
    if (found) onInspectRecord(found);
  };

  // Extract serial lab points for the selected comparable group
  const serialLabPoints: {
    recordId: string;
    date: string;
    hospital: string;
    reviewStatus: string;
    testName: string;
    numericValue: number;
    unit: string;
    referenceRange: string;
    assayMethod?: string;
  }[] = [];

  patientRecords.forEach((rec) => {
    rec.labResults?.forEach((lab) => {
      if (lab.comparableGroup === selectedLabGroup && typeof lab.value === 'number') {
        serialLabPoints.push({
          recordId: rec.id,
          date: rec.date,
          hospital: rec.hospital,
          reviewStatus: rec.reviewStatus,
          testName: lab.testName,
          numericValue: lab.value,
          unit: lab.unit,
          referenceRange: lab.referenceRange,
          assayMethod: lab.assayMethod,
        });
      }
    });
  });

  // Check if there are incompatible unit lab entries (e.g. REC-104 Glucose in mmol/L)
  const incompatibleGlucoseEntries = patientRecords.flatMap((rec) =>
    (rec.labResults || [])
      .filter((l) => l.testName.toLowerCase().includes('glucose'))
      .map((l) => ({
        recordId: rec.id,
        date: rec.date,
        hospital: rec.hospital,
        value: l.value,
        unit: l.unit,
        referenceRange: l.referenceRange,
        assayMethod: l.assayMethod,
      }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-1">
            <span>LONGITUDINAL MULTI-HOSPITAL HEALTH TIMELINE</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-bold">{patient.id} ({patient.fullName})</span>
            <span aria-hidden="true">·</span>
            <span>{patientRecords.length} Chronological Events</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Connected Health Journey & Source-Linked AI Synthesis
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Every factual statement in the AI summary links directly to the underlying clinical record. Laboratory trend comparisons preserve original units and flag incompatible scales.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleGenerateSummary(patient.id)}
            disabled={isLoadingSummary}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
            <span>{isLoadingSummary ? 'Regenerating Summary...' : 'Regenerate AI Summary'}</span>
          </button>
        </div>
      </div>

      {/* AI-Generated Source-Linked Patient Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">
              AI-Generated Longitudinal Summary (Source-Linked)
            </h2>
          </div>
          {aiSummary && (
            <div className="text-xs text-slate-500 font-mono">
              <span>
                Mode:{' '}
                <strong className="text-teal-800">
                  {aiSummary.aiMode === 'live-gemini'
                    ? 'Live Gemini 3.8 Flash'
                    : 'Demo AI Mode (Simulated Fallback)'}
                </strong>
              </span>
              <span aria-hidden="true"> · </span>
              <span>Updated: {aiSummary.generatedAt}</span>
            </div>
          )}
        </div>

        {summaryError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {summaryError}
          </div>
        )}

        {isLoadingSummary ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-5 h-5 text-teal-700 animate-spin mx-auto" />
            <p>Synthesizing authorized multi-hospital records and verifying source links...</p>
          </div>
        ) : aiSummary ? (
          <div className="mt-4 space-y-5">
            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
              {aiSummary.overviewParagraph}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Documented Conditions & Medications */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    Documented Health Conditions
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {aiSummary.documentedConditions.map((item, idx) => (
                      <li key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <span>{item.statement}</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.sourceRecordIds.map((rid) => (
                            <button
                              key={rid}
                              onClick={() => openRecordById(rid)}
                              className="font-mono text-xs font-semibold text-teal-700 hover:underline"
                            >
                              [Source: {rid}]
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    Medication History & Documented Rationale
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {aiSummary.medicationHistorySummary.map((item, idx) => (
                      <li key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <span>{item.statement}</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.sourceRecordIds.map((rid) => (
                            <button
                              key={rid}
                              onClick={() => openRecordById(rid)}
                              className="font-mono text-xs font-semibold text-teal-700 hover:underline"
                            >
                              [Source: {rid}]
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Lab Changes, Follow-ups, and Missing/Conflicting Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    Notable Changes in Available Test Results
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {aiSummary.notableLabChanges.map((item, idx) => (
                      <li key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <span>{item.statement}</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.sourceRecordIds.map((rid) => (
                            <button
                              key={rid}
                              onClick={() => openRecordById(rid)}
                              className="font-mono text-xs font-semibold text-teal-700 hover:underline"
                            >
                              [Source: {rid}]
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-amber-900 mb-2">
                    Missing, Unverified, or Conflicting Information
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-800">
                    {aiSummary.missingOrConflictingInfo.map((warn, idx) => (
                      <li
                        key={idx}
                        className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50"
                      >
                        {warn}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Scenario B: Serial Lab Trend & Unit Compatibility Comparator */}
      {patient.id === 'P1001' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs text-teal-700 font-medium">
                <FlaskConical className="w-4 h-4" />
                <span>SCENARIO B · SERIAL LABORATORY TREND & UNIT COMPATIBILITY COMPARATOR</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Multi-Hospital Laboratory Comparison (Preserving Original Units & Reference Ranges)
              </h2>
            </div>

            {/* Analyte Selector Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {[
                { id: 'HbA1c_%', label: 'HbA1c (%)' },
                { id: 'eGFR_mL_min', label: 'eGFR (mL/min/1.73m²)' },
                { id: 'Creatinine_mg_dL', label: 'Creatinine (mg/dL)' },
                { id: 'LDL_mg_dL', label: 'LDL Cholesterol (mg/dL)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedLabGroup(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedLabGroup === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Serial Trend Table + SVG Sparkline */}
            <div className="lg:col-span-7 space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                      <th className="py-2.5 px-3">Date & Record</th>
                      <th className="py-2.5 px-3">Facility & Method</th>
                      <th className="py-2.5 px-3 text-right">Value & Unit</th>
                      <th className="py-2.5 px-3">Ref Range</th>
                      <th className="py-2.5 px-3">Provenance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {serialLabPoints.map((pt) => (
                      <tr key={pt.recordId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono tabular-nums">
                          <div className="font-semibold text-slate-900">{pt.date}</div>
                          <button
                            onClick={() => openRecordById(pt.recordId)}
                            className="text-teal-700 hover:underline font-semibold"
                          >
                            {pt.recordId}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{pt.hospital}</div>
                          <div className="text-slate-500">{pt.assayMethod}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {pt.numericValue} {pt.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                          {pt.referenceRange}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-semibold ${
                              pt.reviewStatus === 'Verified'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {pt.reviewStatus === 'Verified' ? 'Verified' : 'Needs Review'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clean SVG Trend Visualization */}
              {serialLabPoints.length >= 2 && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                    <span className="font-semibold text-slate-800">
                      Compatible Unit Trajectory ({serialLabPoints[0].testName} in {serialLabPoints[0].unit})
                    </span>
                    <span className="font-mono">
                      Ref: {serialLabPoints[0].referenceRange}
                    </span>
                  </div>
                  <svg viewBox="0 0 500 110" className="w-full h-28 overflow-visible">
                    {(() => {
                      const vals = serialLabPoints.map((p) => p.numericValue);
                      const minV = Math.min(...vals) * 0.9;
                      const maxV = Math.max(...vals) * 1.1;
                      const range = Math.max(0.1, maxV - minV);
                      const coords = serialLabPoints.map((p, idx) => {
                        const x =
                          50 +
                          (idx / Math.max(1, serialLabPoints.length - 1)) * 400;
                        const y = 85 - ((p.numericValue - minV) / range) * 60;
                        return { x, y, ...p };
                      });
                      const pathD = coords
                        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
                        .join(' ');
                      return (
                        <>
                          <line
                            x1="30"
                            y1="88"
                            x2="470"
                            y2="88"
                            stroke="#cbd5e1"
                            strokeWidth="1"
                          />
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#0f766e"
                            strokeWidth="2.5"
                          />
                          {coords.map((c) => (
                            <g key={c.recordId}>
                              <circle
                                cx={c.x}
                                cy={c.y}
                                r="5"
                                fill={c.reviewStatus === 'Verified' ? '#0f766e' : '#d97706'}
                              />
                              <text
                                x={c.x}
                                y={c.y - 10}
                                textAnchor="middle"
                                className="text-[10px] font-mono fill-slate-900 font-bold"
                              >
                                {c.numericValue} {c.unit}
                              </text>
                              <text
                                x={c.x}
                                y={103}
                                textAnchor="middle"
                                className="text-[10px] font-mono fill-slate-500"
                              >
                                {c.date} ({c.recordId})
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>

            {/* Right: Incompatible Unit & Assay Method Warning Box */}
            <div className="lg:col-span-5 p-5 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Incompatible Unit & Assay Safeguard</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  OneHealth AI prevents misleading visual trend lines when participating hospitals report the same test in different units or non-equivalent assay methods:
                </p>

                <div className="space-y-2.5">
                  {incompatibleGlucoseEntries.map((g) => (
                    <div
                      key={g.recordId}
                      className="p-3 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {g.date} · <span className="font-mono text-teal-800">{g.recordId}</span>
                        </div>
                        <div className="text-slate-500">{g.hospital}</div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div
                          className={`font-bold ${
                            g.unit === 'mmol/L' ? 'text-amber-800' : 'text-slate-900'
                          }`}
                        >
                          {g.value} {g.unit}
                        </div>
                        <div className="text-slate-500">Ref: {g.referenceRange}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/80 text-xs text-amber-900">
                <strong>Clinical Safety Rule:</strong> REC-104 Fasting Glucose (<code className="font-mono">9.2 mmol/L</code>) is blocked from direct plotting against <code className="font-mono">mg/dL</code> values without explicit molar conversion (<code className="font-mono">× 18.018 ≈ 166 mg/dL</code>). Similarly, REC-104 Creatinine used a Jaffe kinetic assay vs. Enzymatic IDMS at Metro General.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chronological Timeline Filter Bar & Event Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Chronological Health Timeline ({filteredRecords.length} of {patientRecords.length} Events)
            </h2>
            <p className="text-xs text-slate-500">
              Filter by event category, hospital, review status, or date range. Click any event to inspect the original report.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline (diagnosis, lab, drug, hospital)..."
              aria-label="Search timeline events"
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 w-56 focus:outline-none focus:border-teal-700"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by event category"
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              aria-label="Filter by hospital"
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="ALL">All Hospitals</option>
              {hospitals.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by review status"
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="Verified">Clinician-Verified</option>
              <option value="Needs Review">Needs Review</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Start date filter"
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="End date filter"
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-700"
            />

            {(categoryFilter !== 'ALL' ||
              hospitalFilter !== 'ALL' ||
              statusFilter !== 'ALL' ||
              dateFrom ||
              dateTo ||
              searchQuery) && (
              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setHospitalFilter('ALL');
                  setStatusFilter('ALL');
                  setDateFrom('');
                  setDateTo('');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 text-teal-700 font-semibold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Timeline Events List */}
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">
              No timeline events match the selected filters.
            </p>
            <button
              onClick={() => {
                setCategoryFilter('ALL');
                setHospitalFilter('ALL');
                setStatusFilter('ALL');
                setDateFrom('');
                setDateTo('');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
            >
              Clear Timeline Filters
            </button>
          </div>
        ) : (
          <div className="mt-6 relative pl-6 border-l border-slate-200 space-y-6">
            {filteredRecords.map((rec) => {
              const isExpanded = Boolean(expandedRecordIds[rec.id]);
              return (
                <div key={rec.id} className="relative">
                  {/* Timeline Node Marker */}
                  <div
                    className={`w-3 h-3 rounded-full absolute -left-[30px] top-1.5 border-2 border-white ${
                      rec.reviewStatus === 'Verified' ? 'bg-teal-700' : 'bg-amber-600'
                    }`}
                  />

                  <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {rec.date}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-teal-800">{rec.id}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-700">{rec.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.hospital}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.clinician}</span>
                        {rec.fhirResourceType && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-500">
                              FHIR: {rec.fhirResourceType}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-semibold ${
                            rec.reviewStatus === 'Verified'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {rec.reviewStatus === 'Verified'
                            ? 'Clinician-Verified'
                            : 'Needs Review'}
                        </span>
                        <button
                          onClick={() => toggleExpandRecord(rec.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                        >
                          {isExpanded ? 'Collapse Details' : 'Expand Details'}
                        </button>
                        <button
                          onClick={() => onInspectRecord(rec)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:border-teal-700 text-slate-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          Inspect Source Document
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1.5">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {rec.summaryNotes}
                    </p>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                        {/* Plain-Language Patient Explanation */}
                        {rec.plainLanguageExplanation && (
                          <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-200/80 text-xs">
                            <div className="font-bold text-teal-900 mb-0.5">
                              Plain-Language Patient Explanation
                            </div>
                            <p className="text-slate-800 leading-relaxed">
                              {rec.plainLanguageExplanation}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <span className="font-semibold text-slate-700">
                              Documented Diagnosis:{' '}
                            </span>
                            <span className="text-slate-900">
                              {rec.documentedDiagnosis || 'Not explicitly recorded'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <span className="font-semibold text-slate-700">
                              Follow-Up Plan:{' '}
                            </span>
                            <span className="text-slate-900">
                              {rec.followUpRecommendation || 'Per treating clinician'}
                            </span>
                          </div>
                        </div>

                        {/* Structured Lab Analytes Preview if present */}
                        {rec.labResults && rec.labResults.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {rec.labResults.map((lab, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <div className="text-slate-500 truncate">{lab.testName}</div>
                                <div className="font-mono font-bold text-slate-900 tabular-nums mt-0.5">
                                  {lab.value} {lab.unit}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  Ref: {lab.referenceRange}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Prescribed Medications Preview if present */}
                        {rec.prescribedMedications && rec.prescribedMedications.length > 0 && (
                          <div className="space-y-1.5">
                            {rec.prescribedMedications.map((m, idx) => (
                              <div key={idx} className="text-xs text-slate-700">
                                <span className="font-semibold text-slate-900">
                                  Rx: {m.name} {m.strength}
                                </span>{' '}
                                ({m.dose}, {m.frequency}) —{' '}
                                <span className="text-slate-500">
                                  Documented Indication:{' '}
                                  {m.documentedIndication || 'Not recorded'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
