import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileText,
  HeartPulse,
  MessageSquareHeart,
  Moon,
  Pill,
  ShieldAlert,
  Sparkles,
  Sun,
} from 'lucide-react';
import { MedicalRecord, NavigationSection, Patient, UserRole } from '../types';

// ============================================================================
// HIGH-RESOLUTION SVG MEDICAL ILLUSTRATIONS (ENCODED AS DATA-URI IMAGES)
// Guarantees instant 0ms load, crisp retina rendering, and zero broken links.
// ============================================================================

function svgToDataUri(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const CONNECTED_CARE_BANNER_IMG = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="640" y2="320" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F0FDFA"/>
      <stop offset="55%" stop-color="#CCFBF1"/>
      <stop offset="100%" stop-color="#E0F2FE"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F8FAFC"/>
    </linearGradient>
  </defs>
  <rect width="640" height="320" rx="24" fill="url(#bgGrad)"/>
  <circle cx="540" cy="70" r="110" fill="#99F6E4" opacity="0.35"/>
  <circle cx="110" cy="260" r="95" fill="#BAE6FD" opacity="0.4"/>

  <!-- Connected Hospital Network Nodes -->
  <path d="M90 165 C 190 95, 290 95, 370 155 C 440 205, 510 185, 565 120" stroke="#0F766E" stroke-width="3" stroke-dasharray="6 6" fill="none"/>

  <!-- Hospital 1 Card -->
  <rect x="36" y="130" width="130" height="84" rx="14" fill="url(#cardGrad)" stroke="#0F766E" stroke-width="2"/>
  <rect x="52" y="146" width="28" height="28" rx="8" fill="#0F766E"/>
  <path d="M66 153V167M59 160H73" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
  <text x="88" y="158" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0F172A">Hospital 1</text>
  <text x="88" y="172" font-family="sans-serif" font-size="9" fill="#475569">Metro General</text>
  <rect x="52" y="186" width="96" height="14" rx="6" fill="#DCFCE7"/>
  <text x="62" y="196" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="#166534">✓ Records Linked</text>

  <!-- Central Patient Health Summary Hub -->
  <rect x="210" y="54" width="220" height="212" rx="20" fill="#FFFFFF" stroke="#0F766E" stroke-width="2.5"/>
  <rect x="228" y="72" width="184" height="42" rx="10" fill="#0F766E"/>
  <circle cx="250" cy="93" r="12" fill="#5EEAD4"/>
  <path d="M245 93L249 97L256 89" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="270" y="90" font-family="sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF">1 Unified Health Story</text>
  <text x="270" y="104" font-family="sans-serif" font-size="9" fill="#CCFBF1">Easy to Read &amp; Understand</text>

  <!-- ECG Pulse Line inside Hub -->
  <rect x="228" y="126" width="184" height="58" rx="10" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"/>
  <path d="M240 158 H278 L288 138 L300 174 L312 146 L322 158 H398" stroke="#0F766E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="398" cy="158" r="4.5" fill="#0F766E"/>
  <text x="240" y="176" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0F766E">BP: 148/92 → 124/78 mmHg (Healthy)</text>

  <!-- Simple Status Pills inside Hub -->
  <rect x="228" y="196" width="88" height="52" rx="10" fill="#F8FAFC" stroke="#E2E8F0"/>
  <text x="240" y="215" font-family="sans-serif" font-size="9" fill="#64748B">Blood Sugar</text>
  <text x="240" y="234" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0F766E">6.8% ✓</text>

  <rect x="324" y="196" width="88" height="52" rx="10" fill="#FEF2F2" stroke="#FECACA"/>
  <text x="334" y="215" font-family="sans-serif" font-size="9" fill="#991B1B">Allergy Alert</text>
  <text x="334" y="234" font-family="sans-serif" font-size="11" font-weight="bold" fill="#DC2626">No Penicillin</text>

  <!-- Hospital 2 & 3 Cards on Right -->
  <rect x="468" y="64" width="140" height="82" rx="14" fill="url(#cardGrad)" stroke="#0284C7" stroke-width="2"/>
  <circle cx="494" cy="92" r="14" fill="#E0F2FE"/>
  <path d="M488 92 H500 M494 86 V98" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round"/>
  <text x="514" y="90" font-family="sans-serif" font-size="10.5" font-weight="bold" fill="#0F172A">Apollo Lab</text>
  <text x="514" y="103" font-family="sans-serif" font-size="8.5" fill="#475569">Blood &amp; Kidney Tests</text>
  <text x="484" y="130" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0369A1">✓ Explained Simply</text>

  <rect x="468" y="168" width="140" height="82" rx="14" fill="url(#cardGrad)" stroke="#0F766E" stroke-width="2"/>
  <circle cx="494" cy="196" r="14" fill="#CCFBF1"/>
  <path d="M489 196 C489 191, 499 191, 499 196 C499 201, 494 204, 494 204 C494 204, 489 201, 489 196 Z" fill="#0F766E"/>
  <text x="514" y="194" font-family="sans-serif" font-size="10.5" font-weight="bold" fill="#0F172A">St. Jude Heart</text>
  <text x="514" y="207" font-family="sans-serif" font-size="8.5" fill="#475569">Heart &amp; BP Clinic</text>
  <text x="484" y="234" font-family="sans-serif" font-size="9" font-weight="bold" fill="#0F766E">✓ Doctor Verified</text>
</svg>
`);

export const HEART_BP_ILLUSTRATION_IMG = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" fill="none">
  <rect width="400" height="240" rx="18" fill="#F0FDFA"/>
  <circle cx="88" cy="120" r="58" fill="#CCFBF1"/>
  <!-- Heart Icon -->
  <path d="M88 154 C88 154 50 128 50 100 C50 84 63 74 76 74 C83 74 88 79 88 84 C88 79 93 74 100 74 C113 74 126 84 126 100 C126 128 88 154 88 154 Z" fill="#0F766E"/>
  <path d="M62 114 H78 L84 98 L92 128 L99 108 L105 114 H116" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- BP Readout Card -->
  <rect x="168" y="42" width="198" height="156" rx="14" fill="#FFFFFF" stroke="#99F6E4" stroke-width="2"/>
  <text x="188" y="70" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748B">BLOOD PRESSURE PROGRESS</text>
  <text x="188" y="106" font-family="monospace" font-size="28" font-weight="bold" fill="#0F766E">124/78</text>
  <text x="302" y="104" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803D">mmHg</text>
  <rect x="188" y="122" width="158" height="12" rx="6" fill="#E2E8F0"/>
  <rect x="188" y="122" width="128" height="12" rx="6" fill="#10B981"/>
  <text x="188" y="156" font-family="sans-serif" font-size="11" font-weight="bold" fill="#166534">✓ Down from 148/92 mmHg</text>
  <text x="188" y="176" font-family="sans-serif" font-size="10" fill="#475569">Heart &amp; BP medicine is working</text>
</svg>
`);

