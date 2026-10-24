export type UserRole = 'patient' | 'doctor' | 'admin' | 'analyst';

export type NavigationSection =
  | 'overview'
  | 'patients'
  | 'timeline'
  | 'records'
  | 'patient-ai'
  | 'clinical-copilot'
  | 'prescriptions'
  | 'abdm-readiness'
  | 'public-health'
  | 'privacy'
  | 'notifications'
  | 'audit';

export type SupportedUILanguage = 'en' | 'hi' | 'ta' | 'kn';

export interface DemoPersona {
  id: string;
  role: UserRole;
  name: string;
  title: string;
  organization: string;
  linkedPatientId?: string;
  hprOrRoleId?: string;
  description: string;
  badgeText: string;
}

export type RecordCategory =
  | 'Lab Report'
  | 'Prescription'
  | 'Discharge Summary'
  | 'Imaging Report'
  | 'Consultation Note'
  | 'Diagnosis'
  | 'Procedure'
  | 'Follow-Up'
  | 'Vaccination Record'
  | 'Patient-Reported Symptom';

export type ReviewStatus = 'Verified' | 'Needs Review';

export type ProvenanceType =
  | 'Clinician-Verified'
  | 'Machine-Extracted — Needs Review'
  | 'Patient-Reported'
  | 'AI-Generated Interpretation';

export interface LabAnalyteResult {
  testName: string;
  value: number | string;
  unit: string;
  referenceRange: string;
  flag?: 'Normal' | 'High' | 'Low' | 'Critical' | 'Uncertain';
  assayMethod?: string;
  comparableGroup?: string;
}

export interface ExtractedMedicationItem {
  name: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
  documentedIndication?: string;
}

export interface VitalSignSnapshot {
  systolicBp?: number; // mmHg
  diastolicBp?: number; // mmHg
  heartRateBpm?: number; // bpm
  spO2Pct?: number; // %
  weightKg?: number; // kg
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  title: string;
  category: RecordCategory;
  date: string; // YYYY-MM-DD
  hospital: string;
  facilityRegistryId?: string; // Simulated HFR ID
  clinician: string;
  clinicianRegistryId?: string; // Simulated HPR ID
  specialty: string;
  reviewStatus: ReviewStatus;
  provenance: ProvenanceType;
  fhirResourceType?: 'DiagnosticReport' | 'MedicationRequest' | 'Composition' | 'ImagingStudy' | 'Immunization' | 'Observation';
  uploadedBy: string;
  uploadedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  summaryNotes: string;
  plainLanguageExplanation?: string;
  originalDocumentText: string;
  fileName?: string;
  fileMimeType?: string;
  documentedDiagnosis?: string;
  followUpRecommendation?: string;
  vitalSigns?: VitalSignSnapshot;
  labResults?: LabAnalyteResult[];
  prescribedMedications?: ExtractedMedicationItem[];
}

export interface AllergyItem {
  id: string;
  substance: string;
  reaction: string;
  severity: 'Mild' | 'Moderate' | 'Severe / Anaphylaxis';
  sourceRecordId: string;
  verifiedStatus: 'Clinician-Verified' | 'Patient-Reported';
}

export interface ChronicCondition {
  id: string;
  name: string;
  diagnosedDate: string;
  status: 'Active' | 'Controlled' | 'Resolved' | 'Monitoring';
  documentingHospital: string;
  sourceRecordId: string;
}

export interface ActiveMedication {
  id: string;
  name: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribingClinician: string;
  hospital: string;
  documentedReason?: string;
  status: 'Active' | 'Completed' | 'Discontinued';
  sourceRecordId: string;
}

export interface SharingPermission {
  id: string;
  patientId: string;
  entityName: string;
  entityType: 'Doctor' | 'Hospital';
  entityId: string;
  facilityHfrId?: string;
  clinicianHprId?: string;
  categoriesShared: string[];
  purpose: string;
  status: 'Active' | 'Revoked' | 'Expired' | 'Pending Approval' | 'Rejected';
  grantedAt: string;
  expiresAt: string;
  lastAccessedAt?: string;
}

