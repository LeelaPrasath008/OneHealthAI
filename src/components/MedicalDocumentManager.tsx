import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FileCheck2,
  FilePlus2,
  FileText,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { SAMPLE_DOCUMENT_TEMPLATES } from '../seedData';
import {
  ExtractedMedicationItem,
  LabAnalyteResult,
  MedicalRecord,
  Patient,
  RecordCategory,
  SampleDocumentTemplate,
  UserRole,
} from '../types';

interface MedicalDocumentManagerProps {
  role: UserRole;
  patient: Patient | undefined;
  records: MedicalRecord[];
  isUploadModalOpen: boolean;
  inspectedRecord: MedicalRecord | null;
  onOpenUploadModal: () => void;
  onCloseUploadModal: () => void;
  onInspectRecord: (record: MedicalRecord | null) => void;
  onRefreshState: () => Promise<void>;
}

const RECORD_CATEGORIES: RecordCategory[] = [
  'Lab Report',
  'Prescription',
  'Discharge Summary',
  'Imaging Report',
  'Consultation Note',
  'Diagnosis',
  'Vaccination Record',
  'Patient-Reported Symptom',
];

export const MedicalDocumentManager: React.FC<MedicalDocumentManagerProps> = ({
  role,
  patient,
  records,
  isUploadModalOpen,
  inspectedRecord,
  onOpenUploadModal,
  onCloseUploadModal,
  onInspectRecord,
  onRefreshState,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [hospitalFilter, setHospitalFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Upload & Extraction Staging State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<RecordCategory>('Lab Report');
  const [docDate, setDocDate] = useState('2026-10-24');
  const [docHospital, setDocHospital] = useState('Metro General Hospital');
  const [docClinician, setDocClinician] = useState('Dr. Vikram Mehta, MD');
  const [docSpecialty, setDocSpecialty] = useState('Internal Medicine');
  const [docSummaryNotes, setDocSummaryNotes] = useState('');
  const [docOriginalText, setDocOriginalText] = useState('');
  const [docDiagnosis, setDocDiagnosis] = useState('');
  const [docFollowUp, setDocFollowUp] = useState('');
  const [stagedLabs, setStagedLabs] = useState<LabAnalyteResult[]>([]);
  const [stagedMeds, setStagedMeds] = useState<ExtractedMedicationItem[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [extractionModeLabel, setExtractionModeLabel] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Edit Metadata State inside Record Inspector Drawer
  const [isEditingInspected, setIsEditingInspected] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [editSummary, setEditSummary] = useState('');

  const activePatientRecords = patient
    ? records.filter((r) => r.patientId === patient.id)
    : records;

  const hospitals = Array.from(new Set(activePatientRecords.map((r) => r.hospital)));

  const filteredRecords = activePatientRecords
    .filter((rec) => {
      if (categoryFilter !== 'ALL' && rec.category !== categoryFilter) return false;
      if (hospitalFilter !== 'ALL' && rec.hospital !== hospitalFilter) return false;
      if (statusFilter !== 'ALL' && rec.reviewStatus !== statusFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        rec.id.toLowerCase().includes(q) ||
        rec.title.toLowerCase().includes(q) ||
        rec.hospital.toLowerCase().includes(q) ||
        rec.clinician.toLowerCase().includes(q) ||
        rec.summaryNotes.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleLoadTemplate = (tpl: SampleDocumentTemplate) => {
    setDocTitle(tpl.title);
    setDocCategory(tpl.category);
    setDocDate(tpl.date);
    setDocHospital(tpl.hospital);
    setDocClinician(tpl.clinician);
    setDocSpecialty(tpl.specialty);
    setDocOriginalText(tpl.rawText);
    setDocSummaryNotes(
      `Extracted from clinical template "${tpl.label}". Staged with "Needs Review" status until clinician verification.`
    );
    setDocDiagnosis(tpl.extractedDiagnosis || 'Not explicitly recorded in source document');
    setDocFollowUp(tpl.extractedFollowUp || 'Not explicitly recorded in source document');
    setStagedLabs(tpl.extractedLabs ? [...tpl.extractedLabs] : []);
    setStagedMeds(tpl.extractedMeds ? [...tpl.extractedMeds] : []);
    setSelectedFileName(`${tpl.id}.txt (Clinical Demo Template)`);
    setExtractionModeLabel('Curated Clinical Template Extraction — Staged as Needs Review');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setIsExtracting(true);
    setExtractionModeLabel('Extracting structured fields via Server-Side Gemini 3.8 Flash...');

    try {
      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        const text = await file.text();
        setDocOriginalText(text);
        const res = await fetch('/api/ai/extract-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: text, fileName: file.name }),
        });
        const data = await res.json();
        if (data.extracted) {
          setDocTitle(data.extracted.title || `Uploaded Document — ${file.name}`);
          setDocSummaryNotes(data.extracted.summaryNotes || '');
          setDocDiagnosis(data.extracted.documentedDiagnosis || 'Not explicitly recorded');
          setDocFollowUp(data.extracted.followUpRecommendation || '');
          if (Array.isArray(data.extracted.labResults)) setStagedLabs(data.extracted.labResults);
          if (Array.isArray(data.extracted.prescribedMedications))
            setStagedMeds(data.extracted.prescribedMedications);
          setExtractionModeLabel(
            data.aiMode === 'live-gemini'
              ? 'Extracted via Live Gemini 3.8 Flash (Staged as Needs Review)'
              : 'Demo Extraction Staging (Needs Clinician Review)'
          );
        }
      } else {
        // Read binary/image/PDF as base64 for Gemini multimodal extraction
        const reader = new FileReader();
        reader.onload = async () => {
          const resultStr = String(reader.result || '');
          const base64Part = resultStr.includes(',') ? resultStr.split(',')[1] : '';
          const res = await fetch('/api/ai/extract-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64Part,
              mimeType: file.type || 'application/pdf',
              fileName: file.name,
            }),
          });
          const data = await res.json();
          if (data.extracted) {
            setDocTitle(data.extracted.title || `Uploaded Clinical File — ${file.name}`);
            setDocSummaryNotes(
              data.extracted.summaryNotes ||
                `Uploaded file ${file.name}. Structured fields staged for clinician review.`
            );
            setDocOriginalText(
              data.extracted.extractedText ||
                `[Original File Reference Preserved: ${file.name} (${file.type || 'document'})]`
            );
            setDocDiagnosis(
              data.extracted.documentedDiagnosis || 'Not explicitly recorded in source document'
            );
            setDocFollowUp(data.extracted.followUpRecommendation || '');
            if (Array.isArray(data.extracted.labResults)) setStagedLabs(data.extracted.labResults);
            if (Array.isArray(data.extracted.prescribedMedications))
              setStagedMeds(data.extracted.prescribedMedications);
            setExtractionModeLabel(
              data.aiMode === 'live-gemini'
                ? 'Extracted via Live Gemini 3.8 Flash Multimodal (Needs Review)'
                : 'File Reference Preserved — Demo Extraction Staged (Needs Review)'
            );
          }
          setIsExtracting(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err) {
      setExtractionModeLabel('File attached — manual review required.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveUploadedRecord = async (verifyImmediately: boolean) => {
    if (!patient) return;
    if (!docTitle.trim()) return;
    setIsSavingRecord(true);
    try {
      const canVerify = role === 'doctor' && verifyImmediately;
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          title: docTitle.trim(),
          category: docCategory,
          date: docDate,
          hospital: docHospital,
          clinician: docClinician,
          specialty: docSpecialty,
          reviewStatus: canVerify ? 'Verified' : 'Needs Review',
          provenance: canVerify
            ? 'Clinician-Verified'
            : 'Machine-Extracted — Needs Review',
          uploadedBy:
            role === 'doctor'
              ? 'Dr. Vikram Mehta, MD'
              : role === 'admin'
              ? 'Priya Nair, MHA (Hospital Admin)'
              : patient.fullName,
          actorRole: role,
          summaryNotes: docSummaryNotes.trim() || `${docCategory} added for ${patient.fullName}.`,
          originalDocumentText:
            docOriginalText.trim() ||
            `ORIGINAL DOCUMENT REFERENCE: ${docTitle} (${docHospital}, ${docDate})`,
          fileName: selectedFileName || undefined,
          documentedDiagnosis: docDiagnosis,
          followUpRecommendation: docFollowUp,
          labResults: stagedLabs.length > 0 ? stagedLabs : undefined,
          prescribedMedications: stagedMeds.length > 0 ? stagedMeds : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await onRefreshState();
        onCloseUploadModal();
        setFeedbackBanner(
          `Added record ${data.record.id} ("${data.record.title}") to ${patient.fullName}'s timeline with status: ${data.record.reviewStatus}.`
        );
        // Reset staging form
        setDocTitle('');
        setDocSummaryNotes('');
        setDocOriginalText('');
        setStagedLabs([]);
        setStagedMeds([]);
        setSelectedFileName('');
        setExtractionModeLabel(null);
      }
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleVerifyRecord = async (rec: MedicalRecord) => {
    const response = await fetch(`/api/records/${rec.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markVerified: true,
        actorRole: role,
        actorIdentity:
          role === 'doctor' ? 'Dr. Vikram Mehta, MD' : 'Priya Nair, MHA',
      }),
    });
    if (response.ok) {
      const data = await response.json();
      await onRefreshState();
      onInspectRecord(data.record);
      setFeedbackBanner(
        `Record ${rec.id} verified and transitioned from "Needs Review" to "Clinician-Verified".`
      );
    }
  };

  const handleSaveMetadataEdits = async () => {
    if (!inspectedRecord) return;
    const response = await fetch(`/api/records/${inspectedRecord.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        summaryNotes: editSummary,
        documentedDiagnosis: editDiagnosis,
        followUpRecommendation: editFollowUp,
        actorRole: role,
        actorIdentity:
          role === 'doctor' ? 'Dr. Vikram Mehta, MD' : 'Priya Nair, MHA',
      }),
    });
    if (response.ok) {
      const data = await response.json();
      await onRefreshState();
      onInspectRecord(data.record);
      setIsEditingInspected(false);
      setFeedbackBanner(
        `Updated structured metadata on ${inspectedRecord.id} while preserving the original clinical document text.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {feedbackBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-teal-700 font-medium mb-1">
            <span>MEDICAL DOCUMENT MANAGEMENT & STRUCTURED EXTRACTION</span>
            {patient && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-bold">
                  {patient.id} ({patient.fullName})
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Connected Medical Records & Verification Staging
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload diagnostic reports, prescriptions, and discharge summaries. Machine-extracted fields remain clearly marked &ldquo;Needs Review&rdquo; alongside the preserved original document until verified by a qualified clinician.
          </p>
        </div>

        <button
          onClick={onOpenUploadModal}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start lg:self-center"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Upload / Extract Medical Record</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Record ID (REC-104), title, hospital, or clinician..."
              aria-label="Search medical records"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by document category"
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="ALL">All Document Types</option>
              {RECORD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              aria-label="Filter by hospital"
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
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
              aria-label="Filter by verification status"
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="ALL">All Review Statuses</option>
              <option value="Verified">Clinician-Verified</option>
              <option value="Needs Review">Needs Review (Unverified)</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <th className="py-3 px-4">Record ID & Date</th>
                <th className="py-3 px-4">Type & Title</th>
                <th className="py-3 px-4">Hospital & Clinician</th>
                <th className="py-3 px-4">Provenance & Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                    <div className="font-bold text-teal-800">{rec.id}</div>
                    <div className="text-slate-500">{rec.date}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-500">{rec.category}</div>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {rec.title}
                    </div>
                    <div className="text-slate-600 mt-0.5 line-clamp-1">
                      {rec.summaryNotes}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{rec.hospital}</div>
                    <div className="text-slate-500">
                      {rec.clinician} ({rec.specialty})
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div
                      className={`font-semibold ${
                        rec.reviewStatus === 'Verified'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {rec.reviewStatus === 'Verified'
                        ? 'Clinician-Verified'
                        : 'Needs Review'}
                    </div>
                    <div className="text-slate-500 mt-0.5">{rec.provenance}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                    <button
                      onClick={() => {
                        setIsEditingInspected(false);
                        onInspectRecord(rec);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
                    >
                      Preview & Edit
                    </button>
                    {rec.reviewStatus === 'Needs Review' && role === 'doctor' && (
                      <button
                        onClick={() => handleVerifyRecord(rec)}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors"
                      >
                        Verify Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Preview, Original Reference & Metadata Editor Modal */}
      {inspectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-6 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-teal-800">
                    {inspectedRecord.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{inspectedRecord.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{inspectedRecord.category}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      inspectedRecord.reviewStatus === 'Verified'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {inspectedRecord.provenance}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {inspectedRecord.title}
                </h2>
                <div className="text-xs text-slate-600 mt-0.5">
                  {inspectedRecord.hospital} · {inspectedRecord.clinician} ({inspectedRecord.specialty})
                </div>
              </div>
              <button
                onClick={() => onInspectRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                aria-label="Close record preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Preserved Original Document Content */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    Preserved Original Document Reference (Immutable Source)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Uploaded by: {inspectedRecord.uploadedBy}
                  </span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-96">
                  {inspectedRecord.originalDocumentText}
                </pre>
              </div>

              {/* Right: Structured Extracted / Verified Clinical Fields */}
              <div className="lg:col-span-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    Structured Clinical Fields ({inspectedRecord.reviewStatus})
                  </h3>
                  {(role === 'doctor' || role === 'admin') && !isEditingInspected && (
                    <button
                      onClick={() => {
                        setEditTitle(inspectedRecord.title);
                        setEditSummary(inspectedRecord.summaryNotes);
                        setEditDiagnosis(inspectedRecord.documentedDiagnosis || '');
                        setEditFollowUp(inspectedRecord.followUpRecommendation || '');
                        setIsEditingInspected(true);
                      }}
                      className="text-teal-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Structured Fields</span>
                    </button>
                  )}
                </div>

                {isEditingInspected ? (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Record Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Documented Diagnosis
                      </label>
                      <input
                        type="text"
                        value={editDiagnosis}
                        onChange={(e) => setEditDiagnosis(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Clinical Summary Notes
                      </label>
                      <textarea
                        rows={3}
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Follow-Up Recommendation
                      </label>
                      <input
                        type="text"
                        value={editFollowUp}
                        onChange={(e) => setEditFollowUp(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsEditingInspected(false)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveMetadataEdits}
                        className="px-3 py-1.5 bg-teal-700 text-white rounded-lg font-semibold"
                      >
                        Save Structured Edits
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div className="text-slate-500">Documented Diagnosis</div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {inspectedRecord.documentedDiagnosis || 'Not explicitly recorded in source'}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div className="text-slate-500">Clinical Summary</div>
                      <div className="text-slate-800 mt-0.5 leading-relaxed">
                        {inspectedRecord.summaryNotes}
                      </div>
                    </div>

                    {inspectedRecord.followUpRecommendation && (
                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                        <div className="text-slate-500">Follow-Up Recommendation</div>
                        <div className="font-medium text-teal-900 mt-0.5">
                          {inspectedRecord.followUpRecommendation}
                        </div>
                      </div>
                    )}

                    {inspectedRecord.labResults && inspectedRecord.labResults.length > 0 && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">
                          Extracted Laboratory Results (Original Units & Reference Ranges)
                        </div>
                        <div className="divide-y divide-slate-100">
                          {inspectedRecord.labResults.map((l, i) => (
                            <div key={i} className="px-3 py-2 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-900">{l.testName}</span>
                                {l.assayMethod && (
                                  <span className="text-slate-500 block text-[11px]">
                                    Method: {l.assayMethod}
                                  </span>
                                )}
                              </div>
                              <div className="text-right font-mono tabular-nums">
                                <span className="font-bold text-slate-900">
                                  {l.value} {l.unit}
                                </span>
                                <span className="block text-[11px] text-slate-500">
                                  Ref: {l.referenceRange}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {inspectedRecord.reviewStatus === 'Needs Review' && role === 'doctor' && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                    <div className="text-xs text-amber-900">
                      <strong>Clinician Verification Required:</strong> Confirm that extracted fields match the source document on the left.
                    </div>
                    <button
                      onClick={() => handleVerifyRecord(inspectedRecord)}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
                    >
                      Verify & Sign Off
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Extraction Modal */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-6 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-semibold text-teal-700">
                  TARGET PATIENT: {patient?.id} ({patient?.fullName})
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Upload Medical Document & Structured Extraction Staging
                </h2>
              </div>
              <button
                onClick={onCloseUploadModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Choose File Upload or Sample Clinical Template */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 mb-1">
                    Option A — Select Local File (PDF, Image, or Text)
                  </div>
                  <p className="text-xs text-slate-600">
                    Parses uploaded clinical files via Server-Side Gemini 3.8 Flash and stages extracted values with &ldquo;Needs Review&rdquo; status.
                  </p>
                </div>
                <label className="mt-3 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center justify-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose PDF / Image / Text File</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {selectedFileName && (
                  <div className="mt-2 text-xs font-mono text-teal-800 truncate">
                    Selected: {selectedFileName}
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-xs font-bold text-slate-900 mb-2">
                  Option B — Load Curated Clinical Sample Document (One-Click Demo)
                </div>
                <div className="space-y-2">
                  {SAMPLE_DOCUMENT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleLoadTemplate(tpl)}
                      className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-teal-700 text-xs flex items-center justify-between gap-2 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{tpl.label}</div>
                        <div className="text-slate-500">
                          {tpl.category} · {tpl.hospital} · {tpl.date}
                        </div>
                      </div>
                      <span className="text-teal-700 font-semibold whitespace-nowrap shrink-0">
                        Extract Sample →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {extractionModeLabel && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <span>
                  <strong>Provenance Status:</strong> {extractionModeLabel}
                </span>
                <span className="font-mono font-semibold">Needs Review</span>
              </div>
            )}

            {/* Step 2: Editable Review Form */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-800 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g., Quarterly HbA1c & Renal Function Panel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Record Category *
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as RecordCategory)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {RECORD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Document Date *
                </label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Hospital / Provider *
                </label>
                <input
                  type="text"
                  value={docHospital}
                  onChange={(e) => setDocHospital(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Relevant Clinician
                </label>
                <input
                  type="text"
                  value={docClinician}
                  onChange={(e) => setDocClinician(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Original Document Text Reference (Preserved)
                </label>
                <textarea
                  rows={5}
                  value={docOriginalText}
                  onChange={(e) => setDocOriginalText(e.target.value)}
                  placeholder="Paste or load source clinical report text..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Extracted Documented Diagnosis (Editable)
                  </label>
                  <input
                    type="text"
                    value={docDiagnosis}
                    onChange={(e) => setDocDiagnosis(e.target.value)}
                    placeholder="Never invent missing values — leave blank if not stated"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Extracted Follow-Up Recommendation (Editable)
                  </label>
                  <input
                    type="text"
                    value={docFollowUp}
                    onChange={(e) => setDocFollowUp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Summary Notes
                  </label>
                  <input
                    type="text"
                    value={docSummaryNotes}
                    onChange={(e) => setDocSummaryNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Staged Lab Analytes Preview */}
            {stagedLabs.length > 0 && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-900 mb-2">
                  Extracted Laboratory Fields (Staged as &ldquo;Needs Review&rdquo;)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stagedLabs.map((lab, idx) => (
                    <div key={idx} className="p-2 bg-white border border-slate-200 rounded-lg flex justify-between">
                      <span className="font-semibold">{lab.testName}</span>
                      <span className="font-mono">
                        {lab.value} {lab.unit} (Ref: {lab.referenceRange})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCloseUploadModal}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingRecord || !docTitle.trim()}
                onClick={() => handleSaveUploadedRecord(false)}
                className="px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg disabled:opacity-50"
              >
                Save as &ldquo;Needs Review&rdquo;
              </button>
              {role === 'doctor' && (
                <button
                  type="button"
                  disabled={isSavingRecord || !docTitle.trim()}
                  onClick={() => handleSaveUploadedRecord(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
                >
                  Verify & Publish to Timeline (Clinician Sign-Off)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