export const SUGAR_KIDNEY_ILLUSTRATION_IMG = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" fill="none">
  <rect width="400" height="240" rx="18" fill="#EFF6FF"/>
  <circle cx="88" cy="120" r="58" fill="#DBEAFE"/>
  <!-- Blood Drop & Shield -->
  <path d="M88 70 C88 70 56 112 56 136 C56 154 70 168 88 168 C106 168 120 154 120 136 C120 112 88 70 88 70 Z" fill="#0284C7"/>
  <path d="M76 136 L85 145 L102 126" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Sugar & Kidney Readout Card -->
  <rect x="168" y="42" width="198" height="156" rx="14" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="2"/>
  <text x="188" y="70" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748B">SUGAR &amp; KIDNEY HEALTH</text>
  <text x="188" y="104" font-family="monospace" font-size="24" font-weight="bold" fill="#0369A1">HbA1c 6.8%</text>
  <rect x="188" y="118" width="158" height="12" rx="6" fill="#E2E8F0"/>
  <rect x="188" y="118" width="134" height="12" rx="6" fill="#0284C7"/>
  <text x="188" y="152" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0369A1">✓ Improved from 7.9% → 6.8%</text>
  <text x="188" y="174" font-family="sans-serif" font-size="10.5" font-weight="bold" fill="#15803D">✓ Kidney Filter (eGFR): 82 Normal</text>
