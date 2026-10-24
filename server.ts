import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createInitialSeedState } from './src/seedData.ts';
import type {
  AppStateStore,
  AuditLogEntry,
  ClinicalCopilotResponse,
  LongitudinalSummaryResponse,
  MedicalRecord,
  NotificationItem,
  Patient,
  PatientAIResponse,
  PrescriptionDraft,
  UserRole,
} from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE_PATH = path.join(__dirname, 'server-store.json');

function loadStore(): AppStateStore {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as AppStateStore;
      if (
        parsed &&
        Array.isArray(parsed.patients) &&
        parsed.patients.length > 0 &&
        Array.isArray(parsed.records) &&
        parsed.records.some((r) => r.id === 'REC-202') &&
        Array.isArray(parsed.abdmExchangeLogs) &&
        Array.isArray(parsed.consultationQueue)
      ) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not load server-store.json, initializing fresh seed state:', err);
  }
  const initial = createInitialSeedState();
  saveStore(initial);
  return initial;
}

function saveStore(store: AppStateStore): void {
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

let db: AppStateStore = loadStore();

function nowTimestamp(): string {
  const d = new Date();
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function addAuditLog(
  actorRole: UserRole,
  actorIdentity: string,
  action: string,
  targetIdentifier: string,
  outcome: AuditLogEntry['outcome'],
  summary: string
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `AUD-${1000 + db.auditLogs.length + 1}`,
    timestamp: nowTimestamp(),
    actorRole,
    actorIdentity,
    action,
    targetIdentifier,
    outcome,
    summary,
  };
  db.auditLogs.unshift(entry);
  return entry;
}

function addNotification(
  recipientRole: UserRole | 'all',
  title: string,
  message: string,
  category: NotificationItem['category'],
  targetSection: NotificationItem['targetSection'],
  patientId?: string
): NotificationItem {
  const notif: NotificationItem = {
    id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recipientRole,
    patientId,
    title,
    message,
    category,
    timestamp: nowTimestamp().slice(0, 16),
    read: false,
    targetSection,
  };
  db.notifications.unshift(notif);
  return notif;
}

export function isDoctorAuthorizedForPatient(patient: Patient, doctorId = 'DOC-101'): boolean {
  // Check if the patient has an active sharing permission for this doctor or any active hospital permission
  const docPerm = patient.sharingPermissions.find(
    (p) => p.entityId === doctorId || p.entityType === 'Doctor'
  );
  if (docPerm) {
    return docPerm.status === 'Active';
  }
  return patient.sharingPermissions.some((p) => p.status === 'Active');
}

function hasValidGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
}

