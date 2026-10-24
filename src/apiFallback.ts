import { createInitialSeedState } from './seedData';
import {
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
} from './types';

const CLIENT_STORE_KEY = 'onehealth_demo_store_v4';

function nowTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function getInitialClientStore(): AppStateStore {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(CLIENT_STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppStateStore;
        if (
          parsed &&
          Array.isArray(parsed.patients) &&
          parsed.patients.length >= 2 &&
          Array.isArray(parsed.records) &&
          parsed.records.some((r) => r.id === 'REC-202')
        ) {
          return parsed;
        }
      }
    }
  } catch (_err) {
    // Ignore localStorage read errors
  }
  const initial = createInitialSeedState();
  saveClientStore(initial);
  return initial;
}

export function saveClientStore(store: AppStateStore): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CLIENT_STORE_KEY, JSON.stringify(store));
    }
  } catch (_err) {
    // Ignore localStorage write errors
  }
}

let clientDb: AppStateStore = getInitialClientStore();

function addClientAuditLog(
  actorRole: UserRole,
  actorIdentity: string,
  action: string,
  targetIdentifier: string,
  outcome: AuditLogEntry['outcome'],
  summary: string
) {
  clientDb.auditLogs.unshift({
    id: `AUD-${8000 + clientDb.auditLogs.length + 1}`,
    timestamp: nowTimestamp(),
    actorRole,
    actorIdentity,
    action,
    targetIdentifier,
    outcome,
    summary,
  });
}

