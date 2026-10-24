import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Edit3,
  FileText,
  Lock,
  Pill,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../apiFallback';
import {
  MedicalRecord,
  Patient,
  PrescriptionDraft,
  PrescriptionDraftStatus,
  UserRole,
} from '../types';

interface PrescriptionAndSafetyWorkspaceProps {
  role: UserRole;
  patient: Patient | undefined;
  records: MedicalRecord[];
  prescriptionDrafts: PrescriptionDraft[];
  onInspectRecord: (record: MedicalRecord) => void;
  onRefreshState: () => Promise<void>;
}

export const PrescriptionAndSafetyWorkspace: React.FC<
  PrescriptionAndSafetyWorkspaceProps
> = ({
  role,
  patient,
  records,
  prescriptionDrafts,
  onInspectRecord,
  onRefreshState,
}) => {
  const [selectedDraftId, setSelectedDraftId] = useState<string>(
    prescriptionDrafts[0]?.id || 'RX-2001'
  );
  const [clinicalRequestPrompt, setClinicalRequestPrompt] = useState(
    'Prepare a 90-day continuation draft for Telmisartan 40 mg OD based on controlled blood pressure and microalbuminuria history in REC-102 and REC-106.'
  );
  const [isGeneratingAIDraft, setIsGeneratingAIDraft] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clinician Review & Editing State
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editMedName, setEditMedName] = useState('');
  const [editStrength, setEditStrength] = useState('');
  const [editDose, setEditDose] = useState('');
  const [editRoute, setEditRoute] = useState<PrescriptionDraft['route']>('Oral');
  const [editFrequency, setEditFrequency] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editRationale, setEditRationale] = useState('');
  const [clinicianReviewNotes, setClinicianReviewNotes] = useState('');
  const [attestationChecked, setAttestationChecked] = useState(true);
  const [isUpdatingDraft, setIsUpdatingDraft] = useState(false);

  if (!patient) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center">
        <p className="text-sm text-slate-600">Select a patient to review prescriptions.</p>
      </div>
    );
  }

  const patientRecords = records.filter((r) => r.patientId === patient.id);
  const patientDrafts = prescriptionDrafts.filter((d) => d.patientId === patient.id);
  const activeDraft =
    patientDrafts.find((d) => d.id === selectedDraftId) ||
    patientDrafts[0] ||
    prescriptionDrafts[0];

  const openRecordById = (recId: string) => {
    const found = records.find((r) => r.id === recId);
    if (found) onInspectRecord(found);
  };

  // Detect potential duplicate therapy classes from active medications + drafts
  const statinMeds = patient.medications.filter((m) =>
    m.name.toLowerCase().includes('statin')
  );
  const missingIndicationMeds = patient.medications.filter(
    (m) =>
      !m.documentedReason ||
      m.documentedReason.toLowerCase().includes('not explicitly recorded')
  );

  const startEditing = (draft: PrescriptionDraft) => {
    setEditMedName(draft.medicationName);
    setEditStrength(draft.strength);
    setEditDose(draft.dose);
    setEditRoute(draft.route);
    setEditFrequency(draft.frequency);
    setEditDuration(draft.duration);
    setEditInstructions(draft.instructions);
    setEditRationale(draft.supportingRationale);
    setIsEditingDraft(true);
  };

  const handleGenerateProposalFromAI = async () => {
    setIsGeneratingAIDraft(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const aiRes = await apiFetch('/api/ai/prescription-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          clinicalRequest: clinicalRequestPrompt,
        }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok || !aiData.proposal) {
        setErrorMsg(aiData.error || 'Could not generate prescription proposal.');
        return;
      }

      const p = aiData.proposal;
      const createRes = await apiFetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          medicationName: p.medicationName,
          strength: p.strength,
          dose: p.dose,
          route: p.route || 'Oral',
          frequency: p.frequency,
          duration: p.duration,
          instructions: p.instructions,
          supportingRationale: p.supportingRationale,
          allergyCheckSummary: p.allergyCheckSummary,
          interactionCheckSummary: p.interactionCheckSummary,
          sourceRecordIds: p.sourceRecordIds || patientRecords.slice(-2).map((r) => r.id),
          createdBy: `OneHealth Clinical Copilot (${
            aiData.aiMode === 'live-gemini' ? 'Live Gemini 3.8 Flash' : 'Demo AI Proposal'
          })`,
          status: 'Awaiting Clinician Review',
        }),
      });

      const createdData = await createRes.json();
      if (createRes.ok && createdData.draft) {
        await onRefreshState();
        setSelectedDraftId(createdData.draft.id);
        setAttestationChecked(true);
        setFeedbackMsg(
          `AI prepared non-active prescription draft ${createdData.draft.id} ("${createdData.draft.medicationName}") with status "Awaiting Clinician Review". Only an authorized clinician can approve it.`
        );
      }
    } catch (err) {
      setErrorMsg('Network error while staging AI prescription proposal.');
    } finally {
      setIsGeneratingAIDraft(false);
    }
  };

  const handleCreateBlankClinicianDraft = async () => {
    setErrorMsg(null);
    const res = await apiFetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        medicationName: 'Cholecalciferol (Vitamin D3) — Synthetic Demo Draft',
        strength: '60,000 IU',
        dose: '1 sachet / capsule',
        route: 'Oral',
        frequency: 'Once weekly with milk/meal',
        duration: '8 weeks',
        instructions: 'Take orally once weekly after a meal.',
        supportingRationale:
          'Clinician-initiated draft for nutritional vitamin D supplementation in setting of chronic kidney disease monitoring.',
        sourceRecordIds: patientRecords.slice(-1).map((r) => r.id),
        createdBy: 'Dr. Vikram Mehta, MD',
        status: 'Draft',
      }),
    });
    const data = await res.json();
    if (res.ok && data.draft) {
      await onRefreshState();
      setSelectedDraftId(data.draft.id);
      setFeedbackMsg(`Created new clinician draft ${data.draft.id} (Status: Draft).`);
    }
  };

  const handleSaveDraftEdits = async () => {
    if (!activeDraft) return;
    setIsUpdatingDraft(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/prescriptions/${activeDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationName: editMedName,
          strength: editStrength,
          dose: editDose,
          route: editRoute,
          frequency: editFrequency,
          duration: editDuration,
          instructions: editInstructions,
          supportingRationale: editRationale,
          clinicianNotes: clinicianReviewNotes,
          actorRole: role,
          actorIdentity: 'Dr. Vikram Mehta, MD',
        }),
      });
      if (res.ok) {
        await onRefreshState();
        setIsEditingDraft(false);
        setFeedbackMsg(`Saved parameter edits on prescription draft ${activeDraft.id}.`);
      }
    } finally {
      setIsUpdatingDraft(false);
    }
  };

  const handleWorkflowTransition = async (newStatus: PrescriptionDraftStatus) => {
    if (!activeDraft) return;
    setErrorMsg(null);
    setFeedbackMsg(null);

    if (newStatus === 'Approved by Clinician' && !attestationChecked) {
      setErrorMsg(
        'Clinician Safety Attestation Required: You must check the verification box below confirming review of documented allergies, labs, and interactions before approving.'
      );
      return;
    }

    setIsUpdatingDraft(true);
    try {
      const res = await apiFetch(`/api/prescriptions/${activeDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          clinicianNotes: clinicianReviewNotes,
          attestationConfirmed: attestationChecked,
          actorRole: role,
          actorIdentity:
            role === 'doctor' ? 'Dr. Vikram Mehta, MD' : 'Unauthorized Role',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Action not permitted.');
      } else {
        await onRefreshState();
        setClinicianReviewNotes('');
        setFeedbackMsg(
          `Prescription ${activeDraft.id} transitioned to "${newStatus}" by Dr. Vikram Mehta, MD (Simulated approval — demo only).`
        );
      }
    } finally {
      setIsUpdatingDraft(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-1">
            <Pill className="w-4 h-4" />
            <span>SCENARIO D · CLINICIAN-SUPERVISED PRESCRIPTION & MEDICATION SAFETY WORKSPACE</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-bold">
              Patient: {patient.id} ({patient.fullName})
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Supervised Prescription Review & Medication Safety Panel
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            AI may prepare a proposed prescription draft from authorized clinical context, but it can never independently issue, approve, or renew a prescription. Unapproved drafts are hidden from active patient medication lists.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-xs font-mono font-semibold text-amber-900 shrink-0 self-start lg:self-center">
          Simulated approval — demo only (No pharmacy transmission)
        </span>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 text-xs font-semibold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 flex items-center justify-between gap-4 text-xs font-semibold text-red-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* AI Draft Proposal Generator Bar (For Doctors) */}
      {role === 'doctor' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Step 1: Prepare Proposed Prescription Draft (AI Context Gatherer or Manual Draft)
              </h2>
              <p className="text-xs text-slate-500">
                Enter a clinical request based on documented diagnoses/labs—never from a standalone symptom alone.
              </p>
            </div>
            <button
              onClick={handleCreateBlankClinicianDraft}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start md:self-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Clinician Draft</span>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={clinicalRequestPrompt}
              onChange={(e) => setClinicalRequestPrompt(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            <button
              onClick={handleGenerateProposalFromAI}
              disabled={isGeneratingAIDraft || !clinicalRequestPrompt.trim()}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isGeneratingAIDraft
                  ? 'Staging Draft Proposal...'
                  : 'Prepare Proposed Draft with AI'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Split: Left = Prescription Drafts & Review Workspace, Right = Medication Safety Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Prescription Draft Queue & Active Inspector */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Prescription Proposals & Review Queue
              </h2>
              <p className="text-xs text-slate-500">
                Select a prescription draft below to edit parameters, review safety checks, or sign off
              </p>
            </div>
          </div>

          {/* Draft Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {prescriptionDrafts.map((d) => {
              const isSelected = activeDraft?.id === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDraftId(d.id);
                    setIsEditingDraft(false);
                    setAttestationChecked(false);
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/50 text-slate-900'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="font-mono font-bold text-teal-800">
                    {d.id} · {d.patientId}
                  </div>
                  <div className="font-semibold truncate max-w-[180px]">
                    {d.medicationName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{d.status}</div>
                </button>
              );
            })}
          </div>

          {activeDraft ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    <span>Draft ID: {activeDraft.id}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Patient: {activeDraft.patientName} ({activeDraft.patientId})</span>
                    <span aria-hidden="true"> · </span>
                    <span>Creator: {activeDraft.createdBy}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {activeDraft.medicationName} ({activeDraft.strength})
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-bold ${
                      activeDraft.status === 'Approved by Clinician'
                        ? 'text-emerald-700'
                        : activeDraft.status === 'Rejected'
                        ? 'text-red-700'
                        : 'text-amber-700'
                    }`}
                  >
                    Status: {activeDraft.status}
                  </span>
                  {role === 'doctor' && !isEditingDraft && (
                    <button
                      onClick={() => startEditing(activeDraft)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:border-teal-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Draft</span>
                    </button>
                  )}
                </div>
              </div>

              {isEditingDraft ? (
                <div className="p-4 rounded-xl border border-teal-700/40 bg-teal-50/20 space-y-3 text-xs">
                  <div className="font-bold text-slate-900">
                    Edit Prescription Draft Parameters (Clinician Override)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Medication Name
                      </label>
                      <input
                        type="text"
                        value={editMedName}
                        onChange={(e) => setEditMedName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Strength
                      </label>
                      <input
                        type="text"
                        value={editStrength}
                        onChange={(e) => setEditStrength(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Dose
                      </label>
                      <input
                        type="text"
                        value={editDose}
                        onChange={(e) => setEditDose(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Frequency
                      </label>
                      <input
                        type="text"
                        value={editFrequency}
                        onChange={(e) => setEditFrequency(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Route
                      </label>
                      <select
                        value={editRoute}
                        onChange={(e) =>
                          setEditRoute(e.target.value as PrescriptionDraft['route'])
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Oral">Oral</option>
                        <option value="Subcutaneous">Subcutaneous</option>
                        <option value="Intravenous">Intravenous</option>
                        <option value="Inhaled">Inhaled</option>
                        <option value="Topical">Topical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Patient Instructions (Sig)
                    </label>
                    <textarea
                      rows={2}
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Documented Clinical Rationale
                    </label>
                    <textarea
                      rows={2}
                      value={editRationale}
                      onChange={(e) => setEditRationale(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingDraft(false)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDraftEdits}
                      disabled={isUpdatingDraft}
                      className="px-4 py-1.5 bg-teal-700 text-white rounded-lg font-semibold"
                    >
                      Save Draft Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Dose & Route</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {activeDraft.dose} ({activeDraft.route})
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Frequency</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {activeDraft.frequency}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Duration</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {activeDraft.duration}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Reviewing Clinician</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {activeDraft.reviewingClinician}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                  <div className="font-bold text-slate-900 mb-1">
                    Prescribed Instructions (Sig)
                  </div>
                  <p className="text-slate-700">{activeDraft.instructions}</p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                  <div className="font-bold text-slate-900 mb-1">
                    Supporting Clinical Rationale & Source Records
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {activeDraft.supportingRationale}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeDraft.sourceRecordIds.map((rid) => (
                      <button
                        key={rid}
                        onClick={() => openRecordById(rid)}
                        className="font-mono font-semibold text-teal-700 hover:underline"
                      >
                        [Source Record: {rid}]
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="font-bold text-slate-900 mb-1">
                      Allergy Cross-Check Summary
                    </div>
                    <p className="text-slate-700">{activeDraft.allergyCheckSummary}</p>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="font-bold text-slate-900 mb-1">
                      Interaction & Renal Dosing Check
                    </div>
                    <p className="text-slate-700">{activeDraft.interactionCheckSummary}</p>
                  </div>
                </div>
              </div>

              {/* Clinician Attestation & Action Controls (Only Doctor can approve) */}
              {role === 'doctor' ? (
                <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3 text-xs">
                  <div className="font-bold text-slate-900">
                    Clinician Supervision & Approval Sign-Off (Simulated Demo Only)
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reviewing Clinician Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={clinicianReviewNotes}
                      onChange={(e) => setClinicianReviewNotes(e.target.value)}
                      placeholder="Add clinical verification notes, titration rationale, or reason for rejection..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attestationChecked}
                      onChange={(e) => setAttestationChecked(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                    />
                    <span className="text-slate-800 leading-relaxed">
                      <strong>Mandatory Clinician Attestation:</strong> I confirm as the reviewing physician (Dr. Vikram Mehta, MD) that I have independently verified the patient&apos;s documented allergies, latest renal/electrolyte labs, and active medications before authorizing this simulated prescription.
                    </span>
                  </label>

                  {feedbackMsg && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{feedbackMsg}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-xs font-semibold text-red-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {activeDraft.status !== 'Awaiting Clinician Review' && (
                        <button
                          onClick={() =>
                            handleWorkflowTransition('Awaiting Clinician Review')
                          }
                          disabled={isUpdatingDraft}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                        >
                          Submit for Approval / Review
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleWorkflowTransition(
                            'Requires Additional Information'
                          )
                        }
                        disabled={isUpdatingDraft}
                        className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg"
                      >
                        Request More Info
                      </button>
                      <button
                        onClick={() => handleWorkflowTransition('Rejected')}
                        disabled={isUpdatingDraft}
                        className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-900 font-semibold rounded-lg"
                      >
                        Reject Draft
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        handleWorkflowTransition('Approved by Clinician')
                      }
                      disabled={isUpdatingDraft}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve (Simulated — Demo Only)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-3">
                  <div>
                    <strong className="text-sm block">
                      Submit Doctor Approval / Prescription Renewal Request ({role.toUpperCase()} Mode)
                    </strong>
                    <p className="mt-0.5 text-slate-700">
                      Only a licensed clinician (<strong>DOCTOR</strong> role) can finalize and approve prescriptions. As a <strong>{role.toUpperCase()}</strong>, you can submit a new approval/refill request to {patient.assignedClinician} below:
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isUpdatingDraft}
                      onClick={async () => {
                        setIsUpdatingDraft(true);
                        setErrorMsg(null);
                        try {
                          const firstMed = patient.medications[0];
                          const res = await apiFetch('/api/prescriptions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              patientId: patient.id,
                              medicationName: firstMed
                                ? `${firstMed.name} (Refill / Approval Request)`
                                : 'Telmisartan 40 mg (Approval Request)',
                              strength: firstMed ? firstMed.strength : '40 mg',
                              dose: firstMed ? firstMed.dose : '1 tablet',
                              route: 'Oral',
                              frequency: firstMed ? firstMed.frequency : 'Once daily',
                              duration: '90 days',
                              instructions: 'Submitted for clinician review and approval.',
                              supportingRationale: `${role.toUpperCase()} submitted an approval/refill request for ${patient.fullName} (${patient.id}).`,
                              sourceRecordIds: patientRecords.slice(0, 2).map((r) => r.id),
                              createdBy:
                                role === 'patient'
                                  ? `${patient.fullName} (Patient Request)`
                                  : 'Priya Nair, MHA (Hospital Admin Request)',
                              status: 'Awaiting Clinician Review',
                            }),
                          });
                          const data = await res.json();
                          if (res.ok && data.draft) {
                            await onRefreshState();
                            setSelectedDraftId(data.draft.id);
                            setFeedbackMsg(
                              `Submitted approval request ${data.draft.id} ("${data.draft.medicationName}") to ${patient.assignedClinician}. Status: Awaiting Clinician Review.`
                            );
                          }
                        } finally {
                          setIsUpdatingDraft(false);
                        }
                      }}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Approval Request to Doctor</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Approval Audit History */}
              <div className="pt-3 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-900 mb-2">
                  Prescription Approval & State Audit Trail ({activeDraft.approvalHistory.length} Events)
                </div>
                <div className="space-y-2">
                  {activeDraft.approvalHistory.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">
                          {ev.actorName} ({ev.actorRole}):
                        </span>{' '}
                        <span className="text-slate-700">{ev.action}</span>
                        {ev.notes && (
                          <span className="block text-slate-500 mt-0.5">
                            Note: &ldquo;{ev.notes}&rdquo;
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-500 shrink-0">
                        {ev.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right 5 Columns: Section 12 — Medication Safety & Interaction Review Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between text-xs text-amber-800 font-mono font-semibold mb-1">
                <span>MEDICATION SAFETY PANEL (SYNTHETIC DEMO)</span>
                <span>Verification Required</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Allergies, Active Regimen & Safety Checks
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured cross-check of known medications, documented allergies, duplicate therapy classes, and missing prescribing details.
              </p>
            </div>

            {/* 1. Documented Allergies */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900">
                1. Documented Patient Allergies ({patient.allergies.length})
              </h3>
              {patient.allergies.length === 0 ? (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  No drug allergies recorded in available records. Confirm verbally with patient.
                </div>
              ) : (
                patient.allergies.map((alg) => (
                  <div
                    key={alg.id}
                    className="p-3 rounded-lg border border-red-200 bg-red-50/40 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-red-900">
                      <span>{alg.substance}</span>
                      <span>{alg.severity}</span>
                    </div>
                    <div className="text-slate-700 mt-0.5">
                      Reaction: {alg.reaction}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1">
                      {alg.verifiedStatus} · Source: {alg.sourceRecordId}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. Active Clinician-Approved Medications */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900">
                2. Known Active Medications ({patient.medications.length})
              </h3>
              <div className="space-y-2">
                {patient.medications.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {m.name} ({m.strength})
                      </span>
                      <span className="font-mono text-teal-800">{m.sourceRecordId}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      {m.dose} · {m.frequency} · {m.hospital}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Duplicate Therapy & Patient-Record Warnings */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900">
                3. Structured Safety & Missing Detail Checks
              </h3>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                <div className="font-semibold text-slate-900">
                  Duplicate Therapy Class Check
                </div>
                <p className="text-slate-600">
                  {statinMeds.length > 1
                    ? `WARNING: Multiple statin entries detected (${statinMeds.map((s) => s.name).join(', ')}). Review for potential duplicate HMG-CoA reductase inhibitor therapy.`
                    : 'No duplicate active pharmacological class detected among verified active medications.'}
                </p>
              </div>

              {missingIndicationMeds.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs space-y-1">
                  <div className="font-semibold text-amber-900">
                    Missing Medication Detail Flag
                  </div>
                  <p className="text-slate-700">
                    {missingIndicationMeds.map((m) => `${m.name} (${m.sourceRecordId})`).join(', ')} lacks an explicitly documented prescribing indication in the uploaded clinic record.
                  </p>
                </div>
              )}

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs space-y-1">
                <div className="font-semibold text-amber-900">
                  Synthetic Interaction Example (Demo Inspection)
                </div>
                <p className="text-slate-700">
                  In {patient.fullName}&apos;s regimen, co-administration of an SGLT2 inhibitor (Empagliflozin) with an ARB (Telmisartan) requires monitoring for volume depletion and periodic serum creatinine/potassium checks (documented in REC-106).
                </p>
              </div>
            </div>
          </div>

          {/* Mandatory Clinical Safety Disclaimer */}
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong>Prototype Medication Safety Notice:</strong> A live commercial drug-interaction database is not connected in this clinical prototype. Do not infer that a medication is safe merely because no automated alert is displayed. Actual medication safety and dosing must always be verified using an approved clinical pharmacology reference.
          </div>
        </div>
      </div>
    </div>
  );
};