function getGeminiClient(): GoogleGenAI | null {
  if (!hasValidGeminiKey()) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback generator for Longitudinal Summary
function buildFallbackTimelineSummary(
  patient: Patient,
  records: MedicalRecord[]
): LongitudinalSummaryResponse {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const recIds = sorted.map((r) => r.id);

  if (patient.id === 'P1001') {
    return {
      generatedAt: nowTimestamp(),
      aiMode: 'demo-fallback',
      overviewParagraph:
        'Ananya Rao (52F, P1001) has a longitudinal record across Metro General Hospital, St. Jude Cardiac & Specialty Center, and City Apollo Diagnostics documenting Type 2 Diabetes Mellitus (REC-101), Essential Hypertension with microalbuminuria (REC-102), and Stage 3a/G2 chronic kidney disease monitoring (REC-104, REC-106). Following addition of Empagliflozin 10 mg OD in September 2026 (REC-106), unverified follow-up lab REC-107 on 2026-10-18 shows Fasting Plasma Glucose at 118 mg/dL and eGFR stabilizing at 62 mL/min/1.73m².',
      documentedConditions: [
        {
          statement: 'Type 2 Diabetes Mellitus (E11.9) documented at baseline endocrinology consultation.',
          sourceRecordIds: ['REC-101', 'REC-106'],
          category: 'condition',
        },
        {
          statement: 'Essential Hypertension (I10) with spot urine albumin-to-creatinine ratio of 42 mg/g.',
          sourceRecordIds: ['REC-102'],
          category: 'condition',
        },
        {
          statement: 'Mildly decreased glomerular filtration rate (eGFR 61 -> 58 -> 62 mL/min/1.73m²) under cardiorenal monitoring.',
          sourceRecordIds: ['REC-104', 'REC-106', 'REC-107'],
          category: 'condition',
        },
      ],
      medicationHistorySummary: [
        {
          statement: 'Metformin XR 500 mg PO twice daily initiated 2025-11-15 for first-line glycemic control.',
          sourceRecordIds: ['REC-101'],
          category: 'medication',
        },
        {
          statement: 'Telmisartan 40 mg PO once daily initiated 2026-02-12 for hypertension and antiproteinuric nephroprotection.',
          sourceRecordIds: ['REC-102'],
          category: 'medication',
        },
        {
          statement: 'Atorvastatin 20 mg PO at bedtime prescribed 2026-06-02 at City Apollo Clinic (note: explicit prescribing rationale was not recorded on the uploaded slip).',
          sourceRecordIds: ['REC-105'],
          category: 'medication',
        },
        {
          statement: 'Empagliflozin 10 mg PO once daily added 2026-09-14 for persistent HbA1c elevation (7.8%) and cardiorenal protection.',
          sourceRecordIds: ['REC-106'],
          category: 'medication',
        },
      ],
      notableLabChanges: [
        {
          statement: 'HbA1c (HPLC %) moved from 7.4% (2025-11-15) to 8.1% (2026-05-18), then improved to 7.8% (2026-09-14).',
          sourceRecordIds: ['REC-101', 'REC-104', 'REC-106'],
          category: 'lab_change',
        },
        {
          statement: 'LDL Cholesterol improved from 128 mg/dL (REC-101) and 118 mg/dL (REC-104) down to 88 mg/dL (REC-106) following Atorvastatin initiation.',
          sourceRecordIds: ['REC-101', 'REC-104', 'REC-106'],
          category: 'lab_change',
        },
        {
          statement: 'eGFR (CKD-EPI) trended 74 -> 61 -> 58 mL/min/1.73m², with recent unverified extraction REC-107 showing 62 mL/min/1.73m².',
          sourceRecordIds: ['REC-101', 'REC-104', 'REC-106', 'REC-107'],
          category: 'lab_change',
        },
      ],
      recentVisitsAndFollowUps: [
        {
          statement: '4-week post-Empagliflozin renal and electrolyte check uploaded on 2026-10-18 (REC-107) is currently marked "Needs Review" awaiting clinician verification.',
          sourceRecordIds: ['REC-106', 'REC-107'],
          category: 'followup',
        },
        {
          statement: 'Documented recommendation in REC-101 for ophthalmology retinal screening has no corresponding completion record uploaded yet.',
          sourceRecordIds: ['REC-101'],
          category: 'followup',
        },
      ],
      missingOrConflictingInfo: [
        'Unit & Assay Difference Warning: REC-104 (City Apollo Diagnostics) reported Fasting Blood Glucose in SI units (9.2 mmol/L) and used Jaffe kinetic creatinine, whereas Metro General and St. Jude used venous mg/dL and enzymatic IDMS creatinine.',
        'Unrecorded Prescribing Indication: REC-105 (Atorvastatin 20 mg) does not state the original prescriber’s specific indication on the prescription slip.',
        'Unverified Record: REC-107 contains machine-extracted values (Creatinine 1.10 mg/dL, eGFR 62) that require clinician verification before final clinical sign-off.',
      ],
    };
  }

  return {
    generatedAt: nowTimestamp(),
    aiMode: 'demo-fallback',
    overviewParagraph: `${patient.fullName} (${patient.age}${patient.gender[0]}, ${patient.id}) has ${records.length} authorized medical record(s) on file across participating facilities. Active documented conditions include ${patient.conditions.map((c) => c.name).join(', ') || 'none recorded'}.`,
    documentedConditions: patient.conditions.map((c) => ({
      statement: `${c.name} (${c.status}) documented at ${c.documentingHospital}.`,
      sourceRecordIds: [c.sourceRecordId],
      category: 'condition',
    })),
    medicationHistorySummary: patient.medications.map((m) => ({
      statement: `${m.name} ${m.strength} (${m.frequency}) prescribed by ${m.prescribingClinician} at ${m.hospital}.`,
      sourceRecordIds: [m.sourceRecordId],
      category: 'medication',
    })),
    notableLabChanges: sorted
      .filter((r) => r.labResults && r.labResults.length > 0)
      .map((r) => ({
        statement: `${r.date} (${r.hospital}): ${r.labResults!.map((l) => `${l.testName} ${l.value} ${l.unit}`).join(', ')}.`,
        sourceRecordIds: [r.id],
        category: 'lab_change',
      })),
    recentVisitsAndFollowUps: sorted.slice(-2).map((r) => ({
      statement: `${r.date} — ${r.title}: ${r.followUpRecommendation || r.summaryNotes}`,
      sourceRecordIds: [r.id],
      category: 'followup',
    })),
    missingOrConflictingInfo:
      recIds.length < 2
        ? ['Limited longitudinal history: fewer than 2 multi-hospital visits are available for serial trend comparison.']
        : ['No conflicting laboratory units detected in the currently available records for this patient.'],
  };
}

// Fallback generator for Patient AI Health Assistant
function buildFallbackPatientAIResponse(
  question: string,
  patient: Patient,
  records: MedicalRecord[]
): PatientAIResponse {
  const qLower = question.toLowerCase();
  const emergencyKeywords = ['chest pain', 'shortness of breath', 'cant breathe', 'fainting', 'severe bleeding', 'stroke', 'suicidal', 'swelling of lips', 'anaphylaxis'];
  const emergencyWarningDetected = emergencyKeywords.some((kw) => qLower.includes(kw));

  if (emergencyWarningDetected) {
    return {
      id: `PAI-${Date.now()}`,
      question,
      timestamp: nowTimestamp(),
      aiMode: 'demo-fallback',
      simpleAnswer:
        'Your message mentions symptoms that could be a medical emergency. Please seek urgent in-person medical evaluation or call your local emergency services immediately rather than relying on this assistant.',
      fromYourRecords: patient.allergies.map((a) => ({
        statement: `Documented allergy to ${a.substance} (${a.severity}): ${a.reaction}`,
        recordId: a.sourceRecordId,
        recordDate: '2025-11-15',
        hospital: patient.registeringHospital,
      })),
      generalEducationalContext:
        'Warning signs such as chest pressure, difficulty breathing, sudden weakness, or facial/throat swelling require immediate clinical assessment.',
      uncertaintyAndMissingInfo: [
        'This AI assistant cannot examine you, check your vital signs, or rule out life-threatening conditions.',
      ],
      recommendedNextStep:
        'Contact local emergency medical services or go to the nearest hospital emergency department immediately.',
      safetyNotice:
        'EMERGENCY WARNING: If you are experiencing severe symptoms, do not wait. Seek emergency medical care right away.',
      emergencyWarningDetected: true,
    };
  }

  if (qLower.includes('blood test') || qLower.includes('lab') || qLower.includes('changed') || qLower.includes('result')) {
    return {
      id: `PAI-${Date.now()}`,
      question,
      timestamp: nowTimestamp(),
      aiMode: 'demo-fallback',
      simpleAnswer:
        'Your recent laboratory reports show encouraging progress in both your cholesterol and blood sugar levels, while your kidney function (eGFR) has remained relatively steady around 58 to 62 mL/min/1.73m².',
      fromYourRecords: [
        {
          statement: 'On September 14, 2026, your HbA1c (3-month average blood sugar measure) was 7.8% (improved from 8.1% in May 2026), and your LDL ("bad") cholesterol dropped into the normal range at 88 mg/dL (reference: under 100 mg/dL).',
          recordId: 'REC-106',
          recordDate: '2026-09-14',
          hospital: 'St. Jude Cardiac & Specialty Center',
        },
        {
          statement: 'On October 18, 2026, a follow-up lab report showed Fasting Plasma Glucose at 118 mg/dL and eGFR (kidney filtration estimate) at 62 mL/min/1.73m². Note: This October 18 report is currently marked "Needs Review" until your doctor verifies the extracted numbers.',
          recordId: 'REC-107',
          recordDate: '2026-10-18',
          hospital: 'Metro General Hospital',
        },
        {
          statement: 'In May 2026, City Apollo Diagnostics reported your fasting sugar as 9.2 mmol/L using a different unit scale (mmol/L instead of mg/dL).',
          recordId: 'REC-104',
          recordDate: '2026-05-18',
          hospital: 'City Apollo Diagnostics & Clinic',
        },
      ],
      generalEducationalContext:
        'HbA1c measures average blood sugar over roughly 2 to 3 months. eGFR estimates how well the kidneys filter waste; when starting a medicine like Empagliflozin, a small temporary dip followed by stabilization is commonly observed and monitored by doctors.',
      uncertaintyAndMissingInfo: [
        'Your October 18, 2026 lab report (REC-107) has been extracted into the system but is still awaiting final clinician sign-off.',
        'The May 2026 glucose test (REC-104) used mmol/L units rather than mg/dL, so those raw numbers should not be compared directly without unit conversion.',
      ],
      recommendedNextStep:
        'Bring your home blood pressure and blood sugar log to your upcoming follow-up with Dr. Vikram Mehta so he can confirm your October 18 lab results (REC-107).',
      safetyNotice:
        'Educational summary only — always confirm test interpretations and treatment targets with your healthcare provider. Never change medication doses on your own.',
      emergencyWarningDetected: false,
    };
  }

  if (qLower.includes('medicine') || qLower.includes('medication') || qLower.includes('prescription') || qLower.includes('pill')) {
    return {
      id: `PAI-${Date.now()}`,
      question,
      timestamp: nowTimestamp(),
      aiMode: 'demo-fallback',
      simpleAnswer: `Your clinician-verified records list ${patient.medications.length} active medications. Each medicine plays a specific role in managing your documented health conditions.`,
      fromYourRecords: patient.medications.map((m) => ({
        statement: `${m.name} ${m.strength} (${m.dose}, ${m.frequency}) — Prescribed by ${m.prescribingClinician} at ${m.hospital}. Documented reason in record: ${m.documentedReason || 'Not explicitly recorded on slip'}.`,
        recordId: m.sourceRecordId,
        recordDate: m.startDate,
        hospital: m.hospital,
      })),
      generalEducationalContext:
        'Metformin and Empagliflozin help manage blood sugar in Type 2 Diabetes (and Empagliflozin also supports kidney and heart health). Telmisartan helps control blood pressure and protect the kidneys. Atorvastatin is commonly used to lower LDL cholesterol.',
      uncertaintyAndMissingInfo: [
        'For Atorvastatin 20 mg (REC-105), the uploaded clinic slip did not explicitly list the prescribing reason, though your LDL cholesterol subsequently improved from 118 mg/dL to 88 mg/dL.',
      ],
      recommendedNextStep:
        'Continue taking your clinician-approved medicines as directed and ask Dr. Vikram Mehta if you have any questions about timing or side effects.',
      safetyNotice:
        'Do not stop, start, or change the dose of any prescription medication without speaking to your prescribing doctor.',
      emergencyWarningDetected: false,
    };
  }

  // Default comprehensive answer covering discharge summary / follow-ups / next appointment questions
  const latestRec = records[records.length - 1];
  return {
    id: `PAI-${Date.now()}`,
    question,
    timestamp: nowTimestamp(),
    aiMode: 'demo-fallback',
    simpleAnswer:
      'Based on your latest hospital summary from St. Jude Cardiac & Specialty Center (REC-106) and your recent October lab check (REC-107), your care team is closely monitoring your blood sugar, blood pressure, and kidney filtration after adding Empagliflozin 10 mg.',
    fromYourRecords: [
      {
        statement: 'Discharge/Day-Care Summary (REC-106) documents that Empagliflozin 10 mg once daily was added on September 14, 2026 alongside Metformin XR 500 mg twice daily and Telmisartan 40 mg once daily.',
        recordId: 'REC-106',
        recordDate: '2026-09-14',
        hospital: 'St. Jude Cardiac & Specialty Center',
      },
      {
        statement: 'Recommended Follow-Up in REC-106: Recheck kidney function (Serum Creatinine and eGFR) and potassium 4 weeks after starting Empagliflozin, and review home blood pressure and glucose logs.',
        recordId: 'REC-106',
        recordDate: '2026-09-14',
        hospital: 'St. Jude Cardiac & Specialty Center',
      },
      ...(latestRec
        ? [
            {
              statement: `Most recent uploaded record (${latestRec.id} on ${latestRec.date}): ${latestRec.summaryNotes}`,
              recordId: latestRec.id,
              recordDate: latestRec.date,
              hospital: latestRec.hospital,
            },
          ]
        : []),
    ],
    generalEducationalContext:
      'Preparing a short list of questions before your appointment helps you and your doctor review whether new medications are working well and what preventive screenings are due next.',
    uncertaintyAndMissingInfo: [
      'Your baseline endocrinology record (REC-101) recommended an annual retinal eye exam, and no eye exam report has been uploaded to your timeline yet.',
    ],
    recommendedNextStep:
      'Suggested questions for your next visit: (1) "Does my October 18 kidney test (REC-107) look stable after starting Empagliflozin?" (2) "Should I schedule my diabetic eye screening now?"',
    safetyNotice:
      'This summary is based solely on your uploaded OneHealth AI records and general health education. Always consult your physician for personalized medical advice.',
    emergencyWarningDetected: false,
  };
}

// Fallback generator for Doctor Clinical Intelligence Copilot
function buildFallbackClinicalCopilotResponse(
  question: string,
  patient: Patient,
  records: MedicalRecord[]
): ClinicalCopilotResponse {
  const qLower = question.toLowerCase();

  if (qLower.includes('atorvastatin') || qLower.includes('why might') || qLower.includes('medication') || qLower.includes('explain med')) {
    return {
      id: `COP-${Date.now()}`,
      question,
      timestamp: nowTimestamp(),
      aiMode: 'demo-fallback',
      shortAnswer:
        'The available records show explicit prescribing rationales for Metformin XR (REC-101), Telmisartan (REC-102), and Empagliflozin (REC-106), whereas the original prescribing rationale for Atorvastatin 20 mg (REC-105) is NOT explicitly documented on the source prescription slip.',
      patientRecordEvidence: [
        {
          finding: 'Atorvastatin Calcium 20 mg PO HS prescribed by Dr. R. Narayanan on 2026-06-02. Source prescription slip contains no diagnosis code or written indication.',
          recordId: 'REC-105',
          date: '2026-06-02',
          sourceHospital: 'City Apollo Diagnostics & Clinic',
        },
        {
          finding: 'Prior to REC-105, patient had documented Type 2 Diabetes Mellitus (REC-101) and elevated LDL Cholesterol of 128 mg/dL (REC-101) and 118 mg/dL (REC-104). Following Atorvastatin initiation, LDL decreased to 88 mg/dL (REC-106).',
          recordId: 'REC-104',
          date: '2026-05-18',
          sourceHospital: 'City Apollo Diagnostics & Clinic',
        },
        {
          finding: 'Empagliflozin 10 mg OD (REC-106) and Telmisartan 40 mg OD (REC-102) have explicit documented rationales: glycemic/cardiorenal protection (eGFR 58) and hypertension with microalbuminuria (uACR 42 mg/g).',
          recordId: 'REC-106',
          date: '2026-09-14',
          sourceHospital: 'St. Jude Cardiac & Specialty Center',
        },
      ],
      clinicalContextAndReasoning:
        'The available records show that Atorvastatin 20 mg was started two weeks after an elevated LDL-C of 118 mg/dL (REC-104) in a 52-year-old patient with Type 2 Diabetes and hypertension. While HMG-CoA reductase inhibitors (statins) are commonly used for primary atherosclerotic cardiovascular disease (ASCVD) risk reduction and dyslipidemia management in patients aged 40–75 with diabetes, the original prescriber’s specific rationale or target LDL threshold is not recorded in REC-105.',
      prescribingRationaleStatus: {
        medication: 'Atorvastatin Calcium 20 mg (REC-105) & Empagliflozin 10 mg (REC-106)',
        explicitlyDocumentedInRecord: false,
        documentedReasonOrNote:
          'Atorvastatin (REC-105): Original prescribing rationale is NOT recorded on the uploaded prescription slip. Empagliflozin (REC-106) & Telmisartan (REC-102): Explicitly documented for T2DM cardiorenal protection and hypertension with microalbuminuria.',
        commonApprovedIndication:
          'Atorvastatin is an HMG-CoA reductase inhibitor commonly indicated for reducing LDL-C and cardiovascular risk in patients with Type 2 Diabetes Mellitus and/or hypercholesterolemia.',
      },
      potentialRisksAndInteractions: [
        'Allergy Verification: Patient has a severe documented allergy to Penicillin/Amoxicillin (hives/angioedema) and moderate allergy to Sulfonamide antibiotics (REC-101). None of the current active medications (Metformin, Telmisartan, Atorvastatin, Empagliflozin) are beta-lactams or sulfonamide antimicrobials.',
        'Renal Dosing Watch: eGFR was 58 mL/min/1.73m² on 2026-09-14 (REC-106) and 62 mL/min/1.73m² on unverified REC-107. Metformin XR 500 mg BID remains appropriate above eGFR 45 mL/min/1.73m², but renal trajectory should be monitored.',
        'Volume Depletion / Hypotension: Co-administration of Empagliflozin (osmotic diuresis) and Telmisartan (ARB) warrants monitoring of blood pressure and serum creatinine/potassium.',
      ],
      missingInformationAndUncertainty: [
        'Explicit prescribing rationale for Atorvastatin 20 mg is absent from REC-105.',
        'Baseline and follow-up hepatic transaminases (ALT/AST) and creatine kinase (CK) are not present in the uploaded laboratory records.',
        'REC-107 (2026-10-18) is still marked "Needs Review" and awaits clinician verification.',
      ],
      supportingReferences: [
        {
          title: 'KDIGO 2022 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease (SGLT2i & RAS Blockade)',
          organization: 'Kidney Disease: Improving Global Outcomes (KDIGO)',
          yearOrVersion: '2022',
          verificationNote: 'General clinical reference context — Reference verification unavailable in demo mode.',
        },
        {
          title: 'ADA Standards of Care in Diabetes — Cardiovascular Disease and Risk Management (Statin Therapy in Diabetes)',
          organization: 'American Diabetes Association (ADA)',
          yearOrVersion: '2025/2026',
          verificationNote: 'General clinical reference context — Reference verification unavailable in demo mode.',
        },
      ],
      suggestedClinicianChecks: [
        'Confirm indication for Atorvastatin 20 mg with the patient or external clinic note and document ASCVD prevention goal in the problem list.',
        'Verify machine-extracted renal values in REC-107 (Creatinine 1.10 mg/dL, eGFR 62 mL/min/1.73m²) against the source lab report.',
        'Consider ordering a baseline hepatic transaminase (ALT/AST) and repeat spot urine ACR at the next scheduled review.',
      ],
    };
  }

  if (qLower.includes('compare') || qLower.includes('lab') || qLower.includes('test')) {
    return {
      id: `COP-${Date.now()}`,
      question,
      timestamp: nowTimestamp(),
      aiMode: 'demo-fallback',
      shortAnswer:
        'Serial laboratory comparison across REC-101, REC-104, REC-106, and unverified REC-107 shows HbA1c peaking at 8.1% (May 2026) before declining to 7.8% (Sep 2026), LDL-C improving from 128 to 88 mg/dL, and eGFR stabilizing at 62 mL/min/1.73m² after an initial dip to 58 mL/min/1.73m². Direct numerical comparison of Fasting Glucose in REC-104 (9.2 mmol/L) with REC-101/106 (mg/dL) is flagged due to incompatible units.',
      patientRecordEvidence: [
        {
          finding: 'HbA1c (HPLC %): 7.4% (2025-11-15, REC-101) -> 8.1% (2026-05-18, REC-104) -> 7.8% (2026-09-14, REC-106). All measured in % (NGSP).',
          recordId: 'REC-106',
          date: '2026-09-14',
          sourceHospital: 'St. Jude Cardiac & Specialty Center',
        },
        {
          finding: 'Serum Creatinine & eGFR: 0.92 mg/dL / eGFR 74 (REC-101, Enzymatic) -> 1.12 mg/dL / eGFR 61 (REC-104, Jaffe Kinetic) -> 1.18 mg/dL / eGFR 58 (REC-106, Enzymatic) -> 1.10 mg/dL / eGFR 62 (REC-107, Unverified).',
          recordId: 'REC-107',
          date: '2026-10-18',
          sourceHospital: 'Metro General Hospital',
        },
        {
          finding: 'Fasting Glucose Unit Discrepancy: 148 mg/dL (REC-101) vs. 9.2 mmol/L (REC-104) vs. 134 mg/dL (REC-106) vs. 118 mg/dL (REC-107).',
          recordId: 'REC-104',
          date: '2026-05-18',
          sourceHospital: 'City Apollo Diagnostics & Clinic',
        },
      ],
      clinicalContextAndReasoning:
        '1. Glycemic & Lipid Trajectory: Addition of Atorvastatin 20 mg (REC-105) correlates temporally with LDL reduction from 118 to 88 mg/dL. Addition of Empagliflozin 10 mg (REC-106) is followed by improved fasting glucose (134 -> 118 mg/dL in REC-107).\n2. Renal Trajectory & Assay Nuance: Between REC-101 and REC-104, creatinine was assayed by different methods (Enzymatic IDMS vs. Jaffe alkaline picrate), which can introduce minor analytical bias. After Empagliflozin initiation on 2026-09-14 (eGFR 58), the 4-week check in REC-107 shows eGFR 62 mL/min/1.73m², consistent with preservation of glomerular filtration.',
      potentialRisksAndInteractions: [
        'Do not compare 9.2 mmol/L (REC-104) directly against 134 mg/dL (REC-106) without applying the standard molar conversion (9.2 mmol/L × 18.018 ≈ 166 mg/dL).',
        'REC-107 values are currently machine-extracted ("Needs Review") and must be verified before modifying medication dosages.',
      ],
      missingInformationAndUncertainty: [
        'Follow-up spot urine Albumin-to-Creatinine Ratio (uACR) has not been repeated since the baseline 42 mg/g in REC-102 (2026-02-12).',
        'No HbA1c measurement is included in the 4-week post-Empagliflozin panel (REC-107), as HbA1c requires 8–12 weeks to reflect steady-state glycemic change.',
      ],
      supportingReferences: [
        {
          title: 'Clinical Laboratory Standards: Enzymatic IDMS vs. Jaffe Creatinine Assay Comparability',
          organization: 'National Kidney Disease Education Program (NKDEP)',
          yearOrVersion: 'Reference Summary',
          verificationNote: 'Reference verification unavailable in demo mode.',
        },
      ],
      suggestedClinicianChecks: [
        'Verify and sign off on staged lab report REC-107 in the Medical Records module.',
        'Order repeat spot urine ACR and HbA1c at the December 2026 quarterly visit.',
      ],
    };
  }

  // General handover / history / missing info / interactions fallback
  return {
    id: `COP-${Date.now()}`,
    question,
    timestamp: nowTimestamp(),
    aiMode: 'demo-fallback',
    shortAnswer: `Clinical handover & synthesis for ${patient.fullName} (${patient.id}): ${patient.age}-year-old ${patient.gender.toLowerCase()} with ${patient.conditions.map((c) => c.name).join('; ')}. Currently prescribed ${patient.medications.map((m) => `${m.name} ${m.strength}`).join(', ')}.`,
    patientRecordEvidence: records.slice(-4).map((r) => ({
      finding: `${r.title} (${r.reviewStatus}): ${r.summaryNotes}`,
      recordId: r.id,
      date: r.date,
      sourceHospital: r.hospital,
    })),
    clinicalContextAndReasoning:
      'The available longitudinal records demonstrate multi-facility care across participating hospitals. Documented severe allergies and renal/hematologic trajectories are linked directly to source records above. Clinical interpretation should account for any unverified ("Needs Review") staged extractions.',
    potentialRisksAndInteractions: [
      ...patient.allergies.map(
        (a) => `Documented Allergy (${a.severity}): ${a.substance} — ${a.reaction} (Source: ${a.sourceRecordId}).`
      ),
      'Medication safety check requires verification against an approved clinical pharmacology database before issuing new prescriptions.',
    ],
    missingInformationAndUncertainty: [
      records.some((r) => r.reviewStatus === 'Needs Review')
        ? `Staged record(s) (${records.filter((r) => r.reviewStatus === 'Needs Review').map((r) => r.id).join(', ')}) remain in "Needs Review" status.`
        : 'All currently uploaded records for this patient have been marked Clinician-Verified.',
      'External over-the-counter supplements or unrecorded outside clinic visits cannot be excluded without patient medication reconciliation.',
    ],
    supportingReferences: [
      {
        title: 'WHO / Clinical Handover & Medication Reconciliation Patient Safety Solutions',
        organization: 'World Health Organization (WHO)',
        yearOrVersion: 'Clinical Safety Standard',
        verificationNote: 'Reference verification unavailable in demo mode.',
      },
    ],
    suggestedClinicianChecks: [
      'Perform verbal medication reconciliation with the patient.',
      'Review any pending prescription drafts in the Prescription Review workspace.',
    ],
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. GET /api/state — Role-aware state retrieval
  app.get('/api/state', (req, res) => {
    const role = (req.query.role as UserRole) || 'doctor';
    const patientId = (req.query.patientId as string) || 'P1001';

    // CRITICAL PRIVACY BOUNDARY: Public-Health Analyst NEVER receives identifiable patients or records
    if (role === 'analyst') {
      return res.json({
        aiConfigured: hasValidGeminiKey(),
        patients: [],
        records: [],
        prescriptionDrafts: [],
        publicHealthSeries: db.publicHealthSeries,
        publicHealthSignals: db.publicHealthSignals,
        notifications: db.notifications.filter(
          (n) => n.recipientRole === 'analyst' || n.recipientRole === 'all'
        ),
        auditLogs: db.auditLogs.map((log) => ({
          ...log,
          // Mask any patient name in analyst audit view
          targetIdentifier: log.targetIdentifier.replace(/\(Patient [^)]+\)/g, '(De-identified Record)'),
        })),
        abdmExchangeLogs: [],
        consultationQueue: [],
        facilityStaffConfig: db.facilityStaffConfig || [],
      });
    }

    if (!Array.isArray(db.patients) || db.patients.length === 0) {
      db = createInitialSeedState();
      saveStore(db);
    }

    if (role === 'patient') {
      const myPatient = db.patients.find((p) => p.id === patientId) || db.patients[0];
      const myRecords = db.records.filter((r) => r.patientId === myPatient.id);
      const myDrafts = db.prescriptionDrafts.filter(
        (d) => d.patientId === myPatient.id
      );
      return res.json({
        aiConfigured: hasValidGeminiKey(),
        patients: db.patients,
        records: myRecords,
        prescriptionDrafts: myDrafts,
        publicHealthSeries: [],
        publicHealthSignals: [],
        notifications: db.notifications.filter(
          (n) =>
            (n.recipientRole === 'patient' || n.recipientRole === 'all') &&
            (!n.patientId || n.patientId === myPatient.id)
        ),
        auditLogs: db.auditLogs.filter(
          (a) => a.targetIdentifier.includes(myPatient.id) || a.actorIdentity.includes(myPatient.id)
        ),
        abdmExchangeLogs: (db.abdmExchangeLogs || []).filter((e) => e.patientId === myPatient.id),
        consultationQueue: [],
        facilityStaffConfig: [],
      });
    }

    // Doctor & Admin roles
    return res.json({
      aiConfigured: hasValidGeminiKey(),
      patients: db.patients,
      records: db.records,
      prescriptionDrafts: db.prescriptionDrafts,
      publicHealthSeries: db.publicHealthSeries,
      publicHealthSignals: db.publicHealthSignals,
      notifications: db.notifications.filter(
        (n) => n.recipientRole === role || n.recipientRole === 'all'
      ),
      auditLogs: db.auditLogs,
      abdmExchangeLogs: db.abdmExchangeLogs || [],
      consultationQueue: db.consultationQueue || [],
      facilityStaffConfig: db.facilityStaffConfig || [],
    });
  });

  // 2. POST /api/reset — Instant reset to factory seed data
  app.post('/api/reset', (req, res) => {
    db = createInitialSeedState();
    saveStore(db);
    addAuditLog(
      'admin',
      'Evaluator Demo Control',
      'Reset Prototype Store to Initial Seed Data',
      'System Store',
      'Completed',
      'All synthetic patients, records, permissions, and signals restored to baseline.'
    );
    saveStore(db);
    res.json({ status: 'ok', message: 'Demo data reset to initial seed state.' });
  });

  // 3. POST /api/patients — Register new synthetic patient with duplicate check
  app.post('/api/patients', (req, res) => {
    const {
      fullName,
      dateOfBirth,
      age,
      gender,
      bloodGroup,
      preferredLanguage,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      registeringHospital,
      assignedClinician,
      allergiesText,
      conditionsText,
      medicationsText,
      consentGranted,
      forceCreateDespiteDuplicate,
      actorRole = 'admin',
      actorIdentity = 'Priya Nair, MHA',
    } = req.body;

    if (!fullName || !dateOfBirth || !registeringHospital) {
      return res.status(400).json({ error: 'Full name, date of birth, and registering hospital are required.' });
    }

    // Check for potential duplicate by normalized name or same DOB + similar name
    const normalizedName = fullName.trim().toLowerCase();
    const potentialDuplicates = db.patients.filter(
      (p) =>
        p.fullName.trim().toLowerCase() === normalizedName ||
        (p.dateOfBirth === dateOfBirth &&
          p.fullName.toLowerCase().includes(normalizedName.split(' ')[0]))
    );

    if (potentialDuplicates.length > 0 && !forceCreateDespiteDuplicate) {
      return res.status(409).json({
        duplicateWarning: true,
        message: `Potential duplicate record detected: ${potentialDuplicates.map((d) => `${d.fullName} (${d.id}, DOB: ${d.dateOfBirth})`).join(', ')}. OneHealth AI never silently merges records. Confirm if this is a distinct individual.`,
        existingPatients: potentialDuplicates,
      });
    }

    const nextNum = 1001 + db.patients.length;
    const newId = `P${nextNum}`;
    const initialRecId = `REC-${nextNum}-INIT`;

    const calculatedAge =
      typeof age === 'number' && !Number.isNaN(age)
        ? age
        : Math.max(0, new Date().getFullYear() - new Date(dateOfBirth).getFullYear());

    const newPatient: Patient = {
      id: newId,
      fullName: fullName.trim(),
      dateOfBirth,
      age: calculatedAge,
      gender: gender || 'Prefer not to specify',
      bloodGroup: bloodGroup || 'Unknown',
      preferredLanguage: preferredLanguage || 'English',
      emergencyContact: {
        name: emergencyContactName || 'Not provided (Synthetic Demo)',
        relation: emergencyContactRelation || 'Contact',
        phone: emergencyContactPhone || 'DEMO-555-0199',
      },
      registeringHospital,
      assignedClinician: assignedClinician || 'Dr. Vikram Mehta, MD',
      assignedClinicianId: 'DOC-101',
      registeredAt: new Date().toISOString(),
      allergies: allergiesText
        ? [
            {
              id: `ALG-${Date.now()}`,
              substance: allergiesText,
              reaction: 'Reported at registration intake',
              severity: 'Moderate',
              sourceRecordId: initialRecId,
              verifiedStatus: 'Patient-Reported',
            },
          ]
        : [],
      conditions: conditionsText
        ? [
            {
              id: `COND-${Date.now()}`,
              name: conditionsText,
              diagnosedDate: new Date().toISOString().slice(0, 10),
              status: 'Active',
              documentingHospital: registeringHospital,
              sourceRecordId: initialRecId,
            },
          ]
        : [],
      medications: medicationsText
        ? [
            {
              id: `MED-${Date.now()}`,
              name: medicationsText,
              strength: 'As reported at intake',
              dose: 'See intake note',
              route: 'Oral',
              frequency: 'Daily',
              startDate: new Date().toISOString().slice(0, 10),
              prescribingClinician: assignedClinician || 'Dr. Vikram Mehta, MD',
              hospital: registeringHospital,
              documentedReason: 'Documented during registration intake',
              status: 'Active',
              sourceRecordId: initialRecId,
            },
          ]
        : [],
      sharingPermissions: [
        {
          id: `PERM-${Date.now()}-1`,
          patientId: newId,
          entityName: `${assignedClinician || 'Dr. Vikram Mehta, MD'} (${registeringHospital})`,
          entityType: 'Doctor',
          entityId: 'DOC-101',
          categoriesShared: ['Lab Reports', 'Prescriptions', 'Consultation Notes', 'Allergies'],
          purpose: 'Primary Care & Clinical Coordination',
          status: consentGranted !== false ? 'Active' : 'Revoked',
          grantedAt: new Date().toISOString().slice(0, 10),
          expiresAt: '2027-10-24',
        },
      ],
    };

    const intakeRecord: MedicalRecord = {
      id: initialRecId,
      patientId: newId,
      title: 'Initial Hospital Registration & Clinical Intake Summary',
      category: 'Consultation Note',
      date: new Date().toISOString().slice(0, 10),
      hospital: registeringHospital,
      clinician: assignedClinician || 'Dr. Vikram Mehta, MD',
      specialty: 'Internal Medicine',
      reviewStatus: 'Verified',
      provenance: 'Clinician-Verified',
      uploadedBy: actorIdentity,
      uploadedAt: new Date().toISOString(),
      verifiedBy: assignedClinician || 'Dr. Vikram Mehta, MD',
      verifiedAt: new Date().toISOString(),
      summaryNotes: `Registered ${newPatient.fullName} (${newId}) at ${registeringHospital}. Allergies: ${allergiesText || 'None reported'}. Conditions: ${conditionsText || 'None reported'}. Medications: ${medicationsText || 'None reported'}.`,
      originalDocumentText: `${registeringHospital.toUpperCase()} — PATIENT REGISTRATION & INTAKE RECORD (SYNTHETIC)\nPatient ID: ${newId} | Name: ${newPatient.fullName} | DOB: ${dateOfBirth}\nAssigned Clinician: ${assignedClinician || 'Dr. Vikram Mehta, MD'}\nReported Allergies: ${allergiesText || 'None reported'}\nExisting Conditions: ${conditionsText || 'None reported'}\nCurrent Medications: ${medicationsText || 'None reported'}`,
      documentedDiagnosis: conditionsText || 'Initial registration intake',
      followUpRecommendation: 'Complete baseline clinical evaluation and upload diagnostic reports.',
    };

    db.patients.unshift(newPatient);
    db.records.push(intakeRecord);

    addNotification(
      'doctor',
      `New Patient Registered: ${newPatient.fullName} (${newId})`,
      `${newPatient.fullName} was registered at ${registeringHospital} and assigned to ${newPatient.assignedClinician}.`,
      'record_upload',
      'patients',
      newId
    );

    addAuditLog(
      actorRole,
      actorIdentity,
      'Registered New Synthetic Patient & Intake Record',
      `Patient ${newId} (${newPatient.fullName})`,
      'Completed',
      `Created patient profile ${newId} at ${registeringHospital} with initial consent status: ${consentGranted !== false ? 'Active' : 'Revoked'}.`
    );

    saveStore(db);
    return res.status(201).json({ patient: newPatient, initialRecord: intakeRecord });
  });

  // 4. POST /api/records — Upload / create a medical document record
  app.post('/api/records', (req, res) => {
    const {
      patientId,
      title,
      category,
      date,
      hospital,
      clinician,
      specialty,
      reviewStatus = 'Needs Review',
      provenance = 'Machine-Extracted — Needs Review',
      uploadedBy = 'Dr. Vikram Mehta, MD',
      actorRole = 'doctor',
      summaryNotes,
      originalDocumentText,
      fileName,
      fileMimeType,
      documentedDiagnosis,
      followUpRecommendation,
      labResults,
      prescribedMedications,
    } = req.body;

    if (!patientId || !title || !category || !date || !hospital) {
      return res.status(400).json({ error: 'Patient, title, category, date, and hospital are required.' });
    }

    const newRecord: MedicalRecord = {
      id: `REC-${100 + db.records.length + 1}`,
      patientId,
      title,
      category,
      date,
      hospital,
      clinician: clinician || 'Dr. Vikram Mehta, MD',
      specialty: specialty || 'Internal Medicine',
      reviewStatus,
      provenance,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      verifiedBy: reviewStatus === 'Verified' ? uploadedBy : undefined,
      verifiedAt: reviewStatus === 'Verified' ? new Date().toISOString() : undefined,
      summaryNotes: summaryNotes || `${category} uploaded from ${hospital}.`,
      originalDocumentText:
        originalDocumentText ||
        `${hospital.toUpperCase()} — ${category.toUpperCase()} (SYNTHETIC RECORD)\nDate: ${date} | Clinician: ${clinician}\nSummary: ${summaryNotes}`,
      fileName,
      fileMimeType,
      documentedDiagnosis,
      followUpRecommendation,
      labResults: Array.isArray(labResults) ? labResults : undefined,
      prescribedMedications: Array.isArray(prescribedMedications) ? prescribedMedications : undefined,
    };

    db.records.push(newRecord);

    addNotification(
      reviewStatus === 'Needs Review' ? 'doctor' : 'patient',
      reviewStatus === 'Needs Review'
        ? `Record ${newRecord.id} Awaiting Clinician Verification`
        : `New Verified ${newRecord.category} Added (${newRecord.id})`,
      `${newRecord.title} (${newRecord.hospital}, ${newRecord.date}) was added for patient ${patientId}.`,
      reviewStatus === 'Needs Review' ? 'verification_needed' : 'record_upload',
      'records',
      patientId
    );

    addAuditLog(
      actorRole,
      uploadedBy,
      `Uploaded Medical Record (${newRecord.category} — ${newRecord.reviewStatus})`,
      `Record ${newRecord.id} (Patient ${patientId})`,
      reviewStatus === 'Needs Review' ? 'Flagged for Review' : 'Completed',
      `Added ${newRecord.title} from ${hospital} with provenance: ${provenance}.`
    );

    saveStore(db);
    return res.status(201).json({ record: newRecord });
  });

  // 5. PATCH /api/records/:id — Edit extracted metadata or verify record
  app.patch('/api/records/:id', (req, res) => {
    const { id } = req.params;
    const record = db.records.find((r) => r.id === id);
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found.' });
    }

    const {
      title,
      date,
      hospital,
      clinician,
      summaryNotes,
      documentedDiagnosis,
      followUpRecommendation,
      labResults,
      prescribedMedications,
      markVerified,
      requestApproval,
      actorRole = 'doctor',
      actorIdentity = 'Dr. Vikram Mehta, MD',
    } = req.body;

    if (title !== undefined) record.title = title;
    if (date !== undefined) record.date = date;
    if (hospital !== undefined) record.hospital = hospital;
    if (clinician !== undefined) record.clinician = clinician;
    if (summaryNotes !== undefined) record.summaryNotes = summaryNotes;
    if (documentedDiagnosis !== undefined) record.documentedDiagnosis = documentedDiagnosis;
    if (followUpRecommendation !== undefined) record.followUpRecommendation = followUpRecommendation;
    if (Array.isArray(labResults)) record.labResults = labResults;
    if (Array.isArray(prescribedMedications)) record.prescribedMedications = prescribedMedications;

    if (markVerified) {
      record.reviewStatus = 'Verified';
      record.provenance = 'Clinician-Verified';
      record.verifiedBy = actorIdentity;
      record.verifiedAt = new Date().toISOString();

      addNotification(
        'patient',
        `Clinician Verified Record ${record.id}`,
        `${actorIdentity} reviewed and verified ${record.title} (${record.date}).`,
        'doctor_review',
        'timeline',
        record.patientId
      );

      addAuditLog(
        actorRole,
        actorIdentity,
        'Verified Extracted Medical Record',
        `Record ${record.id} (Patient ${record.patientId})`,
        'Completed',
        `Transitioned ${record.id} from "Needs Review" to "Clinician-Verified".`
      );
    } else if (requestApproval) {
      record.provenance = 'Machine-Extracted — Needs Review';
      if (!record.summaryNotes.includes('[Approval Requested]')) {
        record.summaryNotes = `${record.summaryNotes} [Approval Requested]`;
      }
      addNotification(
        'doctor',
        `Approval Requested for Record ${record.id}`,
        `${actorIdentity} requested clinician review and sign-off for ${record.title} (${record.date}).`,
        'verification_needed',
        'records',
        record.patientId
      );
      addAuditLog(
        actorRole,
        actorIdentity,
        'Submitted Record Verification / Approval Request',
        `Record ${record.id} (Patient ${record.patientId})`,
        'Flagged for Review',
        `${actorIdentity} requested clinician approval for ${record.id}.`
      );
    } else {
      addAuditLog(
        actorRole,
        actorIdentity,
        'Updated Structured Metadata on Medical Record',
        `Record ${record.id} (Patient ${record.patientId})`,
        'Completed',
        `Updated structured fields on ${record.id} while preserving original document text.`
      );
    }

    saveStore(db);
    return res.json({ record });
  });

  // 6. POST /api/prescriptions — Create a new prescription draft
  app.post('/api/prescriptions', (req, res) => {
    const {
      patientId,
      medicationName,
      strength,
      dose,
      route = 'Oral',
      frequency,
      duration,
      instructions,
      supportingRationale,
      allergyCheckSummary,
      interactionCheckSummary,
      sourceRecordIds = [],
      createdBy = 'Dr. Vikram Mehta, MD',
      status = 'Awaiting Clinician Review',
    } = req.body;

    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const draft: PrescriptionDraft = {
      id: `RX-${2000 + db.prescriptionDrafts.length + 1}`,
      patientId: patient.id,
      patientName: patient.fullName,
      medicationName,
      strength,
      dose,
      route,
      frequency,
      duration,
      instructions,
      supportingRationale,
      allergyCheckSummary:
        allergyCheckSummary ||
        `Checked against ${patient.allergies.map((a) => a.substance).join(', ') || 'No known allergies'}.`,
      interactionCheckSummary:
        interactionCheckSummary ||
        `Checked against active medications: ${patient.medications.map((m) => m.name).join(', ') || 'None'}.`,
      sourceRecordIds,
      createdBy,
      createdAt: new Date().toISOString(),
      reviewingClinician: 'Dr. Vikram Mehta, MD',
      status,
      approvalHistory: [
        {
          id: `HIST-${Date.now()}`,
          timestamp: nowTimestamp().slice(0, 16),
          actorName: createdBy,
          actorRole: createdBy.includes('Copilot') ? 'AI Decision Support' : 'Doctor',
          action: `Created prescription proposal (${status})`,
        },
      ],
    };

    db.prescriptionDrafts.unshift(draft);

    addNotification(
      'doctor',
      `Prescription Draft ${draft.id} (${draft.status})`,
      `Draft for ${draft.medicationName} ${draft.strength} (${patient.fullName}) is staged for clinician review.`,
      'prescription_status',
      'prescriptions',
      patient.id
    );

    addAuditLog(
      'doctor',
      createdBy,
      `Created Prescription Draft (${draft.status})`,
      `Draft ${draft.id} (Patient ${patient.id})`,
      'Flagged for Review',
      `Staged ${draft.medicationName} ${draft.strength} proposal. Not active until clinician-approved.`
    );

    saveStore(db);
    return res.status(201).json({ draft });
  });

  // 7. PATCH /api/prescriptions/:id — Edit, Submit, Approve, Reject, or Request Info
  app.patch('/api/prescriptions/:id', (req, res) => {
    const { id } = req.params;
    const draft = db.prescriptionDrafts.find((d) => d.id === id);
    if (!draft) {
      return res.status(404).json({ error: 'Prescription draft not found.' });
    }

    const {
      medicationName,
      strength,
      dose,
      route,
      frequency,
      duration,
      instructions,
      supportingRationale,
      newStatus,
      clinicianNotes,
      attestationConfirmed,
      actorRole = 'doctor',
      actorIdentity = 'Dr. Vikram Mehta, MD',
    } = req.body;

    // Update editable fields if provided
    if (medicationName !== undefined) draft.medicationName = medicationName;
    if (strength !== undefined) draft.strength = strength;
    if (dose !== undefined) draft.dose = dose;
    if (route !== undefined) draft.route = route;
    if (frequency !== undefined) draft.frequency = frequency;
    if (duration !== undefined) draft.duration = duration;
    if (instructions !== undefined) draft.instructions = instructions;
    if (supportingRationale !== undefined) draft.supportingRationale = supportingRationale;
    if (clinicianNotes !== undefined) draft.clinicianNotes = clinicianNotes;

    if (newStatus) {
      // CRITICAL CLINICAL SAFETY RULE: Only an authorized clinician ('doctor') who confirmed attestation can approve
      if (newStatus === 'Approved by Clinician') {
        if (actorRole !== 'doctor') {
          return res.status(403).json({
            error: 'Clinical Safety Violation: Only an authorized clinician can approve a prescription draft.',
          });
        }
        if (!attestationConfirmed) {
          return res.status(400).json({
            error: 'Clinician attestation required: Please confirm that you have reviewed allergies, renal/hepatic labs, and interactions before approving.',
          });
        }

        draft.status = 'Approved by Clinician';
        draft.reviewingClinician = actorIdentity;

        // Add to patient's active medications and create a verified Prescription Record in timeline
        const patient = db.patients.find((p) => p.id === draft.patientId);
        const newRecId = `REC-${100 + db.records.length + 1}`;
        if (patient) {
          patient.medications.unshift({
            id: `MED-${Date.now()}`,
            name: draft.medicationName,
            strength: draft.strength,
            dose: draft.dose,
            route: draft.route,
            frequency: draft.frequency,
            startDate: new Date().toISOString().slice(0, 10),
            prescribingClinician: actorIdentity,
            hospital: 'St. Jude Cardiac & Specialty Center',
            documentedReason: draft.supportingRationale,
            status: 'Active',
            sourceRecordId: newRecId,
          });

          db.records.push({
            id: newRecId,
            patientId: patient.id,
            title: `Clinician-Approved Prescription (Simulated Demo): ${draft.medicationName} ${draft.strength}`,
            category: 'Prescription',
            date: new Date().toISOString().slice(0, 10),
            hospital: 'St. Jude Cardiac & Specialty Center',
            clinician: actorIdentity,
            specialty: 'Internal Medicine & Cardiology',
            reviewStatus: 'Verified',
            provenance: 'Clinician-Verified',
            uploadedBy: actorIdentity,
            uploadedAt: new Date().toISOString(),
            verifiedBy: actorIdentity,
            verifiedAt: new Date().toISOString(),
            summaryNotes: `Clinician-supervised approval of ${draft.medicationName} ${draft.strength} (${draft.dose}, ${draft.frequency} for ${draft.duration}). Simulated approval — demo only.`,
            originalDocumentText: `ST. JUDE CARDIAC & SPECIALTY CENTER — CLINICIAN-APPROVED PRESCRIPTION (SIMULATED DEMO ONLY)\nDraft ID: ${draft.id} | Approved By: ${actorIdentity} | Date: ${nowTimestamp()}\nMedication: ${draft.medicationName} ${draft.strength} (${draft.route})\nSig: ${draft.dose} — ${draft.frequency} for ${draft.duration}\nInstructions: ${draft.instructions}\nDocumented Clinical Rationale: ${draft.supportingRationale}`,
            documentedDiagnosis: draft.supportingRationale,
            followUpRecommendation: draft.clinicianNotes || 'Monitor clinical response and adherence.',
            prescribedMedications: [
              {
                name: draft.medicationName,
                strength: draft.strength,
                dose: draft.dose,
                frequency: draft.frequency,
                duration: draft.duration,
                instructions: draft.instructions,
                documentedIndication: draft.supportingRationale,
              },
            ],
          });
        }

        addNotification(
          'patient',
          `Prescription Approved by ${actorIdentity} (Simulated Demo)`,
          `${draft.medicationName} ${draft.strength} has been reviewed and approved by ${actorIdentity}.`,
          'prescription_status',
          'timeline',
          draft.patientId
        );
      } else {
        draft.status = newStatus;
        if (newStatus === 'Rejected' || newStatus === 'Requires Additional Information') {
          addNotification(
            'doctor',
            `Prescription Draft ${draft.id} Marked: ${newStatus}`,
            `${actorIdentity} updated ${draft.id} (${draft.medicationName}): ${clinicianNotes || newStatus}`,
            'prescription_status',
            'prescriptions',
            draft.patientId
          );
        }
      }

      draft.approvalHistory.push({
        id: `HIST-${Date.now()}`,
        timestamp: nowTimestamp().slice(0, 16),
        actorName: actorIdentity,
        actorRole: actorRole === 'doctor' ? 'Reviewing Clinician' : actorRole,
        action: `Transitioned status to "${draft.status}"${newStatus === 'Approved by Clinician' ? ' (Attestation Confirmed — Simulated Demo Approval)' : ''}`,
        notes: clinicianNotes,
      });

      addAuditLog(
        actorRole,
        actorIdentity,
        `Prescription Workflow Action: ${draft.status}`,
        `Draft ${draft.id} (Patient ${draft.patientId})`,
        'Completed',
        `${actorIdentity} updated ${draft.id} (${draft.medicationName}) to "${draft.status}".`
      );
    } else {
      draft.approvalHistory.push({
        id: `HIST-${Date.now()}`,
        timestamp: nowTimestamp().slice(0, 16),
        actorName: actorIdentity,
        actorRole: 'Doctor',
        action: 'Edited prescription draft parameters',
        notes: clinicianNotes,
      });
    }

    saveStore(db);
    return res.json({ draft });
  });

  // 8. PATCH /api/patients/:id/permissions — Grant or Revoke Sharing Permission
  app.patch('/api/patients/:id/permissions', (req, res) => {
    const { id } = req.params;
    const patient = db.patients.find((p) => p.id === id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const {
      permissionId,
      newStatus,
      newEntityName,
      newEntityType,
      newCategories,
      newPurpose,
      newExpiresAt,
      requestStatus,
      actorRole = 'patient',
      actorIdentity = patient.fullName,
    } = req.body;

    if (permissionId) {
      const perm = patient.sharingPermissions.find((p) => p.id === permissionId);
      if (!perm) {
        return res.status(404).json({ error: 'Permission entry not found.' });
      }
      perm.status = newStatus;

      // Sync corresponding simulated ABDM exchange log if present
      if (db.abdmExchangeLogs) {
        const linkedExchange = db.abdmExchangeLogs.find(
          (ex) => ex.consentArtefactId === perm.id || ex.requesterHipOrHiu.includes(perm.entityName)
        );
        if (linkedExchange) {
          linkedExchange.exchangeStatus =
            newStatus === 'Active'
              ? 'Verified Exchange (Simulated)'
              : newStatus === 'Pending Approval'
              ? 'Pending Patient Consent'
              : 'Failed / Consent Revoked';
        }
      }

      addNotification(
        'doctor',
        `Sharing Permission ${newStatus}: ${patient.fullName} (${patient.id})`,
        `${patient.fullName} updated access permission for ${perm.entityName} to "${newStatus}".`,
        'privacy_change',
        'privacy',
        patient.id
      );

      addAuditLog(
        actorRole,
        actorIdentity,
        `${newStatus === 'Active' ? 'Approved / Granted' : newStatus === 'Rejected' ? 'Rejected' : 'Revoked'} Data Sharing Permission`,
        `Permission ${perm.id} (${perm.entityName} for Patient ${patient.id})`,
        'Completed',
        `Permission status changed to ${newStatus}. Subsequent clinician access checks and simulated HIE-CM exchange status immediately reflect this setting.`
      );
    } else if (newEntityName) {
      const artefactId = `CA-IN-2026-${Math.floor(1000 + Math.random() * 9000)}-SIM`;
      const initialPermStatus =
        requestStatus === 'Pending Approval'
          ? ('Pending Approval' as const)
          : ('Active' as const);
      const createdPerm = {
        id: `PERM-${Date.now()}`,
        patientId: patient.id,
        entityName: newEntityName,
        entityType: (newEntityType as 'Doctor' | 'Hospital') || 'Hospital',
        entityId: `ENT-${Date.now()}`,
        facilityHfrId: 'IN-HFR-2904-STJUDE-SIM',
        categoriesShared: Array.isArray(newCategories) && newCategories.length > 0
          ? newCategories
          : ['Lab Reports', 'Prescriptions'],
        purpose: newPurpose || 'Clinical Consultation & Care Coordination',
        status: initialPermStatus,
        grantedAt: new Date().toISOString().slice(0, 10),
        expiresAt: newExpiresAt || '2027-06-30',
      };
      patient.sharingPermissions.unshift(createdPerm);

      if (db.abdmExchangeLogs) {
        db.abdmExchangeLogs.unshift({
          id: `EXCH-${300 + db.abdmExchangeLogs.length + 1}`,
          patientId: patient.id,
          timestamp: nowTimestamp().slice(0, 16),
          requesterHipOrHiu: `${newEntityName} (HIU)`,
          providerHip: `${patient.registeringHospital} (HIP)`,
          hiTypes: createdPerm.categoriesShared,
          consentArtefactId: artefactId,
          exchangeStatus: 'Verified Exchange (Simulated)',
          fhirBundleCount: 2,
          notes: `Purpose: ${createdPerm.purpose}`,
        });
      }

      addNotification(
        'doctor',
        `New Sharing Consent Granted by ${patient.fullName}`,
        `${patient.fullName} granted access to ${createdPerm.entityName} (${artefactId}).`,
        'privacy_change',
        'privacy',
        patient.id
      );

      addAuditLog(
        actorRole,
        actorIdentity,
        'Granted New Data Sharing Consent Artefact',
        `Permission ${createdPerm.id} (Patient ${patient.id})`,
        'Completed',
        `Granted ${createdPerm.entityName} access to ${createdPerm.categoriesShared.join(', ')} (${artefactId}).`
      );
    }

    saveStore(db);
    return res.json({ patient, abdmExchangeLogs: db.abdmExchangeLogs || [] });
  });

  // 8B. POST /api/abdm/exchange — Trigger simulated HIE-CM record discovery & consent request
  app.post('/api/abdm/exchange', (req, res) => {
    const {
      patientId = 'P1001',
      hipName = 'Metro General Hospital (HIP)',
      hiuName = 'St. Jude Cardiac & Specialty Center (HIU)',
      fhirResourceType = 'DiagnosticReport',
      recordId = 'REC-106',
      purposeOfUse = 'Care Management & Multi-Hospital Clinical Review',
      actorRole = 'doctor',
      actorIdentity = 'Dr. Vikram Mehta, MD',
    } = req.body;

    const patient = db.patients.find((p) => p.id === patientId) || db.patients[0];
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const hasActiveConsent = patient.sharingPermissions.some((p) => p.status === 'Active');
    const artefactId = `CA-IN-2026-${Math.floor(1000 + Math.random() * 9000)}-SIM`;
    const newExchange: AppStateStore['abdmExchangeLogs'] extends (infer U)[] | undefined ? U : never = {
      id: `EXCH-${300 + (db.abdmExchangeLogs?.length || 0) + 1}`,
      patientId: patient.id,
      timestamp: nowTimestamp().slice(0, 16),
      requesterHipOrHiu: hiuName,
      providerHip: hipName,
      hiTypes: [fhirResourceType],
      consentArtefactId: artefactId,
      exchangeStatus: hasActiveConsent
        ? 'Verified Exchange (Simulated)'
        : 'Pending Patient Consent',
      fhirBundleCount: 1,
      notes: `Record ${recordId} · ${purposeOfUse}`,
    };

    if (!db.abdmExchangeLogs) db.abdmExchangeLogs = [];
    db.abdmExchangeLogs.unshift(newExchange);

    addAuditLog(
      actorRole,
      actorIdentity,
      `Simulated ABDM HIE-CM Record Exchange (${newExchange.exchangeStatus})`,
      `Exchange ${newExchange.id} · ${fhirResourceType} (${recordId})`,
      hasActiveConsent ? 'Completed' : 'Flagged for Review',
      `Simulated FHIR R4 ${fhirResourceType} exchange from ${hipName} to ${hiuName} under artefact ${artefactId}.`
    );

    saveStore(db);
    return res.status(201).json({ exchange: newExchange, abdmExchangeLogs: db.abdmExchangeLogs });
  });

  // 9. PATCH /api/public-health/signals/:id — Update Public-Health Signal Investigation Status
  app.patch('/api/public-health/signals/:id', (req, res) => {
    const { id } = req.params;
    const signal = db.publicHealthSignals.find((s) => s.id === id);
    if (!signal) {
      return res.status(404).json({ error: 'Public health signal not found.' });
    }

    const {
      status,
      reviewNotes,
      actorIdentity = 'Dr. Rohan Deshmukh, MPH',
    } = req.body;

    if (status) signal.status = status;
    if (reviewNotes !== undefined) signal.reviewNotes = reviewNotes;
    signal.reviewedBy = actorIdentity;
    signal.reviewedAt = nowTimestamp().slice(0, 16);

    addNotification(
      'analyst',
      `Public-Health Signal ${signal.id} Marked "${signal.status}"`,
      `${actorIdentity} updated ${signal.title} (${signal.region}) to ${signal.status}.`,
      'public_health_signal',
      'public-health'
    );

    addAuditLog(
      'analyst',
      actorIdentity,
      `Public-Health Signal Review (${signal.status})`,
      `Signal ${signal.id} (${signal.region})`,
      'Completed',
      `Marked de-identified signal ${signal.id} as "${signal.status}". Notes: ${reviewNotes || 'Recorded in surveillance queue'}.`
    );

    saveStore(db);
    return res.json({ signal });
  });

  // 10. Notifications mark read
  app.patch('/api/notifications/:id/read', (req, res) => {
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (notif) {
      notif.read = true;
      saveStore(db);
    }
    res.json({ notification: notif });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const { role } = req.body;
    db.notifications.forEach((n) => {
      if (!role || n.recipientRole === role || n.recipientRole === 'all') {
        n.read = true;
      }
    });
    saveStore(db);
    res.json({ status: 'ok' });
  });

  // ============================================================================
  // SERVER-SIDE GEMINI 3.8 FLASH AI ENDPOINTS (WITH AUTOMATIC LABELED FALLBACK)
  // ============================================================================

  // A. Longitudinal Timeline Summary (/api/ai/timeline-summary)
  app.post('/api/ai/timeline-summary', async (req, res) => {
    const { patientId, actorRole = 'doctor', actorIdentity = 'Dr. Vikram Mehta, MD' } = req.body;
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    if (actorRole === 'doctor' && !isDoctorAuthorizedForPatient(patient)) {
      addAuditLog(
        actorRole,
        actorIdentity,
        'Attempted AI Summary Generation on Revoked Patient',
        `Patient ${patient.id}`,
        'Restricted / Denied',
        'Access blocked because patient revoked sharing permissions.'
      );
      saveStore(db);
      return res.status(403).json({ error: 'Access denied by patient sharing permissions.' });
    }

    const patientRecords = db.records.filter((r) => r.patientId === patient.id);
    const ai = getGeminiClient();

    if (ai) {
      try {
        const minimalContext = {
          patient: {
            id: patient.id,
            fullName: patient.fullName,
            age: patient.age,
            gender: patient.gender,
            allergies: patient.allergies,
            conditions: patient.conditions,
            medications: patient.medications,
          },
          records: patientRecords.map((r) => ({
            id: r.id,
            date: r.date,
            category: r.category,
            hospital: r.hospital,
            clinician: r.clinician,
            reviewStatus: r.reviewStatus,
            summaryNotes: r.summaryNotes,
            documentedDiagnosis: r.documentedDiagnosis,
            followUpRecommendation: r.followUpRecommendation,
            labResults: r.labResults,
            prescribedMedications: r.prescribedMedications,
          })),
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Generate a longitudinal clinical patient summary using ONLY the supplied patient records JSON.\n\nPatient Context:\n${JSON.stringify(minimalContext, null, 2)}`,
          config: {
            systemInstruction: `You are the OneHealth AI Longitudinal Record Summarizer.
CRITICAL SAFETY RULES:
1. Use ONLY the supplied patient records. Never invent diagnoses, dates, units, or prescribing reasons.
2. Every factual statement MUST include the exact supporting record ID(s) (e.g. ["REC-101"]) in sourceRecordIds.
3. Explicitly highlight any unverified records ("Needs Review"), unit discrepancies (e.g. mmol/L vs mg/dL), assay differences, or missing prescribing rationales (such as REC-105 Atorvastatin).`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overviewParagraph: { type: Type.STRING },
                documentedConditions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      statement: { type: Type.STRING },
                      sourceRecordIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      category: { type: Type.STRING },
                    },
                    required: ['statement', 'sourceRecordIds', 'category'],
                  },
                },
                medicationHistorySummary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      statement: { type: Type.STRING },
                      sourceRecordIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      category: { type: Type.STRING },
                    },
                    required: ['statement', 'sourceRecordIds', 'category'],
                  },
                },
                notableLabChanges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      statement: { type: Type.STRING },
                      sourceRecordIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      category: { type: Type.STRING },
                    },
                    required: ['statement', 'sourceRecordIds', 'category'],
                  },
                },
                recentVisitsAndFollowUps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      statement: { type: Type.STRING },
                      sourceRecordIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      category: { type: Type.STRING },
                    },
                    required: ['statement', 'sourceRecordIds', 'category'],
                  },
                },
                missingOrConflictingInfo: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'overviewParagraph',
                'documentedConditions',
                'medicationHistorySummary',
                'notableLabChanges',
                'recentVisitsAndFollowUps',
                'missingOrConflictingInfo',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        const summaryResult: LongitudinalSummaryResponse = {
          generatedAt: nowTimestamp(),
          aiMode: 'live-gemini',
          overviewParagraph: parsed.overviewParagraph || '',
          documentedConditions: parsed.documentedConditions || [],
          medicationHistorySummary: parsed.medicationHistorySummary || [],
          notableLabChanges: parsed.notableLabChanges || [],
          recentVisitsAndFollowUps: parsed.recentVisitsAndFollowUps || [],
          missingOrConflictingInfo: parsed.missingOrConflictingInfo || [],
        };
        patient.aiSummaryCache = summaryResult;
        saveStore(db);
        return res.json({ summary: summaryResult });
      } catch (err) {
        console.warn('Live Gemini timeline summary failed, falling back to labeled demo mode:', err);
      }
    }

    const fallback = buildFallbackTimelineSummary(patient, patientRecords);
    patient.aiSummaryCache = fallback;
    saveStore(db);
    return res.json({ summary: fallback });
  });

  // B. Patient-Facing AI Health Assistant (/api/ai/patient-assistant)
  app.post('/api/ai/patient-assistant', async (req, res) => {
    const { patientId = 'P1001', question, language = 'en' } = req.body;
    const patient = db.patients.find((p) => p.id === patientId) || db.patients[0];
    const patientRecords = db.records.filter((r) => r.patientId === patient.id);

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Please enter a question.' });
    }

    const langName =
      language === 'hi'
        ? 'Hindi (हिंदी)'
        : language === 'ta'
        ? 'Tamil (தமிழ்)'
        : language === 'kn'
        ? 'Kannada (ಕನ್ನಡ)'
        : 'English';

    const ai = getGeminiClient();
    if (ai) {
      try {
        const contextPayload = {
          patientName: patient.fullName,
          allergies: patient.allergies,
          conditions: patient.conditions,
          activeMedications: patient.medications,
          records: patientRecords.map((r) => ({
            recordId: r.id,
            date: r.date,
            hospital: r.hospital,
            title: r.title,
            reviewStatus: r.reviewStatus,
            summaryNotes: r.summaryNotes,
            followUpRecommendation: r.followUpRecommendation,
            labResults: r.labResults,
            prescribedMedications: r.prescribedMedications,
          })),
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Preferred Response Language: ${langName}\nPatient Question: "${question}"\n\nAuthorized Patient Records JSON:\n${JSON.stringify(contextPayload, null, 2)}`,
          config: {
            systemInstruction: `You are the OneHealth AI Patient Health Assistant.
Rules:
1. Explain medical terms in warm, everyday human language in ${langName}.
2. Strictly separate facts documented in the patient's records (citing exact recordId, recordDate, and hospital) from general health education.
3. Point out any unverified records ("Needs Review"), missing details, or unit differences.
4. Never diagnose with certainty, never prescribe or recommend changing medication doses independently, and encourage consulting their doctor.
5. If the user describes potential emergency symptoms (chest pain, severe shortness of breath, anaphylaxis, stroke signs), set emergencyWarningDetected = true and advise urgent emergency medical care immediately.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                simpleAnswer: { type: Type.STRING },
                fromYourRecords: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      statement: { type: Type.STRING },
                      recordId: { type: Type.STRING },
                      recordDate: { type: Type.STRING },
                      hospital: { type: Type.STRING },
                    },
                    required: ['statement', 'recordId', 'recordDate', 'hospital'],
                  },
                },
                generalEducationalContext: { type: Type.STRING },
                uncertaintyAndMissingInfo: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendedNextStep: { type: Type.STRING },
                safetyNotice: { type: Type.STRING },
                emergencyWarningDetected: { type: Type.BOOLEAN },
              },
              required: [
                'simpleAnswer',
                'fromYourRecords',
                'generalEducationalContext',
                'uncertaintyAndMissingInfo',
                'recommendedNextStep',
                'safetyNotice',
                'emergencyWarningDetected',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        const liveReply: PatientAIResponse = {
          id: `PAI-${Date.now()}`,
          question,
          timestamp: nowTimestamp(),
          aiMode: 'live-gemini',
          simpleAnswer: parsed.simpleAnswer || '',
          fromYourRecords: parsed.fromYourRecords || [],
          generalEducationalContext: parsed.generalEducationalContext || '',
          uncertaintyAndMissingInfo: parsed.uncertaintyAndMissingInfo || [],
          recommendedNextStep: parsed.recommendedNextStep || '',
          safetyNotice:
            parsed.safetyNotice ||
            'Educational information only — consult your healthcare professional before making any changes to your care plan.',
          emergencyWarningDetected: Boolean(parsed.emergencyWarningDetected),
        };
        return res.json({ reply: liveReply });
      } catch (err) {
        console.warn('Live Gemini patient assistant failed, using labeled fallback:', err);
      }
    }

    const fallbackReply = buildFallbackPatientAIResponse(question, patient, patientRecords);
    if (language === 'hi') {
      fallbackReply.simpleAnswer = `हिंदी सारांश: आपके स्वास्थ्य रिकॉर्ड के अनुसार आपकी शुगर (HbA1c 7.8%) और कोलेस्ट्रॉल (LDL 88 mg/dL) में सुधार हो रहा है। — ${fallbackReply.simpleAnswer}`;
    } else if (language === 'ta') {
      fallbackReply.simpleAnswer = `தமிழ் சுருக்கம்: உங்கள் மருத்துவப் பதிவின்படி சர்க்கரை அளவு (HbA1c 7.8%) மற்றும் கொழுப்பு (LDL 88 mg/dL) சீராக முன்னேறி வருகிறது. — ${fallbackReply.simpleAnswer}`;
    } else if (language === 'kn') {
      fallbackReply.simpleAnswer = `ಕನ್ನಡ ಸಾರಾಂಶ: ನಿಮ್ಮ ಆರೋಗ್ಯ ದಾಖಲೆಯ ಪ್ರಕಾರ ರಕ್ತದ ಸಕ್ಕರೆ (HbA1c 7.8%) ಮತ್ತು ಕೊಲೆಸ್ಟ್ರಾಲ್ (LDL 88 mg/dL) ಉತ್ತಮವಾಗಿ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ. — ${fallbackReply.simpleAnswer}`;
    }
    return res.json({ reply: fallbackReply });
  });

  // C. Doctor Clinical Intelligence Copilot (/api/ai/clinical-copilot)
  app.post('/api/ai/clinical-copilot', async (req, res) => {
    const { patientId = 'P1001', question } = req.body;
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    if (!isDoctorAuthorizedForPatient(patient)) {
      addAuditLog(
        'doctor',
        'Dr. Vikram Mehta, MD',
        'Blocked Clinical Copilot Query (Consent Revoked)',
        `Patient ${patient.id}`,
        'Restricted / Denied',
        'Copilot blocked from retrieving patient records because sharing consent is revoked.'
      );
      saveStore(db);
      return res.status(403).json({
        error: 'Access Restricted: This patient has revoked sharing permission for your role/hospital.',
      });
    }

    const patientRecords = db.records.filter((r) => r.patientId === patient.id);
    const ai = getGeminiClient();

    if (ai) {
      try {
        const clinicalContext = {
          patient: {
            id: patient.id,
            fullName: patient.fullName,
            age: patient.age,
            gender: patient.gender,
            allergies: patient.allergies,
            conditions: patient.conditions,
            medications: patient.medications,
          },
          records: patientRecords.map((r) => ({
            id: r.id,
            date: r.date,
            category: r.category,
            hospital: r.hospital,
            clinician: r.clinician,
            reviewStatus: r.reviewStatus,
            provenance: r.provenance,
            summaryNotes: r.summaryNotes,
            originalDocumentText: r.originalDocumentText,
            documentedDiagnosis: r.documentedDiagnosis,
            followUpRecommendation: r.followUpRecommendation,
            labResults: r.labResults,
            prescribedMedications: r.prescribedMedications,
          })),
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Clinician Query: "${question}"\n\nAuthorized Patient Clinical Context:\n${JSON.stringify(clinicalContext, null, 2)}`,
          config: {
            systemInstruction: `You are the OneHealth AI Clinical Intelligence Copilot for licensed physicians.
CRITICAL CLINICAL SAFETY RULES:
1. NEVER claim to know why an original prescriber selected a medication unless the rationale is EXPLICITLY documented in the supplied records. Use careful phrasing such as: "The available records show...", "This medication is commonly used for...", "This may be relevant to the documented condition, but the original prescribing rationale is not recorded in [Record ID]."
2. Strictly separate patient-record evidence (with exact recordId, date, and sourceHospital) from general pharmacological/clinical knowledge.
3. Flag any incompatible laboratory units (e.g., mmol/L vs mg/dL in REC-104), different assay methods (Jaffe vs Enzymatic creatinine), or unverified records ("Needs Review" in REC-107).
4. Do NOT fabricate clinical guideline URLs or paper titles. For supportingReferences, set verificationNote to "Reference verification unavailable in demo mode — general clinical reference context".
5. Never autonomously issue a prescription or recommend a definitive individualized dosage from a symptom alone.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                shortAnswer: { type: Type.STRING },
                patientRecordEvidence: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      finding: { type: Type.STRING },
                      recordId: { type: Type.STRING },
                      date: { type: Type.STRING },
                      sourceHospital: { type: Type.STRING },
                    },
                    required: ['finding', 'recordId', 'date', 'sourceHospital'],
                  },
                },
                clinicalContextAndReasoning: { type: Type.STRING },
                prescribingRationaleStatus: {
                  type: Type.OBJECT,
                  properties: {
                    medication: { type: Type.STRING },
                    explicitlyDocumentedInRecord: { type: Type.BOOLEAN },
                    documentedReasonOrNote: { type: Type.STRING },
                    commonApprovedIndication: { type: Type.STRING },
                  },
                  required: [
                    'medication',
                    'explicitlyDocumentedInRecord',
                    'documentedReasonOrNote',
                    'commonApprovedIndication',
                  ],
                },
                potentialRisksAndInteractions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                missingInformationAndUncertainty: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                supportingReferences: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      organization: { type: Type.STRING },
                      yearOrVersion: { type: Type.STRING },
                      verificationNote: { type: Type.STRING },
                    },
                    required: ['title', 'organization', 'yearOrVersion', 'verificationNote'],
                  },
                },
                suggestedClinicianChecks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'shortAnswer',
                'patientRecordEvidence',
                'clinicalContextAndReasoning',
                'potentialRisksAndInteractions',
                'missingInformationAndUncertainty',
                'supportingReferences',
                'suggestedClinicianChecks',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        const liveCopilot: ClinicalCopilotResponse = {
          id: `COP-${Date.now()}`,
          question,
          timestamp: nowTimestamp(),
          aiMode: 'live-gemini',
          shortAnswer: parsed.shortAnswer || '',
          patientRecordEvidence: parsed.patientRecordEvidence || [],
          clinicalContextAndReasoning: parsed.clinicalContextAndReasoning || '',
          prescribingRationaleStatus: parsed.prescribingRationaleStatus,
          potentialRisksAndInteractions: parsed.potentialRisksAndInteractions || [],
          missingInformationAndUncertainty: parsed.missingInformationAndUncertainty || [],
          supportingReferences: parsed.supportingReferences || [],
          suggestedClinicianChecks: parsed.suggestedClinicianChecks || [],
        };
        return res.json({ reply: liveCopilot });
      } catch (err) {
        console.warn('Live Gemini clinical copilot failed, using labeled fallback:', err);
      }
    }

    const fallback = buildFallbackClinicalCopilotResponse(question, patient, patientRecords);
    return res.json({ reply: fallback });
  });

  // D. Multimodal / Text Document Extraction Assistance (/api/ai/extract-document)
  app.post('/api/ai/extract-document', async (req, res) => {
    const { rawText, fileBase64, mimeType, fileName } = req.body;
    const ai = getGeminiClient();

    if (ai && (rawText || fileBase64)) {
      try {
        const parts: any[] = [];
        if (fileBase64 && mimeType) {
          parts.push({
            inlineData: {
              data: fileBase64,
              mimeType,
            },
          });
        }
        parts.push({
          text: `Extract structured clinical metadata from this medical document (${fileName || 'uploaded document'}).
CRITICAL RULE: Never invent missing values, units, dates, or reference ranges. If a field is not present in the document, leave it empty or state "Not explicitly recorded in source document".
${rawText ? `\nDocument Text:\n${rawText}` : ''}`,
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                date: { type: Type.STRING },
                hospital: { type: Type.STRING },
                clinician: { type: Type.STRING },
                summaryNotes: { type: Type.STRING },
                documentedDiagnosis: { type: Type.STRING },
                followUpRecommendation: { type: Type.STRING },
                extractedText: { type: Type.STRING },
                labResults: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      testName: { type: Type.STRING },
                      value: { type: Type.STRING },
                      unit: { type: Type.STRING },
                      referenceRange: { type: Type.STRING },
                      flag: { type: Type.STRING },
                    },
                    required: ['testName', 'value', 'unit', 'referenceRange'],
                  },
                },
                prescribedMedications: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      strength: { type: Type.STRING },
                      dose: { type: Type.STRING },
                      frequency: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      instructions: { type: Type.STRING },
                      documentedIndication: { type: Type.STRING },
                    },
                    required: ['name', 'strength', 'dose', 'frequency'],
                  },
                },
              },
              required: ['title', 'category', 'summaryNotes', 'extractedText'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          aiMode: 'live-gemini',
          extracted: parsed,
        });
      } catch (err) {
        console.warn('Live Gemini document extraction failed, using heuristic parser:', err);
      }
    }

    // Heuristic / fallback extraction from rawText if provided
    const textToInspect = rawText || `Uploaded file: ${fileName || 'Document'} (Demo staging extraction)`;
    return res.json({
      aiMode: 'demo-fallback',
      extracted: {
        title: fileName ? `Extracted Clinical Document — ${fileName}` : 'Extracted Clinical Report (Needs Review)',
        category: 'Lab Report',
        date: new Date().toISOString().slice(0, 10),
        hospital: 'Metro General Hospital',
        clinician: 'Dr. Vikram Mehta, MD',
        summaryNotes: 'Structured fields staged for clinician verification. Review original document text before marking Verified.',
        documentedDiagnosis: 'Not explicitly recorded in source document',
        followUpRecommendation: 'Clinician review required to confirm follow-up plan.',
        extractedText: textToInspect,
        labResults: [],
        prescribedMedications: [],
      },
    });
  });

  // E. AI-Assisted Proposed Prescription Draft (/api/ai/prescription-draft)
  app.post('/api/ai/prescription-draft', async (req, res) => {
    const { patientId, clinicalRequest } = req.body;
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const patientRecords = db.records.filter((r) => r.patientId === patient.id);
    const ai = getGeminiClient();

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Prepare a clinician-supervised prescription draft proposal (Status: Awaiting Clinician Review) based on this clinician request: "${clinicalRequest || 'Prepare continuation/follow-up draft based on documented history'}".\n\nAuthorized Patient Context:\n${JSON.stringify({ patient, records: patientRecords }, null, 2)}`,
          config: {
            systemInstruction: `You are a clinical decision-support assistant preparing a NON-ACTIVE prescription draft for physician review.
1. Check all documented allergies and active medications.
2. Reference specific record IDs in sourceRecordIds.
3. Never auto-approve. Label supportingRationale clearly as a synthetic prototype proposal requiring clinician verification.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                medicationName: { type: Type.STRING },
                strength: { type: Type.STRING },
                dose: { type: Type.STRING },
                route: { type: Type.STRING },
                frequency: { type: Type.STRING },
                duration: { type: Type.STRING },
                instructions: { type: Type.STRING },
                supportingRationale: { type: Type.STRING },
                allergyCheckSummary: { type: Type.STRING },
                interactionCheckSummary: { type: Type.STRING },
                sourceRecordIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'medicationName',
                'strength',
                'dose',
                'route',
                'frequency',
                'duration',
                'instructions',
                'supportingRationale',
                'allergyCheckSummary',
                'interactionCheckSummary',
                'sourceRecordIds',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          aiMode: 'live-gemini',
          proposal: parsed,
        });
      } catch (err) {
        console.warn('Live Gemini prescription draft failed, using fallback:', err);
      }
    }

    // Fallback proposal tailored to patient
    const firstMed = patient.medications[0];
    return res.json({
      aiMode: 'demo-fallback',
      proposal: {
        medicationName: firstMed ? `${firstMed.name} (Supervised Renewal Proposal)` : 'Telmisartan (Prototype Demo Draft)',
        strength: firstMed ? firstMed.strength : '40 mg',
        dose: firstMed ? firstMed.dose : '1 tablet',
        route: 'Oral',
        frequency: firstMed ? firstMed.frequency : 'Once daily in the morning',
        duration: '90 days',
        instructions: 'Take as directed by reviewing clinician. Monitor blood pressure and renal function per protocol.',
        supportingRationale: `Synthetic prototype draft prepared from authorized records (${patientRecords.map((r) => r.id).join(', ')}) for clinician request: "${clinicalRequest || 'Routine maintenance review'}". Requires clinician verification and attestation.`,
        allergyCheckSummary: `Checked against documented allergies: ${patient.allergies.map((a) => `${a.substance} (${a.severity})`).join(', ') || 'No known allergies documented'}.`,
        interactionCheckSummary: `Reviewed alongside active regimen (${patient.medications.map((m) => m.name).join(', ') || 'None'}). Verify in clinical pharmacology reference before sign-off.`,
        sourceRecordIds: patientRecords.slice(-2).map((r) => r.id),
      },
    });
  });

  // Vite middleware for development or static serving for production
  const distPath = path.join(__dirname, 'dist');
  const distIndex = path.join(distPath, 'index.html');
  if (process.env.NODE_ENV === 'development' || !fs.existsSync(distIndex)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OneHealth AI Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