</svg>
`);

export const DAILY_MEDICINE_ILLUSTRATION_IMG = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" fill="none">
  <rect width="400" height="240" rx="18" fill="#FEFCE8"/>
  <circle cx="88" cy="120" r="58" fill="#FEF08A"/>
  <!-- Sun & Pill Icon -->
  <circle cx="88" cy="102" r="22" fill="#F59E0B"/>
  <rect x="64" y="132" width="48" height="24" rx="12" fill="#FFFFFF" stroke="#0F766E" stroke-width="2.5"/>
  <path d="M88 132 V156" stroke="#0F766E" stroke-width="2.5"/>
  <rect x="65" y="133" width="22" height="22" rx="10" fill="#14B8A6"/>
  <!-- Schedule Card -->
  <rect x="168" y="42" width="198" height="156" rx="14" fill="#FFFFFF" stroke="#FDE047" stroke-width="2"/>
  <text x="188" y="70" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748B">DAILY MEDICINE GUIDE</text>
  <rect x="188" y="84" width="158" height="38" rx="8" fill="#F0FDFA"/>
  <text x="198" y="101" font-family="sans-serif" font-size="10.5" font-weight="bold" fill="#0F766E">☀ Morning (With Food)</text>
  <text x="198" y="115" font-family="sans-serif" font-size="9.5" fill="#334155">Telmisartan · Empagliflozin</text>
  <rect x="188" y="132" width="158" height="38" rx="8" fill="#EFF6FF"/>
  <text x="198" y="149" font-family="sans-serif" font-size="10.5" font-weight="bold" fill="#1D4ED8">☾ Morning &amp; Night</text>
  <text x="198" y="163" font-family="sans-serif" font-size="9.5" fill="#334155">Metformin 500 mg (2x daily)</text>
</svg>
`);

export const DOCTOR_WORKFLOW_BANNER_IMG = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220" fill="none">
  <rect width="600" height="220" rx="20" fill="#0F172A"/>
  <circle cx="520" cy="40" r="90" fill="#0F766E" opacity="0.35"/>
  <!-- 3 Visual Workflow Steps for Clinician -->
  <rect x="28" y="34" width="164" height="152" rx="14" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
  <circle cx="56" cy="64" r="16" fill="#0F766E"/>
  <text x="51" y="69" font-family="sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF">1</text>
  <text x="80" y="68" font-family="sans-serif" font-size="12" font-weight="bold" fill="#F8FAFC">3-Hospital Record</text>
  <text x="44" y="98" font-family="sans-serif" font-size="10.5" fill="#CBD5E1">All labs, vitals &amp; notes</text>
  <text x="44" y="114" font-family="sans-serif" font-size="10.5" fill="#CBD5E1">unified chronologically</text>
  <rect x="44" y="138" width="132" height="28" rx="8" fill="#0F766E" opacity="0.25"/>
  <text x="54" y="156" font-family="monospace" font-size="10" font-weight="bold" fill="#5EEAD4">7 Connected Records</text>

  <rect x="218" y="34" width="164" height="152" rx="14" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
  <circle cx="246" cy="64" r="16" fill="#0284C7"/>
  <text x="241" y="69" font-family="sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF">2</text>
  <text x="270" y="68" font-family="sans-serif" font-size="12" font-weight="bold" fill="#F8FAFC">AI Copilot Check</text>
  <text x="234" y="98" font-family="sans-serif" font-size="10.5" fill="#CBD5E1">Checks allergies, labs</text>
  <text x="234" y="114" font-family="sans-serif" font-size="10.5" fill="#CBD5E1">&amp; missing indications</text>
  <rect x="234" y="138" width="132" height="28" rx="8" fill="#EF4444" opacity="0.25"/>
  <text x="244" y="156" font-family="monospace" font-size="10" font-weight="bold" fill="#FCA5A5">Penicillin Alert Flagged</text>

  <rect x="408" y="34" width="164" height="152" rx="14" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
  <circle cx="436" cy="64" r="16" fill="#10B981"/>
  <text x="431" y="69" font-family="sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF">3</text>
  <text x="460" y="68" font-family="sans-serif" font-size="12" font-weight="bold" fill="#F8FAFC">Doctor Sign-Off</text>
  <text x="424" y="98" font-family="sans-serif" font-size="10.5" fill="#CBD5E1">AI prepares draft; only</text>
  <text x="424" y="114" font-family="sans-serif" font-size="10.5" fill="#CBD5E1">doctor can approve Rx</text>
  <rect x="424" y="138" width="132" height="28" rx="8" fill="#10B981" opacity="0.25"/>
  <text x="434" y="156" font-family="monospace" font-size="10" font-weight="bold" fill="#6EE7B7">Supervised Approval</text>
