import { NavigationSection, SupportedUILanguage } from './types';

export interface LanguageOption {
  code: SupportedUILanguage;
  label: string;
  nativeLabel: string;
  badge: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', badge: 'EN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', badge: 'हिं' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', badge: 'த' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', badge: 'ಕ' },
];

export interface UITranslationBundle {
  languageName: string;
  tagline: string;
  switchRoleBtn: string;
  samplePatientLabel: string;
  doctorLabel: string;
  resetDataBtn: string;
  activeLanguageNoticeTitle: string;
  activeLanguageNoticeBody: (patientName: string, hospitalCount: number) => string;
  navLabels: Record<NavigationSection, { standard: string; patient?: string; mobile: string }>;
  patientOverview: {
    connectedSummaryBadge: string;
    hospitalsLinked: string;
    greeting: (name: string) => string;
    subtitle: string;
    askAssistantBtn: string;
    viewTimelineBtn: string;
    sharingConsentBtn: (pendingCount: number) => string;
    requestApprovalBtn: string;
    pendingConsentTitle: string;
    approveRequestBtn: string;
    rejectRequestBtn: string;
    metricRecords: string;
    metricMedications: string;
    metricAllergies: string;
    metricConsents: string;
  };
  visualGuide: {
    section1Title: string;
    section1Subtitle: string;
    allergyAlertTitle: string;
    allergyAlertSub: string;
    section2Title: string;
    section2Subtitle: string;
    requestRenewalBtn: string;
    renewalSubmittedBadge: string;
    morningLabel: string;
    MorningSub: string;
    nightLabel: string;
    nightSub: string;
    section3Title: string;
    section3Subtitle: string;
    seeAllReportsBtn: string;
    doctorCheckedBadge: string;
    waitingDoctorApprovalBadge: string;
    submitApprovalNeedBtn: string;
    approvalRequestedBadge: string;
    openReportBtn: string;
  };
}

