import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  HelpCircle,
  Lock,
  MessageSquareHeart,
  Pill,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import {
  ClinicalCopilotResponse,
  MedicalRecord,
  Patient,
  PatientAIResponse,
  SupportedUILanguage,
  UserRole,
} from '../types';

interface AIClinicalAssistantsProps {
  mode: 'patient-assistant' | 'clinical-copilot';
  role: UserRole;
  patient: Patient | undefined;
  records: MedicalRecord[];
  aiConfigured: boolean;
  uiLanguage?: SupportedUILanguage;
  onInspectRecord: (record: MedicalRecord) => void;
}

const PATIENT_SUGGESTED_QUESTIONS = [
  'Can you explain my latest blood test in simple language?',
  'What does my discharge summary say?',
  'What medicines are listed in my records?',
  'How have my recorded test results changed?',
  'What follow-up did my doctor recommend?',
  'Can you summarize my last hospital visit?',
  'What should I ask my doctor at my next appointment?',
];

const MULTILINGUAL_PATIENT_GLOSSARY: Record<
  SupportedUILanguage,
  {
    languageLabel: string;
    heading: string;
    summaryText: string;
    keyTerms: { term: string; meaning: string }[];
  }
> = {
  en: {
    languageLabel: 'English',
    heading: 'Plain-Language Key Terms in Your Chart',
    summaryText:
      'Your connected chart tracks blood sugar (HbA1c), kidney filtration (eGFR), blood pressure, and cholesterol across 3 hospitals.',
    keyTerms: [
      { term: 'HbA1c (7.8%)', meaning: '3-month average blood sugar measure (improved from 8.1%).' },
      { term: 'eGFR (62 mL/min)', meaning: 'Estimate of how well your kidneys filter waste.' },
      { term: 'Needs Review (REC-107)', meaning: 'Numbers extracted by computer awaiting your doctor’s final check.' },
    ],
  },
  hi: {
    languageLabel: 'हिंदी (Hindi — Patient Summary Support)',
    heading: 'आपके स्वास्थ्य रिकॉर्ड का सरल हिंदी सारांश (Patient Summary Guide)',
    summaryText:
      'आपका स्वास्थ्य रिकॉर्ड ३ अस्पतालों की जांच रिपोर्ट को जोड़ता है। आपकी हालिया जांच में शुगर (HbA1c 7.8%) और कोलेस्ट्रॉल (LDL 88 mg/dL) में सुधार देखा गया है, और किडनी की कार्यक्षमता (eGFR 62) स्थिर है।',
    keyTerms: [
      { term: 'HbA1c (7.8%)', meaning: 'पिछले ३ महीनों का औसत ब्लड शुगर स्तर (मई के 8.1% से बेहतर)।' },
      { term: 'eGFR (62 mL/min)', meaning: 'गुर्दे (किडनी) द्वारा रक्त साफ करने की क्षमता का अनुमान।' },
      { term: 'समीक्षा बाकी (REC-107)', meaning: '१८ अक्टूबर की रिपोर्ट डॉक्टर की अंतिम पुष्टि के लिए प्रतीक्षारत है।' },
    ],
  },
  ta: {
    languageLabel: 'தமிழ் (Tamil — Patient Summary Support)',
    heading: 'உங்கள் மருத்துவப் பதிவின் எளிய தமிழ் சுருக்கம் (Patient Summary Guide)',
    summaryText:
      'உங்கள் மருத்துவப் பதிவு 3 மருத்துவமனைகளின் பரிசோதனைகளை இணைக்கிறது. சமீபத்திய பரிசோதனையில் சர்க்கரை அளவு (HbA1c 7.8%) மற்றும் கொழுப்பு (LDL 88 mg/dL) குறைந்துள்ளது; சிறுநீரக செயல்பாடு (eGFR 62) சீராக உள்ளது.',
    keyTerms: [
      { term: 'HbA1c (7.8%)', meaning: 'கடந்த 3 மாத சராசரி இரத்த சர்க்கரை அளவு.' },
      { term: 'eGFR (62 mL/min)', meaning: 'சிறுநீரக வடிகட்டும் திறன் மதிப்பீடு.' },
      { term: 'மருத்துவர் சரிபார்ப்பு (REC-107)', meaning: 'அக்டோபர் 18 பரிசோதனை மருத்துவரின் ஒப்புதலுக்காக காத்திருக்கிறது.' },
    ],
  },
  kn: {
    languageLabel: 'ಕನ್ನಡ (Kannada — Patient Summary Support)',
    heading: 'ನಿಮ್ಮ ಆರೋಗ್ಯ ದಾಖಲೆಯ ಸರಳ ಕನ್ನಡ ಸಾರಾಂಶ (Patient Summary Guide)',
    summaryText:
      'ನಿಮ್ಮ ಆರೋಗ್ಯ ದಾಖಲೆಯು 3 ಆಸ್ಪತ್ರೆಗಳ ವರದಿಗಳನ್ನು ಒಂದೇ ಕಡೆ ಸೇರಿಸುತ್ತದೆ. ಇತ್ತೀಚಿನ ವರದಿಯಲ್ಲಿ ರಕ್ತದ ಸಕ್ಕರೆ ಪ್ರಮಾಣ (HbA1c 7.8%) ಮತ್ತು ಕೊಲೆಸ್ಟ್ರಾಲ್ (LDL 88) ಸುಧಾರಿಸಿದೆ ಹಾಗೂ ಕಿಡ್ನಿ ಕಾರ್ಯಕ್ಷಮತೆ (eGFR 62) ಸ್ಥಿರವಾಗಿದೆ.',
    keyTerms: [
      { term: 'HbA1c (7.8%)', meaning: 'ಕಳೆದ 3 ತಿಂಗಳ ಸರಾಸರಿ ರಕ್ತದ ಸಕ್ಕರೆ ಪ್ರಮಾಣ.' },
      { term: 'eGFR (62 mL/min)', meaning: 'ಮೂತ್ರಪಿಂಡದ (ಕಿಡ್ನಿ) ಶೋಧಕ ಸಾಮರ್ಥ್ಯದ ಅಂದಾಜು.' },
      { term: 'ವೈದ್ಯರ ಪರಿಶೀಲನೆ ಬಾಕಿ (REC-107)', meaning: 'ಅಕ್ಟೋಬರ್ 18ರ ವರದಿಯು ವೈದ್ಯರ ಅಂತಿಮ ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದೆ.' },
    ],
  },
};