function addClientNotification(
  recipientRole: UserRole | 'all',
  title: string,
  message: string,
  category: NotificationItem['category'],
  targetSection: NotificationItem['targetSection'],
  patientId?: string
) {
  clientDb.notifications.unshift({
    id: `NOTIF-${500 + clientDb.notifications.length + 1}`,
    recipientRole,
    patientId,
    title,
    message,
    category,
    timestamp: nowTimestamp().slice(0, 16),
    read: false,
    targetSection,
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildStatePayload(role: UserRole, patientId?: string) {
  if (!clientDb.patients || clientDb.patients.length === 0) {
    clientDb = createInitialSeedState();
    saveClientStore(clientDb);
  }

  if (role === 'analyst') {
    return {
      aiConfigured: false,
      patients: clientDb.patients,
      records: clientDb.records,
      prescriptionDrafts: clientDb.prescriptionDrafts,
      publicHealthSeries: clientDb.publicHealthSeries,
      publicHealthSignals: clientDb.publicHealthSignals,
      notifications: clientDb.notifications.filter(
        (n) => n.recipientRole === 'analyst' || n.recipientRole === 'all'
      ),
      auditLogs: clientDb.auditLogs,
      abdmExchangeLogs: clientDb.abdmExchangeLogs || [],
      consultationQueue: clientDb.consultationQueue || [],
      facilityStaffConfig: clientDb.facilityStaffConfig || [],
    };
  }

  if (role === 'patient') {
    const myPatient =
      clientDb.patients.find((p) => p.id === patientId) || clientDb.patients[0];
    const myRecords = clientDb.records.filter((r) => r.patientId === myPatient.id);
    return {
      aiConfigured: false,
      patients: clientDb.patients,
      records: myRecords,
      prescriptionDrafts: clientDb.prescriptionDrafts.filter(
        (d) => d.patientId === myPatient.id
      ),
      publicHealthSeries: clientDb.publicHealthSeries,
      publicHealthSignals: clientDb.publicHealthSignals,
      notifications: clientDb.notifications.filter(
        (n) =>
          (n.recipientRole === 'patient' || n.recipientRole === 'all') &&
          (!n.patientId || n.patientId === myPatient.id)
      ),
      auditLogs: clientDb.auditLogs.filter(
        (a) =>
          a.targetIdentifier.includes(myPatient.id) ||
          a.actorIdentity.includes(myPatient.id)
      ),
      abdmExchangeLogs: (clientDb.abdmExchangeLogs || []).filter(
        (e) => e.patientId === myPatient.id
      ),
      consultationQueue: clientDb.consultationQueue || [],
      facilityStaffConfig: clientDb.facilityStaffConfig || [],
    };
  }

  return {
    aiConfigured: false,
    patients: clientDb.patients,
    records: clientDb.records,
    prescriptionDrafts: clientDb.prescriptionDrafts,
    publicHealthSeries: clientDb.publicHealthSeries,
    publicHealthSignals: clientDb.publicHealthSignals,
    notifications: clientDb.notifications.filter(
      (n) => n.recipientRole === role || n.recipientRole === 'all'
    ),
    auditLogs: clientDb.auditLogs,
    abdmExchangeLogs: clientDb.abdmExchangeLogs || [],
    consultationQueue: clientDb.consultationQueue || [],
    facilityStaffConfig: clientDb.facilityStaffConfig || [],
  };
}

async function handleLocalApiRequest(
  urlStr: string,
  method: string,
  bodyObj: any
): Promise<Response> {
  const url = new URL(urlStr, window.location.origin);
  const path = url.pathname;

  // 1. GET /api/state
  if (path === '/api/state' && method === 'GET') {
    const role = (url.searchParams.get('role') as UserRole) || 'patient';
    const patientId = url.searchParams.get('patientId') || 'P1001';
    return jsonResponse(buildStatePayload(role, patientId));
  }

  // 2. POST /api/reset
  if (path === '/api/reset' && method === 'POST') {
    clientDb = createInitialSeedState();
    addClientAuditLog(
      'admin',
      bodyObj?.actorIdentity || 'Demo Evaluator',
      'Reset Synthetic Demo Store to Seed Data',
      'GLOBAL_STORE',
      'Completed',
      'Restored all synthetic patients, multi-hospital records, prescriptions, and public-health surveillance series.'
    );
    saveClientStore(clientDb);
    return jsonResponse({ ok: true, message: 'Demo store reset to initial seed data.' });
  }

  // 3. POST /api/patients
  if (path === '/api/patients' && method === 'POST') {
    const {
      fullName,
      dateOfBirth,
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
    } = bodyObj || {};

    if (!fullName || !dateOfBirth || !gender || !registeringHospital) {
      return jsonResponse(
        { error: 'Full name, date of birth, sex/gender, and registering hospital are required.' },
        400
      );
    }

    const normalizedName = String(fullName).trim().toLowerCase();
    const potentialDuplicates = clientDb.patients.filter(
      (p) => p.fullName.toLowerCase() === normalizedName || p.dateOfBirth === dateOfBirth
    );
    if (potentialDuplicates.length > 0 && !forceCreateDespiteDuplicate) {
      return jsonResponse(
        {
          duplicateWarning: true,
          message: `Potential duplicate patient record detected matching name or DOB (${potentialDuplicates.map((d) => `${d.fullName} [${d.id}]`).join(', ')}).`,
          existingPatients: potentialDuplicates,
        },
        409
      );
    }

    const nextNum = 1001 + clientDb.patients.length;
    const newId = `P${nextNum}`;
    const birthYear = parseInt(String(dateOfBirth).slice(0, 4), 10) || 1985;
    const age = Math.max(0, 2026 - birthYear);
    const initialRecId = `REC-${100 + clientDb.records.length + 1}`;

    const newPatient: Patient = {
      id: newId,
      fullName: String(fullName).trim(),
      dateOfBirth,
      age,
      gender,
      bloodGroup: bloodGroup || 'O+',
      preferredLanguage: preferredLanguage || 'English',
      simulatedAbhaNumber: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${nextNum} (SIM)`,
      simulatedAbhaAddress: `${String(fullName).trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@abdm.sim`,
      emergencyContact: {
        name: emergencyContactName || 'Synthetic Emergency Contact',
        relation: emergencyContactRelation || 'Family Member',
        phone: emergencyContactPhone || 'DEMO-555-0199',
      },
      registeringHospital,
      assignedClinician: assignedClinician || 'Dr. Vikram Mehta, MD',
      assignedClinicianId: 'DOC-101',
      registeredAt: new Date().toISOString().slice(0, 10),
      allergies: allergiesText
        ? [
            {
              id: `ALG-${Date.now()}`,
              substance: allergiesText,
              reaction: 'Patient/Clinician reported at registration',
              severity: 'Moderate',
              verifiedStatus: 'Clinician-Verified',
              sourceRecordId: initialRecId,
            },
          ]
        : [],
      conditions: conditionsText
        ? [
            {
              id: `COND-${Date.now()}`,
              name: conditionsText,
              status: 'Active',
              diagnosedDate: new Date().toISOString().slice(0, 10),
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
              strength: 'As reported',
              dose: 'See intake note',
              route: 'Oral',
              frequency: 'Daily',
              startDate: new Date().toISOString().slice(0, 10),
              prescribingClinician: assignedClinician || 'Dr. Vikram Mehta, MD',
              hospital: registeringHospital,
              documentedReason: 'Reported at registration intake',
              status: 'Active',
              sourceRecordId: initialRecId,
            },
          ]
        : [],
      sharingPermissions: [
        {
          id: `PERM-${Date.now()}`,
          patientId: newId,
          entityName: assignedClinician || 'Dr. Vikram Mehta, MD',
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
      summaryNotes: `Registered ${newPatient.fullName} (${newId}) at ${registeringHospital}.`,
      originalDocumentText: `${registeringHospital.toUpperCase()} — PATIENT REGISTRATION & INTAKE RECORD\nPatient ID: ${newId} | Name: ${newPatient.fullName} | DOB: ${dateOfBirth}`,
      documentedDiagnosis: conditionsText || 'Initial registration intake',
      followUpRecommendation: 'Complete baseline clinical evaluation and upload diagnostic reports.',
    };

    clientDb.patients.unshift(newPatient);
    clientDb.records.push(intakeRecord);
    addClientNotification(
      'doctor',
      `New Patient Registered: ${newPatient.fullName} (${newId})`,
      `${newPatient.fullName} was registered at ${registeringHospital}.`,
      'record_upload',
      'patients',
      newId
    );
    addClientAuditLog(
      actorRole,
      actorIdentity,
      'Registered New Synthetic Patient & Intake Record',
      `Patient ${newId} (${newPatient.fullName})`,
      'Completed',
      `Created patient profile ${newId} at ${registeringHospital}.`
    );
    saveClientStore(clientDb);
    return jsonResponse({ patient: newPatient, initialRecord: intakeRecord }, 201);
  }

  // 4. POST /api/records
  if (path === '/api/records' && method === 'POST') {
    const {
      patientId,
      title,
      category = 'Lab Report',
      date = '2026-10-24',
      hospital = 'Metro General Hospital',
      clinician = 'Dr. Vikram Mehta, MD',
      specialty = 'Internal Medicine',
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
    } = bodyObj || {};

    const newRecord: MedicalRecord = {
      id: `REC-${100 + clientDb.records.length + 1}`,
      patientId: patientId || 'P1001',
      title: title || 'Uploaded Clinical Document',
      category,
      date,
      hospital,
      clinician,
      specialty,
      reviewStatus,
      provenance,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      verifiedBy: reviewStatus === 'Verified' ? uploadedBy : undefined,
      verifiedAt: reviewStatus === 'Verified' ? new Date().toISOString() : undefined,
      summaryNotes: summaryNotes || `${category} uploaded from ${hospital}.`,
      originalDocumentText:
        originalDocumentText ||
        `${hospital.toUpperCase()} — ${category.toUpperCase()}\nDate: ${date} | Clinician: ${clinician}`,
      fileName,
      fileMimeType,
      documentedDiagnosis,
      followUpRecommendation,
      labResults: Array.isArray(labResults) ? labResults : undefined,
      prescribedMedications: Array.isArray(prescribedMedications)
        ? prescribedMedications
        : undefined,
    };

    clientDb.records.push(newRecord);
    addClientNotification(
      reviewStatus === 'Needs Review' ? 'doctor' : 'patient',
      reviewStatus === 'Needs Review'
        ? `Record ${newRecord.id} Awaiting Clinician Verification`
        : `New Verified ${newRecord.category} Added (${newRecord.id})`,
      `${newRecord.title} (${newRecord.hospital}, ${newRecord.date}) was added for patient ${newRecord.patientId}.`,
      reviewStatus === 'Needs Review' ? 'verification_needed' : 'record_upload',
      'records',
      newRecord.patientId
    );
    addClientAuditLog(
      actorRole,
      uploadedBy,
      `Uploaded Medical Record (${newRecord.category} — ${newRecord.reviewStatus})`,
      `Record ${newRecord.id} (Patient ${newRecord.patientId})`,
      reviewStatus === 'Needs Review' ? 'Flagged for Review' : 'Completed',
      `Added ${newRecord.title} from ${hospital}.`
    );
    saveClientStore(clientDb);
    return jsonResponse({ record: newRecord }, 201);
  }

  // 5. PATCH /api/records/:id
  if (path.startsWith('/api/records/') && method === 'PATCH') {
    const id = path.split('/').pop() || '';
    const record = clientDb.records.find((r) => r.id === id);
    if (!record) return jsonResponse({ error: 'Record not found' }, 404);
    const {
      title,
      date,
      hospital,
      clinician,
      summaryNotes,
      documentedDiagnosis,
      followUpRecommendation,
      markVerified,
      requestApproval,
      actorRole = 'doctor',
      actorIdentity = 'Dr. Vikram Mehta, MD',
    } = bodyObj || {};

    if (title !== undefined) record.title = title;
    if (date !== undefined) record.date = date;
    if (hospital !== undefined) record.hospital = hospital;
    if (clinician !== undefined) record.clinician = clinician;
    if (summaryNotes !== undefined) record.summaryNotes = summaryNotes;
    if (documentedDiagnosis !== undefined) record.documentedDiagnosis = documentedDiagnosis;
    if (followUpRecommendation !== undefined)
      record.followUpRecommendation = followUpRecommendation;

    if (markVerified) {
      record.reviewStatus = 'Verified';
      record.provenance = 'Clinician-Verified';
      record.verifiedBy = actorIdentity;
      record.verifiedAt = new Date().toISOString();
      addClientNotification(
        'patient',
        `Clinician Verified Record ${record.id}`,
        `${actorIdentity} reviewed and verified ${record.title} (${record.date}).`,
        'doctor_review',
        'timeline',
        record.patientId
      );
      addClientAuditLog(
        actorRole,
        actorIdentity,
        'Verified Extracted Medical Record',
        `Record ${record.id} (Patient ${record.patientId})`,
        'Completed',
        `Transitioned ${record.id} from "Needs Review" to "Clinician-Verified".`
      );
    } else if (requestApproval) {
      addClientNotification(
        'doctor',
        `Approval Requested for Record ${record.id}`,
        `${actorIdentity} requested clinician verification & approval for ${record.title} (${record.id}).`,
        'verification_needed',
        'records',
        record.patientId
      );
      addClientAuditLog(
        actorRole,
        actorIdentity,
        'Submitted Record Verification / Approval Request',
        `Record ${record.id} (Patient ${record.patientId})`,
        'Flagged for Review',
        `${actorIdentity} submitted an approval request to the reviewing clinician for ${record.id}.`
      );
    }

    saveClientStore(clientDb);
    return jsonResponse({ record });
  }

  // 6. POST /api/prescriptions
  if (path === '/api/prescriptions' && method === 'POST') {
    const {
      patientId = 'P1001',
      medicationName = 'Telmisartan',
      strength = '40 mg',
      dose = '1 tablet',
      route = 'Oral',
      frequency = 'Once daily',
      duration = '90 days',
      instructions = 'Take once daily as directed by reviewing clinician.',
      supportingRationale = 'Submitted for clinician review and approval.',
      allergyCheckSummary,
      interactionCheckSummary,
      sourceRecordIds = ['REC-106'],
      createdBy = 'Dr. Vikram Mehta, MD',
      status = 'Awaiting Clinician Review',
    } = bodyObj || {};

    const patient =
      clientDb.patients.find((p) => p.id === patientId) || clientDb.patients[0];

    const draft: PrescriptionDraft = {
      id: `RX-${2000 + clientDb.prescriptionDrafts.length + 1}`,
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
          actorRole: createdBy.includes('Copilot') ? 'AI Decision Support' : 'Doctor / Patient Request',
          action: `Submitted prescription approval request (${status})`,
        },
      ],
    };

    clientDb.prescriptionDrafts.unshift(draft);
    addClientNotification(
      'doctor',
      `Prescription Approval Request ${draft.id} (${draft.status})`,
      `Request for ${draft.medicationName} ${draft.strength} (${patient.fullName}) is awaiting clinician review.`,
      'prescription_status',
      'prescriptions',
      patient.id
    );
    addClientAuditLog(
      'doctor',
      createdBy,
      `Submitted Prescription Approval Request (${draft.status})`,
      `Draft ${draft.id} (Patient ${patient.id})`,
      'Flagged for Review',
      `Staged ${draft.medicationName} ${draft.strength} for clinician approval.`
    );
    saveClientStore(clientDb);
    return jsonResponse({ draft }, 201);
  }

  // 7. PATCH /api/prescriptions/:id
  if (path.startsWith('/api/prescriptions/') && method === 'PATCH') {
    const id = path.split('/').pop() || '';
    const draft = clientDb.prescriptionDrafts.find((d) => d.id === id);
    if (!draft) return jsonResponse({ error: 'Prescription draft not found.' }, 404);

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
      actorRole = 'doctor',
      actorIdentity = 'Dr. Vikram Mehta, MD',
    } = bodyObj || {};

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
      draft.status = newStatus;
      if (newStatus === 'Approved by Clinician') {
        draft.reviewingClinician = actorIdentity;
        const patient = clientDb.patients.find((p) => p.id === draft.patientId);
        const newRecId = `REC-${100 + clientDb.records.length + 1}`;
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
          clientDb.records.push({
            id: newRecId,
            patientId: patient.id,
            title: `Clinician-Approved Prescription: ${draft.medicationName} ${draft.strength}`,
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
            summaryNotes: `Clinician-supervised approval of ${draft.medicationName} ${draft.strength} (${draft.dose}, ${draft.frequency} for ${draft.duration}).`,
            originalDocumentText: `CLINICIAN-APPROVED PRESCRIPTION\nDraft ID: ${draft.id} | Approved By: ${actorIdentity}\nMedication: ${draft.medicationName} ${draft.strength}`,
            documentedDiagnosis: draft.supportingRationale,
            followUpRecommendation: draft.clinicianNotes || 'Monitor clinical response.',
          });
        }
      }

      draft.approvalHistory.push({
        id: `HIST-${Date.now()}`,
        timestamp: nowTimestamp().slice(0, 16),
        actorName: actorIdentity,
        actorRole: actorRole === 'doctor' ? 'Reviewing Clinician' : actorRole,
        action: `Transitioned status to "${draft.status}"`,
        notes: clinicianNotes,
      });

      addClientAuditLog(
        actorRole,
        actorIdentity,
        `Prescription Workflow Action: ${draft.status}`,
        `Draft ${draft.id} (Patient ${draft.patientId})`,
        'Completed',
        `${actorIdentity} updated ${draft.id} (${draft.medicationName}) to "${draft.status}".`
      );
    }

    saveClientStore(clientDb);
    return jsonResponse({ draft });
  }

  // 8. PATCH /api/patients/:id/permissions
  if (path.includes('/permissions') && method === 'PATCH') {
    const parts = path.split('/');
    const id = parts[parts.indexOf('patients') + 1] || 'P1001';
    const patient =
      clientDb.patients.find((p) => p.id === id) || clientDb.patients[0];
    const {
      permissionId,
      newStatus,
      newEntityName,
      newEntityType,
      newCategories,
      newPurpose,
      newExpiresAt,
      requestStatus = 'Active',
      actorRole = 'patient',
      actorIdentity = patient.fullName,
    } = bodyObj || {};

    if (permissionId) {
      const perm = patient.sharingPermissions.find((p) => p.id === permissionId);
      if (perm) {
        perm.status = newStatus;
      }
      addClientAuditLog(
        actorRole,
        actorIdentity,
        `Updated Data Sharing Permission to ${newStatus}`,
        `Permission ${permissionId} (Patient ${patient.id})`,
        'Completed',
        `Permission status changed to ${newStatus}.`
      );
    } else if (newEntityName) {
      const createdPerm = {
        id: `PERM-${Date.now()}`,
        patientId: patient.id,
        entityName: newEntityName,
        entityType: (newEntityType as 'Doctor' | 'Hospital') || 'Hospital',
        entityId: `ENT-${Date.now()}`,
        facilityHfrId: 'IN-HFR-2904-STJUDE-SIM',
        categoriesShared:
          Array.isArray(newCategories) && newCategories.length > 0
            ? newCategories
            : ['Lab Reports', 'Prescriptions', 'Discharge Summaries'],
        purpose: newPurpose || 'Clinical Consultation & Care Coordination',
        status: requestStatus as 'Active' | 'Pending Approval' | 'Revoked' | 'Rejected',
        grantedAt: new Date().toISOString().slice(0, 10),
        expiresAt: newExpiresAt || '2027-06-30',
      };
      patient.sharingPermissions.unshift(createdPerm);
      addClientAuditLog(
        actorRole,
        actorIdentity,
        requestStatus === 'Pending Approval'
          ? 'Submitted New Consent Approval Request'
          : 'Granted New Sharing Permission',
        `Permission ${createdPerm.id} (${newEntityName})`,
        'Completed',
        `${actorIdentity} created consent artefact ${createdPerm.id} (${requestStatus}).`
      );
    }

    saveClientStore(clientDb);
    return jsonResponse({ patient });
  }

  // 9. POST /api/abdm/exchange
  if (path === '/api/abdm/exchange' && method === 'POST') {
    const {
      patientId = 'P1001',
      hipName = 'Metro General Hospital (HIP)',
      hiuName = 'St. Jude Cardiac & Specialty Center (HIU)',
      fhirResourceType = 'DiagnosticReport',
      recordId = 'REC-106',
      purposeOfUse = 'Continuity of Care',
      actorRole = 'doctor',
      actorIdentity = 'Dr. Vikram Mehta, MD',
    } = bodyObj || {};

    const patient =
      clientDb.patients.find((p) => p.id === patientId) || clientDb.patients[0];
    const hasActiveConsent = patient.sharingPermissions.some((p) => p.status === 'Active');
    const newEntry = {
      id: `EXCH-${300 + (clientDb.abdmExchangeLogs?.length || 0) + 1}`,
      patientId: patient.id,
      timestamp: nowTimestamp().slice(0, 16),
      requesterHipOrHiu: hiuName,
      providerHip: hipName,
      hiTypes: [fhirResourceType],
      consentArtefactId: patient.sharingPermissions[0]?.id || 'CA-IN-2026-8841-SIM',
      exchangeStatus: hasActiveConsent
        ? ('Verified Exchange (Simulated)' as const)
        : ('Failed / Consent Revoked' as const),
      fhirBundleCount: 1,
      notes: `${purposeOfUse} (Source Record: ${recordId})`,
    };
    clientDb.abdmExchangeLogs = [newEntry, ...(clientDb.abdmExchangeLogs || [])];
    addClientAuditLog(
      actorRole,
      actorIdentity,
      `Simulated ABDM HIE-CM Exchange (${fhirResourceType})`,
      newEntry.id,
      hasActiveConsent ? 'Completed' : 'Restricted / Denied',
      `${hipName} -> ${hiuName}`
    );
    saveClientStore(clientDb);
    return jsonResponse({ exchange: newEntry }, 201);
  }

  // 10. PATCH /api/public-health/signals/:id
  if (path.startsWith('/api/public-health/signals/') && method === 'PATCH') {
    const id = path.split('/').pop() || '';
    const sig = clientDb.publicHealthSignals.find((s) => s.id === id);
    if (sig && bodyObj?.status) {
      sig.status = bodyObj.status;
      sig.reviewNotes = bodyObj.reviewNotes;
    }
    saveClientStore(clientDb);
    return jsonResponse({ signal: sig });
  }

  // 11. Notifications read
  if (path.startsWith('/api/notifications/') && method === 'PATCH') {
    const id = path.split('/')[3] || '';
    const notif = clientDb.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    saveClientStore(clientDb);
    return jsonResponse({ notification: notif });
  }

  if (path === '/api/notifications/read-all' && method === 'POST') {
    clientDb.notifications.forEach((n) => {
      n.read = true;
    });
    saveClientStore(clientDb);
    return jsonResponse({ ok: true });
  }

  // 12. AI endpoints fallback
  if (path === '/api/ai/timeline-summary' && method === 'POST') {
    const pid = bodyObj?.patientId || 'P1001';
    const patient =
      clientDb.patients.find((p) => p.id === pid) || clientDb.patients[0];
    const recs = clientDb.records.filter((r) => r.patientId === patient.id);
    const summary: LongitudinalSummaryResponse =
      patient.aiSummaryCache || {
        generatedAt: nowTimestamp(),
        aiMode: 'demo-fallback',
        overviewParagraph: `${patient.fullName} (${patient.age}y ${patient.gender}) has ${recs.length} connected clinical records across ${Array.from(new Set(recs.map((r) => r.hospital))).join(', ')}. Active conditions: ${patient.conditions.map((c) => c.name).join(', ')}.`,
        documentedConditions: patient.conditions.map((c) => ({
          statement: `${c.name} (${c.status}) documented at ${c.documentingHospital}.`,
          sourceRecordIds: [c.sourceRecordId],
          category: 'condition' as const,
        })),
        medicationHistorySummary: patient.medications.map((m) => ({
          statement: `${m.name} ${m.strength} (${m.dose}, ${m.frequency}) — ${m.documentedReason || 'Active regimen'}.`,
          sourceRecordIds: [m.sourceRecordId],
          category: 'medication' as const,
        })),
        notableLabChanges: recs.slice(-2).map((r) => ({
          statement: `${r.title} (${r.date} at ${r.hospital}): ${r.summaryNotes}`,
          sourceRecordIds: [r.id],
          category: 'lab_change' as const,
        })),
        recentVisitsAndFollowUps: recs
          .filter((r) => r.followUpRecommendation)
          .slice(-2)
          .map((r) => ({
            statement: r.followUpRecommendation || 'Continue clinical monitoring.',
            sourceRecordIds: [r.id],
            category: 'followup' as const,
          })),
        missingOrConflictingInfo: [
          'Always verify machine-extracted laboratory values marked "Needs Review" against original clinical reports.',
        ],
      };
    return jsonResponse({ summary });
  }

  if (path === '/api/ai/patient-assistant' && method === 'POST') {
    const pid = bodyObj?.patientId || 'P1001';
    const question = String(bodyObj?.question || 'Explain my health records');
    const lang = String(bodyObj?.language || 'en');
    const patient =
      clientDb.patients.find((p) => p.id === pid) || clientDb.patients[0];
    const recs = clientDb.records.filter((r) => r.patientId === patient.id);
    const isEmergency = /chest pain|shortness of breath|faint|seizure|stroke|unconscious|bleeding/i.test(
      question
    );

    const langPrefix =
      lang === 'hi'
        ? 'हिंदी सारांश: आपके जुड़े हुए अस्पताल रिकॉर्ड के अनुसार, आपकी हालिया जांच और दवाइयाँ नियंत्रण में हैं। '
        : lang === 'ta'
        ? 'தமிழ் சுருக்கம்: உங்கள் இணைக்கப்பட்ட மருத்துவமனைப் பதிவுகளின்படி, உங்கள் பரிசோதனை முடிவுகள் சீராக உள்ளன. '
        : lang === 'kn'
        ? 'ಕನ್ನಡ ಸಾರಾಂಶ: ನಿಮ್ಮ ಸಂಪರ್ಕಿತ ಆಸ್ಪತ್ರೆ ದಾಖಲೆಗಳ ಪ್ರಕಾರ, ನಿಮ್ಮ ಇತ್ತೀಚಿನ ಪರೀಕ್ಷಾ ಫಲಿತಾಂಶಗಳು ನಿಯಂತ್ರಣದಲ್ಲಿವೆ. '
        : '';

    const reply: PatientAIResponse = {
      id: `PAI-${Date.now()}`,
      question,
      timestamp: nowTimestamp(),
      aiMode: 'demo-fallback',
      emergencyWarningDetected: isEmergency,
      simpleAnswer: isEmergency
        ? `${langPrefix}URGENT WARNING: Your message mentions symptoms (${question}) that require immediate emergency medical evaluation. Please contact emergency services or visit the nearest hospital emergency department immediately.`
        : `${langPrefix}Based on ${patient.fullName}'s ${recs.length} connected records, your latest visit (${recs[recs.length - 1]?.title || 'Recent Checkup'} on ${recs[recs.length - 1]?.date || '2026-10-18'}) shows steady progress. Active medications include ${patient.medications.map((m) => `${m.name} ${m.strength}`).join(', ')}.`,
      fromYourRecords: recs.slice(-3).map((r) => ({
        statement: `${r.title}: ${r.summaryNotes}`,
        recordId: r.id,
        hospital: r.hospital,
        recordDate: r.date,
      })),
      generalEducationalContext:
        'Keeping longitudinal records connected across hospitals helps your care team track blood pressure, blood sugar, kidney function, and respiratory trends safely over time.',
      uncertaintyAndMissingInfo: [
        'Any record marked "Needs Review" must be confirmed by your treating doctor during your next consultation.',
      ],
      recommendedNextStep: isEmergency
        ? 'Seek emergency medical care immediately.'
        : 'Continue taking your clinician-approved medications as prescribed and review these questions at your next follow-up visit.',
      safetyNotice:
        'Educational plain-language summary only — not a medical diagnosis or prescription order.',
    };
    return jsonResponse({ reply });
  }

  if (path === '/api/ai/clinical-copilot' && method === 'POST') {
    const pid = bodyObj?.patientId || 'P1001';
    const question = String(bodyObj?.question || 'Summarize patient history');
    const patient =
      clientDb.patients.find((p) => p.id === pid) || clientDb.patients[0];
    const recs = clientDb.records.filter((r) => r.patientId === patient.id);

    const reply: ClinicalCopilotResponse = {
      id: `COP-${Date.now()}`,
      question,
      timestamp: nowTimestamp(),
      aiMode: 'demo-fallback',
      shortAnswer: `Synthesized ${recs.length} multi-hospital records for ${patient.fullName} (${patient.id}, ${patient.age}y ${patient.gender}). Documented conditions: ${patient.conditions.map((c) => c.name).join('; ')}. Critical allergies: ${patient.allergies.map((a) => `${a.substance} (${a.severity})`).join(', ') || 'None recorded'}.`,
      patientRecordEvidence: recs.map((r) => ({
        finding: `${r.title}: ${r.summaryNotes}`,
        recordId: r.id,
        date: r.date,
        sourceHospital: r.hospital,
      })),
      clinicalContextAndReasoning:
        'Verify medication indications and renal/electrolyte parameters across participating facilities before modifying chronic therapy. Cross-check documented drug allergies prior to authorizing any new prescription draft.',
      potentialRisksAndInteractions: [
        `Documented allergy alert: ${patient.allergies.map((a) => `${a.substance} (${a.reaction})`).join(', ') || 'No drug allergies on file'}.`,
        'Ensure incompatible laboratory units (e.g., mmol/L vs mg/dL) are converted before longitudinal trend interpretation.',
      ],
      missingInformationAndUncertainty: [
        'Confirm any unverified machine-extracted lab values marked "Needs Review" against original hospital reports.',
      ],
      supportingReferences: [
        {
          title: 'Standard Multi-Hospital Clinical Handover & Medication Reconciliation Protocol',
          organization: 'OneHealth AI Clinical Governance Reference',
          yearOrVersion: '2026',
          verificationNote: 'General clinical reference context — Reference verification unavailable in demo mode.',
        },
      ],
      suggestedClinicianChecks: [
        'Verify unverified records in the Medical Records tab.',
        'Review active medications and documented allergies before approving prescription drafts.',
      ],
    };
    return jsonResponse({ reply });
  }

  if (path === '/api/ai/prescription-draft' && method === 'POST') {
    const pid = bodyObj?.patientId || 'P1001';
    const clinicalRequest = String(bodyObj?.clinicalRequest || 'Routine renewal');
    const patient =
      clientDb.patients.find((p) => p.id === pid) || clientDb.patients[0];
    const recs = clientDb.records.filter((r) => r.patientId === patient.id);
    return jsonResponse({
      aiMode: 'demo-fallback',
      proposal: {
        medicationName:
          patient.id === 'P1002'
            ? 'Budesonide / Formoterol Inhaler'
            : 'Telmisartan',
        strength: patient.id === 'P1002' ? '200/6 mcg' : '40 mg',
        dose: patient.id === 'P1002' ? '1 inhalation' : '1 tablet',
        route: patient.id === 'P1002' ? 'Inhaled' : 'Oral',
        frequency: 'Twice daily / As directed',
        duration: '90 days',
        instructions:
          'Take as directed by reviewing clinician. Monitor vital signs and clinical response.',
        supportingRationale: `Prepared from authorized records (${recs.map((r) => r.id).join(', ')}) for request: "${clinicalRequest}". Requires clinician verification and approval.`,
        allergyCheckSummary: `Checked against documented allergies: ${patient.allergies.map((a) => `${a.substance} (${a.severity})`).join(', ') || 'None'}.`,
        interactionCheckSummary: `Reviewed alongside active regimen (${patient.medications.map((m) => m.name).join(', ') || 'None'}).`,
        sourceRecordIds: recs.slice(-2).map((r) => r.id),
      },
    });
  }

  if (path === '/api/ai/extract-document' && method === 'POST') {
    const fileName = bodyObj?.fileName || 'Uploaded_Report.pdf';
    return jsonResponse({
      aiMode: 'demo-fallback',
      extracted: {
        title: `Extracted Clinical Report — ${fileName}`,
        category: 'Lab Report',
        summaryNotes: `Structured clinical fields extracted from ${fileName} and staged as "Needs Review" for clinician approval.`,
        documentedDiagnosis: 'Pending clinician verification of uploaded report',
        followUpRecommendation: 'Review extracted values and verify against original document.',
        extractedText: bodyObj?.rawText || `[Uploaded Clinical Document Reference: ${fileName}]`,
        labResults: [
          {
            testName: 'HbA1c (Glycated Hemoglobin)',
            value: 7.4,
            unit: '%',
            referenceRange: '4.0 - 5.6 %',
            assayMethod: 'HPLC (NGSP Certified)',
            flag: 'High',
            comparableGroup: 'HbA1c_%',
          },
        ],
      },
    });
  }

  return jsonResponse({ ok: true });
}

const nativeFetch: typeof fetch | undefined =
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : undefined;

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const urlStr =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  const isApiCall = urlStr.startsWith('/api/') || urlStr.includes('/api/');
  if (!isApiCall) {
    if (nativeFetch) {
      return nativeFetch(input, init);
    }
    throw new Error('Fetch is not available in this environment.');
  }

  const method = (init?.method || 'GET').toUpperCase();
  let bodyObj: any = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      bodyObj = JSON.parse(init.body);
    } catch (_e) {
      bodyObj = {};
    }
  }

  if (!nativeFetch) {
    return handleLocalApiRequest(urlStr, method, bodyObj);
  }

  try {
    const response = await nativeFetch(input, init);
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      // Clone and verify that /api/state never returns empty patients
      if (urlStr.includes('/api/state')) {
        const cloned = response.clone();
        const data = await cloned.json();
        if (data && Array.isArray(data.patients) && data.patients.length > 0) {
          return response;
        }
        // If backend returned empty patients, serve from client fallback store
        return handleLocalApiRequest(urlStr, method, bodyObj);
      }
      return response;
    }
    // If non-JSON (e.g. Render Static Site returning text/html) or 404/500, use local fallback
    return handleLocalApiRequest(urlStr, method, bodyObj);
  } catch (_networkErr) {
    return handleLocalApiRequest(urlStr, method, bodyObj);
  }
}

let isInstalled = false;

export function installApiFallback(): void {
  if (isInstalled || typeof window === 'undefined') return;
  isInstalled = true;

  try {
    Object.defineProperty(window, 'fetch', {
      value: apiFetch,
      configurable: true,
      writable: true,
    });
  } catch (_err) {
    // In environments where window.fetch is a non-configurable getter, apiFetch is used directly.
  }
}