export const UI_TRANSLATIONS: Record<SupportedUILanguage, UITranslationBundle> = {
  en: {
    languageName: 'English',
    tagline: 'Connected Health & Clinical Intelligence',
    switchRoleBtn: 'Switch Demo Account',
    samplePatientLabel: 'Sample Patient:',
    doctorLabel: 'Doctor:',
    resetDataBtn: 'Reset Seed Data',
    activeLanguageNoticeTitle: 'English Health Summary Active',
    activeLanguageNoticeBody: (patientName, hospitalCount) =>
      `Viewing ${patientName}’s connected medical records across ${hospitalCount} participating hospitals in plain English.`,
    navLabels: {
      overview: { standard: 'Overview', mobile: 'Overview' },
      patients: { standard: 'Patients', patient: 'My Health Profile', mobile: 'Profile' },
      timeline: { standard: 'Health Timeline', mobile: 'Timeline' },
      records: { standard: 'Medical Records', mobile: 'Records' },
      'patient-ai': { standard: 'AI Health Assistant', mobile: 'AI Guide' },
      'clinical-copilot': { standard: 'Clinical Intelligence Copilot', mobile: 'Copilot' },
      prescriptions: {
        standard: 'Prescription & Approval Review',
        patient: 'Approvals & Rx Requests',
        mobile: 'Approvals',
      },
      'abdm-readiness': { standard: 'Connected Health / ABDM', mobile: 'Consent' },
      'public-health': { standard: 'Public Health Intelligence', mobile: 'Surveillance' },
      privacy: { standard: 'Sharing & Privacy', mobile: 'Privacy' },
      notifications: { standard: 'Notifications', mobile: 'Alerts' },
      audit: { standard: 'Audit & Activity', mobile: 'Audit' },
    },
    patientOverview: {
      connectedSummaryBadge: 'YOUR CONNECTED HEALTH SUMMARY',
      hospitalsLinked: 'Hospitals Linked',
      greeting: (name) => `Hello, ${name} — Your Health Is On Track`,
      subtitle:
        'See your heart, blood pressure, blood sugar, and daily medicines in simple pictures and everyday words — all connected across your hospitals.',
      askAssistantBtn: 'Ask Health Assistant',
      viewTimelineBtn: 'View Health Timeline',
      sharingConsentBtn: (pending) => `Sharing & Consent (${pending} Pending)`,
      requestApprovalBtn: 'Submit Doctor Approval Request',
      pendingConsentTitle: 'Pending Health Record Consent Request',
      approveRequestBtn: 'Approve Request Now',
      rejectRequestBtn: 'Reject Request',
      metricRecords: 'Connected Medical Records',
      metricMedications: 'Active Approved Medications',
      metricAllergies: 'Documented Allergies',
      metricConsents: 'Active Consent Artefacts',
    },
    visualGuide: {
      section1Title: '1. Your Health at a Glance (Easy Visual Guide)',
      section1Subtitle: 'Simple picture cards showing how your body is doing right now',
      allergyAlertTitle: 'Important Allergy Warning:',
      allergyAlertSub: 'Shown automatically to every treating doctor before prescribing.',
      section2Title: '2. Your Daily Medicine Schedule',
      section2Subtitle: 'Clear morning and night reminders from your doctors',
      requestRenewalBtn: 'Submit Refill / Approval Request to Doctor',
      renewalSubmittedBadge: 'Approval Request Sent to Doctor!',
      morningLabel: 'Morning (After Breakfast)',
      MorningSub: 'Take with a full glass of water',
      nightLabel: 'Night (After Dinner)',
      nightSub: 'Helps control cholesterol & overnight recovery',
      section3Title: '3. Recent Hospital Visits (Easy Summary)',
      section3Subtitle: 'Short, plain-language takeaways from each hospital visit',
      seeAllReportsBtn: 'See All Full Reports →',
      doctorCheckedBadge: 'Doctor Checked',
      waitingDoctorApprovalBadge: 'Needs Doctor Approval',
      submitApprovalNeedBtn: 'Submit Approval Request',
      approvalRequestedBadge: 'Submitted for Doctor Approval ✓',
      openReportBtn: 'Tap to open full report →',
    },
  },
  hi: {
    languageName: 'हिंदी (Hindi)',
    tagline: 'जुड़े हुए स्वास्थ्य रिकॉर्ड और क्लिनिकल इंटेलिजेंस',
    switchRoleBtn: 'डेमो खाता बदलें',
    samplePatientLabel: 'मरीज़ (Patient):',
    doctorLabel: 'डॉक्टर:',
    resetDataBtn: 'डेटा रीसेट करें',
    activeLanguageNoticeTitle: 'हिंदी भाषा मोड सक्रिय (Hindi Health Summary Active)',
    activeLanguageNoticeBody: (patientName, hospitalCount) =>
      `${patientName} के ${hospitalCount} अस्पतालों के जुड़े हुए स्वास्थ्य रिकॉर्ड, दवाइयाँ और जांच रिपोर्ट अब सरल हिंदी में प्रदर्शित हैं।`,
    navLabels: {
      overview: { standard: 'मुख्य सारांश (Overview)', mobile: 'सारांश' },
      patients: {
        standard: 'मरीज़ सूची (Patients)',
        patient: 'मेरी स्वास्थ्य प्रोफ़ाइल',
        mobile: 'प्रोफ़ाइल',
      },
      timeline: { standard: 'स्वास्थ्य टाइमलाइन (Timeline)', mobile: 'टाइमलाइन' },
      records: { standard: 'मेडिकल रिपोर्ट (Records)', mobile: 'रिपोर्ट' },
      'patient-ai': { standard: 'AI स्वास्थ्य सहायक', mobile: 'AI सहायक' },
      'clinical-copilot': { standard: 'क्लिनिकल AI कोपायलट', mobile: 'कोपायलट' },
      prescriptions: {
        standard: 'दवा और स्वीकृति समीक्षा (Approvals)',
        patient: 'दवा और डॉक्टर स्वीकृति',
        mobile: 'स्वीकृति',
      },
      'abdm-readiness': { standard: 'ABDM और सहमति (Consent)', mobile: 'सहमति' },
      'public-health': { standard: 'जन-स्वास्थ्य निगरानी', mobile: 'निगरानी' },
      privacy: { standard: 'गोपनीयता और साझाकरण', mobile: 'गोपनीयता' },
      notifications: { standard: 'सूचनाएं (Alerts)', mobile: 'सूचनाएं' },
      audit: { standard: 'ऑडिट लॉग (Audit)', mobile: 'ऑडिट' },
    },
    patientOverview: {
      connectedSummaryBadge: 'आपका जुड़ा हुआ स्वास्थ्य सारांश',
      hospitalsLinked: 'अस्पताल जुड़े हैं',
      greeting: (name) => `नमस्ते, ${name} — आपका स्वास्थ्य नियंत्रण में है`,
      subtitle:
        'अपने दिल, ब्लड प्रेशर, ब्लड शुगर और रोज़ाना की दवाइयों की जानकारी सरल चित्रों और आसान हिंदी में देखें — आपके सभी अस्पतालों से जुड़ी हुई।',
      askAssistantBtn: 'AI स्वास्थ्य सहायक से पूछें',
      viewTimelineBtn: 'स्वास्थ्य टाइमलाइन देखें',
      sharingConsentBtn: (pending) => `सहमति और साझाकरण (${pending} लंबित)`,
      requestApprovalBtn: 'डॉक्टर स्वीकृति अनुरोध भेजें (Submit Request)',
      pendingConsentTitle: 'स्वास्थ्य रिकॉर्ड साझा करने की अनुमति का अनुरोध लंबित है',
      approveRequestBtn: 'अभी अनुमति दें (Approve)',
      rejectRequestBtn: 'अस्वीकार करें (Reject)',
      metricRecords: 'जुड़े हुए मेडिकल रिकॉर्ड',
      metricMedications: 'सक्रिय प्रमाणित दवाइयाँ',
      metricAllergies: 'दर्ज एलर्जी चेतावनी',
      metricConsents: 'सक्रिय सहमति अनुमतियाँ',
    },
    visualGuide: {
      section1Title: '1. एक नज़र में आपका स्वास्थ्य (सरल चित्र मार्गदर्शिका)',
      section1Subtitle: 'सरल कार्ड जो बताते हैं कि आपके शरीर की जांच रिपोर्ट कैसी है',
      allergyAlertTitle: 'महत्वपूर्ण एलर्जी चेतावनी:',
      allergyAlertSub: 'कोई भी नई दवा लिखने से पहले हर डॉक्टर को यह चेतावनी स्वतः दिखाई जाती है।',
      section2Title: '2. आपकी रोज़ाना की दवाइयों का समय',
      section2Subtitle: 'सुबह और रात की दवाइयों का सरल चार्ट',
      requestRenewalBtn: 'दवा नवीनीकरण / डॉक्टर स्वीकृति अनुरोध भेजें',
      renewalSubmittedBadge: 'डॉक्टर को स्वीकृति अनुरोध भेज दिया गया है!',
      morningLabel: 'सुबह (नाश्ते के बाद)',
      MorningSub: 'एक गिलास पानी के साथ लें',
      nightLabel: 'रात (खाने के बाद)',
      nightSub: 'कोलेस्ट्रॉल और रात की रिकवरी में सहायक',
      section3Title: '3. हालिया अस्पताल विज़िट (सरल सारांश)',
      section3Subtitle: 'प्रत्येक अस्पताल की जांच रिपोर्ट का आसान भाषा में सार',
      seeAllReportsBtn: 'सभी पूरी रिपोर्ट देखें →',
      doctorCheckedBadge: 'डॉक्टर द्वारा सत्यापित',
      waitingDoctorApprovalBadge: 'डॉक्टर की स्वीकृति बाकी',
      submitApprovalNeedBtn: 'डॉक्टर स्वीकृति अनुरोध भेजें',
      approvalRequestedBadge: 'स्वीकृति के लिए भेजा गया ✓',
      openReportBtn: 'पूरी रिपोर्ट खोलने के लिए टैप करें →',
    },
  },
  ta: {
    languageName: 'தமிழ் (Tamil)',
    tagline: 'இணைக்கப்பட்ட மருத்துவப் பதிவுகள் & நுண்ணறிவு',
    switchRoleBtn: 'டெமோ கணக்கை மாற்று',
    samplePatientLabel: 'நோயாளி (Patient):',
    doctorLabel: 'மருத்துவர்:',
    resetDataBtn: 'தரவை மீட்டமை',
    activeLanguageNoticeTitle: 'தமிழ் மொழி சுருக்கம் செயலில் உள்ளது (Tamil Active)',
    activeLanguageNoticeBody: (patientName, hospitalCount) =>
      `${patientName} அவர்களின் ${hospitalCount} மருத்துவமனைப் பதிவுகள், மருந்துகள் மற்றும் பரிசோதனை முடிவுகள் எளிய தமிழில் காட்டப்படுகின்றன.`,
    navLabels: {
      overview: { standard: 'முகப்பு சுருக்கம் (Overview)', mobile: 'முகப்பு' },
      patients: {
        standard: 'நோயாளிகள் (Patients)',
        patient: 'எனது உடல்நல விவரம்',
        mobile: 'விவரம்',
      },
      timeline: { standard: 'மருத்துவ காலவரிசை (Timeline)', mobile: 'காலவரிசை' },
      records: { standard: 'மருத்துவ அறிக்கைகள் (Records)', mobile: 'அறிக்கைகள்' },
      'patient-ai': { standard: 'AI உடல்நல உதவியாளர்', mobile: 'AI உதவி' },
      'clinical-copilot': { standard: 'மருத்துவர் AI கோபைலட்', mobile: 'கோபைலட்' },
      prescriptions: {
        standard: 'மருந்து & ஒப்புதல் (Approvals)',
        patient: 'மருந்து ஒப்புதல் கோரிக்கை',
        mobile: 'ஒப்புதல்',
      },
      'abdm-readiness': { standard: 'ABDM & ஒப்புதல் (Consent)', mobile: 'ஒப்புதல்' },
      'public-health': { standard: 'பொது சுகாதார கண்காணிப்பு', mobile: 'கண்காணிப்பு' },
      privacy: { standard: 'பகிர்வு & தனியுரிமை', mobile: 'தனியுரிமை' },
      notifications: { standard: 'அறிவிப்புகள் (Alerts)', mobile: 'அறிவிப்பு' },
      audit: { standard: 'தணிக்கை பதிவு (Audit)', mobile: 'தணிக்கை' },
    },
    patientOverview: {
      connectedSummaryBadge: 'உங்கள் இணைக்கப்பட்ட உடல்நலச் சுருக்கம்',
      hospitalsLinked: 'மருத்துவமனைகள் இணைக்கப்பட்டுள்ளன',
      greeting: (name) => `வணக்கம், ${name} — உங்கள் உடல்நலம் சீராக உள்ளது`,
      subtitle:
        'உங்கள் இதயம், இரத்த அழுத்தம், இரத்த சர்க்கரை மற்றும் தினசரி மருந்துகளை எளிய படங்கள் மற்றும் தமிழில் காண்க.',
      askAssistantBtn: 'AI உதவியாளரிடம் கேளுங்கள்',
      viewTimelineBtn: 'காலவரிசையைப் பார்க்கவும்',
      sharingConsentBtn: (pending) => `பகிர்வு & ஒப்புதல் (${pending} நிலுவையில்)`,
      requestApprovalBtn: 'மருத்துவர் ஒப்புதல் கோரிக்கை அனுப்பு',
      pendingConsentTitle: 'மருத்துவப் பதிவு ஒப்புதல் கோரிக்கை நிலுவையில் உள்ளது',
      approveRequestBtn: 'இப்போதே ஒப்புதல் அளி (Approve)',
      rejectRequestBtn: 'நிராகரி (Reject)',
      metricRecords: 'இணைக்கப்பட்ட மருத்துவ அறிக்கைகள்',
      metricMedications: 'செயலில் உள்ள மருந்துகள்',
      metricAllergies: 'பதிவு செய்யப்பட்ட ஒவ்வாமை (Allergy)',
      metricConsents: 'செயலில் உள்ள ஒப்புதல்கள்',
    },
    visualGuide: {
      section1Title: '1. ஒரு பார்வையில் உங்கள் உடல்நலம் (எளிய பட வழிகாட்டி)',
      section1Subtitle: 'உங்கள் உடல்நிலை எப்படி உள்ளது என்பதைக் காட்டும் எளிய அட்டைகள்',
      allergyAlertTitle: 'முக்கிய ஒவ்வாமை (Allergy) எச்சரிக்கை:',
      allergyAlertSub: 'புதிய மருந்து எழுதும் முன் ஒவ்வொரு மருத்துவருக்கும் இது காட்டப்படும்.',
      section2Title: '2. உங்கள் தினசரி மருந்து அட்டவணை',
      section2Subtitle: 'காலை மற்றும் இரவு மருந்துகளுக்கான எளிய வழிகாட்டி',
      requestRenewalBtn: 'மருந்து புதுப்பிப்பு / ஒப்புதல் கோரிக்கை அனுப்பு',
      renewalSubmittedBadge: 'மருத்துவருக்கு ஒப்புதல் கோரிக்கை அனுப்பப்பட்டது!',
      morningLabel: 'காலை (காலை உணவுக்குப் பிறகு)',
      MorningSub: 'ஒரு டம்ளர் தண்ணீருடன் எடுத்துக் கொள்ளவும்',
      nightLabel: 'இரவு (இரவு உணவுக்குப் பிறகு)',
      nightSub: 'கொழுப்பைக் கட்டுப்படுத்த உதவுகிறது',
      section3Title: '3. சமீபத்திய மருத்துவமனை வருகைகள் (எளிய சுருக்கம்)',
      section3Subtitle: 'ஒவ்வொரு மருத்துவமனைப் பரிசோதனையின் எளிய விளக்கம்',
      seeAllReportsBtn: 'அனைத்து அறிக்கைகளையும் காண்க →',
      doctorCheckedBadge: 'மருத்துவர் சரிபார்த்தது',
      waitingDoctorApprovalBadge: 'மருத்துவர் ஒப்புதல் தேவை',
      submitApprovalNeedBtn: 'ஒப்புதல் கோரிக்கை அனுப்பு',
      approvalRequestedBadge: 'ஒப்புதலுக்கு அனுப்பப்பட்டது ✓',
      openReportBtn: 'முழு அறிக்கையைத் திறக்க தட்டவும் →',
    },
  },
  kn: {
    languageName: 'ಕನ್ನಡ (Kannada)',
    tagline: 'ಸಂಪರ್ಕಿತ ಆರೋಗ್ಯ ದಾಖಲೆಗಳು ಮತ್ತು ವೈದ್ಯಕೀಯ ಬುದ್ಧಿಮತ್ತೆ',
    switchRoleBtn: 'ಡೆಮೊ ಖಾತೆ ಬದಲಿಸಿ',
    samplePatientLabel: 'ರೋಗಿ (Patient):',
    doctorLabel: 'ವೈದ್ಯರು:',
    resetDataBtn: 'ಡೇಟಾ ಮರುಹೊಂದಿಸಿ',
    activeLanguageNoticeTitle: 'ಕನ್ನಡ ಭಾಷಾ ಸಾರಾಂಶ ಸಕ್ರಿಯವಾಗಿದೆ (Kannada Active)',
    activeLanguageNoticeBody: (patientName, hospitalCount) =>
      `${patientName} ಅವರ ${hospitalCount} ಆಸ್ಪತ್ರೆಗಳ ಆರೋಗ್ಯ ದಾಖಲೆಗಳು, ಔಷಧಿಗಳು ಮತ್ತು ವರದಿಗಳನ್ನು ಸರಳ ಕನ್ನಡದಲ್ಲಿ ತೋರಿಸಲಾಗುತ್ತಿದೆ.`,
    navLabels: {
      overview: { standard: 'ಮುಖ್ಯ ಸಾರಾಂಶ (Overview)', mobile: 'ಸಾರಾಂಶ' },
      patients: {
        standard: 'ರೋಗಿಗಳು (Patients)',
        patient: 'ನನ್ನ ಆರೋಗ್ಯ ವಿವರ',
        mobile: 'ವಿವರ',
      },
      timeline: { standard: 'ಆರೋಗ್ಯ ಟೈಮ್‌ಲೈನ್ (Timeline)', mobile: 'ಟೈಮ್‌ಲೈನ್' },
      records: { standard: 'ವೈದ್ಯಕೀಯ ವರದಿಗಳು (Records)', mobile: 'ವರದಿಗಳು' },
      'patient-ai': { standard: 'AI ಆರೋಗ್ಯ ಸಹಾಯಕ', mobile: 'AI ಸಹಾಯಕ' },
      'clinical-copilot': { standard: 'ಕ್ಲಿನಿಕಲ್ AI ಕೋಪೈಲಟ್', mobile: 'ಕೋಪೈಲಟ್' },
      prescriptions: {
        standard: 'ಔಷಧಿ ಮತ್ತು ಅನುಮೋದನೆ (Approvals)',
        patient: 'ವೈದ್ಯರ ಅನುಮೋದನೆ ವಿನಂತಿ',
        mobile: 'ಅನುಮೋದನೆ',
      },
      'abdm-readiness': { standard: 'ABDM ಮತ್ತು ಸಮ್ಮತಿ (Consent)', mobile: 'ಸಮ್ಮತಿ' },
      'public-health': { standard: 'ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ ಕಣ್ಗಾವಲು', mobile: 'ಕಣ್ಗಾವಲು' },
      privacy: { standard: 'ಗೌಪ್ಯತೆ ಮತ್ತು ಹಂಚಿಕೆ', mobile: 'ಗೌಪ್ಯತೆ' },
      notifications: { standard: 'ಸೂಚನೆಗಳು (Alerts)', mobile: 'ಸೂಚನೆ' },
      audit: { standard: 'ಆಡಿಟ್ ದಾಖಲೆ (Audit)', mobile: 'ಆಡಿಟ್' },
    },
    patientOverview: {
      connectedSummaryBadge: 'ನಿಮ್ಮ ಸಂಪರ್ಕಿತ ಆರೋಗ್ಯ ಸಾರಾಂಶ',
      hospitalsLinked: 'ಆಸ್ಪತ್ರೆಗಳು ಸಂಪರ್ಕಗೊಂಡಿವೆ',
      greeting: (name) => `ನಮಸ್ಕಾರ, ${name} — ನಿಮ್ಮ ಆರೋಗ್ಯ ಉತ್ತಮವಾಗಿದೆ`,
      subtitle:
        'ನಿಮ್ಮ ಹೃದಯ, ರಕ್ತದೊತ್ತಡ, ರಕ್ತದ ಸಕ್ಕರೆ ಮತ್ತು ದೈನಂದಿನ ಔಷಧಿಗಳನ್ನು ಸರಳ ಚಿತ್ರಗಳು ಮತ್ತು ಕನ್ನಡದಲ್ಲಿ ನೋಡಿ.',
      askAssistantBtn: 'AI ಆರೋಗ್ಯ ಸಹಾಯಕರನ್ನು ಕೇಳಿ',
      viewTimelineBtn: 'ಆರೋಗ್ಯ ಟೈಮ್‌ಲೈನ್ ನೋಡಿ',
      sharingConsentBtn: (pending) => `ಹಂಚಿಕೆ ಮತ್ತು ಸಮ್ಮತಿ (${pending} ಬಾಕಿ)`,
      requestApprovalBtn: 'ವೈದ್ಯರ ಅನುಮೋದನೆ ವಿನಂತಿ ಕಳುಹಿಸಿ',
      pendingConsentTitle: 'ಆರೋಗ್ಯ ದಾಖಲೆ ಸಮ್ಮತಿ ವಿನಂತಿ ಬಾಕಿ ಇದೆ',
      approveRequestBtn: 'ಈಗಲೇ ಅನುಮೋದಿಸಿ (Approve)',
      rejectRequestBtn: 'ತಿರಸ್ಕರಿಸಿ (Reject)',
      metricRecords: 'ಸಂಪರ್ಕಿತ ವೈದ್ಯಕೀಯ ವರದಿಗಳು',
      metricMedications: 'ಸಕ್ರಿಯ ದೃಢೀಕೃತ ಔಷಧಿಗಳು',
      metricAllergies: 'ದಾಖಲಾದ ಅಲರ್ಜಿ ಎಚ್ಚರಿಕೆ',
      metricConsents: 'ಸಕ್ರಿಯ ಸಮ್ಮತಿ ಪತ್ರಗಳು',
    },
    visualGuide: {
      section1Title: '1. ಒಂದು ನೋಟದಲ್ಲಿ ನಿಮ್ಮ ಆರೋಗ್ಯ (ಸರಳ ಚಿತ್ರ ಮಾರ್ಗದರ್ಶಿ)',
      section1Subtitle: 'ನಿಮ್ಮ ದೇಹದ ಸ್ಥಿತಿ ಹೇಗಿದೆ ಎಂದು ತೋರಿಸುವ ಸರಳ ಕಾರ್ಡ್‌ಗಳು',
      allergyAlertTitle: 'ಮುಖ್ಯ ಅಲರ್ಜಿ ಎಚ್ಚರಿಕೆ:',
      allergyAlertSub: 'ಹೊಸ ಔಷಧಿ ನೀಡುವ ಮೊದಲು ಪ್ರತಿಯೊಬ್ಬ ವೈದ್ಯರಿಗೆ ಇದು ಕಾಣಿಸುತ್ತದೆ.',
      section2Title: '2. ನಿಮ್ಮ ದೈನಂದಿನ ಔಷಧಿ ವೇಳಾಪಟ್ಟಿ',
      section2Subtitle: 'ಬೆಳಿಗ್ಗೆ ಮತ್ತು ರಾತ್ರಿ ಔಷಧಿಗಳ ಸರಳ ಮಾಹಿತಿ',
      requestRenewalBtn: 'ಔಷಧಿ ನವೀಕರಣ / ಅನುಮೋದನೆ ವಿನಂತಿ ಕಳುಹಿಸಿ',
      renewalSubmittedBadge: 'ವೈದ್ಯರಿಗೆ ಅನುಮೋದನೆ ವಿನಂತಿ ಕಳುಹಿಸಲಾಗಿದೆ!',
      morningLabel: 'ಬೆಳಿಗ್ಗೆ (ಉಪಾಹಾರದ ನಂತರ)',
      MorningSub: 'ಒಂದು ಲೋಟ ನೀರಿನೊಂದಿಗೆ ತೆಗೆದುಕೊಳ್ಳಿ',
      nightLabel: 'ರಾತ್ರಿ (ಊಟದ ನಂತರ)',
      nightSub: 'ಕೊಲೆಸ್ಟ್ರಾಲ್ ನಿಯಂತ್ರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ',
      section3Title: '3. ಇತ್ತೀಚಿನ ಆಸ್ಪತ್ರೆ ಭೇಟಿಗಳು (ಸರಳ ಸಾರಾಂಶ)',
      section3Subtitle: 'ಪ್ರತಿ ಆಸ್ಪತ್ರೆಯ ವರದಿಯ ಸರಳ ಕನ್ನಡ ವಿವರಣೆ',
      seeAllReportsBtn: 'ಎಲ್ಲಾ ಪೂರ್ಣ ವರದಿಗಳನ್ನು ನೋಡಿ →',
      doctorCheckedBadge: 'ವೈದ್ಯರಿಂದ ದೃಢೀಕರಿಸಲ್ಪಟ್ಟಿದೆ',
      waitingDoctorApprovalBadge: 'ವೈದ್ಯರ ಅನುಮೋದನೆ ಬಾಕಿ ಇದೆ',
      submitApprovalNeedBtn: 'ಅನುಮೋದನೆ ವಿನಂತಿ ಸಲ್ಲಿಸಿ',
      approvalRequestedBadge: 'ಅನುಮೋದನೆಗೆ ಕಳುಹಿಸಲಾಗಿದೆ ✓',
      openReportBtn: 'ಪೂರ್ಣ ವರದಿ ತೆರೆಯಲು ಟ್ಯಾಪ್ ಮಾಡಿ →',
    },
  },
};