export interface ABDMExchangeLogItem {
  id: string;
  patientId: string;
  timestamp: string;
  requesterHipOrHiu: string;
  providerHip: string;
  hiTypes: string[];
  consentArtefactId: string;
  exchangeStatus: 'Verified Exchange (Simulated)' | 'Pending Patient Consent' | 'Failed / Consent Revoked' | 'Timed Out — Retry Staged';
  fhirBundleCount: number;
  notes: string;
}

export interface ConsultationQueueItem {
  id: string;
  patientId: string;
  patientName: string;
  ageGender: string;
  appointmentTime: string;
  visitType: 'Follow-Up Review' | 'Lab & Medication Review' | 'New Referral' | 'Urgent Triage';
  chiefComplaint: string;
  status: 'Checked In' | 'In Consultation' | 'Awaiting Labs' | 'Completed';
  allergyAlert?: string;
}

export interface FacilityStaffConfigItem {
  id: string;
  name: string;
  roleTitle: string;
  department: string;
  facilityName: string;
  simulatedHfrId: string;
  simulatedHprId: string;
  integrationMode: 'Prototype Simulation' | 'Demo Sandbox Ready';
  verificationStatus: 'Active' | 'Pending Registry Sync';
}

export interface Patient {
  id: string;
  fullName: string;
  simulatedAbhaAddress?: string; // Explicitly labeled simulated demo handle e.g. ananya.rao.demo@sbx
  simulatedAbhaNumber?: string; // Explicitly labeled DEMO-ABHA-1001
  dateOfBirth: string;
  age: number;
  gender: 'Female' | 'Male' | 'Non-binary' | 'Prefer not to specify';
  bloodGroup?: string;
  preferredLanguage: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  registeringHospital: string;
  assignedClinician: string;
  assignedClinicianId: string;
  registeredAt: string;
  allergies: AllergyItem[];
  conditions: ChronicCondition[];
  medications: ActiveMedication[];
  sharingPermissions: SharingPermission[];
  aiSummaryCache?: LongitudinalSummaryResponse;
}

export type PrescriptionDraftStatus =
  | 'Draft'
  | 'Awaiting Clinician Review'
  | 'Approved by Clinician'
  | 'Rejected'
  | 'Requires Additional Information';

export interface PrescriptionApprovalEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  notes?: string;
}

export interface PrescriptionDraft {
  id: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  strength: string;
  dose: string;
  route: 'Oral' | 'Subcutaneous' | 'Intravenous' | 'Inhaled' | 'Topical';
  frequency: string;
  duration: string;
  instructions: string;
  supportingRationale: string;
  allergyCheckSummary: string;
  interactionCheckSummary: string;
  sourceRecordIds: string[];
  createdBy: string;
  createdAt: string;
  reviewingClinician: string;
  status: PrescriptionDraftStatus;
  clinicianNotes?: string;
  approvalHistory: PrescriptionApprovalEvent[];
}

export interface PublicHealthTimeSeriesPoint {
  weekLabel: string;
  date: string;
  region: 'North Metro Sector' | 'South River Valley' | 'East Harbor District' | 'Central Civic Zone';
  hospital: string;
  // Syndromic (S-Form: symptom presentations)
  feverCount: number;
  feverBaseline: number;
  respiratoryCount: number;
  respiratoryBaseline: number;
  giCount: number;
  giBaseline: number;
  rashCount: number;
  rashBaseline: number;
  combinedClusterCount: number;
  combinedClusterBaseline: number;
  // Presumptive (P-Form: clinician provisional assessment) & Lab-Confirmed (L-Form)
  presumptiveArboviralCount: number;
  labConfirmedArboviralCount: number;
  presumptiveInfluenzaCount: number;
  labConfirmedInfluenzaCount: number;
  reportingCompletenessPct: number;
  reportingDelayHours: number;
}

export type SignalInvestigationStatus =
  | 'Pending Review'
  | 'Under Review'
  | 'Escalated'
  | 'Dismissed'
  | 'Resolved';

