import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Code2,
  FileCheck2,
  FileJson,
  Lock,
  Network,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  ABDMExchangeLogItem,
  FacilityStaffConfigItem,
  MedicalRecord,
  Patient,
  UserRole,
} from '../types';

interface ABDMReadinessWorkspaceProps {
  role: UserRole;
  patient: Patient | undefined;
  records: MedicalRecord[];
  abdmExchangeLogs: ABDMExchangeLogItem[];
  facilityStaffConfig: FacilityStaffConfigItem[];
  onInspectRecord: (record: MedicalRecord) => void;
  onRefreshState: () => Promise<void>;
}

export const ABDMReadinessWorkspace: React.FC<ABDMReadinessWorkspaceProps> = ({
  role,
  patient,
  records,
  abdmExchangeLogs,
  facilityStaffConfig,
  onInspectRecord,
  onRefreshState,
}) => {
  const [selectedFhirRecordId, setSelectedFhirRecordId] = useState<string>('REC-106');
  const [selectedFhirProfile, setSelectedFhirProfile] = useState<
    'DiagnosticReport' | 'MedicationRequest' | 'Composition' | 'Patient' | 'Consent'
  >('DiagnosticReport');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [simHip, setSimHip] = useState('Metro General Hospital (HIP)');
  const [simHiu, setSimHiu] = useState('St. Jude Cardiac & Specialty Center (HIU)');
  const [simResource, setSimResource] = useState<
    'DiagnosticReport' | 'MedicationRequest' | 'DischargeSummary' | 'OPConsultNote'
  >('DiagnosticReport');

  if (!patient) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center">
        <p className="text-sm text-slate-600">
          Select an authorized patient to inspect Connected Health / ABDM Readiness workflows.
        </p>
      </div>
    );
  }

  const patientRecords = records.filter((r) => r.patientId === patient.id);
  const activeFhirRecord =
    patientRecords.find((r) => r.id === selectedFhirRecordId) || patientRecords[0];

  const handlePermissionAction = async (
    permissionId: string,
    entityName: string,
    newStatus: 'Active' | 'Revoked' | 'Rejected'
  ) => {
    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res = await fetch(`/api/patients/${patient.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionId,
          newStatus,
          actorRole: role,
          actorIdentity:
            role === 'patient'
              ? `${patient.fullName} (${patient.simulatedAbhaAddress || patient.id})`
              : 'Dr. Vikram Mehta, MD (HPR-IN-4402-9811-SIM)',
        }),
      });
      if (res.ok) {
        await onRefreshState();
        setStatusFeedback(
          `Consent artefact for "${entityName}" transitioned to "${newStatus}". HIE-CM exchange status and clinician access permissions updated.`
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerSimulatedExchange = async () => {
    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res = await fetch('/api/abdm/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          hipName: simHip,
          hiuName: simHiu,
          fhirResourceType: simResource,
          recordId: activeFhirRecord?.id || 'REC-106',
          purposeOfUse: 'Continuity of Care & Longitudinal Record Exchange (Simulated ABDM HIE-CM)',
          actorRole: role,
          actorIdentity:
            role === 'doctor'
              ? 'Dr. Vikram Mehta, MD'
              : role === 'admin'
              ? 'Priya Nair, MHA'
              : patient.fullName,
        }),
      });
      if (res.ok) {
        await onRefreshState();
        setStatusFeedback(
          `Simulated HIE-CM ${simResource} exchange between ${simHip} and ${simHiu} recorded in the interoperability log.`
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Build realistic FHIR R4-inspired JSON representation (explicitly labeled Prototype Simulation)
  const buildSimulatedFhirJson = () => {
    if (selectedFhirProfile === 'Patient') {
      return {
        resourceType: 'Patient',
        id: patient.id,
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient (Simulated Prototype)'],
          security: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason', code: 'HTEST' }],
        },
        identifier: [
          {
            system: 'https://healthid.ndhm.gov.in/simulated-prototype',
            type: { text: 'Simulated ABHA Number (Demo Only)' },
            value: patient.simulatedAbhaNumber || '91-4820-7391-6042 (SIM)',
          },
          {
            system: 'https://abdm.gov.in/abha-address/simulated-prototype',
            type: { text: 'Simulated ABHA Address' },
            value: patient.simulatedAbhaAddress || 'ananya.rao.demo@abdm.sim',
          },
        ],
        name: [{ text: patient.fullName }],
        gender: patient.gender.toLowerCase(),
        birthDate: patient.dateOfBirth,
        managingOrganization: {
          reference: 'Organization/IN-HFR-2901-METRO-SIM',
          display: patient.registeringHospital,
        },
      };
    }

    if (selectedFhirProfile === 'Consent') {
      const activePerm = patient.sharingPermissions[0];
      return {
        resourceType: 'Consent',
        id: activePerm?.id || 'CA-IN-2026-8841-SIM',
        status: activePerm?.status === 'Active' ? 'active' : 'inactive',
        scope: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy' }],
        },
        patient: {
          reference: `Patient/${patient.id}`,
          display: `${patient.fullName} (${patient.simulatedAbhaAddress || 'Demo ABHA'})`,
        },
        dateTime: activePerm?.grantedAt || '2026-10-20',
        performer: [{ display: patient.fullName }],
        organization: [
          {
            display: `${patient.registeringHospital} (HIP)`,
          },
          {
            display: `${activePerm?.entityName || 'St. Jude Cardiac & Specialty Center'} (HIU)`,
          },
        ],
        provision: {
          type: activePerm?.status === 'Active' ? 'permit' : 'deny',
          period: {
            start: activePerm?.grantedAt || '2025-11-15',
            end: activePerm?.expiresAt || '2027-06-30',
          },
          class: (activePerm?.categoriesShared || []).map((c) => ({
            system: 'https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-hi-types (Simulated)',
            code: c,
          })),
        },
      };
    }

    if (selectedFhirProfile === 'MedicationRequest') {
      const med = patient.medications[0];
      return {
        resourceType: 'MedicationRequest',
        id: `FHIR-MED-${med?.id || 'MED-01'}-SIM`,
        meta: {
          profile: [
            'https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest (Simulated Prototype)',
          ],
        },
        status: 'active',
        intent: 'order',
        subject: {
          reference: `Patient/${patient.id}`,
          display: patient.fullName,
        },
        medicationCodeableConcept: {
          text: med ? `${med.name} ${med.strength}` : 'Empagliflozin 10 mg',
        },
        authoredOn: med?.startDate || '2026-09-14',
        requester: {
          reference: 'Practitioner/HPR-IN-4402-9811-SIM',
          display: med?.prescribingClinician || 'Dr. Vikram Mehta, MD',
        },
        reasonCode: [
          {
            text:
              med?.documentedReason ||
              'Not explicitly recorded in source prescription slip (Provenance preserved)',
          },
        ],
        dosageInstruction: [
          {
            text: med ? `${med.dose} · ${med.frequency} (${med.route})` : '1 tablet once daily',
          },
        ],
        supportingInformation: [{ reference: `DocumentReference/${med?.sourceRecordId || 'REC-106'}` }],
      };
    }

    if (selectedFhirProfile === 'Composition') {
      return {
        resourceType: 'Composition',
        id: `FHIR-COMP-${activeFhirRecord?.id || 'REC-106'}-SIM`,
        meta: {
          profile: [
            'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord (Simulated Prototype)',
          ],
        },
        status: activeFhirRecord?.reviewStatus === 'Verified' ? 'final' : 'preliminary',
        type: {
          text: activeFhirRecord?.category || 'Discharge Summary',
        },
        subject: {
          reference: `Patient/${patient.id}`,
          display: `${patient.fullName} (${patient.simulatedAbhaNumber || 'Simulated ABHA'})`,
        },
        date: activeFhirRecord?.date || '2026-09-14',
        author: [
          {
            display: `${activeFhirRecord?.clinician} (${activeFhirRecord?.hospital})`,
          },
        ],
        title: activeFhirRecord?.title || 'Clinical Encounter Summary',
        section: [
          {
            title: 'Documented Diagnosis',
            text: {
              status: 'generated',
              div: activeFhirRecord?.documentedDiagnosis || 'See source record',
            },
          },
          {
            title: 'Clinical Summary & Follow-Up Plan',
            text: {
              status: 'generated',
              div: `${activeFhirRecord?.summaryNotes || ''} | Follow-up: ${
                activeFhirRecord?.followUpRecommendation || 'Per clinician guidance'
              }`,
            },
          },
        ],
      };
    }

    // Default: DiagnosticReport
    return {
      resourceType: 'DiagnosticReport',
      id: `FHIR-DR-${activeFhirRecord?.id || 'REC-106'}-SIM`,
      meta: {
        profile: [
          'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportLab (Simulated Prototype)',
        ],
      },
      status: activeFhirRecord?.reviewStatus === 'Verified' ? 'final' : 'preliminary',
      code: {
        text: activeFhirRecord?.title || 'Multi-Hospital Diagnostic Panel',
      },
      subject: {
        reference: `Patient/${patient.id}`,
        display: `${patient.fullName} (${patient.simulatedAbhaNumber || 'Simulated ABHA'})`,
      },
      effectiveDateTime: activeFhirRecord?.date || '2026-09-14',
      performer: [
        {
          display: activeFhirRecord?.hospital || 'St. Jude Cardiac & Specialty Center',
        },
      ],
      result: (activeFhirRecord?.labResults || []).map((lab, idx) => ({
        reference: `Observation/OBS-${idx + 1}`,
        display: `${lab.testName}: ${lab.value} ${lab.unit} (Ref: ${lab.referenceRange}, Method: ${
          lab.assayMethod || 'Standard'
        })`,
      })),
      conclusion: activeFhirRecord?.summaryNotes,
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-teal-700 font-medium mb-1">
            <Network className="w-4 h-4" />
            <span>CONNECTED HEALTH & DIGITAL INTEROPERABILITY ARCHITECTURE</span>
            <span aria-hidden="true">·</span>
            <span>ABDM-INSPIRED WORKFLOWS (PROTOTYPE SIMULATION)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            ABDM Readiness, Consent Artefacts & FHIR R4 Health Record Exchange
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Demonstrates how OneHealth AI aligns with India&apos;s Ayushman Bharat Digital Mission (ABDM) building blocks: patient-linked Health IDs (ABHA), Health Facility &amp; Professional Registries (HFR/HPR), consent-gated HIP/HIU data exchange, and NRCeS FHIR R4 clinical resource mapping.
          </p>
        </div>

        <div className="px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900 shrink-0 self-start lg:self-center">
          Prototype Simulation — No Live NHA / ABDM Gateway Connection
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

      {/* 3 Core ABDM Building Block Cards: Simulated ABHA, HFR, HPR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Card 1: Simulated ABHA Health ID */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-teal-800 uppercase">
                1. Simulated Patient Health ID (ABHA)
              </span>
              <span className="font-mono text-[11px] text-slate-500">Prototype Demo ID</span>
            </div>
            <div className="text-lg font-bold text-slate-900">{patient.fullName}</div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500">ABHA Number (Sim):</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {patient.simulatedAbhaNumber || '91-4820-7391-6042'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500">ABHA Address (PHR):</span>
                <span className="font-mono font-semibold text-teal-800">
                  {patient.simulatedAbhaAddress || 'ananya.rao.demo@abdm.sim'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Links longitudinal care episodes across {patientRecords.length} multi-hospital records under patient-controlled consent.
          </div>
        </div>

        {/* Card 2: Simulated Health Facility Registry (HFR) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-teal-800 uppercase">
                2. Health Facility Registry (HFR — Sim)
              </span>
              <Building2 className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-base font-bold text-slate-900">
              Participating HIP &amp; HIU Network
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Metro General Hospital</span>
                <span className="font-mono text-slate-600">IN-HFR-2901-METRO-SIM</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">St. Jude Cardiac Center</span>
                <span className="font-mono text-slate-600">IN-HFR-2904-STJUDE-SIM</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-medium">City Apollo Diagnostics</span>
                <span className="font-mono text-slate-600">IN-HFR-2908-APOLLO-SIM</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Facilities act as Health Information Providers (HIP) when uploading records and Health Information Users (HIU) when requesting longitudinal history.
          </div>
        </div>

        {/* Card 3: Simulated Healthcare Professionals Registry (HPR) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-teal-800 uppercase">
                3. Healthcare Professionals Registry (HPR — Sim)
              </span>
              <UserCheck className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-base font-bold text-slate-900">
              Verified Clinician &amp; Officer IDs
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {(facilityStaffConfig.length > 0
                ? facilityStaffConfig.slice(0, 3)
                : [
                    {
                      id: 'STF-1',
                      name: 'Dr. Vikram Mehta, MD',
                      simulatedHprId: 'HPR-IN-4402-9811-SIM',
                      verificationStatus: 'Active',
                    },
                  ]
              ).map((stf) => (
                <div
                  key={stf.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                >
                  <span className="text-slate-800 font-medium truncate">{stf.name}</span>
                  <span className="font-mono text-teal-800 shrink-0">{stf.simulatedHprId}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Clinician prescription sign-off and record verification are bound to simulated HPR practitioner identifiers.
          </div>
        </div>
      </div>

      {/* Interactive Consent Artefact Manager + HIE-CM Exchange Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Consent Artefact Queue (Approve / Reject / Revoke) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Patient-Controlled Consent Artefacts (DEPA / ABDM Consent Flow)
              </h2>
              <p className="text-xs text-slate-500">
                Approve pending HIU consent requests, or revoke active artefacts to immediately block downstream record exchange
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-600">
              {patient.sharingPermissions.length} Artefacts
            </span>
          </div>

          <div className="space-y-3">
            {patient.sharingPermissions.map((perm) => (
              <div
                key={perm.id}
                className={`p-4 rounded-xl border transition-all ${
                  perm.status === 'Pending Approval'
                    ? 'border-amber-300 bg-amber-50/40'
                    : perm.status === 'Active'
                    ? 'border-slate-200 bg-slate-50/40'
                    : 'border-red-200 bg-red-50/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600">
                    <span className="font-bold text-slate-900">
                      {perm.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{perm.entityType}</span>
                    <span aria-hidden="true">·</span>
                    <span>Expires: {perm.expiresAt}</span>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      perm.status === 'Active'
                        ? 'text-emerald-700'
                        : perm.status === 'Pending Approval'
                        ? 'text-amber-800'
                        : 'text-red-700'
                    }`}
                  >
                    {perm.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-1">{perm.entityName}</h3>
                <div className="text-xs text-slate-600 mt-1">
                  <span>
                    <strong>HIP:</strong> {patient.registeringHospital}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    <strong>HIU / Recipient:</strong> {perm.entityName} ({perm.facilityHfrId || perm.clinicianHprId || 'Simulated ID'})
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  <strong>HI Types Requested:</strong> {perm.categoriesShared.join(', ')} ·{' '}
                  <strong>Purpose:</strong> {perm.purpose}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-end gap-2">
                  {perm.status === 'Pending Approval' ? (
                    <>
                      <button
                        disabled={isProcessing}
                        onClick={() =>
                          handlePermissionAction(perm.id, perm.entityName, 'Active')
                        }
                        className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Approve Consent Request
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() =>
                          handlePermissionAction(perm.id, perm.entityName, 'Rejected')
                        }
                        className="px-3.5 py-1.5 bg-white border border-red-300 hover:bg-red-50 text-red-800 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Reject Request
                      </button>
                    </>
                  ) : perm.status === 'Active' ? (
                    <button
                      disabled={isProcessing}
                      onClick={() =>
                        handlePermissionAction(perm.id, perm.entityName, 'Revoked')
                      }
                      className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Revoke Consent Artefact
                    </button>
                  ) : (
                    <button
                      disabled={isProcessing}
                      onClick={() =>
                        handlePermissionAction(perm.id, perm.entityName, 'Active')
                      }
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Re-Authorize Consent Artefact
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: HIE-CM Record Discovery & Pull Simulator */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Simulate HIE-CM Record Discovery &amp; Pull
            </h2>
            <p className="text-xs text-slate-500">
              Test how a Health Information User (HIU) requests a FHIR R4 clinical document from a Health Information Provider (HIP) through the Consent Manager.
            </p>

            <div className="space-y-3 text-xs pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Source Health Information Provider (HIP)
                </label>
                <select
                  value={simHip}
                  onChange={(e) => setSimHip(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Metro General Hospital (HIP)">
                    Metro General Hospital (IN-HFR-2901-METRO-SIM)
                  </option>
                  <option value="City Apollo Diagnostics & Clinic (HIP)">
                    City Apollo Diagnostics &amp; Clinic (IN-HFR-2908-APOLLO-SIM)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Requesting Health Information User (HIU)
                </label>
                <select
                  value={simHiu}
                  onChange={(e) => setSimHiu(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="St. Jude Cardiac & Specialty Center (HIU)">
                    St. Jude Cardiac &amp; Specialty Center (IN-HFR-2904-STJUDE-SIM)
                  </option>
                  <option value="Seva Community Medical Institute (HIU)">
                    Seva Community Medical Institute (IN-HFR-2912-SEVA-SIM)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NRCeS FHIR R4 Health Information Type
                </label>
                <select
                  value={simResource}
                  onChange={(e) => setSimResource(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                >
                  <option value="DiagnosticReport">DiagnosticReport (Lab / Imaging)</option>
                  <option value="MedicationRequest">MedicationRequest (Prescription)</option>
                  <option value="DischargeSummary">Composition (DischargeSummaryRecord)</option>
                  <option value="OPConsultNote">Composition (OPConsultRecord)</option>
                </select>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleTriggerSimulatedExchange}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Simulate Consent-Verified Record Exchange</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-900">
              Interoperability &amp; Provenance Safeguard
            </div>
            <p className="leading-relaxed">
              When records are exchanged across hospitals, OneHealth AI preserves original laboratory units (e.g. <code className="font-mono">mmol/L</code> vs <code className="font-mono">mg/dL</code> in <code className="font-mono">REC-104</code>) and explicitly flags unverified machine extractions (<code className="font-mono">REC-107</code>).
            </p>
          </div>
        </div>
      </div>

      {/* HIE-CM Health Information Exchange Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Simulated HIE-CM Record Discovery &amp; Exchange Log ({abdmExchangeLogs.length})
            </h2>
            <p className="text-xs text-slate-500">
              End-to-end traceability of cross-hospital FHIR R4 record exchanges governed by patient consent artefacts
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Exchange ID &amp; Time</th>
                <th className="py-3 px-4">Consent Artefact</th>
                <th className="py-3 px-4">Provider (HIP) → User (HIU)</th>
                <th className="py-3 px-4">FHIR Resource &amp; Record</th>
                <th className="py-3 px-4">Exchange Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {abdmExchangeLogs.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                    <div className="font-bold text-slate-900">{ex.id}</div>
                    <div className="text-slate-500">{ex.timestamp}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-800">
                    <div>{ex.consentArtefactId}</div>
                    <div className="text-slate-500 font-sans">{ex.notes}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{ex.providerHip}</div>
                    <div className="text-slate-500">→ {ex.requesterHipOrHiu}</div>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="font-semibold text-teal-800">
                      {ex.hiTypes.join(', ')}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span className="text-slate-600">
                      {ex.fhirBundleCount} FHIR Bundle(s)
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    <span
                      className={
                        ex.exchangeStatus === 'Verified Exchange (Simulated)'
                          ? 'text-emerald-700'
                          : ex.exchangeStatus === 'Pending Patient Consent'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }
                    >
                      {ex.exchangeStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive FHIR R4 Resource Bundle Inspector */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-teal-700 font-medium">
              <FileJson className="w-4 h-4" />
              <span>FHIR R4 CLINICAL INFORMATION MODEL INSPECTOR (PROTOTYPE SIMULATION)</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Structured Health Record Mapping to NRCeS / HL7 FHIR R4 Profiles
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedFhirRecordId}
              onChange={(e) => setSelectedFhirRecordId(e.target.value)}
              aria-label="Select source clinical record for FHIR mapping"
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-800"
            >
              {patientRecords.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.category} ({r.date})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  'DiagnosticReport',
                  'MedicationRequest',
                  'Composition',
                  'Patient',
                  'Consent',
                ] as const
              ).map((prof) => (
                <button
                  key={prof}
                  onClick={() => setSelectedFhirProfile(prof)}
                  className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-colors ${
                    selectedFhirProfile === prof
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {prof}
                </button>
              ))}
            </div>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
          {JSON.stringify(buildSimulatedFhirJson(), null, 2)}
        </pre>
      </div>
    </div>
  );
};
