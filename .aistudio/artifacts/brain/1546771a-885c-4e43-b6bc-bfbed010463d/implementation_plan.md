# OneHealth AI — Connected Health Records, Clinical Intelligence & Early Warning

OneHealth AI is an interactive full-stack clinical health record, decision-support, and public-health surveillance prototype built for the Seva First Innovative Hackathon. It unifies multi-hospital patient records into a longitudinal, source-linked timeline, empowers patients with plain-language explanations, equips clinicians with an evidence-grounded Clinical Intelligence Copilot and supervised prescription workflow, and provides public-health analysts with de-identified outbreak signal detection.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices have been confirmed from your answers and integrated across the prototype specification:

- **Confirmed Decision 1 — Persistence & Reset**: **Server-backed JSON store with instant reset to seed data**. All patient registrations, uploaded medical documents, extracted fields, clinician prescription reviews, consent changes, notifications, and audit events persist on the backend (`server-store.json`) and survive page refreshes, accompanied by a one-click **"Reset Demo Data"** control for evaluators.
- **Confirmed Decision 2 — Gemini AI & Demo Fallback Strategy**: **Live Gemini 3.8 Flash (`gemini-3.8-flash`) with automatic fallback to clearly labeled demo responses**. All AI workflows run through server-side Express routes using `@google/genai` with structured JSON schemas. If the API key is absent or a call fails, the server gracefully returns scenario-grounded synthetic responses with an explicit **"Demo AI Mode (Simulated)"** indicator so evaluators never encounter broken flows or silent fabrication.
- **Confirmed Decision 3 — Document Upload & Extraction Workflow**: **Both real file upload parsing with Gemini plus curated clinical sample templates**. Users can either upload real PDF/image/text documents for multimodal Gemini extraction or select from realistic multi-hospital clinical sample documents (Lab Reports, Discharge Summaries, Prescriptions, Imaging Reports) that populate editable structured fields marked **"Needs Review"** until clinician-verified.

---

## 1. Overview & Core Concept

- **What It Does**: Connects a patient's healthcare journey across participating hospitals (`Metro General Hospital`, `St. Jude Cardiac & Specialty Center`, `Seva Community Medical Institute`, and `City Apollo Diagnostics`). It turns fragmented clinical visits, lab trends, imaging reports, and prescriptions into a chronological, source-linked longitudinal timeline while enforcing strict role-based privacy, clinician-in-the-loop prescription supervision, and de-identified public-health anomaly detection.
- **Target Audience / Personas**:
  1. **Patient** (e.g., *Ananya Rao, P1001*): Views personal longitudinal health records, compares lab trends with clear unit/reference context, asks the Patient AI Assistant plain-language questions with source citations, and manages granular hospital/clinician sharing permissions.
  2. **Doctor** (e.g., *Dr. Vikram Mehta, MD — Internal Medicine & Cardiology*): Searches and views authorized patients, uploads/verifies medical records, consults the **Clinical Intelligence Copilot** (with strict separation of documented prescribing rationale vs. general pharmacological reference), reviews the **Medication Safety Panel**, and edits/approves/rejects **Clinician-Supervised Prescription Drafts**.
  3. **Hospital Administrator** (e.g., *Priya Nair — Metro General Health Registry*): Registers new patients with duplicate-check safeguards, uploads hospital records, monitors pending verifications and data quality warnings, and audits system-wide access events without bypassing clinical authorization rules.
  4. **Public-Health Analyst** (e.g., *Dr. Rohan Deshmukh — Regional Epidemiological Unit*): Investigates strictly de-identified, aggregated symptom and diagnosis trends across regions/hospitals against historical baselines, reviews potential outbreak signals, and logs investigation status changes (`Under Review`, `Escalated`, `Dismissed`, `Resolved`).
