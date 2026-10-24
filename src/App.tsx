import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  LayoutDashboard,
  Lock,
  MessageSquareHeart,
  MoreHorizontal,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Pill,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { ABDMReadinessWorkspace } from './components/ABDMReadinessWorkspace';
import { AIClinicalAssistants } from './components/AIClinicalAssistants';
import { MedicalDocumentManager } from './components/MedicalDocumentManager';
import { OverviewViews } from './components/OverviewViews';
import { PatientDirectoryAndProfile } from './components/PatientDirectoryAndProfile';
import { PrescriptionAndSafetyWorkspace } from './components/PrescriptionAndSafetyWorkspace';
import {
  NotificationsAndAuditView,
  PublicHealthDashboard,
  SharingAndPrivacyView,
} from './components/PublicHealthAndGovernance';
import { RoleLoginModal } from './components/RoleLoginModal';
import { TimelineAndLabComparator } from './components/TimelineAndLabComparator';
import { apiFetch, getInitialClientStore } from './apiFallback';
import { UI_TRANSLATIONS } from './i18n';
import { DEMO_PERSONAS, GUIDED_SCENARIOS } from './seedData';
import {
  ABDMExchangeLogItem,
  AuditLogEntry,
  ConsultationQueueItem,
  DemoPersona,
  FacilityStaffConfigItem,
  GuidedScenario,
  MedicalRecord,
  NavigationSection,
  NotificationItem,
  Patient,
  PrescriptionDraft,
  PublicHealthSignal,
  PublicHealthTimeSeriesPoint,
  SupportedUILanguage,
  UserRole,
} from './types';

// Custom Original OneHealth AI Brand SVG Emblem (Connected Health Records + Clinical Intelligence Nodes)
const OneHealthBrandLogo: React.FC = () => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-7 h-7 shrink-0"
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="8" fill="#0F766E" />
    <path
      d="M6.5 16.5H11L13.5 10.5L17.5 21.5L20.5 14.5L22.5 16.5H25.5"
      stroke="#CCFBF1"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="13.5" cy="10.5" r="2" fill="#FFFFFF" />
    <circle cx="17.5" cy="21.5" r="2" fill="#FFFFFF" />
    <circle cx="25.5" cy="16.5" r="2" fill="#5EEAD4" />
  </svg>
);

interface NavItemConfig {
  id: NavigationSection;
  label: string;
  shortMobileLabel: string;
  patientLabel?: string;
  patientMobileLabel?: string;
  allowedRoles: UserRole[];
  icon: React.ReactNode;
}

const PRIMARY_MOBILE_TAB_IDS: Record<UserRole, NavigationSection[]> = {
  doctor: ['overview', 'patients', 'timeline', 'clinical-copilot', 'prescriptions'],
  patient: ['overview', 'timeline', 'records', 'patient-ai', 'abdm-readiness'],
  admin: ['overview', 'patients', 'records', 'abdm-readiness', 'prescriptions'],
  analyst: ['overview', 'public-health', 'notifications', 'audit'],
};

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortMobileLabel: 'Overview',
    allowedRoles: ['patient', 'doctor', 'admin', 'analyst'],
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: 'patients',
    label: 'Patients',
    shortMobileLabel: 'Patients',
    patientLabel: 'My Health Profile',
    patientMobileLabel: 'Profile',
    allowedRoles: ['patient', 'doctor', 'admin'],
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'timeline',
    label: 'Health Timeline',
    shortMobileLabel: 'Timeline',
    allowedRoles: ['patient', 'doctor', 'admin'],
    icon: <Clock className="w-4 h-4" />,
  },
  {
    id: 'records',
    label: 'Medical Records',
    shortMobileLabel: 'Records',
    allowedRoles: ['patient', 'doctor', 'admin'],
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'patient-ai',
    label: 'AI Health Assistant',
    shortMobileLabel: 'AI Guide',
    allowedRoles: ['patient'],
    icon: <MessageSquareHeart className="w-4 h-4" />,
  },
  {
    id: 'clinical-copilot',
    label: 'Clinical Intelligence Copilot',
    shortMobileLabel: 'Copilot',
    allowedRoles: ['doctor'],
    icon: <Stethoscope className="w-4 h-4" />,
  },
  {
    id: 'prescriptions',
    label: 'Prescription Review',
    shortMobileLabel: 'Rx Review',
    patientLabel: 'Approvals & Rx Requests',
    patientMobileLabel: 'Approvals',
    allowedRoles: ['patient', 'doctor', 'admin'],
    icon: <Pill className="w-4 h-4" />,
  },
  {
    id: 'abdm-readiness',
    label: 'Connected Health / ABDM',
    shortMobileLabel: 'ABDM',
    patientMobileLabel: 'Consent',
    allowedRoles: ['patient', 'doctor', 'admin'],
    icon: <Network className="w-4 h-4" />,
  },
  {
    id: 'public-health',
    label: 'Public Health Intelligence',
    shortMobileLabel: 'Surveillance',
    allowedRoles: ['analyst'],
    icon: <Activity className="w-4 h-4" />,
  },
  {
    id: 'privacy',
    label: 'Sharing & Privacy',
    shortMobileLabel: 'Privacy',
    allowedRoles: ['patient', 'doctor', 'admin'],
    icon: <Lock className="w-4 h-4" />,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    shortMobileLabel: 'Alerts',
    allowedRoles: ['patient', 'doctor', 'admin', 'analyst'],
    icon: <Bell className="w-4 h-4" />,
  },
  {
    id: 'audit',
    label: 'Audit & Activity',
    shortMobileLabel: 'Audit',
    allowedRoles: ['patient', 'doctor', 'admin', 'analyst'],
    icon: <ShieldCheck className="w-4 h-4" />,
  },
];

