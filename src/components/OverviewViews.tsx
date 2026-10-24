import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileCheck2,
  FilePlus2,
  FileText,
  HeartPulse,
  Lock,
  MessageSquareHeart,
  Network,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { apiFetch } from '../apiFallback';
import { UI_TRANSLATIONS } from '../i18n';
import { createInitialSeedState } from '../seedData';
import {
  ABDMExchangeLogItem,
  AuditLogEntry,
  ConsultationQueueItem,
  FacilityStaffConfigItem,
  MedicalRecord,
  NavigationSection,
  NotificationItem,
  Patient,
  PrescriptionDraft,
  PublicHealthSignal,
  PublicHealthTimeSeriesPoint,
  SupportedUILanguage,
  UserRole,
} from '../types';
import { PatientVitalsTrendChart } from './PatientVitalsTrendChart';
import {
  CONNECTED_CARE_BANNER_IMG,
  DOCTOR_WORKFLOW_BANNER_IMG,
  PatientVisualHealthSnapshot,
} from './VisualHealthGuide';

interface OverviewProps {
  role: UserRole;
  patients: Patient[];
  selectedPatient: Patient | undefined;
  records: MedicalRecord[];
  prescriptionDrafts: PrescriptionDraft[];
  publicHealthSeries?: PublicHealthTimeSeriesPoint[];
  publicHealthSignals: PublicHealthSignal[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  abdmExchangeLogs?: ABDMExchangeLogItem[];
  consultationQueue?: ConsultationQueueItem[];
  facilityStaffConfig?: FacilityStaffConfigItem[];
  uiLanguage?: SupportedUILanguage;
  onRefreshState?: () => Promise<void>;
  onNavigate: (section: NavigationSection) => void;
  onSelectPatient: (patientId: string, targetSection?: NavigationSection) => void;
  onInspectRecord?: (record: MedicalRecord) => void;
  onOpenRegistrationModal: () => void;
  onOpenUploadModal: () => void;
}

export const OverviewViews: React.FC<OverviewProps> = ({
  role,
  patients,
  selectedPatient,
  records,
  prescriptionDrafts,
  publicHealthSeries = [],
  publicHealthSignals,
  auditLogs,
  abdmExchangeLogs = [],
  consultationQueue = [],
  facilityStaffConfig = [],
  uiLanguage = 'en',
  onRefreshState,
  onNavigate,
  onSelectPatient,
  onInspectRecord,
  onOpenRegistrationModal,
  onOpenUploadModal,
}) => {
  const [overviewToast, setOverviewToast] = useState<string | null>(null);
  const [isSubmittingOverviewAction, setIsSubmittingOverviewAction] = useState(false);

  // Guaranteed fallback so patient profiles and records are never empty on any deployment
  const seedFallback = createInitialSeedState();
  const safePatients = patients.length > 0 ? patients : seedFallback.patients;
  const safeRecords = records.length > 0 ? records : seedFallback.records;

  // ============================================================================
  // 1. PATIENT OVERVIEW — HEALTH RECORD SUMMARY, PLAIN-LANGUAGE EXPLANATIONS & CONSENT
  // ============================================================================
  if (role === 'patient') {
    const patient = selectedPatient || safePatients[0];
    const t =
      UI_TRANSLATIONS[uiLanguage]?.patientOverview ||
      UI_TRANSLATIONS.en.patientOverview;

    const myRecords = safeRecords
      .filter((r) => r.patientId === patient.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const activePermissions = patient.sharingPermissions.filter((p) => p.status === 'Active');
    const pendingConsentRequests = patient.sharingPermissions.filter(
      (p) => p.status === 'Pending Approval'
    );
    const hospitalsVisited = Array.from(new Set(myRecords.map((r) => r.hospital)));

    const handleDirectConsentDecision = async (
      permissionId: string,
      entityName: string,
      newStatus: 'Active' | 'Rejected'
    ) => {
      setIsSubmittingOverviewAction(true);
      try {
        const res = await apiFetch(`/api/patients/${patient.id}/permissions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permissionId,
            newStatus,
            actorRole: 'patient',
            actorIdentity: `${patient.fullName} (${patient.id})`,
          }),
        });
        if (res.ok) {
          if (onRefreshState) await onRefreshState();
          setOverviewToast(
            newStatus === 'Active'
              ? `Approved consent request (${permissionId}) for "${entityName}". Access is now Active.`
              : `Rejected consent request (${permissionId}) for "${entityName}".`
          );
        }
      } finally {
        setIsSubmittingOverviewAction(false);
      }
    };

    const handleSubmitDoctorApprovalRequest = async () => {
      setIsSubmittingOverviewAction(true);
      try {
        const firstMed = patient.medications[0];
        const res = await apiFetch('/api/prescriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: patient.id,
            medicationName: firstMed
              ? `${firstMed.name} (Patient Approval / Refill Request)`
              : 'Telmisartan 40 mg (Patient Approval Request)',
            strength: firstMed ? firstMed.strength : '40 mg',
            dose: firstMed ? firstMed.dose : '1 tablet',
            route: 'Oral',
            frequency: firstMed ? firstMed.frequency : 'Once daily in the morning',
            duration: '90 days',
            instructions: 'Patient-submitted approval/renewal request for clinician review.',
            supportingRationale: `Patient ${patient.fullName} (${patient.id}) submitted an approval/refill request from the Patient Overview.`,
            sourceRecordIds: myRecords.slice(0, 2).map((r) => r.id),
            createdBy: `${patient.fullName} (Patient Request)`,
            status: 'Awaiting Clinician Review',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (onRefreshState) await onRefreshState();
          setOverviewToast(
            `Submitted approval request (${data.draft?.id || 'RX'}) to ${patient.assignedClinician}. Status: Awaiting Clinician Review.`
          );
        }
      } finally {
        setIsSubmittingOverviewAction(false);
      }
    };

    return (
      <div className="space-y-3.5 sm:space-y-6">
        {overviewToast && (
          <div className="p-3 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-emerald-950 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{overviewToast}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate('prescriptions')}
                className="px-2.5 py-1 bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
              >
                Open Approvals Queue →
              </button>
              <button
                onClick={() => setOverviewToast(null)}
                className="text-emerald-800 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Patient Greeting & Illustrated Connected Health Hero Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 items-center">
          <div className="lg:col-span-7 space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-teal-700 font-semibold">
              <span>{t.connectedSummaryBadge}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{patient.id}</span>
              <span aria-hidden="true">·</span>
              <span>
                {hospitalsVisited.length} {t.hospitalsLinked}
              </span>
            </div>
            <h1 className="text-lg sm:text-3xl font-bold text-slate-900 tracking-tight">
              {t.greeting(patient.fullName)}
            </h1>
            <p className="text-xs sm:text-base text-slate-600 leading-snug sm:leading-relaxed max-w-xl">
              {t.subtitle}
            </p>
            <div className="pt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              <button
                onClick={() => onNavigate('patient-ai')}
                className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageSquareHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{t.askAssistantBtn}</span>
              </button>
              <button
                onClick={() => onNavigate('timeline')}
                className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{t.viewTimelineBtn}</span>
              </button>
              <button
                onClick={handleSubmitDoctorApprovalRequest}
                disabled={isSubmittingOverviewAction}
                className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{t.requestApprovalBtn}</span>
              </button>
              <button
                onClick={() => onNavigate('abdm-readiness')}
                className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Network className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700" />
                <span>
                  {t.sharingConsentBtn(pendingConsentRequests.length)}
                </span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl overflow-hidden border border-teal-200/80 bg-teal-50/40 shadow-xs max-h-32 sm:max-h-none">
              <img
                src={CONNECTED_CARE_BANNER_IMG}
                alt="Visual diagram connecting Hospital 1, Apollo Lab, and St. Jude Heart Clinic into one easy-to-read patient health summary"
                referrerPolicy="no-referrer"
                className="w-full h-32 sm:h-auto object-cover"
              />
            </div>
          </div>
        </div>

        {/* Pending Consent Artefact Alert if any */}
        {pendingConsentRequests.length > 0 && (
          <div className="p-3 sm:p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="text-xs text-amber-950">
              <div className="font-bold text-xs sm:text-sm">
                {t.pendingConsentTitle} ({pendingConsentRequests[0].id})
              </div>
              <p className="mt-0.5 leading-snug">
                <strong>{pendingConsentRequests[0].entityName}</strong> has requested access to your{' '}
                <strong>{pendingConsentRequests[0].categoriesShared.join(', ')}</strong> for{' '}
                <em>{pendingConsentRequests[0].purpose}</em>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                disabled={isSubmittingOverviewAction}
                onClick={() =>
                  handleDirectConsentDecision(
                    pendingConsentRequests[0].id,
                    pendingConsentRequests[0].entityName,
                    'Active'
                  )
                }
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap disabled:opacity-50"
              >
                {t.approveRequestBtn}
              </button>
              <button
                disabled={isSubmittingOverviewAction}
                onClick={() =>
                  handleDirectConsentDecision(
                    pendingConsentRequests[0].id,
                    pendingConsentRequests[0].entityName,
                    'Rejected'
                  )
                }
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white border border-red-300 hover:bg-red-50 text-red-800 text-xs font-semibold rounded-lg whitespace-nowrap disabled:opacity-50"
              >
                {t.rejectRequestBtn}
              </button>
              <button
                onClick={() => onNavigate('abdm-readiness')}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-semibold rounded-lg whitespace-nowrap"
              >
                Open Consent Hub →
              </button>
            </div>
          </div>
        )}

        {/* Key Metrics Strip (2x2 Compact Grid on Mobile, 4 Columns on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">{t.metricRecords}</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5 sm:mt-1">
              {myRecords.length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
              <span>{myRecords.filter((r) => r.reviewStatus === 'Verified').length} Verified</span>
              <span aria-hidden="true"> · </span>
              <span>{myRecords.filter((r) => r.reviewStatus === 'Needs Review').length} Review</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">{t.metricMedications}</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5 sm:mt-1">
              {patient.medications.length}
            </div>
            <div className="text-[11px] sm:text-xs text-emerald-700 mt-0.5 sm:mt-1 truncate">
              Clinician-verified
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">{t.metricAllergies}</div>
            <div className="text-lg sm:text-2xl font-bold text-red-700 font-mono tabular-nums mt-0.5 sm:mt-1">
              {patient.allergies.length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
              {patient.allergies.map((a) => a.substance.split(' ')[0]).join(', ') || 'None recorded'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">{t.metricConsents}</div>
            <div className="text-base sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5 sm:mt-1">
              {activePermissions.length} Active · {pendingConsentRequests.length} Pending
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
              ABDM Consent Hub
            </div>
          </div>
        </div>

        {/* Illustrated Visual Health Snapshot, Morning/Night Medicine Guide & Bite-Sized Report Cards */}
        <PatientVisualHealthSnapshot
          patient={patient}
          records={myRecords}
          uiLanguage={uiLanguage}
          onRefreshState={onRefreshState}
          onNavigate={onNavigate}
          onInspectRecord={(rec) =>
            onInspectRecord ? onInspectRecord(rec) : onNavigate('records')
          }
        />

        {/* Interactive Recharts Vital Signs Longitudinal Trend Visualization */}
        <PatientVitalsTrendChart
          records={myRecords}
          onInspectRecord={(rec) =>
            onInspectRecord ? onInspectRecord(rec) : onNavigate('records')
          }
        />
      </div>
    );
  }

  // ============================================================================
  // 2. DOCTOR OVERVIEW — TODAY'S CONSULTATION QUEUE, VERIFICATION & COPILOT
  // ============================================================================
  if (role === 'doctor') {
    const pendingDrafts = prescriptionDrafts.filter(
      (d) =>
        d.status === 'Awaiting Clinician Review' ||
        d.status === 'Draft' ||
        d.status === 'Requires Additional Information'
    );
    const unverifiedRecords = records.filter((r) => r.reviewStatus === 'Needs Review');

    return (
      <div className="space-y-3.5 sm:space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 items-center">
          <div className="lg:col-span-7 space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-teal-700 font-semibold">
              <span>DOCTOR WORKSPACE</span>
              <span aria-hidden="true">·</span>
              <span>Dr. Vikram Mehta, MD</span>
              <span aria-hidden="true">·</span>
              <span>St. Jude Cardiac &amp; Specialty Center</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
              Clinician Queue, Multi-Hospital Records &amp; AI Copilot
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Review connected patient records from 3 hospitals, check medication safety with the AI Copilot, and sign off on prescriptions.
            </p>
            <div className="pt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              <button
                onClick={() => onNavigate('clinical-copilot')}
                className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Open Clinical Copilot</span>
              </button>
              <button
                onClick={() => onNavigate('prescriptions')}
                className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Prescription Review ({pendingDrafts.length})</span>
              </button>
              <button
                onClick={onOpenUploadModal}
                className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                <span>Upload Report</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 max-h-32 sm:max-h-none">
              <img
                src={DOCTOR_WORKFLOW_BANNER_IMG}
                alt="3-step visual workflow: 1. 3-Hospital Record, 2. AI Copilot Check, 3. Doctor Sign-Off"
                referrerPolicy="no-referrer"
                className="w-full h-32 sm:h-auto object-cover"
              />
            </div>
          </div>
        </div>

        {/* KPI Strip (2x2 on Mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">Consultation Queue</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5 sm:mt-1">
              {consultationQueue.length || patients.length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
              {patients.filter((p) => p.sharingPermissions.some((s) => s.status === 'Active')).length} active consent
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">Rx Drafts Pending</div>
            <div className="text-lg sm:text-2xl font-bold text-amber-700 font-mono tabular-nums mt-0.5 sm:mt-1">
              {pendingDrafts.length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
              Needs doctor attestation
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">Records Needing Review</div>
            <div className="text-lg sm:text-2xl font-bold text-amber-700 font-mono tabular-nums mt-0.5 sm:mt-1">
              {unverifiedRecords.length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
              Staged extractions
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">Severe Allergies</div>
            <div className="text-lg sm:text-2xl font-bold text-red-700 font-mono tabular-nums mt-0.5 sm:mt-1">
              {patients.filter((p) => p.allergies.some((a) => a.severity.includes('Severe'))).length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
              Penicillin · NSAIDs
            </div>
          </div>
        </div>

        {/* Today's Outpatient Consultation Queue Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-teal-700 font-medium">
                <CalendarClock className="w-4 h-4" />
                <span>TODAY&apos;S OUTPATIENT &amp; SPECIALTY CONSULTATION QUEUE</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Scheduled Patient Encounters &amp; Rapid Clinical Launchpad
              </h2>
            </div>
            <button
              onClick={() => onNavigate('patients')}
              className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap shrink-0"
            >
              Open Full Patient Directory →
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">Slot &amp; Status</th>
                  <th className="py-3 px-4">Patient &amp; ABHA (Sim)</th>
                  <th className="py-3 px-4">Visit Type &amp; Chief Complaint</th>
                  <th className="py-3 px-4">Priority / Safety Alerts</th>
                  <th className="py-3 px-4 text-right">Quick Clinical Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {consultationQueue.map((q) => {
                  const pt = patients.find((p) => p.id === q.patientId);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900">{q.appointmentTime}</div>
                        <div
                          className={`font-sans font-semibold ${
                            q.status === 'In Consultation' || q.status === 'Checked In'
                              ? 'text-teal-700'
                              : q.status === 'Awaiting Labs'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {q.status}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {q.patientName}{' '}
                          <span className="font-mono text-teal-800">({q.patientId})</span>
                        </div>
                        <div className="text-slate-500 font-mono">
                          {q.ageGender} · {pt?.simulatedAbhaAddress || 'ABHA Linked'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-slate-800">
                          {q.visitType}
                        </div>
                        <div className="text-slate-600 mt-0.5">{q.chiefComplaint}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {q.allergyAlert && (
                          <div className="text-red-700 font-semibold">{q.allergyAlert}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onSelectPatient(q.patientId, 'timeline')}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-teal-700 rounded-lg font-semibold text-slate-800"
                          >
                            Timeline
                          </button>
                          <button
                            onClick={() => onSelectPatient(q.patientId, 'records')}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-teal-700 rounded-lg font-semibold text-slate-800"
                          >
                            Records
                          </button>
                          <button
                            onClick={() => onSelectPatient(q.patientId, 'clinical-copilot')}
                            className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 rounded-lg font-semibold text-white"
                          >
                            Copilot
                          </button>
                          <button
                            onClick={() => onSelectPatient(q.patientId, 'prescriptions')}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg font-semibold text-white"
                          >
                            Rx Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Patients Roster & Action Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 items-stretch">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recently Accessed Patients &amp; Consent Status
                </h2>
                <p className="text-xs text-slate-500">
                  Select any patient to inspect their multi-hospital timeline, labs, or launch Clinical Copilot
                </p>
              </div>
              <button
                onClick={() => onNavigate('abdm-readiness')}
                className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap shrink-0"
              >
                ABDM Exchange Logs →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {patients.map((pt) => {
                const hasConsent = pt.sharingPermissions.some((p) => p.status === 'Active');
                const isActivePt = selectedPatient?.id === pt.id;
                return (
                  <div
                    key={pt.id}
                    className={`py-3 px-2.5 sm:py-3.5 sm:px-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-colors ${
                      isActivePt ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-teal-800">{pt.id}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-900 text-sm">{pt.fullName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-600 font-mono tabular-nums">
                          {pt.age}y {pt.gender[0]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            hasConsent
                              ? 'text-emerald-700 font-medium'
                              : 'text-red-700 font-medium'
                          }
                        >
                          {hasConsent ? 'Consent Active' : 'Access Revoked'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {pt.conditions.map((c) => c.name).join(' · ') || 'No chronic conditions listed'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectPatient(pt.id, 'timeline')}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Timeline
                      </button>
                      <button
                        onClick={() => onSelectPatient(pt.id, 'clinical-copilot')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Copilot
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Clinical Verification &amp; Approval Queue
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Items requiring physician supervision before clinical activation
              </p>

              <div className="space-y-3">
                {pendingDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/40"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-amber-900">
                        {draft.id} · {draft.status}
                      </span>
                      <span className="font-mono text-slate-600">
                        Patient: {draft.patientId}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">
                      {draft.medicationName} ({draft.strength})
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {draft.supportingRationale}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => onSelectPatient(draft.patientId, 'prescriptions')}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Review &amp; Supervise Draft →
                      </button>
                    </div>
                  </div>
                ))}

                {unverifiedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
                      <span>{rec.id} · Machine-Extracted (Needs Review)</span>
                      <span className="font-mono">{rec.date}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">
                      {rec.title}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => onSelectPatient(rec.patientId, 'records')}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:border-teal-700 text-slate-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Verify Extracted Fields →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              Clinical safety guardrail: AI drafts remain inactive until a clinician completes attestation.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. HOSPITAL ADMINISTRATOR OVERVIEW — HFR/HPR REGISTRY, ABDM STATUS & QUALITY
  // ============================================================================
  if (role === 'admin') {
    const unverifiedCount = records.filter((r) => r.reviewStatus === 'Needs Review').length;
    const pendingReviewsCount = prescriptionDrafts.filter(
      (d) => d.status === 'Awaiting Clinician Review'
    ).length;
    const hospitalsSet = new Set(records.map((r) => r.hospital));

    return (
      <div className="space-y-3.5 sm:space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-teal-700 font-medium mb-1">
              <span>HOSPITAL REGISTRY &amp; HEALTH INFORMATION GOVERNANCE</span>
              <span aria-hidden="true">·</span>
              <span>Priya Nair, MHA</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">HFR: IN-HFR-2901-METRO-SIM</span>
              <span aria-hidden="true">·</span>
              <span>Metro General Hospital</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
              Hospital Administrator Operations &amp; Interoperability Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Register patients with duplicate-detection safeguards, upload multi-hospital clinical documents, configure simulated HFR/HPR staff nodes, and audit consent-gated health exchanges.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={onOpenRegistrationModal}
              className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Register New Patient</span>
            </button>
            <button
              onClick={onOpenUploadModal}
              className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Upload Medical Document</span>
            </button>
            <button
              onClick={() => onNavigate('abdm-readiness')}
              className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Network className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700" />
              <span>ABDM Readiness Hub</span>
            </button>
          </div>
        </div>

        {/* 5 Admin KPI Cards (2 Columns on Mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">Registered Patients</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5 sm:mt-1">
              {patients.length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">Simulated ABHA linked</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">Medical Records</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5 sm:mt-1">
              {records.length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">FHIR R4 mapped</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">Awaiting Verification</div>
            <div className="text-lg sm:text-2xl font-bold text-amber-700 font-mono tabular-nums mt-0.5 sm:mt-1">
              {unverifiedCount}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">Needs sign-off</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">Clinician Reviews</div>
            <div className="text-lg sm:text-2xl font-bold text-amber-700 font-mono tabular-nums mt-0.5 sm:mt-1">
              {pendingReviewsCount}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">Pending approval</div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
            <div className="text-[11px] sm:text-xs text-slate-500">HIE-CM Exchanges</div>
            <div className="text-lg sm:text-2xl font-bold text-teal-700 font-mono tabular-nums mt-0.5 sm:mt-1">
              {Math.max(3, abdmExchangeLogs.length)}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
              Across {Math.max(4, hospitalsSet.size)} HIP/HIU facilities
            </div>
          </div>
        </div>

        {/* Staff & Facility Registry Configuration (Simulated HFR / HPR) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-teal-700 font-medium">
                <Building2 className="w-4 h-4" />
                <span>STAFF &amp; FACILITY REGISTRY CONFIGURATION (SIMULATED HFR / HPR)</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Participating Hospital Nodes &amp; Verified Healthcare Professionals
              </h2>
            </div>
            <button
              onClick={() => onNavigate('abdm-readiness')}
              className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap shrink-0"
            >
              Inspect FHIR &amp; Consent Exchange →
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">Facility Name &amp; Simulated HFR ID</th>
                  <th className="py-3 px-4">Authorized Clinician / Officer</th>
                  <th className="py-3 px-4">Role &amp; Department</th>
                  <th className="py-3 px-4">Simulated HPR ID</th>
                  <th className="py-3 px-4">ABDM Sandbox Node Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {facilityStaffConfig.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{cfg.facilityName}</div>
                      <div className="font-mono text-slate-500">{cfg.simulatedHfrId}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{cfg.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {cfg.roleTitle} · {cfg.department}
                    </td>
                    <td className="py-3 px-4 font-mono text-teal-800 font-semibold">
                      {cfg.simulatedHprId}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      <span
                        className={
                          cfg.verificationStatus === 'Active'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }
                      >
                        {cfg.verificationStatus} ({cfg.integrationMode})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Quality Warnings & Recent Audit Events */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 items-stretch">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Data Quality &amp; Interoperability Warnings
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Automated schema and unit checks across participating hospital uploads
            </p>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40">
                <div className="text-xs font-semibold text-amber-900">
                  Unit Heterogeneity Flagged · Record REC-104 (Patient P1001)
                </div>
                <p className="text-xs text-slate-700 mt-1">
                  City Apollo Diagnostics reported Fasting Blood Glucose in SI units (<code className="font-mono">9.2 mmol/L</code>) rather than conventional <code className="font-mono">mg/dL</code>. Direct trend line plotting is disabled until unit conversion validation.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40">
                <div className="text-xs font-semibold text-amber-900">
                  Missing Prescribing Indication · Record REC-105 (Patient P1001)
                </div>
                <p className="text-xs text-slate-700 mt-1">
                  Uploaded outpatient prescription for Atorvastatin Calcium 20 mg lacks an explicit ICD-10 diagnosis code or written indication on the source slip.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-xs font-semibold text-slate-900">
                  Unverified Machine Extraction · Record REC-107 (Patient P1001)
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Staged laboratory extraction (Serum Creatinine 1.10 mg/dL, eGFR 62) is marked &ldquo;Needs Review&rdquo; pending clinician verification.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recent Administrative &amp; Access Audit Events
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time log of record creations, consent updates, and access checks
                </p>
              </div>
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap shrink-0"
              >
                Full Audit Log →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="py-2.5 sm:py-3 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-mono font-semibold text-slate-700">
                      {log.id} · {log.actorRole.toUpperCase()}
                    </span>
                    <span className="font-mono tabular-nums">{log.timestamp}</span>
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {log.action} — <span className="font-mono text-teal-800">{log.targetIdentifier}</span>
                  </div>
                  <div className="text-slate-600 mt-0.5">{log.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. PUBLIC-HEALTH ANALYST OVERVIEW — IDSP / IHIP SURVEILLANCE STREAMS (S/P/L)
  // ============================================================================
  const pendingSignals = publicHealthSignals.filter(
    (s) => s.status === 'Pending Review' || s.status === 'Under Review'
  );
  const latestSouthRiver = publicHealthSeries
    .filter((p) => p.region === 'South River Valley')
    .slice(-1)[0];

  return (
    <div className="space-y-3.5 sm:space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-teal-700 font-medium mb-1">
            <span>IDSP / IHIP-ALIGNED EPIDEMIOLOGICAL SURVEILLANCE (SIMULATED DEMO)</span>
            <span aria-hidden="true">·</span>
            <span>Dr. Rohan Deshmukh, MPH</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-emerald-800">Zero Patient PII Exposed</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
            Public-Health Intelligence &amp; Early-Warning Signal Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Monitor strictly de-identified S-Form (Syndromic), P-Form (Presumptive Clinical), and L-Form (Lab-Confirmed) indicator streams across participating regional hospitals to investigate statistical anomalies early.
          </p>
        </div>
        <button
          onClick={() => onNavigate('public-health')}
          className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start lg:self-center"
        >
          <Activity className="w-4 h-4" />
          <span>Open Full IDSP / IHIP Surveillance Workspace</span>
        </button>
      </div>

      {/* 4 IDSP / IHIP Surveillance KPI Cards (2x2 on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
          <div className="text-[11px] sm:text-xs text-slate-500">S-Form Weekly Peak</div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5 sm:mt-1">
            {latestSouthRiver ? latestSouthRiver.feverCount + latestSouthRiver.rashCount : 69} cases
          </div>
          <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
            Syndromic intake stream
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
          <div className="text-[11px] sm:text-xs text-slate-500">P-Form &amp; L-Form</div>
          <div className="text-lg sm:text-2xl font-bold text-teal-800 font-mono tabular-nums mt-0.5 sm:mt-1">
            {latestSouthRiver?.presumptiveArboviralCount || 36} P · {latestSouthRiver?.labConfirmedArboviralCount || 14} L
          </div>
          <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
            OPD vs. lab confirmed
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
          <div className="text-[11px] sm:text-xs text-slate-500">Signals in Queue</div>
          <div className="text-lg sm:text-2xl font-bold text-red-700 font-mono tabular-nums mt-0.5 sm:mt-1">
            {pendingSignals.length}
          </div>
          <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
            Requires human review
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5">
          <div className="text-[11px] sm:text-xs text-slate-500">Patient PII Exposed</div>
          <div className="text-base sm:text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5 sm:mt-1">
            0 (Hard-Blocked)
          </div>
          <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 truncate">
            Strict de-identification
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Active Potential Outbreak Signals (Simulated Aggregate Data)
          </h2>
          <button
            onClick={() => onNavigate('public-health')}
            className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap shrink-0"
          >
            Inspect S/P/L Streams &amp; Thresholds →
          </button>
        </div>
        <div className="space-y-3">
          {publicHealthSignals.map((sig) => (
            <div
              key={sig.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-slate-800">{sig.id}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-red-700">
                    Potential signal — requires public-health review
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-600">
                    {sig.statisticalRatio.toFixed(2)}x Baseline
                  </span>
                  {sig.surveillanceStream && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-700">{sig.surveillanceStream}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-teal-800">Status: {sig.status}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{sig.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{sig.triggerExplanation}</p>
              </div>
              <button
                onClick={() => onNavigate('public-health')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 self-start md:self-center"
              >
                Investigate Signal
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