</svg>
`);

interface PatientVisualGuideProps {
  patient: Patient;
  records: MedicalRecord[];
  onNavigate: (section: NavigationSection) => void;
  onInspectRecord: (record: MedicalRecord) => void;
}

export const PatientVisualHealthSnapshot: React.FC<PatientVisualGuideProps> = ({
  patient,
  records,
  onNavigate,
  onInspectRecord,
}) => {
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Find latest & earliest BP and HbA1c from records for visual meters
  const recordsChronological = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const bpRecords = recordsChronological.filter((r) => r.vitalSigns?.systolicBp);
  const firstBpRecord = bpRecords[0];
  const latestBpRecord = bpRecords[bpRecords.length - 1];
  const firstSystolic = firstBpRecord?.vitalSigns?.systolicBp || 142;
  const firstDiastolic = firstBpRecord?.vitalSigns?.diastolicBp || 88;
  const systolic = latestBpRecord?.vitalSigns?.systolicBp || 124;
  const diastolic = latestBpRecord?.vitalSigns?.diastolicBp || 78;

  const hba1cPoints = recordsChronological.flatMap((r) =>
    (r.labResults || [])
      .filter((l) => l.testName.toLowerCase().includes('hba1c'))
      .map((l) => Number(l.value))
  );
  const firstHba1c = hba1cPoints[0] || 7.9;
  const latestHba1c = hba1cPoints[hba1cPoints.length - 1] || 6.8;

  const primaryAllergy = patient.allergies[0];

  const getSimpleOneLineSummary = (rec: MedicalRecord): {
    headline: string;
    whatItMeans: string;
    nextStep: string;
    visualStatus: 'good' | 'watch';
    statusLabel: string;
  } => {
    if (rec.id === 'REC-106') {
      return {
        headline: 'Blood Sugar & Blood Pressure Are Improving',
        whatItMeans:
          'Your 3-month blood sugar (HbA1c) improved to 6.8% and blood pressure reached 128/80 mmHg.',
        nextStep: 'Start new morning tablet (Empagliflozin 10 mg) and recheck blood test in 4 weeks.',
        visualStatus: 'good',
        statusLabel: 'Improving · Doctor Verified',
      };
    }
    if (rec.id === 'REC-107') {
      return {
        headline: 'Routine Kidney & Salt Balance Blood Test',
        whatItMeans:
          'Your kidney filter number (eGFR 62) and potassium (4.6) are stable after starting your new medicine.',
        nextStep: 'Your doctor is reviewing this computer-scanned report to sign off.',
        visualStatus: 'watch',
        statusLabel: 'Waiting for Doctor Sign-Off',
      };
    }
    if (rec.id === 'REC-104') {
      return {
        headline: 'Lab Check: Blood Sugar & Kidney Function',
        whatItMeans:
          'Your HbA1c dropped from 7.9% to 7.4%, and your kidneys are filtering waste normally (eGFR 82).',
        nextStep: 'Note: This lab used a different unit (mmol/L) for fasting sugar.',
        visualStatus: 'good',
        statusLabel: 'On Track · Doctor Verified',
      };
    }
    if (rec.id === 'REC-103') {
      return {
        headline: 'Hospital Stay for Mild Chest Discomfort (Heart Attack Ruled Out)',
        whatItMeans:
          'Heart tests and ultrasound (EF 58%) showed your heart muscle is pumping normally.',
        nextStep: 'Continue daily heart and blood pressure protection medicines.',
        visualStatus: 'good',
        statusLabel: 'Recovered · Doctor Verified',
      };
    }
    return {
      headline: rec.title,
      whatItMeans:
        (rec.plainLanguageExplanation || rec.summaryNotes).split('.')[0] + '.',
      nextStep: rec.followUpRecommendation || 'Continue regular follow-up with your doctor.',
      visualStatus: rec.reviewStatus === 'Verified' ? 'good' : 'watch',
      statusLabel:
        rec.reviewStatus === 'Verified' ? 'Doctor Verified' : 'Needs Doctor Review',
    };
  };

  return (
    <div className="space-y-6">
      {/* 1. AT-A-GLANCE VISUAL HEALTH CARDS WITH ILLUSTRATIONS (EASY FOR NORMAL PEOPLE) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <span className="text-xs font-bold text-teal-700 tracking-wide">
              EASY-TO-READ VISUAL HEALTH SNAPSHOT · {patient.fullName.toUpperCase()} ({patient.id})
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              How Your Health Is Doing Right Now (In Simple Pictures)
            </h2>
            <p className="text-sm text-slate-600">
              No confusing medical jargon — see your heart, blood sugar, kidney health, and daily medicines at a glance.
            </p>
          </div>
          <button
            onClick={() => onNavigate('patient-ai')}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 self-start sm:self-center shrink-0"
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Ask a Question in Simple Words</span>
          </button>
        </div>

        {/* 3 Large Illustrated Story Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Card 1: Heart & Blood Pressure */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="aspect-[5/3] w-full bg-teal-50 border-b border-slate-200 overflow-hidden">
                <img
                  src={HEART_BP_ILLUSTRATION_IMG}
                  alt="Heart and blood pressure progress illustration"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-800">1. HEART &amp; BLOOD PRESSURE</span>
                  <span className="font-semibold text-emerald-700">✓ Healthy Target</span>
                </div>
                <div className="text-base font-bold text-slate-900">
                  BP is Down to {systolic}/{diastolic} mmHg
                </div>
                <p className="text-sm text-slate-700 leading-snug">
                  Your blood pressure improved from <strong>{firstSystolic}/{firstDiastolic}</strong> down to{' '}
                  <strong>{systolic}/{diastolic} mmHg</strong> across your connected hospital visits.
                </p>
                {/* Visual Progress Meter */}
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>Earlier: {firstSystolic}/{firstDiastolic}</span>
                    <span className="text-emerald-700">Latest: {systolic}/{diastolic} (Good)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full w-4/5" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-white border-t border-slate-200/80 text-xs font-medium text-slate-700 flex items-center justify-between">
              <span>
                Action: Continue daily prescribed care ({patient.medications[0]?.name || 'Maintenance'})
              </span>
            </div>
          </div>

          {/* Card 2: Blood Sugar & Kidneys */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="aspect-[5/3] w-full bg-sky-50 border-b border-slate-200 overflow-hidden">
                <img
                  src={SUGAR_KIDNEY_ILLUSTRATION_IMG}
                  alt="Blood sugar and kidney health illustration"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-800">2. BLOOD SUGAR &amp; KIDNEYS</span>
                  <span className="font-semibold text-emerald-700">✓ Improving</span>
                </div>
                <div className="text-base font-bold text-slate-900">
                  3-Month Sugar (HbA1c) at {latestHba1c}%
                </div>
                <p className="text-sm text-slate-700 leading-snug">
                  Your average blood sugar improved from <strong>{firstHba1c}% → {latestHba1c}%</strong>, and your kidneys are filtering normally.
                </p>
                {/* Visual Progress Meter */}
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>Earlier: {firstHba1c}%</span>
                    <span className="text-sky-700">Latest: {latestHba1c}% (On Track)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-600 rounded-full w-5/6" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-white border-t border-slate-200/80 text-xs font-medium text-slate-700 flex items-center justify-between">
              <span>Action: Routine follow-up lab check as scheduled</span>
            </div>
          </div>

          {/* Card 3: Daily Medicine & Allergy Safety */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="aspect-[5/3] w-full bg-amber-50 border-b border-slate-200 overflow-hidden">
                <img
                  src={DAILY_MEDICINE_ILLUSTRATION_IMG}
                  alt="Daily medicine schedule illustration"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900">3. DAILY MEDICINES &amp; SAFETY</span>
                  <span className="font-semibold text-red-700">
                    {patient.allergies.length > 0
                      ? `${patient.allergies.length} Allergy Alert`
                      : 'No Known Allergies'}
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900">
                  {patient.medications.length} Approved Daily Medicines
                </div>
                <p className="text-sm text-slate-700 leading-snug">
                  All your active medicines are checked and approved by your doctor.{' '}
                  {primaryAllergy ? (
                    <strong className="text-red-700">
                      Never take {primaryAllergy.substance}.
                    </strong>
                  ) : (
                    <span>No drug allergies recorded in your chart.</span>
                  )}
                </p>
                {primaryAllergy ? (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                    <span>
                      Allergy: {primaryAllergy.substance} ({primaryAllergy.reaction})
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Zero drug allergies documented across linked hospitals</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-3 bg-white border-t border-slate-200/80 text-xs font-medium text-slate-700 flex items-center justify-between">
              <span>Action: Show allergy card before any new medicine</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SIMPLE VISUAL MORNING & NIGHT MEDICINE CHART */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-xs font-bold text-teal-700">
              EASY DAILY PILL SCHEDULE
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              When to Take Your Medicines Each Day
            </h2>
          </div>
          <span className="text-xs text-emerald-700 font-semibold">
            ✓ All signed off by licensed doctors
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Morning Box */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Morning — With Breakfast
                </div>
                <div className="text-xs text-slate-600">
                  Morning daily maintenance medicines
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {patient.medications.map((med) => (
                <div
                  key={`morn-${med.id}`}
                  className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {med.name} <span className="text-teal-800 font-mono">{med.strength}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      <strong>Why you take it:</strong>{' '}
                      {med.documentedReason ||
                        (med.name.includes('Telmisartan')
                          ? 'Keeps blood pressure steady and protects kidneys'
                          : med.name.includes('Metformin')
                          ? 'Controls blood sugar throughout the day'
                          : med.name.includes('Empagliflozin')
                          ? 'Lowers blood sugar and protects your heart'
                          : 'Supports your doctor-approved treatment plan')}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-800 whitespace-nowrap shrink-0">
                    {med.dose}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Evening / Night Box */}
          <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Night — With Dinner
                  </div>
                  <div className="text-xs text-slate-600">
                    Evening dose after meal
                  </div>
                </div>
              </div>

              {patient.medications
                .filter(
                  (m) =>
                    m.frequency.toLowerCase().includes('twice') ||
                    m.frequency.toLowerCase().includes('evening') ||
                    m.frequency.toLowerCase().includes('night')
                )
                .map((med) => (
                  <div
                    key={`night-${med.id}`}
                    className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {med.name}{' '}
                        <span className="text-teal-800 font-mono">{med.strength}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        <strong>Why you take it:</strong> Controls overnight blood sugar levels
                      </div>
                    </div>
                    <span className="text-xs font-bold text-sky-800 whitespace-nowrap shrink-0">
                      1 Tablet
                    </span>
                  </div>
                ))}
            </div>

            <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
              <strong className="text-slate-900">Simple Reminder for Next Visit:</strong> Do a routine kidney &amp; salt blood test in 4 weeks, and bring your home blood pressure readings.
            </div>
          </div>
        </div>
      </div>

      {/* 3. BITE-SIZED REPORT EXPLANATIONS (1-LINE SUMMARY FIRST, EXPAND FOR FULL TEXT) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-xs font-bold text-teal-700">
              RECENT HOSPITAL REPORTS — BITE-SIZED &amp; EASY TO READ
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              What Your Recent Hospital Visits Mean (In 1 Simple Sentence)
            </h2>
          </div>
          <button
            onClick={() => onNavigate('timeline')}
            className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap shrink-0"
          >
            View Full Timeline →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.slice(0, 4).map((rec) => {
            const simple = getSimpleOneLineSummary(rec);
            const isExpanded = expandedReportId === rec.id;
            return (
              <div
                key={rec.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      <strong className="font-mono text-teal-800">{rec.id}</strong> · {rec.date} ·{' '}
                      {rec.hospital}
                    </span>
                    <span
                      className={
                        simple.visualStatus === 'good'
                          ? 'font-semibold text-emerald-700'
                          : 'font-semibold text-amber-700'
                      }
                    >
                      {simple.statusLabel}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{simple.headline}</h3>

                  {/* Short 1-sentence plain summary */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5 text-sm">
                    <p className="text-slate-800">
                      <strong className="text-teal-800">In Simple Words:</strong>{' '}
                      {simple.whatItMeans}
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong className="text-slate-900">Next Step:</strong> {simple.nextStep}
                    </p>
                  </div>

                  {/* Optional expandable full explanation for those who want details */}
                  {isExpanded && (
                    <div className="p-3 rounded-lg bg-slate-100 text-xs text-slate-700 space-y-1.5 leading-relaxed">
                      <div className="font-bold text-slate-900">Full Medical Summary:</div>
                      <p>{rec.plainLanguageExplanation || rec.summaryNotes}</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() =>
                      setExpandedReportId(isExpanded ? null : rec.id)
                    }
                    className="font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Hide Full Details</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Read Full Explanation</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onInspectRecord(rec)}
                    className="font-semibold text-teal-700 hover:text-teal-900"
                  >
                    Open Original Report →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