- **Key Value**: *"One patient. One connected health journey. Better-informed clinical decisions. Earlier awareness of emerging health threats."*

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Demo Access & Role Switcher**: Evaluators can start from the **Demo Access & Role Selection Modal / Screen** or use the persistent top-level **Prototype Evaluator Bar** to one-click switch between the 4 demo roles (*Patient*, *Doctor*, *Hospital Administrator*, *Public-Health Analyst*), trigger any of the **8 Guided Hackathon Scenarios (Scenarios A–H)**, or reset the store to factory seed state.
2. **Patient Registration & Duplicate Detection (Scenario H)**: Hospital Administrators or Doctors generate a unique Patient ID, validate demographics, allergies, conditions, and initial consent, check for potential duplicate records (warning before creation rather than silently merging), and immediately open the newly created 9-tab Patient Profile.
3. **Medical Document Upload, Multimodal Extraction & Verification**: Authorized staff upload a file or load a clinical template, extract structured test values/units/reference ranges or medication instructions into a **"Needs Review"** staging panel, edit any field while preserving the original document reference, and mark the record **"Clinician Verified"** to publish it to the longitudinal timeline.
4. **Longitudinal Health Timeline & Lab Trend Comparison (Scenarios A & B)**: Interactive timeline filterable by date range, event category, hospital, clinician, and review status. Includes a dedicated **Lab Trend & Compatibility Analyzer** that compares serial tests (e.g., HbA1c, eGFR, Creatinine, LDL) across hospitals while flagging unit incompatibilities or method differences without inferring automated diagnoses.
5. **Patient AI Health Assistant (Scenario E)**: Friendly conversational interface with suggested question chips. Every answer renders structured cards showing: *Simple Answer*, *What Your Records Show (with clickable record badges)*, *General Health Context*, *Uncertainty / Missing Info*, *Recommended Next Step*, and *Emergency / Safety Guidance*.
6. **Doctor Clinical Intelligence Copilot & Medication Safety (Scenario C)**: Clinical workspace integrated with the active patient's authorized history. Features 7 one-click clinical quick actions (*Summarize History*, *Explain Medication*, *Compare Labs*, *Review Allergies*, *Check Interactions*, *Prepare Handover*, *Identify Missing Info*). Enforces the **Critical Prescribing Rationale Rule** (never claiming to know why an original prescriber chose a drug unless explicitly recorded).
7. **Clinician-Supervised Prescription Draft & Approval (Scenario D)**: End-to-end state machine (`Draft` → `Awaiting Clinician Review` → `Approved by Clinician` / `Rejected` / `Requires Additional Information`). Requires the reviewing doctor to check an explicit clinical verification attestation before approval. Unapproved drafts are strictly hidden from active patient medication lists.
8. **Cross-Hospital Public Health Intelligence (Scenario F)**: De-identified time-series charts comparing daily/weekly symptom and diagnosis counts against moving historical baselines across regions. Flags statistical anomalies as *"Potential signal — requires public-health review"* with transparent evidence, limitations, and an interactive analyst review queue.
9. **Granular Sharing, Consent & Live Access Enforcement (Scenario G)**: Patient-facing privacy controls where revoking a doctor's or hospital's access immediately updates backend permission checks, blocks unauthorized record access in the Doctor view, triggers a real notification, and records an immutable entry in the Audit Log.

### Visual Identity & Theme
- **Aesthetic Direction**: Calm, high-trust, clinical-grade SaaS workspace designed for rapid scannability, zero visual clutter, and accessible hierarchy.
- **Color Palette & Atmospheric Polarity**: High-craft light mode canvas (`#F8FAFC` slate-50 workspace backdrop with crisp `#FFFFFF` structural surfaces and `1px solid #E2E8F0` hairline borders).
  - **Primary Brand & Clinical Accent**: Deep Clinical Teal (`#0F766E` / `teal-700`) and Trust Navy (`#0F172A` / `slate-900`).
  - **Semantic Clinical Status Tokens** (always paired with explicit text labels and icons, never color alone):
    - *Clinician Verified / Approved*: Restrained Emerald (`#15803D` text on `#F0FDF4` surface)
    - *Needs Review / Caution / Missing Data*: Warm Amber (`#B45309` text on `#FFFBEB` surface)
    - *Critical Alert / Allergy / Contradiction / Signal*: Clinical Crimson (`#B91C1C` text on `#FEF2F2` surface)