export interface PublicHealthSignal {
  id: string;
  title: string;
  surveillanceStream: 'S-Form (Syndromic)' | 'P-Form (Presumptive Clinical)' | 'L-Form (Laboratory-Confirmed)';
  symptomCategory: string;
  region: string;
  participatingHospitalsCount: number;
  detectedDate: string;
  comparisonPeriod: string;
  observedCount: number;
  presumptiveCount: number;
  labConfirmedCount: number;
  baselineAverage: number;
  statisticalRatio: number;
  dataCompletenessPct: number;
  reportingLagHours: number;
  severity: 'Moderate' | 'High' | 'Watch';
  evidenceQuality: 'Preliminary Aggregate' | 'Multi-Facility Concordant';
  status: SignalInvestigationStatus;
  triggerExplanation: string;
  limitationsAndConfonders: string[];
  alternativeExplanations: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface NotificationItem {
  id: string;
  recipientRole: UserRole | 'all';
  patientId?: string;
  title: string;
  message: string;
  category:
    | 'record_upload'
    | 'verification_needed'
    | 'doctor_review'
    | 'prescription_status'
    | 'follow_up'
    | 'privacy_change'
    | 'public_health_signal';
  timestamp: string;
  read: boolean;
  targetSection: NavigationSection;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  actorIdentity: string;
  action: string;
  targetIdentifier: string;
  outcome: 'Authorized' | 'Restricted / Denied' | 'Completed' | 'Flagged for Review';
  summary: string;
}

export interface LongitudinalSummaryClaim {
  statement: string;
  sourceRecordIds: string[];
  category: 'condition' | 'medication' | 'lab_change' | 'visit' | 'followup';
}

export interface LongitudinalSummaryResponse {
  generatedAt: string;
  aiMode: 'live-gemini' | 'demo-fallback';
  overviewParagraph: string;
  documentedConditions: LongitudinalSummaryClaim[];
  medicationHistorySummary: LongitudinalSummaryClaim[];
  notableLabChanges: LongitudinalSummaryClaim[];
  recentVisitsAndFollowUps: LongitudinalSummaryClaim[];
  missingOrConflictingInfo: string[];
}

export interface PatientAIResponse {
  id: string;
  question: string;
  timestamp: string;
  aiMode: 'live-gemini' | 'demo-fallback';
  simpleAnswer: string;
  fromYourRecords: {
    statement: string;
    recordId: string;
    recordDate: string;
    hospital: string;
  }[];
  generalEducationalContext: string;
  uncertaintyAndMissingInfo: string[];
  recommendedNextStep: string;
  safetyNotice: string;
  emergencyWarningDetected: boolean;
}

export interface ClinicalReferenceItem {
  title: string;
  organization: string;
  yearOrVersion: string;
  verificationNote: string;
  url?: string;
}

export interface ClinicalCopilotResponse {
  id: string;
  question: string;
  timestamp: string;
  aiMode: 'live-gemini' | 'demo-fallback';
  shortAnswer: string;
  patientRecordEvidence: {
    finding: string;
    recordId: string;
    date: string;
    sourceHospital: string;
  }[];
  clinicalContextAndReasoning: string;
  prescribingRationaleStatus?: {
    medication: string;
    explicitlyDocumentedInRecord: boolean;
    documentedReasonOrNote: string;
    commonApprovedIndication: string;
  };
  potentialRisksAndInteractions: string[];
  missingInformationAndUncertainty: string[];
  supportingReferences: ClinicalReferenceItem[];
  suggestedClinicianChecks: string[];
}

export interface SampleDocumentTemplate {
  id: string;
  label: string;
  category: RecordCategory;
  hospital: string;
  clinician: string;
  specialty: string;
  date: string;
  title: string;
  rawText: string;
  extractedDiagnosis?: string;
  extractedFollowUp?: string;
  extractedLabs?: LabAnalyteResult[];
  extractedMeds?: ExtractedMedicationItem[];
}

export interface GuidedScenario {
  id: string;
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  title: string;
  subtitle: string;
  recommendedRole: UserRole;
  targetSection: NavigationSection;
  patientId?: string;
  instructions: string;
}

export interface AppStateStore {
  patients: Patient[];
  records: MedicalRecord[];
  prescriptionDrafts: PrescriptionDraft[];
  publicHealthSeries: PublicHealthTimeSeriesPoint[];
  publicHealthSignals: PublicHealthSignal[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  abdmExchangeLogs?: ABDMExchangeLogItem[];
  consultationQueue?: ConsultationQueueItem[];
  facilityStaffConfig?: FacilityStaffConfigItem[];
}