const DOCTOR_QUICK_ACTIONS = [
  {
    label: 'Summarize patient history',
    prompt: 'Summarize the patient’s previous treatments, multi-hospital visits, and documented outcomes.',
  },
  {
    label: 'Explain medication (Atorvastatin vs Empagliflozin)',
    prompt:
      'Why might Atorvastatin 20 mg (REC-105) and Empagliflozin 10 mg (REC-106) have been prescribed? Distinguish documented prescribing rationale from general clinical indications.',
  },
  {
    label: 'Compare laboratory reports',
    prompt:
      'How does the latest laboratory report compare with previous reports across hospitals? Highlight any unit or assay incompatibilities.',
  },
  {
    label: 'Review documented allergies',
    prompt:
      'Review the patient’s documented allergies and severity, and verify whether any active medications pose cross-reactivity risks.',
  },
  {
    label: 'Check potential interactions',
    prompt:
      'What important medication interactions, renal dosing thresholds, or contraindications should I review for this regimen?',
  },
  {
    label: 'Find relevant clinical guidance',
    prompt:
      'What standard clinical practice guidelines (such as KDIGO diabetes-in-CKD, ADA cardiovascular risk reduction, and RAS/SGLT2i monitoring) apply to this patient’s documented conditions?',
  },
  {
    label: 'Prepare handover',
    prompt: 'Prepare a concise, source-linked clinical handover summary for this patient.',
  },
  {
    label: 'Identify missing clinical info',
    prompt:
      'What clinical information, baseline tests, or verifications are missing before I can fully assess this situation?',
  },
];

