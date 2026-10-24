import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FilePlus2,
  FileText,
  Lock,
  Pill,
  Search,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  AuditLogEntry,
  MedicalRecord,
  NavigationSection,
  Patient,
  UserRole,
} from '../types';

interface PatientDirectoryAndProfileProps {
  role: UserRole;
  patients: Patient[];
  selectedPatient: Patient | undefined;
  records: MedicalRecord[];
  auditLogs: AuditLogEntry[];
  isRegistrationModalOpen: boolean;
  onCloseRegistrationModal: () => void;
  onOpenRegistrationModal: () => void;
  onSelectPatient: (patientId: string, targetSection?: NavigationSection) => void;
  onNavigate: (section: NavigationSection) => void;
  onOpenUploadModal: () => void;
  onInspectRecord: (record: MedicalRecord) => void;
  onRefreshState: () => Promise<void>;
}

type ProfileTab =
  | 'summary'
  | 'timeline'
  | 'records'
  | 'diagnoses'
  | 'medications'
  | 'allergies'
  | 'visits'
  | 'permissions'
  | 'activity';

export const PatientDirectoryAndProfile: React.FC<PatientDirectoryAndProfileProps> = ({
  role,
  patients,
  selectedPatient,
  records,
  auditLogs,
  isRegistrationModalOpen,
  onCloseRegistrationModal,
  onOpenRegistrationModal,
  onSelectPatient,
  onNavigate,
  onOpenUploadModal,
  onInspectRecord,
  onRefreshState,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('summary');
  const [regSuccessBanner, setRegSuccessBanner] = useState<string | null>(null);

  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1984-06-15');
  const [gender, setGender] = useState<Patient['gender']>('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [preferredLanguage, setPreferredLanguage] = useState('English / Hindi');
  const [emergencyContactName, setEmergencyContactName] = useState('Ramesh Verma (Synthetic)');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Spouse');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('DEMO-555-0188');
  const [registeringHospital, setRegisteringHospital] = useState('Metro General Hospital');
  const [assignedClinician, setAssignedClinician] = useState('Dr. Vikram Mehta, MD');
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [consentGranted, setConsentGranted] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<Patient[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePatient = selectedPatient || patients[0];
  const nextGeneratedId = `P${1001 + patients.length}`;

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.id.toLowerCase().includes(q) ||
      p.fullName.toLowerCase().includes(q) ||
      p.registeringHospital.toLowerCase().includes(q) ||
      p.conditions.some((c) => c.name.toLowerCase().includes(q))
    );
  });

  const handleRegisterSubmit = async (forceDespiteDuplicate = false) => {
    setFormError(null);
    if (!fullName.trim()) {
      setFormError('Patient full name is required.');
      return;
    }
    if (!dateOfBirth) {
      setFormError('Date of birth is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          dateOfBirth,
          gender,
          bloodGroup,
          preferredLanguage,
          emergencyContactName,
          emergencyContactRelation,
          emergencyContactPhone,
          registeringHospital,
          assignedClinician,
          allergiesText: allergiesText.trim(),
          conditionsText: conditionsText.trim(),
          medicationsText: medicationsText.trim(),
          consentGranted,
          forceCreateDespiteDuplicate: forceDespiteDuplicate,
          actorRole: role,
          actorIdentity:
            role === 'admin' ? 'Priya Nair, MHA' : 'Dr. Vikram Mehta, MD',
        }),
      });

      const data = await response.json();
      if (response.status === 409 && data.duplicateWarning) {
        setDuplicateCandidates(data.existingPatients || []);
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        setFormError(data.error || 'Failed to register patient.');
        setIsSubmitting(false);
        return;
      }

      await onRefreshState();
      const createdPt: Patient = data.patient;
      setDuplicateCandidates(null);
      setFullName('');
      setAllergiesText('');
      setConditionsText('');
      setMedicationsText('');
      onCloseRegistrationModal();
      onSelectPatient(createdPt.id);
      setActiveProfileTab('summary');
      setRegSuccessBanner(
        `Registered synthetic patient ${createdPt.fullName} (${createdPt.id}) at ${createdPt.registeringHospital} and opened their profile.`
      );
    } catch (err) {
      setFormError('Network error while registering patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activePatient) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center">
        <p className="text-sm text-slate-600">No patients available in the demo registry.</p>
      </div>
    );
  }

  const patientRecords = records
    .filter((r) => r.patientId === activePatient.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const patientAuditLogs = auditLogs.filter(
    (log) =>
      log.targetIdentifier.includes(activePatient.id) ||
      log.actorIdentity.includes(activePatient.fullName)
  );

  // Check if Doctor access is restricted by patient consent
  const doctorHasConsent =
    role !== 'doctor' ||
    activePatient.sharingPermissions.some((p) => p.status === 'Active');

  return (
    <div className="space-y-6">
      {/* Registration Confirmation Toast/Banner */}
      {regSuccessBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{regSuccessBanner}</span>
          </div>
          <button
            onClick={() => setRegSuccessBanner(null)}
            className="text-xs font-semibold text-emerald-800 hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Directory & Search Bar (Shown to Doctor & Admin) */}
      {(role === 'doctor' || role === 'admin') && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Connected Hospital Patient Directory ({patients.length} Synthetic Records)
              </h2>
              <p className="text-xs text-slate-500">
                Search by fictional Patient ID (e.g., P1001–P1006), full name, hospital, or documented condition
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID (P1001) or Name..."
                  aria-label="Search patients by ID or name"
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700 w-56"
                />
              </div>
              <button
                onClick={onOpenRegistrationModal}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register New Patient</span>
              </button>
            </div>
          </div>

          {/* Horizontal Patient Selector Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPatients.map((pt) => {
              const isSelected = pt.id === activePatient.id;
              const hasActiveConsent = pt.sharingPermissions.some(
                (p) => p.status === 'Active'
              );
              return (
                <button
                  key={pt.id}
                  onClick={() => onSelectPatient(pt.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/40'
                      : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-mono font-bold text-teal-800">{pt.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-900 truncate">
                        {pt.fullName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                      {pt.age}y · {pt.gender} · DOB {pt.dateOfBirth}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 truncate">
                      {pt.registeringHospital}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      hasActiveConsent ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {hasActiveConsent ? 'Shared' : 'Revoked'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Patient Profile Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-mono font-bold text-teal-800">
                PATIENT ID: {activePatient.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>SYNTHETIC DEMO IDENTITY</span>
              <span aria-hidden="true">·</span>
              <span>Registered at {activePatient.registeringHospital}</span>
              <span aria-hidden="true">·</span>
              <span>Assigned: {activePatient.assignedClinician}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activePatient.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
              <span>DOB: {activePatient.dateOfBirth} ({activePatient.age} yrs)</span>
              <span aria-hidden="true">·</span>
              <span>Sex/Gender: {activePatient.gender}</span>
              <span aria-hidden="true">·</span>
              <span>Blood Group: {activePatient.bloodGroup || 'O+'}</span>
              <span aria-hidden="true">·</span>
              <span>Language: {activePatient.preferredLanguage}</span>
              <span aria-hidden="true">·</span>
              <span>Emergency: {activePatient.emergencyContact.name} ({activePatient.emergencyContact.phone})</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {(role === 'doctor' || role === 'admin') && (
              <button
                onClick={onOpenUploadModal}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Add Consultation / Upload Report</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('timeline')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Full Longitudinal Timeline</span>
            </button>
          </div>
        </div>

        {/* Severe Allergy Alert Strip if present */}
        {activePatient.allergies.length > 0 && doctorHasConsent && (
          <div className="mt-4 p-3.5 rounded-lg bg-red-50/70 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5 text-xs text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Documented Allergies: </span>
                {activePatient.allergies.map((a, idx) => (
                  <span key={a.id}>
                    {idx > 0 && ' · '}
                    <strong>{a.substance}</strong> ({a.severity}: {a.reaction} — Source: {a.sourceRecordId})
                  </span>
                ))}
              </div>
            </div>
            <span className="text-xs font-mono text-red-700 shrink-0">
              {activePatient.allergies[0].verifiedStatus}
            </span>
          </div>
        )}

        {/* If Doctor access is revoked by Patient Consent (Scenario G), enforce restriction! */}
        {!doctorHasConsent ? (
          <div className="mt-6 p-8 rounded-xl bg-red-50/50 border border-red-200 text-center space-y-3">
            <Lock className="w-8 h-8 text-red-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Clinical Record Access Restricted by Patient Consent Settings
            </h3>
            <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
              Patient <strong>{activePatient.fullName} ({activePatient.id})</strong> has revoked active sharing permissions for your role/facility. OneHealth AI enforces patient consent changes immediately across all clinical views and AI copilot queries.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => onNavigate('privacy')}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Inspect Sharing & Privacy State
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 9 Profile Tabs */}
            <div className="mt-5 flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {(
                [
                  { id: 'summary', label: '1. Summary' },
                  { id: 'timeline', label: `2. Timeline (${patientRecords.length})` },
                  { id: 'records', label: `3. Medical Records (${patientRecords.length})` },
                  { id: 'diagnoses', label: `4. Diagnoses (${activePatient.conditions.length})` },
                  { id: 'medications', label: `5. Medications (${activePatient.medications.length})` },
                  { id: 'allergies', label: `6. Allergies (${activePatient.allergies.length})` },
                  { id: 'visits', label: '7. Visits & Consultations' },
                  { id: 'permissions', label: `8. Sharing Permissions (${activePatient.sharingPermissions.length})` },
                  { id: 'activity', label: `9. Activity History (${patientAuditLogs.length})` },
                ] as { id: ProfileTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveProfileTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeProfileTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Summary */}
            {activeProfileTab === 'summary' && (
              <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    Documented Conditions ({activePatient.conditions.length})
                  </h3>
                  <div className="space-y-2.5">
                    {activePatient.conditions.map((c) => (
                      <div key={c.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-slate-500 mt-0.5">
                          <span>Status: {c.status}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono">{c.diagnosedDate}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono text-teal-800">{c.sourceRecordId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    Active Clinician-Verified Medications ({activePatient.medications.length})
                  </h3>
                  <div className="space-y-2.5">
                    {activePatient.medications.map((m) => (
                      <div key={m.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                        <div className="font-semibold text-slate-900">
                          {m.name} <span className="font-mono text-teal-800">{m.strength}</span>
                        </div>
                        <div className="text-slate-600">
                          {m.dose} · {m.frequency}
                        </div>
                        <div className="text-slate-500 font-mono">
                          Source: {m.sourceRecordId} ({m.hospital})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    Latest Connected Records & Follow-Ups
                  </h3>
                  <div className="space-y-2.5">
                    {patientRecords.slice(0, 3).map((r) => (
                      <div key={r.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-teal-800">{r.id}</span>
                          <span className="font-mono text-slate-500">{r.date}</span>
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">{r.title}</div>
                        <button
                          onClick={() => onInspectRecord(r)}
                          className="text-teal-700 font-semibold hover:underline mt-1"
                        >
                          Open Original Report →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Timeline Preview */}
            {activeProfileTab === 'timeline' && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Chronological events for {activePatient.fullName}. Click any record to inspect full clinical details.
                  </p>
                  <button
                    onClick={() => onNavigate('timeline')}
                    className="px-3 py-1.5 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                  >
                    Open Full Interactive Timeline & Lab Comparator →
                  </button>
                </div>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {patientRecords.map((r) => (
                    <div key={r.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono font-bold text-slate-800">{r.date}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono text-teal-800">{r.id}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{r.category}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{r.hospital}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">{r.title}</div>
                        <p className="text-xs text-slate-600 mt-1">{r.summaryNotes}</p>
                      </div>
                      <button
                        onClick={() => onInspectRecord(r)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 self-start sm:self-center"
                      >
                        View Source Record
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Medical Records */}
            {activeProfileTab === 'records' && (
              <div className="mt-5 space-y-3">
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Record ID</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Title</th>
                        <th className="py-2.5 px-4">Hospital & Clinician</th>
                        <th className="py-2.5 px-4">Review Status</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {patientRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-semibold text-teal-800">
                            {rec.id}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                            {rec.date}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{rec.category}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {rec.title}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {rec.hospital} · {rec.clinician}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${
                                rec.reviewStatus === 'Verified'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {rec.reviewStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => onInspectRecord(rec)}
                              className="font-semibold text-teal-700 hover:underline"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Diagnoses */}
            {activeProfileTab === 'diagnoses' && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePatient.conditions.map((cond) => (
                  <div key={cond.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono font-semibold text-teal-800">
                        Source: {cond.sourceRecordId}
                      </span>
                      <span className="font-mono tabular-nums">Diagnosed: {cond.diagnosedDate}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{cond.name}</h4>
                    <div className="text-xs text-slate-600 mt-1">
                      <span>Status: <strong>{cond.status}</strong></span>
                      <span aria-hidden="true"> · </span>
                      <span>Documented at {cond.documentingHospital}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 5: Medications */}
            {activeProfileTab === 'medications' && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePatient.medications.map((med) => (
                  <div key={med.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono font-semibold text-teal-800">
                        Source: {med.sourceRecordId}
                      </span>
                      <span className="font-mono tabular-nums">Started: {med.startDate}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {med.name} ({med.strength})
                    </h4>
                    <div className="text-xs text-slate-700 mt-1">
                      {med.dose} · {med.route} · {med.frequency}
                    </div>
                    <div className="text-xs text-slate-600 mt-1.5">
                      <strong>Documented Prescribing Reason:</strong>{' '}
                      {med.documentedReason || 'Not explicitly recorded in source prescription'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Prescriber: {med.prescribingClinician} ({med.hospital})
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 6: Allergies */}
            {activeProfileTab === 'allergies' && (
              <div className="mt-5 space-y-3">
                {activePatient.allergies.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    No documented drug or environmental allergies on file for this patient.
                  </p>
                ) : (
                  activePatient.allergies.map((alg) => (
                    <div key={alg.id} className="p-4 rounded-xl border border-red-200 bg-red-50/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-red-800">{alg.severity}</span>
                        <span className="font-mono text-slate-600">
                          {alg.verifiedStatus} · Source: {alg.sourceRecordId}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{alg.substance}</h4>
                      <p className="text-xs text-slate-700 mt-1">Reaction: {alg.reaction}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 7: Visits & Consultations */}
            {activeProfileTab === 'visits' && (
              <div className="mt-5 space-y-3">
                {patientRecords
                  .filter(
                    (r) =>
                      r.category === 'Consultation Note' ||
                      r.category === 'Discharge Summary'
                  )
                  .map((visit) => (
                    <div key={visit.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                      <div className="text-xs text-slate-500">
                        <span className="font-mono font-bold text-slate-800">{visit.date}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{visit.hospital}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{visit.clinician} ({visit.specialty})</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{visit.title}</h4>
                      <p className="text-xs text-slate-700 mt-1">{visit.summaryNotes}</p>
                      {visit.followUpRecommendation && (
                        <p className="text-xs text-teal-800 font-medium mt-1.5">
                          Follow-Up Plan: {visit.followUpRecommendation}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Tab 8: Sharing Permissions */}
            {activeProfileTab === 'permissions' && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Current data-sharing authorizations for {activePatient.fullName}.
                  </p>
                  <button
                    onClick={() => onNavigate('privacy')}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                  >
                    Manage Consent in Sharing & Privacy →
                  </button>
                </div>
                {activePatient.sharingPermissions.map((perm) => (
                  <div key={perm.id} className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500 font-mono">
                        {perm.id} · {perm.entityType} · Expires {perm.expiresAt}
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{perm.entityName}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Categories: {perm.categoriesShared.join(', ')}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        perm.status === 'Active' ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {perm.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 9: Activity History */}
            {activeProfileTab === 'activity' && (
              <div className="mt-5 divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {patientAuditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-white text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-mono font-semibold text-slate-800">
                        {log.id} · {log.actorIdentity} ({log.actorRole.toUpperCase()})
                      </span>
                      <span className="font-mono tabular-nums">{log.timestamp}</span>
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {log.action} — <span className="text-teal-800">{log.outcome}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{log.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Patient Registration Modal (Scenario H) */}
      {isRegistrationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-semibold text-teal-700">
                  AUTO-GENERATED PATIENT ID: {nextGeneratedId}
                </span>
                <h2 id="reg-modal-title" className="text-lg font-bold text-slate-900">
                  Register New Synthetic Patient (Hospital Intake)
                </h2>
              </div>
              <button
                onClick={onCloseRegistrationModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                aria-label="Close registration modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                {formError}
              </div>
            )}

            {/* Duplicate Record Warning Safeguard */}
            {duplicateCandidates && duplicateCandidates.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Potential Duplicate Patient Record Detected</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  A patient with a matching name or date of birth already exists in the connected health registry ({duplicateCandidates.map((d) => `${d.fullName} [${d.id}, DOB ${d.dateOfBirth}]`).join(', ')}). To prevent dangerous record collisions, OneHealth AI never silently merges potentially different individuals.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const existing = duplicateCandidates[0];
                      setDuplicateCandidates(null);
                      onCloseRegistrationModal();
                      onSelectPatient(existing.id);
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                  >
                    Open Existing Patient ({duplicateCandidates[0].id})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegisterSubmit(true)}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg"
                  >
                    Confirm Distinct Person & Create {nextGeneratedId}
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRegisterSubmit(false);
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Full Name (Synthetic Demo) *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Siddharth Verma (or Ananya Rao to test duplicate check)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Sex / Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Patient['gender'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to specify">Prefer not to specify</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Preferred Language
                  </label>
                  <input
                    type="text"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Registering Participating Hospital *
                  </label>
                  <select
                    value={registeringHospital}
                    onChange={(e) => setRegisteringHospital(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="Metro General Hospital">Metro General Hospital</option>
                    <option value="St. Jude Cardiac & Specialty Center">St. Jude Cardiac & Specialty Center</option>
                    <option value="Seva Community Medical Institute">Seva Community Medical Institute</option>
                    <option value="City Apollo Diagnostics & Clinic">City Apollo Diagnostics & Clinic</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Assigned Clinician
                  </label>
                  <input
                    type="text"
                    value={assignedClinician}
                    onChange={(e) => setAssignedClinician(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Known Allergies (Optional)
                  </label>
                  <input
                    type="text"
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    placeholder="e.g., Cephalosporins (Mild rash)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Existing Conditions (Optional)
                  </label>
                  <input
                    type="text"
                    value={conditionsText}
                    onChange={(e) => setConditionsText(e.target.value)}
                    placeholder="e.g., Essential Hypertension"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Current Medications (Optional)
                  </label>
                  <input
                    type="text"
                    value={medicationsText}
                    onChange={(e) => setMedicationsText(e.target.value)}
                    placeholder="e.g., Amlodipine 5 mg OD"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <input
                  id="consent-checkbox"
                  type="checkbox"
                  checked={consentGranted}
                  onChange={(e) => setConsentGranted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <label htmlFor="consent-checkbox" className="text-slate-700 leading-relaxed">
                  <strong>Simulated Connected-Record Consent:</strong> Patient authorizes sharing of longitudinal clinical records with their assigned clinician and registering hospital (can be revoked at any time in Sharing & Privacy).
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseRegistrationModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : `Create Patient Profile (${nextGeneratedId})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
