import React from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Lock,
  Play,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { DEMO_PERSONAS, GUIDED_SCENARIOS } from '../seedData';
import { DemoPersona, GuidedScenario, UserRole } from '../types';

interface RoleLoginModalProps {
  isOpen: boolean;
  currentRole: UserRole;
  currentPersonaId?: string;
  aiConfigured: boolean;
  onSelectRole: (role: UserRole, persona?: DemoPersona) => void;
  onRunScenario: (scenario: GuidedScenario) => void;
  onClose: () => void;
}

export const RoleLoginModal: React.FC<RoleLoginModalProps> = ({
  isOpen,
  currentRole,
  currentPersonaId,
  aiConfigured,
  onSelectRole,
  onRunScenario,
  onClose,
}) => {
  if (!isOpen) return null;

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'patient':
        return <UserCheck className="w-5 h-5 text-teal-700" />;
      case 'doctor':
        return <Stethoscope className="w-5 h-5 text-teal-700" />;
      case 'admin':
        return <Building2 className="w-5 h-5 text-teal-700" />;
      case 'analyst':
        return <Activity className="w-5 h-5 text-teal-700" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full p-6 md:p-8 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
              <span>CONNECTED HEALTH &amp; CLINICAL INTELLIGENCE PLATFORM</span>
              <span aria-hidden="true">·</span>
              <span>SYNTHETIC DEMO AUTHENTICATION</span>
              <span aria-hidden="true">·</span>
              <span>{aiConfigured ? 'LIVE GEMINI 3.8 FLASH ACTIVE' : 'DEMO AI FALLBACK ACTIVE'}</span>
            </div>
            <h2 id="role-modal-title" className="text-2xl font-bold text-slate-900 tracking-tight">
              OneHealth AI — Connected Health Records &amp; Clinical Intelligence
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              One patient. One connected health journey. Better-informed clinical decisions. Earlier awareness of emerging health threats. Choose from 2 Sample Patients, 2 Sample Doctors, Hospital Admin, or Public-Health Analyst below.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start md:self-center"
          >
            Continue as {currentRole.toUpperCase()}
          </button>
        </div>

        {/* 6 Demo Personas Grid (2 Sample Patients, 2 Sample Doctors, Admin, Analyst) */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              1. One-Click Demo Accounts (2 Sample Patients · 2 Sample Doctors · Admin · Analyst)
            </h3>
            <span className="text-xs text-slate-500">
              All identities and clinical records are 100% fictional
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_PERSONAS.map((persona: DemoPersona) => {
              const isSelected = currentPersonaId
                ? persona.id === currentPersonaId
                : persona.role === currentRole;
              return (
                <div
                  key={persona.id}
                  className={`flex flex-col justify-between p-5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-100">
                          {getRoleIcon(persona.role)}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-teal-800">
                            {persona.badgeText}
                          </div>
                          <h4 className="text-base font-bold text-slate-900">
                            {persona.name}
                          </h4>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-semibold text-teal-800 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-teal-700" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mb-2">
                      <span>{persona.title}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-medium text-slate-800">{persona.organization}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {persona.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">
                      Role: {persona.role}
                    </span>
                    <button
                      onClick={() => {
                        onSelectRole(persona.role, persona);
                        onClose();
                      }}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-teal-700 text-white hover:bg-teal-800'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>Switch to {persona.name.split(' ')[0]}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 8 Guided Clinical Scenarios */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Guided Clinical Workflow Scenarios (Scenarios A–H)
            </h3>
            <span className="text-xs text-slate-500">
              Automatically switches role, patient context, and target module
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {GUIDED_SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between hover:border-teal-700/50 transition-colors"
              >
                <div>
                  <div className="text-xs font-mono font-semibold text-teal-800 mb-1">
                    Scenario {sc.code} · {sc.recommendedRole.toUpperCase()}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                    {sc.title.replace(`Scenario ${sc.code} — `, '')}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {sc.subtitle}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onRunScenario(sc);
                    onClose();
                  }}
                  className="mt-3 w-full py-1.5 px-3 bg-white border border-slate-300 hover:border-teal-700 hover:text-teal-800 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Launch Scenario {sc.code}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Prototype Clinical Safety & Privacy Notice */}
        <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span>
              <strong>Clinical Safety & Governance Boundary:</strong> OneHealth AI is a clinical decision-support and connected health-record prototype. AI never independently diagnoses or approves prescriptions. Public-health analytics operate strictly on de-identified aggregate synthetic counts.
            </span>
          </div>
          <span className="font-mono text-slate-500 shrink-0">
            Prototype Storage: Server JSON
          </span>
        </div>
      </div>
    </div>
  );
};