export const AIClinicalAssistants: React.FC<AIClinicalAssistantsProps> = ({
  mode,
  role,
  patient,
  records,
  aiConfigured,
  uiLanguage = 'en',
  onInspectRecord,
}) => {
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [patientHistory, setPatientHistory] = useState<PatientAIResponse[]>([]);
  const [copilotHistory, setCopilotHistory] = useState<ClinicalCopilotResponse[]>([]);

  if (!patient) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center">
        <p className="text-sm text-slate-600">Select a patient to use the AI Assistant.</p>
      </div>
    );
  }

  const patientRecords = records
    .filter((r) => r.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const openRecordById = (recId: string) => {
    const found = patientRecords.find((r) => r.id === recId);
    if (found) onInspectRecord(found);
  };

  // Enforce Consent in Clinical Copilot
  const doctorHasConsent =
    role !== 'doctor' ||
    patient.sharingPermissions.some((p) => p.status === 'Active');

  if (mode === 'clinical-copilot' && !doctorHasConsent) {
    return (
      <div className="p-8 bg-red-50/50 border border-red-200 rounded-xl text-center space-y-2">
        <Lock className="w-8 h-8 text-red-700 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">
          Clinical Intelligence Copilot Blocked by Patient Consent Settings
        </h2>
        <p className="text-xs text-slate-600 max-w-lg mx-auto">
          Patient {patient.fullName} ({patient.id}) has revoked data-sharing authorization. The Clinical Copilot cannot retrieve or analyze this patient&apos;s records.
        </p>
      </div>
    );
  }

  const handleSendPatientQuestion = async (qText?: string) => {
    const query = (qText ?? inputQuestion).trim();
    if (!query) return;
    setInputQuestion('');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/ai/patient-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, question: query }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Could not process question.');
      } else if (data.reply) {
        setPatientHistory((prev) => [data.reply, ...prev]);
      }
    } catch (err) {
      setErrorMsg('Network error while contacting Patient AI Assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCopilotQuery = async (qText?: string) => {
    const query = (qText ?? inputQuestion).trim();
    if (!query) return;
    setInputQuestion('');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/ai/clinical-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, question: query }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Could not process clinical query.');
      } else if (data.reply) {
        setCopilotHistory((prev) => [data.reply, ...prev]);
      }
    } catch (err) {
      setErrorMsg('Network error while contacting Clinical Intelligence Copilot.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // VIEW 1: PATIENT-FACING AI HEALTH ASSISTANT (SCENARIO E)
  // ============================================================================
  if (mode === 'patient-assistant') {
    const glossary = MULTILINGUAL_PATIENT_GLOSSARY[uiLanguage] || MULTILINGUAL_PATIENT_GLOSSARY.en;

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-teal-700 font-medium mb-1">
                <MessageSquareHeart className="w-4 h-4" />
                <span>PATIENT-FACING AI HEALTH ASSISTANT</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-bold">
                  {patient.id} ({patient.fullName})
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {aiConfigured
                    ? 'Live Gemini 3.8 Flash Active'
                    : 'Demo AI Mode (Labeled Fallback)'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Understand Your Health Records in Simple Language
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Ask questions about your blood tests, hospital visits, or medications. Every explanation clearly separates what is written in your records from general health education.
              </p>
            </div>
          </div>

          {/* Indian Healthcare Multilingual Summary Support Card */}
          <div className="mt-4 p-4 rounded-xl bg-teal-50/50 border border-teal-200/80">
            <div className="flex items-center justify-between text-xs text-teal-900 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-700" />
                <span>{glossary.heading}</span>
              </span>
              <span className="font-mono text-[11px] text-teal-800">
                {glossary.languageLabel}
              </span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed">{glossary.summaryText}</p>
            <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {glossary.keyTerms.map((kt, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="font-bold text-slate-900">{kt.term}</div>
                  <div className="text-slate-600 mt-0.5">{kt.meaning}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Question Buttons */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Suggested Questions (Click to Ask):
            </div>
            <div className="flex flex-wrap gap-2">
              {PATIENT_SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  disabled={isLoading}
                  onClick={() => handleSendPatientQuestion(q)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-700/40 rounded-lg text-xs font-medium text-slate-800 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPatientQuestion();
            }}
            className="mt-4 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask a question about your health records (or type 'chest pain' to test emergency warning detection)..."
              aria-label="Ask the Patient AI Health Assistant"
              className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuestion.trim()}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Explaining...' : 'Ask Assistant'}</span>
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            {errorMsg}
          </div>
        )}

        {isLoading && (
          <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2 text-xs text-slate-600">
            <RefreshCw className="w-5 h-5 text-teal-700 animate-spin mx-auto" />
            <p>Reviewing {patient.fullName}&apos;s authorized records and preparing a plain-language explanation...</p>
          </div>
        )}

        {/* Responses History */}
        {patientHistory.length === 0 && !isLoading ? (
          <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-3">
            <MessageSquareHeart className="w-8 h-8 text-teal-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">
              Ready to Explain Your Connected Records
            </h3>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              Select any suggested question above—such as <em>&ldquo;Can you explain my latest blood test in simple language?&rdquo;</em>—to see a structured, source-cited explanation.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {patientHistory.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div className="text-sm font-bold text-slate-900">
                    Q: &ldquo;{item.question}&rdquo;
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    <span>
                      {item.aiMode === 'live-gemini'
                        ? 'Live Gemini 3.8 Flash'
                        : 'Demo AI Mode (Simulated)'}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{item.timestamp}</span>
                  </div>
                </div>

                {item.emergencyWarningDetected && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-900">
                      <div className="font-bold text-sm">
                        URGENT MEDICAL WARNING DETECTED
                      </div>
                      <p className="mt-1 leading-relaxed">{item.safetyNotice}</p>
                    </div>
                  </div>
                )}

                {/* 1. Simple Answer */}
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/80">
                  <div className="text-xs font-bold text-teal-900 mb-1">
                    Simple Explanation
                  </div>
                  <p className="text-sm text-slate-900 leading-relaxed">
                    {item.simpleAnswer}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* 2. Information Found in Your Records */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                    <div className="font-bold text-slate-900">
                      Information Found in Your Authorized Records
                    </div>
                    {item.fromYourRecords.map((recItem, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-white border border-slate-200"
                      >
                        <p className="text-slate-800 leading-relaxed">
                          {recItem.statement}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span>
                            {recItem.hospital} · {recItem.recordDate}
                          </span>
                          <button
                            onClick={() => openRecordById(recItem.recordId)}
                            className="text-teal-700 font-semibold hover:underline"
                          >
                            [Open {recItem.recordId}]
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3. General Educational Context & Uncertainty */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                      <div className="font-bold text-slate-900 mb-1">
                        General Educational Context (Not Specific to Your Chart)
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {item.generalEducationalContext}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
                      <div className="font-bold text-amber-900 mb-1">
                        Missing Information &amp; Uncertainty
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        {item.uncertaintyAndMissingInfo.map((u, idx) => (
                          <li key={idx}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Recommended Next Step & Safety Notice */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <strong className="text-slate-900">Recommended Next Step: </strong>
                    <span className="text-slate-700">{item.recommendedNextStep}</span>
                  </div>
                  <span className="text-slate-500 shrink-0">{item.safetyNotice}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: TWO-PANEL CLINICAL INTELLIGENCE COPILOT — DOCTOR WORKSPACE (SECTION F)
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-teal-700 font-medium mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>TWO-PANEL CLINICAL INTELLIGENCE COPILOT (DECISION-SUPPORT ONLY)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-bold">
              Patient: {patient.id} ({patient.fullName})
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {aiConfigured
                ? 'Live Gemini 3.8 Flash Active'
                : 'Demo AI Mode (Labeled Fallback)'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Evidence-Grounded Clinical Copilot &amp; Live Chart Context
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Left panel displays {patient.fullName}&apos;s live longitudinal clinical chart, allergies, and source records; right panel runs evidence-grounded clinical queries without fabricating undocumented prescribing rationales.
          </p>
        </div>
      </div>

      {/* Desktop 2-Panel Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (4 Cols): Selected Patient Context, Allergies, Medications & Timeline Records */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5 lg:sticky lg:top-20">
          <div className="pb-3.5 border-b border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span className="font-bold text-teal-800">{patient.id}</span>
              <span>{patient.simulatedAbhaNumber || 'ABHA Sim'}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              {patient.fullName} ({patient.age}y {patient.gender[0]})
            </h2>
            <div className="text-xs text-slate-600 mt-0.5">
              Blood Group: <strong className="font-mono">{patient.bloodGroup}</strong> · Hospital:{' '}
              {patient.registeringHospital}
            </div>
          </div>

          {/* Allergies Alert Box */}
          <div>
            <div className="text-xs font-bold text-red-900 mb-2 flex items-center justify-between">
              <span>Documented Allergies ({patient.allergies.length})</span>
              <span className="font-mono text-[11px] text-red-700">CRITICAL CHECK</span>
            </div>
            {patient.allergies.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                No known allergies documented.
              </div>
            ) : (
              <div className="space-y-2">
                {patient.allergies.map((alg) => (
                  <div
                    key={alg.id}
                    className="p-2.5 rounded-lg bg-red-50/60 border border-red-200 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-red-900">
                      <span>{alg.substance}</span>
                      <span className="font-mono text-[11px]">{alg.severity}</span>
                    </div>
                    <div className="text-slate-700 mt-0.5">{alg.reaction}</div>
                    <button
                      onClick={() => openRecordById(alg.sourceRecordId)}
                      className="mt-1 font-mono text-[11px] font-semibold text-teal-800 hover:underline"
                    >
                      [Source: {alg.sourceRecordId}]
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Medications List */}
          <div>
            <div className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
              <span>Active Medications ({patient.medications.length})</span>
              <Pill className="w-3.5 h-3.5 text-teal-700" />
            </div>
            <div className="space-y-2">
              {patient.medications.map((med) => (
                <div
                  key={med.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>
                      {med.name} <span className="font-mono text-teal-800">{med.strength}</span>
                    </span>
                    <button
                      onClick={() => openRecordById(med.sourceRecordId)}
                      className="font-mono text-[11px] text-teal-700 hover:underline"
                    >
                      [{med.sourceRecordId}]
                    </button>
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    {med.dose} · {med.frequency}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Rationale:{' '}
                    {med.documentedReason
                      ? med.documentedReason
                      : 'Not recorded on source slip (REC-105)'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronological Source Records Quick-Inspector */}
          <div>
            <div className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
              <span>Authorized Source Records ({patientRecords.length})</span>
              <Clock className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {patientRecords.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => onInspectRecord(rec)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-teal-700 bg-white transition-colors text-xs"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="font-bold text-teal-800">
                      {rec.id} · {rec.date}
                    </span>
                    <span
                      className={
                        rec.reviewStatus === 'Verified'
                          ? 'text-emerald-700 font-semibold'
                          : 'text-amber-700 font-semibold'
                      }
                    >
                      {rec.reviewStatus}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5 truncate">
                    {rec.title}
                  </div>
                  <div className="text-slate-500 truncate">{rec.hospital}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (8 Cols): Copilot Quick Actions, Query Input & Structured Evidence Responses */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="text-xs font-semibold text-slate-700 mb-2.5">
              Clinical Copilot Quick Actions (8 Evidence-Grounded Prompts):
            </div>
            <div className="flex flex-wrap gap-2">
              {DOCTOR_QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  disabled={isLoading}
                  onClick={() => handleSendCopilotQuery(qa.prompt)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-700/40 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
                >
                  {qa.label}
                </button>
              ))}
            </div>

            {/* Custom Query Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCopilotQuery();
              }}
              className="mt-4 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask a clinical question (e.g., 'Why might Atorvastatin have been prescribed?' or 'Compare serial renal labs')..."
                aria-label="Clinical Copilot query input"
                className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
              <button
                type="submit"
                disabled={isLoading || !inputQuestion.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Analyzing...' : 'Run Clinical Query'}</span>
              </button>
            </form>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          {isLoading && (
            <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2 text-xs text-slate-600">
              <RefreshCw className="w-5 h-5 text-teal-700 animate-spin mx-auto" />
              <p>
                Cross-referencing authorized records ({patientRecords.map((r) => r.id).join(', ')}) and checking prescribing rationale provenance...
              </p>
            </div>
          )}

          {copilotHistory.length === 0 && !isLoading ? (
            <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-3">
              <Stethoscope className="w-8 h-8 text-teal-700 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                Select a Quick Action Above to Demonstrate Clinical Intelligence
              </h3>
              <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
                Try clicking <strong>&ldquo;Explain medication (Atorvastatin vs Empagliflozin)&rdquo;</strong> (Scenario C) to inspect how the Copilot distinguishes explicitly documented prescribing rationale in <code className="font-mono">REC-106</code> from unrecorded prescribing rationale in <code className="font-mono">REC-105</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {copilotHistory.map((resp) => (
                <div
                  key={resp.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div className="text-sm font-bold text-slate-900">
                      Clinician Query: &ldquo;{resp.question}&rdquo;
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      <span>
                        {resp.aiMode === 'live-gemini'
                          ? 'Live Gemini 3.8 Flash'
                          : 'Demo AI Mode (Simulated)'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{resp.timestamp}</span>
                    </div>
                  </div>

                  {/* 1. Short Answer */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-900 mb-1">
                      1. Short Clinical Synthesis
                    </div>
                    <p className="text-sm text-slate-900 leading-relaxed">
                      {resp.shortAnswer}
                    </p>
                  </div>

                  {/* Prescribing Rationale Provenance Box (if medication query) */}
                  {resp.prescribingRationaleStatus && (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 text-xs space-y-1.5">
                      <div className="font-bold text-amber-900 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          CRITICAL SAFEGUARD · Prescribing Rationale Provenance Check: {resp.prescribingRationaleStatus.medication}
                        </span>
                        <span className="font-mono">
                          {resp.prescribingRationaleStatus.explicitlyDocumentedInRecord
                            ? 'EXPLICITLY DOCUMENTED'
                            : 'PARTIALLY / NOT RECORDED IN SOURCE'}
                        </span>
                      </div>
                      <p className="text-slate-800">
                        <strong>What the Patient Record Explicitly States:</strong>{' '}
                        {resp.prescribingRationaleStatus.documentedReasonOrNote}
                      </p>
                      <p className="text-slate-700">
                        <strong>General Approved Pharmacological Indication:</strong>{' '}
                        {resp.prescribingRationaleStatus.commonApprovedIndication}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                    {/* 2. Relevant Patient-Record Evidence */}
                    <div className="space-y-2.5">
                      <h3 className="font-bold text-slate-900">
                        2. Relevant Patient-Record Evidence (Authorized Chart)
                      </h3>
                      {resp.patientRecordEvidence.map((ev, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50/50"
                        >
                          <p className="text-slate-800 leading-relaxed">{ev.finding}</p>
                          <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-slate-500">
                            <span>
                              {ev.sourceHospital} · {ev.date}
                            </span>
                            <button
                              onClick={() => openRecordById(ev.recordId)}
                              className="text-teal-700 font-semibold hover:underline"
                            >
                              [Inspect {ev.recordId}]
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 3. Clinical Context & Reasoning + 4. Potential Risks */}
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                        <h3 className="font-bold text-slate-900 mb-1">
                          3. Clinical Context &amp; Reasoning
                        </h3>
                        <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                          {resp.clinicalContextAndReasoning}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/30">
                        <h3 className="font-bold text-red-900 mb-1">
                          4. Potential Risks, Allergies, or Interactions to Review
                        </h3>
                        <ul className="list-disc pl-4 space-y-1 text-slate-800">
                          {resp.potentialRisksAndInteractions.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-100">
                    {/* 5. Missing Information */}
                    <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/40">
                      <h4 className="font-bold text-amber-900 mb-1">
                        5. Missing Information &amp; Uncertainty
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        {resp.missingInformationAndUncertainty.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>

                    {/* 6. Supporting References */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                      <h4 className="font-bold text-slate-900 mb-1">
                        6. Supporting Clinical References
                      </h4>
                      <div className="space-y-2">
                        {resp.supportingReferences.map((ref, i) => (
                          <div key={i} className="border-b border-slate-200/70 pb-1.5 last:border-0">
                            <div className="font-semibold text-slate-800">{ref.title}</div>
                            <div className="text-slate-500">
                              {ref.organization} ({ref.yearOrVersion})
                            </div>
                            <div className="text-[11px] font-mono text-amber-800 mt-0.5">
                              {ref.verificationNote}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 7. Suggested Clinician Checks */}
                    <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/30">
                      <h4 className="font-bold text-teal-900 mb-1">
                        7. Suggested Clinician Next Steps
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-800">
                        {resp.suggestedClinicianChecks.map((chk, i) => (
                          <li key={i}>{chk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <strong>Clinician Responsibility Notice:</strong> The Clinical Intelligence Copilot is a decision-support tool, not an autonomous medical authority. The treating clinician remains solely responsible for verifying references and making clinical decisions.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