export default function App() {
  const [initialSeedStore] = useState(() => getInitialClientStore());

  const [role, setRole] = useState<UserRole>('patient');
  const [currentPersonaId, setCurrentPersonaId] = useState<string>('persona-patient');
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('P1001');
  const [uiLanguage, setUiLanguage] = useState<SupportedUILanguage>('en');

  const [aiConfigured, setAiConfigured] = useState<boolean>(false);
  const [patients, setPatients] = useState<Patient[]>(initialSeedStore.patients);
  const [records, setRecords] = useState<MedicalRecord[]>(initialSeedStore.records);
  const [prescriptionDrafts, setPrescriptionDrafts] = useState<PrescriptionDraft[]>(
    initialSeedStore.prescriptionDrafts
  );
  const [publicHealthSeries, setPublicHealthSeries] = useState<PublicHealthTimeSeriesPoint[]>(
    initialSeedStore.publicHealthSeries
  );
  const [publicHealthSignals, setPublicHealthSignals] = useState<PublicHealthSignal[]>(
    initialSeedStore.publicHealthSignals
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialSeedStore.notifications
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialSeedStore.auditLogs);
  const [abdmExchangeLogs, setAbdmExchangeLogs] = useState<ABDMExchangeLogItem[]>(
    initialSeedStore.abdmExchangeLogs || []
  );
  const [consultationQueue, setConsultationQueue] = useState<ConsultationQueueItem[]>(
    initialSeedStore.consultationQueue || []
  );
  const [facilityStaffConfig, setFacilityStaffConfig] = useState<FacilityStaffConfigItem[]>(
    initialSeedStore.facilityStaffConfig || []
  );
  const [isLoadingState, setIsLoadingState] = useState<boolean>(false);

  // UI & Modal States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<MedicalRecord | null>(null);
  const [activeScenarioBanner, setActiveScenarioBanner] = useState<GuidedScenario | null>(null);
  const [globalPatientSearch, setGlobalPatientSearch] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchAppState = useCallback(
    async (targetRole?: UserRole, targetPatientId?: string) => {
      const r = targetRole || role;
      const pid = targetPatientId || selectedPatientId;
      try {
        const res = await apiFetch(
          `/api/state?role=${encodeURIComponent(r)}&patientId=${encodeURIComponent(pid)}`
        );
        if (res.ok) {
          const data = await res.json();
          setAiConfigured(Boolean(data.aiConfigured));
          if (Array.isArray(data.patients) && data.patients.length > 0) {
            setPatients(data.patients);
          }
          if (Array.isArray(data.records) && data.records.length > 0) {
            setRecords(data.records);
          }
          if (Array.isArray(data.prescriptionDrafts)) {
            setPrescriptionDrafts(data.prescriptionDrafts);
          }
          if (Array.isArray(data.publicHealthSeries)) {
            setPublicHealthSeries(data.publicHealthSeries);
          }
          if (Array.isArray(data.publicHealthSignals)) {
            setPublicHealthSignals(data.publicHealthSignals);
          }
          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
          if (Array.isArray(data.auditLogs)) {
            setAuditLogs(data.auditLogs);
          }
          if (Array.isArray(data.abdmExchangeLogs)) {
            setAbdmExchangeLogs(data.abdmExchangeLogs);
          }
          if (Array.isArray(data.consultationQueue)) {
            setConsultationQueue(data.consultationQueue);
          }
          if (Array.isArray(data.facilityStaffConfig)) {
            setFacilityStaffConfig(data.facilityStaffConfig);
          }
        }
      } catch (err) {
        console.warn('Using client seed fallback store:', err);
      } finally {
        setIsLoadingState(false);
      }
    },
    [role, selectedPatientId]
  );

  useEffect(() => {
    fetchAppState();
  }, [fetchAppState]);

  const handleSelectRole = (newRole: UserRole, persona?: DemoPersona) => {
    setRole(newRole);
    const chosenPersona =
      persona || DEMO_PERSONAS.find((p) => p.role === newRole) || DEMO_PERSONAS[0];
    setCurrentPersonaId(chosenPersona.id);

    const nextPatientId =
      chosenPersona.linkedPatientId ||
      (newRole === 'patient' ? selectedPatientId || 'P1001' : selectedPatientId);
    setSelectedPatientId(nextPatientId);

    const allowedSections = NAV_ITEMS.filter((item) =>
      item.allowedRoles.includes(newRole)
    ).map((i) => i.id);
    if (!allowedSections.includes(activeSection)) {
      setActiveSection('overview');
    }
    fetchAppState(newRole, nextPatientId);
  };

  const handleRunScenario = (scenario: GuidedScenario) => {
    setRole(scenario.recommendedRole);
    const matchingPersona = DEMO_PERSONAS.find(
      (p) => p.role === scenario.recommendedRole
    );
    if (matchingPersona) {
      setCurrentPersonaId(matchingPersona.id);
    }
    if (scenario.patientId) {
      setSelectedPatientId(scenario.patientId);
    }
    setActiveSection(scenario.targetSection);
    setActiveScenarioBanner(scenario);
    fetchAppState(
      scenario.recommendedRole,
      scenario.patientId || selectedPatientId
    );
  };

  const handleSelectPatient = (
    patientId: string,
    targetSection?: NavigationSection
  ) => {
    setSelectedPatientId(patientId);
    if (role === 'patient') {
      const matchingPtPersona = DEMO_PERSONAS.find(
        (p) => p.role === 'patient' && p.linkedPatientId === patientId
      );
      if (matchingPtPersona) {
        setCurrentPersonaId(matchingPtPersona.id);
      }
    }
    if (targetSection) {
      setActiveSection(targetSection);
    }
    setGlobalPatientSearch('');
    fetchAppState(role, patientId);
  };

  const handleResetDemoStore = async () => {
    setIsResetting(true);
    try {
      await apiFetch('/api/reset', { method: 'POST' });
      await fetchAppState();
      setActiveScenarioBanner(null);
    } finally {
      setIsResetting(false);
    }
  };

  const currentPersona =
    DEMO_PERSONAS.find((p) => p.id === currentPersonaId) ||
    DEMO_PERSONAS.find((p) => p.role === role) ||
    DEMO_PERSONAS[0];
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(role)
  );
  const primaryMobileIds = PRIMARY_MOBILE_TAB_IDS[role];
  const primaryMobileTabs = primaryMobileIds
    .map((id) => visibleNavItems.find((item) => item.id === id))
    .filter((item): item is NavItemConfig => Boolean(item));
  const secondaryMobileTabs = visibleNavItems.filter(
    (item) => !primaryMobileIds.includes(item.id)
  );
  const isSecondaryMobileActive = secondaryMobileTabs.some(
    (item) => item.id === activeSection
  );
  const activeNavConfig =
    visibleNavItems.find((i) => i.id === activeSection) || visibleNavItems[0];
  const selectedPatient =
    patients.find((p) => p.id === selectedPatientId) || patients[0];
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const matchingSearchPatients =
    globalPatientSearch.trim().length > 0 && (role === 'doctor' || role === 'admin')
      ? patients.filter(
          (p) =>
            p.id.toLowerCase().includes(globalPatientSearch.toLowerCase()) ||
            p.fullName.toLowerCase().includes(globalPatientSearch.toLowerCase())
        )
      : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 Clean Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 lg:px-6 py-2 lg:py-3 flex items-center justify-between gap-2 lg:gap-8">
        {/* Zone 1: Original OneHealth AI Brand Wordmark & Emblem */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('overview');
              setMobileMenuOpen(false);
            }}
            className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <OneHealthBrandLogo />
            <div>
              <span className="block leading-none">OneHealth AI</span>
              <span className="hidden sm:block text-[10px] font-medium text-slate-500 mt-0.5">
                Connected Health &amp; Clinical Intelligence
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Contextual Role, Sample Doctor Switcher, Active Patient Selector & Search */}
        <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-600 min-w-0">
          {role === 'doctor' ? (
            <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
              <span>Doctor:</span>
              <select
                value={currentPersona.id}
                onChange={(e) => {
                  const docPersona = DEMO_PERSONAS.find((p) => p.id === e.target.value);
                  if (docPersona) handleSelectRole('doctor', docPersona);
                }}
                aria-label="Switch sample doctor"
                className="px-2.5 py-1 bg-teal-50 border border-teal-300 rounded-md font-semibold text-teal-950 focus:outline-none focus:border-teal-700"
              >
                {DEMO_PERSONAS.filter((p) => p.role === 'doctor').map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.organization.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="whitespace-nowrap shrink-0">
              Active Account: <strong className="text-slate-900">{currentPersona.name}</strong>
            </span>
          )}

          {role !== 'analyst' && selectedPatient && (
            <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
              <span>{role === 'patient' ? 'Sample Patient:' : 'Patient:'}</span>
              <select
                value={selectedPatient.id}
                onChange={(e) => handleSelectPatient(e.target.value)}
                aria-label="Switch active patient"
                className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-teal-700"
              >
                {patients.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.id} — {pt.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(role === 'doctor' || role === 'admin') && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalPatientSearch}
                onChange={(e) => setGlobalPatientSearch(e.target.value)}
                placeholder="Quick patient lookup (ID or name)..."
                aria-label="Global authorized patient search"
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs w-48 focus:outline-none focus:border-teal-700"
              />
              {matchingSearchPatients.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-40 divide-y divide-slate-100">
                  {matchingSearchPatients.map((pt) => (
                    <button
                      key={pt.id}
                      onClick={() => handleSelectPatient(pt.id, 'patients')}
                      className="w-full text-left px-3 py-2 hover:bg-teal-50 text-xs flex items-center justify-between"
                    >
                      <span>
                        <strong className="font-mono text-teal-800">{pt.id}</strong> · {pt.fullName}
                      </span>
                      <span className="text-slate-400">{pt.age}y</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Zone 3: 1 Primary Action Button (Demo Role & Scenario Switcher) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsRoleModalOpen(true)}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <span className="sm:hidden">Role ({role.toUpperCase()})</span>
            <span className="hidden sm:inline">Switch Demo Account ({role.toUpperCase()})</span>
          </button>
        </div>
      </header>

      {/* Mobile On-The-Go Sample Patient & Doctor Switcher Bar */}
      {role !== 'analyst' && selectedPatient && (
        <div className="md:hidden bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between gap-1.5 text-[11px]">
          {role === 'doctor' && (
            <select
              value={currentPersona.id}
              onChange={(e) => {
                const docPersona = DEMO_PERSONAS.find((p) => p.id === e.target.value);
                if (docPersona) handleSelectRole('doctor', docPersona);
              }}
              aria-label="Mobile switch sample doctor"
              className="px-2 py-1 bg-teal-50 border border-teal-300 rounded-md font-semibold text-teal-950 text-[11px] max-w-[130px] truncate"
            >
              {DEMO_PERSONAS.filter((p) => p.role === 'doctor').map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          )}
          <span className="text-slate-500 font-medium shrink-0">
            {role === 'patient' ? 'Patient:' : 'Pt:'}
          </span>
          <select
            value={selectedPatient.id}
            onChange={(e) => handleSelectPatient(e.target.value)}
            aria-label="Mobile switch active patient"
            className="flex-1 min-w-0 px-2 py-1 bg-slate-100 border border-slate-300 rounded-md font-semibold text-slate-900 text-[11px] focus:outline-none focus:border-teal-700"
          >
            {patients.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.id} — {pt.fullName} ({pt.age}y)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Prototype Evaluator Bar: Compact Horizontal Scroll on Mobile, Full Wrap on Desktop */}
      <div className="bg-slate-900 text-slate-200 px-3 lg:px-6 py-1.5 sm:py-2 text-[11px] sm:text-xs border-b border-slate-800 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-1.5 sm:gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="font-mono font-semibold text-teal-400 mr-0.5 shrink-0">
            DEMO:
          </span>
          {DEMO_PERSONAS.map((persona) => {
            const isActivePersona =
              persona.role === 'patient'
                ? role === 'patient' && selectedPatientId === persona.linkedPatientId
                : persona.role === 'doctor'
                ? role === 'doctor' && currentPersona.id === persona.id
                : role === persona.role;
            const shortBtnLabel =
              persona.id === 'persona-patient'
                ? 'Patient 1: Ananya (P1001)'
                : persona.id === 'persona-patient-2'
                ? 'Patient 2: Kavin (P1002)'
                : persona.id === 'persona-doctor'
                ? 'Doctor 1: Dr. Mehta'
                : persona.id === 'persona-doctor-2'
                ? 'Doctor 2: Dr. Menon'
                : persona.role === 'admin'
                ? 'Hospital Admin'
                : 'Public-Health Analyst';
            return (
              <button
                key={persona.id}
                onClick={() => handleSelectRole(persona.role, persona)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isActivePersona
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {shortBtnLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 overflow-x-auto no-scrollbar">
          {/* Indian Language Accessibility Buttons (Instant Multilingual UI & Patient Summary) */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 sm:p-1 rounded-lg border border-slate-700 shrink-0">
            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-400 ml-1 mr-0.5 shrink-0" />
            {(
              [
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिंदी' },
                { code: 'ta', label: 'தமிழ்' },
                { code: 'kn', label: 'ಕನ್ನಡ' },
              ] as { code: SupportedUILanguage; label: string }[]
            ).map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setUiLanguage(lang.code)}
                className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                  uiLanguage === lang.code
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-400 hidden lg:inline">Scenarios:</span>
            {GUIDED_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleRunScenario(sc)}
                title={sc.title}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono font-semibold transition-colors whitespace-nowrap ${
                  activeScenarioBanner?.id === sc.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {sc.code}
              </button>
            ))}
          </div>

          <button
            onClick={handleResetDemoStore}
            disabled={isResetting}
            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">{isResetting ? 'Resetting...' : 'Reset Seed Data'}</span>
            <span className="sm:hidden">{isResetting ? '...' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Left Sidebar + Viewport + Optional Right Contextual Drawer */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Collapsible Left Sidebar */}
        <aside
          className={`hidden lg:flex flex-col justify-between bg-white border-r border-slate-200 transition-all shrink-0 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className="p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = activeSection === item.id;
              const translatedNavObj =
                UI_TRANSLATIONS[uiLanguage]?.navLabels?.[item.id];
              const translatedNavLabel =
                role === 'patient' && translatedNavObj?.patient
                  ? translatedNavObj.patient
                  : translatedNavObj?.standard;
              const displayLabel =
                uiLanguage !== 'en' && translatedNavLabel
                  ? translatedNavLabel
                  : role === 'patient' && item.patientLabel
                  ? item.patientLabel
                  : item.label;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  title={displayLabel}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-50 text-teal-900 border border-teal-700/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={isActive ? 'text-teal-700' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="truncate">{displayLabel}</span>
                    )}
                  </div>
                  {!sidebarCollapsed &&
                    item.id === 'notifications' &&
                    unreadNotifCount > 0 && (
                      <span className="font-mono text-[11px] font-bold text-teal-800">
                        {unreadNotifCount}
                      </span>
                    )}
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-200">
            {!sidebarCollapsed && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 mb-2">
                <div className="font-semibold text-slate-800">
                  {aiConfigured ? 'Live Gemini 3.8 Flash' : 'Demo AI Mode'}
                </div>
                <div className="mt-0.5">
                  Storage: Persistent Server JSON (Synthetic Demo Records)
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse Sidebar</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Bottom-Anchored Secondary Sheet ("More" clinical & governance tools) */}
        {mobileMenuOpen && secondaryMobileTabs.length > 0 && (
          <div className="fixed inset-0 z-40 lg:hidden flex flex-col justify-end">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative bg-white border-t border-slate-200 rounded-t-2xl p-4 pb-24 shadow-2xl z-50 space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    More Clinical &amp; Governance Views
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Active Role: {currentPersona.name}
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
                  aria-label="Close more navigation sheet"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {secondaryMobileTabs.map((item) => {
                  const isActive = activeSection === item.id;
                  const displayLabel =
                    role === 'patient' && item.patientLabel
                      ? item.patientLabel
                      : item.label;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`min-h-[48px] flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-950 border-teal-700/30'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={isActive ? 'text-teal-700' : 'text-slate-500'}>
                          {item.icon}
                        </span>
                        <span className="truncate">{displayLabel}</span>
                      </span>
                      {item.id === 'notifications' && unreadNotifCount > 0 && (
                        <span className="font-mono text-[11px] font-bold text-teal-800">
                          {unreadNotifCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Persistent Bottom-Anchored Mobile Navigation Tab Bar (Primary Roles) */}
        <nav
          aria-label="Primary mobile navigation"
          className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-0.5 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-stretch justify-around max-w-lg mx-auto">
            {primaryMobileTabs.map((item) => {
              const isActive = activeSection === item.id && !mobileMenuOpen;
              const shortLabel =
                role === 'patient' && item.patientMobileLabel
                  ? item.patientMobileLabel
                  : item.shortMobileLabel;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex-1 min-h-[44px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                    isActive
                      ? 'text-teal-800 bg-teal-50/90 font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <span
                    className={`relative flex items-center justify-center ${
                      isActive ? 'text-teal-700 scale-105' : 'text-slate-500'
                    } transition-transform`}
                  >
                    {item.icon}
                    {item.id === 'notifications' && unreadNotifCount > 0 && (
                      <span className=" -top-1.5 -right-2.5 font-mono text-[10px] font-bold text-teal-800">
                        ·{unreadNotifCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] sm:text-[11px] leading-none tracking-tight truncate max-w-[68px]">
                    {shortLabel}
                  </span>
                </button>
              );
            })}

            {secondaryMobileTabs.length > 0 && (
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-expanded={mobileMenuOpen}
                aria-label="More navigation options"
                className={`relative flex-1 min-h-[44px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                  mobileMenuOpen || isSecondaryMobileActive
                    ? 'text-teal-800 bg-teal-50/90 font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <span
                  className={`flex items-center justify-center ${
                    mobileMenuOpen || isSecondaryMobileActive
                      ? 'text-teal-700'
                      : 'text-slate-500'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </span>
                <span className="text-[10px] sm:text-[11px] leading-none tracking-tight truncate max-w-[68px]">
                  {isSecondaryMobileActive
                    ? activeNavConfig?.shortMobileLabel || 'More'
                    : 'More'}
                </span>
              </button>
            )}
          </div>
        </nav>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-2.5 pb-16 sm:p-5 sm:pb-24 lg:p-8 lg:pb-8 max-w-7xl mx-auto w-full space-y-3 sm:space-y-5">
          {/* Breadcrumbs & Contextual Patient Drawer Toggle Bar */}
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2">
              <button
                onClick={() => setActiveSection('overview')}
                className="hover:text-slate-900 font-medium"
              >
                OneHealth AI
              </button>
              <span aria-hidden="true">/</span>
              <span className="text-slate-700 font-medium">{currentPersona.title}</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-teal-800">
                {role === 'patient' && activeNavConfig?.patientLabel
                  ? activeNavConfig.patientLabel
                  : activeNavConfig?.label}
              </span>
              {role !== 'analyst' && selectedPatient && (
                <>
                  <span aria-hidden="true">/</span>
                  <span className="font-mono text-slate-700">
                    {selectedPatient.id} ({selectedPatient.fullName})
                  </span>
                </>
              )}
            </nav>

            {role !== 'analyst' && selectedPatient && (
              <button
                onClick={() => setContextDrawerOpen(!contextDrawerOpen)}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-teal-700 text-slate-700 font-semibold flex items-center gap-1.5"
              >
                {contextDrawerOpen ? (
                  <>
                    <PanelRightClose className="w-3.5 h-3.5 text-teal-700" />
                    <span>Hide Patient Context Drawer</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-3.5 h-3.5 text-teal-700" />
                    <span>Patient Context Drawer</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Active Guided Scenario Banner */}
          {activeScenarioBanner && (
            <div className="p-3 sm:p-4 rounded-xl bg-teal-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="text-xs space-y-1">
                <div className="font-mono font-bold text-teal-300">
                  ACTIVE GUIDED CLINICAL WALKTHROUGH · {activeScenarioBanner.title.toUpperCase()}
                </div>
                <p className="text-slate-100 leading-relaxed">
                  {activeScenarioBanner.instructions}
                </p>
              </div>
              <button
                onClick={() => setActiveScenarioBanner(null)}
                className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shrink-0 self-start sm:self-center"
              >
                Dismiss Walkthrough Guide
              </button>
            </div>
          )}

          {/* Active Multilingual Banner when Hindi / Tamil / Kannada is selected */}
          {uiLanguage !== 'en' && (
            <div className="p-3 sm:p-4 rounded-xl bg-teal-50 border border-teal-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs text-teal-950">
              <div className="space-y-0.5 sm:space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-teal-900">
                  <Globe className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>
                    {UI_TRANSLATIONS[uiLanguage].activeLanguageNoticeTitle} ({UI_TRANSLATIONS[uiLanguage].languageName})
                  </span>
                </div>
                <p className="text-slate-800 leading-snug">
                  {UI_TRANSLATIONS[uiLanguage].activeLanguageNoticeBody(
                    selectedPatient?.fullName || 'Ananya Rao',
                    3
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUiLanguage('en')}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white border border-teal-300 hover:bg-teal-100 text-teal-900 font-semibold rounded-lg shrink-0 self-start sm:self-center"
              >
                Switch to English
              </button>
            </div>
          )}

          {isLoadingState ? (
            <div className="p-12 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              Loading connected health records and role permissions...
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <OverviewViews
                  role={role}
                  patients={patients}
                  selectedPatient={selectedPatient}
                  records={records}
                  prescriptionDrafts={prescriptionDrafts}
                  publicHealthSeries={publicHealthSeries}
                  publicHealthSignals={publicHealthSignals}
                  notifications={notifications}
                  auditLogs={auditLogs}
                  abdmExchangeLogs={abdmExchangeLogs}
                  consultationQueue={consultationQueue}
                  facilityStaffConfig={facilityStaffConfig}
                  uiLanguage={uiLanguage}
                  onRefreshState={fetchAppState}
                  onNavigate={setActiveSection}
                  onSelectPatient={handleSelectPatient}
                  onInspectRecord={(rec) => {
                    setInspectedRecord(rec);
                    setActiveSection('records');
                  }}
                  onOpenRegistrationModal={() => {
                    setActiveSection('patients');
                    setIsRegistrationModalOpen(true);
                  }}
                  onOpenUploadModal={() => {
                    setActiveSection('records');
                    setIsUploadModalOpen(true);
                  }}
                />
              )}

              {activeSection === 'patients' && (
                <PatientDirectoryAndProfile
                  role={role}
                  patients={patients}
                  selectedPatient={selectedPatient}
                  records={records}
                  auditLogs={auditLogs}
                  isRegistrationModalOpen={isRegistrationModalOpen}
                  onCloseRegistrationModal={() => setIsRegistrationModalOpen(false)}
                  onOpenRegistrationModal={() => setIsRegistrationModalOpen(true)}
                  onSelectPatient={handleSelectPatient}
                  onNavigate={setActiveSection}
                  onOpenUploadModal={() => {
                    setActiveSection('records');
                    setIsUploadModalOpen(true);
                  }}
                  onInspectRecord={(rec) => {
                    setInspectedRecord(rec);
                    setActiveSection('records');
                  }}
                  onRefreshState={fetchAppState}
                />
              )}

              {activeSection === 'timeline' && (
                <TimelineAndLabComparator
                  role={role}
                  patient={selectedPatient}
                  records={records}
                  onInspectRecord={(rec) => {
                    setInspectedRecord(rec);
                    setActiveSection('records');
                  }}
                  onOpenUploadModal={() => {
                    setActiveSection('records');
                    setIsUploadModalOpen(true);
                  }}
                />
              )}

              {activeSection === 'records' && (
                <MedicalDocumentManager
                  role={role}
                  patient={selectedPatient}
                  records={records}
                  isUploadModalOpen={isUploadModalOpen}
                  inspectedRecord={inspectedRecord}
                  onOpenUploadModal={() => setIsUploadModalOpen(true)}
                  onCloseUploadModal={() => setIsUploadModalOpen(false)}
                  onInspectRecord={setInspectedRecord}
                  onRefreshState={fetchAppState}
                />
              )}

              {activeSection === 'patient-ai' && (
                <AIClinicalAssistants
                  mode="patient-assistant"
                  role={role}
                  patient={selectedPatient}
                  records={records}
                  aiConfigured={aiConfigured}
                  uiLanguage={uiLanguage}
                  onChangeLanguage={setUiLanguage}
                  onInspectRecord={(rec) => {
                    setInspectedRecord(rec);
                    setActiveSection('records');
                  }}
                />
              )}

              {activeSection === 'clinical-copilot' && (
                <AIClinicalAssistants
                  mode="clinical-copilot"
                  role={role}
                  patient={selectedPatient}
                  records={records}
                  aiConfigured={aiConfigured}
                  uiLanguage={uiLanguage}
                  onChangeLanguage={setUiLanguage}
                  onInspectRecord={(rec) => {
                    setInspectedRecord(rec);
                    setActiveSection('records');
                  }}
                />
              )}

              {activeSection === 'prescriptions' && (
                <PrescriptionAndSafetyWorkspace
                  role={role}
                  patient={selectedPatient}
                  records={records}
                  prescriptionDrafts={prescriptionDrafts}
                  onInspectRecord={(rec) => {
                    setInspectedRecord(rec);
                    setActiveSection('records');
                  }}
                  onRefreshState={fetchAppState}
                />
              )}

              {activeSection === 'abdm-readiness' && (
                <ABDMReadinessWorkspace
                  role={role}
                  patient={selectedPatient}
                  records={records}
                  abdmExchangeLogs={abdmExchangeLogs}
                  facilityStaffConfig={facilityStaffConfig}
                  onInspectRecord={(rec) => {
                    setInspectedRecord(rec);
                    setActiveSection('records');
                  }}
                  onRefreshState={fetchAppState}
                />
              )}

              {activeSection === 'public-health' && (
                <PublicHealthDashboard
                  series={publicHealthSeries}
                  signals={publicHealthSignals}
                  onRefreshState={fetchAppState}
                />
              )}

              {activeSection === 'privacy' && (
                <SharingAndPrivacyView
                  role={role}
                  patient={selectedPatient}
                  auditLogs={auditLogs}
                  onRefreshState={fetchAppState}
                />
              )}

              {activeSection === 'notifications' && (
                <NotificationsAndAuditView
                  mode="notifications"
                  role={role}
                  notifications={notifications}
                  auditLogs={auditLogs}
                  onNavigate={setActiveSection}
                  onRefreshState={fetchAppState}
                />
              )}

              {activeSection === 'audit' && (
                <NotificationsAndAuditView
                  mode="audit"
                  role={role}
                  notifications={notifications}
                  auditLogs={auditLogs}
                  onNavigate={setActiveSection}
                  onRefreshState={fetchAppState}
                />
              )}
            </>
          )}
        </main>

        {/* Right-Side Contextual Patient & Evidence Drawer */}
        {contextDrawerOpen && role !== 'analyst' && selectedPatient && (
          <aside className="hidden xl:block w-80 bg-white border-l border-slate-200 p-5 space-y-5 shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="text-[11px] font-mono font-bold text-teal-800">
                  CONTEXTUAL PATIENT DRAWER
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedPatient.fullName} ({selectedPatient.id})
                </div>
              </div>
              <button
                onClick={() => setContextDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
                aria-label="Close contextual drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Simulated ABHA Number</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {selectedPatient.simulatedAbhaNumber || '91-4820-7391-6042'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Demographics &amp; Blood Group</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedPatient.age}y · {selectedPatient.gender} · Blood{' '}
                  <span className="font-mono">{selectedPatient.bloodGroup}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-red-900 mb-1.5">
                Allergies ({selectedPatient.allergies.length})
              </div>
              <div className="space-y-1.5 text-xs">
                {selectedPatient.allergies.map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-lg bg-red-50/60 border border-red-200"
                  >
                    <div className="font-bold text-red-900">
                      {a.substance} ({a.severity})
                    </div>
                    <div className="text-slate-700">{a.reaction}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-900 mb-1.5">
                Active Medications ({selectedPatient.medications.length})
              </div>
              <div className="space-y-1.5 text-xs">
                {selectedPatient.medications.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="font-semibold text-slate-900">
                      {m.name} {m.strength}
                    </div>
                    <div className="text-slate-600">
                      {m.dose} · {m.frequency}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <button
                onClick={() => setActiveSection('timeline')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Open Longitudinal Timeline
              </button>
              <button
                onClick={() => setActiveSection('abdm-readiness')}
                className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-semibold rounded-lg"
              >
                Open ABDM &amp; Consent Hub
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Demo Role Selection & Scenario Launcher Modal */}
      <RoleLoginModal
        isOpen={isRoleModalOpen}
        currentRole={role}
        currentPersonaId={currentPersona.id}
        aiConfigured={aiConfigured}
        onSelectRole={handleSelectRole}
        onRunScenario={handleRunScenario}
        onClose={() => setIsRoleModalOpen(false)}
      />
    </div>
  );
}