- **Typography & Scannable Hierarchy**:
  - **Display & Section Headings**: `Plus Jakarta Sans` (SemiBold/Bold, tight tracking, `text-wrap: balance`).
  - **Clinical Body & Documentation**: `Public Sans` / `DM Sans` (14px–15px with generous line-height for clinical notes and plain-language explanations).
  - **Lab Values, Dosages, Timestamps & IDs**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` to ensure vertical alignment of reference ranges, dates, and patient identifiers (`P1001`–`P1006`).
- **Layout Architecture**:
  - **Desktop (1440px baseline)**: Collapsible Left Navigation Sidebar (`260px` wide, role-filtered) + Single-row Top Header (contextual breadcrumb/patient selector, global authorized search, AI mode badge, notification bell, and evaluator role switcher) + Main Content Viewport with single-elevation bordered surfaces.
  - **Mobile / Tablet**: Compact top header with slide-over navigation drawer and responsive card transformations for wide clinical tables.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Server-Side Persistence with One-Click Hackathon Scenario Launcher**
  - *Chosen Approach*: Express backend manages a structured JSON datastore seeded with 6 rich multi-hospital patient journeys (`P1001` Ananya Rao through `P1006` Dev Kumar) and synthetic regional surveillance data, plus a quick-jump Scenario Selector (Scenarios A–H) in the demo bar.
  - *Why*: Evaluators testing end-to-end flows (registering a patient, revoking consent, approving a prescription, or reviewing an outbreak signal) see real state mutations across roles immediately, while still being able to jump directly to any of the 8 rubric scenarios or reset state in one click.
- **Decision 2 — Strict Provenance & Clinical Safety Guardrails**
  - *Chosen Approach*: Every data item carries an explicit provenance classification (`Clinician-Verified`, `Machine-Extracted — Needs Review`, `Patient-Reported`, or `AI-Generated Interpretation`). AI endpoints use strict system instructions and response schemas that require record ID citations and explicitly separate documented facts from general medical reference.
  - *Why*: Directly fulfills clinical safety requirements—preventing AI from fabricating patient history, guessing undocumented prescribing reasons, or autonomously approving prescriptions.
- **Decision 3 — De-Identified Aggregation Boundary for Public Health**
  - *Chosen Approach*: The backend `/api/public-health` endpoint strips all patient identifiers, names, and clinical notes, serving only regional/hospital aggregate counts, baseline comparisons, and statistical signal metadata to the Public-Health Analyst role.
  - *Why*: Enforces a hard architectural boundary so the Public-Health Analyst role can never inspect identifiable patient records or chat histories.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND WORKSPACE (React 19 + TypeScript + Tailwind)           │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar & Prototype Evaluator Strip                                           │  │
│  │ [Brand] · [Global Patient Search] · [Scenario Launcher A-H] · [Role Switcher] │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────┐  ┌─────────────────────────────────────────────────────┐  │
│  │ Role-Aware Sidebar   │  │ Main Clinical & Analytics Viewport                  │  │
│  │ - Overview           │  │  ├─ Role Overviews (Patient/Doctor/Admin/Analyst)   │  │
│  │ - Patients/My Health │  │  ├─ Patient Directory & Registration Modal/View     │  │
│  │ - Health Timeline    │  │  ├─ 9-Tab Patient Profile & Longitudinal Timeline   │  │
│  │ - Medical Records    │  │  ├─ Lab Trend & Unit Compatibility Comparator       │  │
│  │ - AI Health Assistant│  │  ├─ Document Upload, OCR Extraction & Review Form   │  │
│  │ - Clinical Copilot   │  │  ├─ Patient AI Assistant (Source-Linked Cards)      │  │
│  │ - Prescription Review│  │  ├─ Doctor Clinical Copilot & Quick Actions         │  │
│  │ - Medication Safety  │  │  ├─ Supervised Prescription Workflow & Safety Panel │  │
│  │ - Public Health Intel│  │  ├─ Public Health Surveillance & Signal Queue       │  │
│  │ - Sharing & Privacy  │  │  └─ Sharing & Privacy Controls / Notification /Log  │  │
│  └──────────────────────┘  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬──────────────────────────────────────────┘
                                           │ REST JSON API (/api/*)
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND SERVER (Express + TypeScript)                         │
│                                                                                     │
│  ┌───────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │ State, RBAC & Audit Engine            │  │ Server-Side Gemini 3.8 Flash Layer │  │
│  │ - Role & Consent Enforcement          │  │ - /api/ai/timeline-summary         │  │
│  │ - Duplicate Patient Check             │  │ - /api/ai/patient-assistant        │  │
│  │ - Prescription State Machine          │  │ - /api/ai/clinical-copilot         │  │
│  │ - De-Identified Surveillance Engine   │  │ - /api/ai/extract-document         │  │
│  │ - Automatic Notification & Audit Log  │  │ - /api/ai/prescription-draft       │  │
│  │ - Persistent Store + Instant Reset    │  │ - /api/ai/public-health-signal     │  │
│  └───────────────────────────────────────┘  └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Core Entities
- **Patients (`P1001`–`P1006` + newly registered)**: Demographics, preferred language, emergency contact, structured allergies, documented chronic conditions, active clinician-verified medications, and granular `SharingPermission[]` rules.
- **Medical Records & Timeline Events**: Linked by stable `recordId` (`REC-...`) and `patientId`. Includes category (`Lab Report`, `Prescription`, `Discharge Summary`, `Imaging Report`, `Consultation Note`, `Diagnosis`, `Vaccination`), hospital, clinician, date, provenance status (`Verified` vs. `Needs Review`), original document text/file metadata, and structured extracted fields (lab analytes with values, units, reference ranges, and method notes; or prescribed medications with dose, frequency, and documented indication).
- **Prescription Drafts**: Tracks `draftId`, `patientId`, `medicationName`, `strength`, `dose`, `route`, `frequency`, `duration`, `instructions`, `documentedRationale`, `allergyCheckStatus`, `interactionNotes`, `sourceRecordIds`, `status` (`Draft`, `Awaiting Clinician Review`, `Approved by Clinician`, `Rejected`, `Requires Additional Information`), `createdBy`, `reviewedBy`, `attestationConfirmed`, and `approvalHistory[]`.
- **Public Health Signals & Aggregates**: Weekly and daily regional/hospital symptom counts (`Fever`, `Acute Respiratory`, `Gastrointestinal`, `Exanthematous Rash`, `Fever + Arthralgia Cluster`), moving baseline averages, threshold ratios, signal status (`Pending Review`, `Under Review`, `Escalated`, `Dismissed`, `Resolved`), and documented limitations.
- **Notifications & Audit Events**: Real-time state-driven notifications (`NOTIF-...`) with target navigation links and immutable audit log entries (`AUD-...`) recording actor role, actor identity, action, target ID, timestamp, and outcome.

### Interactive Component & State Mapping
- **Role & Consent Enforcement**: Whenever a Patient toggles or revokes a hospital/doctor permission on the *Sharing & Privacy* page, `POST /api/patients/:id/permissions` updates the permission state, creates a Notification and Audit Log entry, and immediately restricts `GET /api/patients/:id` when viewed as that Doctor—displaying an explicit *"Access Restricted by Patient Consent Settings"* screen with an option to inspect the permission state.
- **Document Upload & Review Transition**: Uploading a file or selecting a sample clinical document invokes `/api/ai/extract-document` (or template extraction), populates editable structured fields with a `"Needs Review"` badge, and saves the record. Clicking **"Verify & Publish to Timeline"** as a Doctor transitions the record to `"Clinician Verified"`, updates the patient's longitudinal timeline and lab trends, and logs the verification event.
- **Clinician-Supervised Prescription Approval**: In the *Prescription Review* module, AI can generate a proposed draft from authorized clinical context (`Status: Awaiting Clinician Review`). The Doctor can edit any field, check the mandatory attestation checkbox (*"I have reviewed the patient's documented allergies, renal/hepatic labs, and current medications"*), and click **"Approve (Simulated — Demo Only)"**, **"Request More Info"**, or **"Reject"**. Only upon clinician approval does the medication appear in the patient's active medication list and timeline.
