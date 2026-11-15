import { AppLanguage } from '../types';

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
};

export function tr(lang: AppLanguage, en: string, hi: string): string {
  return lang === 'hi' ? hi : en;
}

const AGENT_HI_MAP: Record<string, { name: string; role: string; scope: string }> = {
  'Customer Intelligence Agent': {
    name: 'ग्राहक जानकारी एजेंट',
    role: 'ऑर्डर, भुगतान इतिहास और पसंद से ग्राहक प्रोफ़ाइल और खरीद मेमोरी तैयार करता है।',
    scope: 'ग्राहक, ऑर्डर और भुगतान डेटा पढ़ता है',
  },
  'Behaviour & Prediction Agent': {
    name: 'व्यवहार और अनुमान एजेंट',
    role: 'रीऑर्डर समय, निष्क्रिय ग्राहक और स्पष्ट COD डिलीवरी जोखिम पहचानता है।',
    scope: 'ऑर्डर जोखिम स्कोर और रीऑर्डर गति तय करता है',
  },
  'Engagement & Copy Agent': {
    name: 'संदेश और संवाद एजेंट',
    role: 'सरल हिन्दी, हिंग्लिश या अंग्रेज़ी में विनम्र ग्राहक संदेश तैयार करता है।',
    scope: 'केवल ड्राफ्ट तैयार करता है (सीधे नहीं भेजता)',
  },
  'Policy & Safety Guard': {
    name: 'नीति और सुरक्षा रक्षक',
    role: 'ग्राहक सहमति, ऑप्ट-आउट, शांत घंटे (9 PM–9 AM), दैनिक सीमा और ऑटो-नियम जांचता है।',
    scope: 'सुरक्षा नियम लागू कर अमान्य संदेश रोकता है',
  },
  'Execution & Measurement Agent': {
    name: 'निष्पादन और परिणाम एजेंट',
    role: 'मंजूर संदेश WhatsApp पर भेजता है और जवाब व ऑर्डर परिणाम सत्यापित करता है।',
    scope: 'मंजूर कार्य पूरा कर परिणाम दर्ज करता है',
  },
};

export function localizeAgentName(lang: AppLanguage, name: string): string {
  if (lang === 'hi' && AGENT_HI_MAP[name]) return AGENT_HI_MAP[name].name;
  return name;
}

export function localizeAgentRole(lang: AppLanguage, name: string, fallbackRole: string): string {
  if (lang === 'hi' && AGENT_HI_MAP[name]) return AGENT_HI_MAP[name].role;
  return fallbackRole;
}

export function localizeAgentScope(lang: AppLanguage, name: string, fallbackScope: string): string {
  if (lang === 'hi' && AGENT_HI_MAP[name]) return AGENT_HI_MAP[name].scope;
  return fallbackScope;
}

export function localizeWorkflowType(lang: AppLanguage, wfType: string): string {
  if (lang !== 'hi') return wfType.replace(/_/g, ' ');
  const map: Record<string, string> = {
    reactivation: 'ग्राहक वापसी',
    cod_protection: 'COD सुरक्षा',
    udhaar_collection: 'उधार वसूली',
    reorder_scan: 'रीऑर्डर जांच',
    voice_command: 'वॉइस कमांड',
  };
  return map[wfType] || wfType.replace(/_/g, ' ');
}

export function localizeOrderStatus(lang: AppLanguage, status: string): string {
  const enMap: Record<string, string> = {
    Pending_Verification: 'Pending Verification',
    In_Transit: 'In Transit',
    Delivered: 'Delivered',
    RTO_Returned: 'Returned (RTO)',
    Cancelled: 'Cancelled',
  };
  const hiMap: Record<string, string> = {
    Pending_Verification: 'सत्यापन बाकी',
    In_Transit: 'रास्ते में',
    Delivered: 'डिलीवर हुआ',
    RTO_Returned: 'रिटर्न (RTO)',
    Cancelled: 'रद्द',
  };
  if (lang === 'hi') return hiMap[status] || status.replace(/_/g, ' ');
  return enMap[status] || status.replace(/_/g, ' ');
}

export function localizePaymentMode(lang: AppLanguage, mode: string): string {
  const enMap: Record<string, string> = {
    COD: 'Cash on Delivery (COD)',
    Prepaid_UPI: 'UPI Prepaid',
    Prepaid_Card: 'Card Prepaid',
    Udhaar: 'Khata / Udhaar',
  };
  const hiMap: Record<string, string> = {
    COD: 'कैश ऑन डिलीवरी (COD)',
    Prepaid_UPI: 'UPI प्रीपेड',
    Prepaid_Card: 'कार्ड प्रीपेड',
    Udhaar: 'खाता / उधार',
  };
  if (lang === 'hi') return hiMap[mode] || mode.replace(/_/g, ' ');
  return enMap[mode] || mode.replace(/_/g, ' ');
}

export function localizeWorkflowStatus(lang: AppLanguage, status: string): string {
  const enMap: Record<string, string> = {
    running: 'Running',
    awaiting_approval: 'Awaiting Approval',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    executing: 'Executing',
    completed: 'Completed',
    executed: 'Completed',
    failed: 'Failed',
    escalated: 'Escalated',
    snoozed: 'Scheduled',
    scheduled: 'Scheduled',
    rejected: 'Rejected',
    blocked: 'Blocked',
    simulated: 'Simulated',
    sent: 'Sent',
    delivered: 'Delivered',
    read: 'Read',
    captured: 'Captured',
    skipped: 'Skipped',
    pending: 'Pending',
  };
  const hiMap: Record<string, string> = {
    running: 'जारी',
    awaiting_approval: 'मंजूरी बाकी',
    pending_approval: 'मंजूरी बाकी',
    approved: 'मंजूर',
    executing: 'निष्पादन जारी',
    completed: 'पूर्ण',
    executed: 'पूर्ण',
    failed: 'विफल',
    escalated: 'एस्केलेटेड',
    snoozed: 'शेड्यूल किया गया',
    scheduled: 'शेड्यूल किया गया',
    rejected: 'अस्वीकृत',
    blocked: 'रोका गया',
    simulated: 'सिमुलेटेड',
    sent: 'भेजा गया',
    delivered: 'डिलीवर',
    read: 'पढ़ा गया',
    captured: 'प्राप्त',
    skipped: 'छोड़ा गया',
    pending: 'लंबित',
  };
  if (lang === 'hi') return hiMap[status] || status.replace(/_/g, ' ');
  return enMap[status] || status.replace(/_/g, ' ');
}

export function localizeAuditAction(lang: AppLanguage, action: string): string {
  if (lang !== 'hi') return action.replace(/_/g, ' ');
  const map: Record<string, string> = {
    demo_sandbox_initialized: 'डेमो सैंडबॉक्स प्रारंभ हुआ',
    workflow_executed: 'वर्कफ़्लो निष्पादित',
    workflow_escalated: 'वर्कफ़्लो एस्केलेट हुआ',
    policy_guard_blocked: 'नीति रक्षक ने संदेश रोका',
    payment_recorded: 'भुगतान दर्ज किया गया',
    cod_risk_scored: 'COD जोखिम जांचा गया',
    approval_scheduled: 'कार्रवाई शेड्यूल हुई',
    approval_snoozed: 'कार्रवाई शेड्यूल हुई',
    approval_rejected: 'प्रस्ताव अस्वीकृत हुआ',
    approval_draft_edited: 'संदेश ड्राफ्ट बदला गया',
    approval_executed: 'मंजूर संदेश भेजा गया',
    tenant_backup_exported: 'दुकान डेटा बैकअप डाउनलोड हुआ',
    integration_connected: 'इंटीग्रेशन कनेक्ट हुआ',
    integration_verification_failed: 'इंटीग्रेशन सत्यापन विफल',
    integration_disconnected: 'इंटीग्रेशन डिस्कनेक्ट हुआ',
    shopify_sync_completed: 'Shopify सिंक पूर्ण हुआ',
    order_created: 'नया ऑर्डर दर्ज हुआ',
    customer_created: 'नया ग्राहक जोड़ा गया',
    customer_updated: 'ग्राहक विवरण अपडेट हुआ',
    settings_updated: 'ऑटो नियम अपडेट हुए',
    csv_imported: 'CSV डेटा अपलोड हुआ',
    csv_rolled_back: 'CSV बैच वापस लिया गया',
  };
  return map[action] || action.replace(/_/g, ' ');
}

export function localizeActorType(lang: AppLanguage, actor: string): string {
  if (lang !== 'hi') return actor;
  const map: Record<string, string> = {
    merchant: 'व्यापारी',
    agent: 'AI एजेंट',
    system: 'सिस्टम',
  };
  return map[actor] || actor;
}

export function localizeSegment(lang: AppLanguage, seg: string): string {
  if (lang !== 'hi') return seg.replace(/_/g, ' ');
  const map: Record<string, string> = {
    reorder_due: 'रीऑर्डर का समय',
    loyal: 'नियमित ग्राहक',
    regular: 'सामान्य ग्राहक',
    at_risk: 'जोखिम में',
    inactive: 'निष्क्रिय',
    high_udhaar: 'अधिक उधार',
    first_time: 'नया ग्राहक',
  };
  return map[seg] || seg.replace(/_/g, ' ');
}

const DICTIONARY: Record<AppLanguage, Record<string, string>> = {
  en: {
    heroEyebrow: 'Central AI Orchestrator · 5 Specialised AI Teammates',
    heroTitle: 'Meet Your AI Teammates. Get Business Work Done.',
    heroSubtitle:
      'Intelligent AI agents that understand your business, coordinate decisions and execute customer workflows.',
    tryDemoBtn: 'Explore AI Teammates',
    seeHowBtn: 'See How It Works',
    startFreeBtn: 'Get Started',
    demoBanner: 'Demo Mode: Showing sample store data and simulated provider dispatches.',
    liveBanner: 'Live Mode: Connected to your store workspace.',
    navHome: 'Home',
    navTeammates: 'AI Teammates',
    navWorkflows: 'Workflows',
    navCapabilities: 'Capabilities',
    navImpact: 'Impact',
    navPricing: 'Pricing',
    navPartners: 'Integrations',
    navResources: 'Resources',
    navLogin: 'Login',
    navConsole: 'Workspace',
    tabDashboard: 'AI Command Center',
    tabCustomers: 'Customer 360',
    tabOrders: 'Orders',
    tabCod: 'COD Protection',
    tabUdhaar: 'Collections',
    tabAgents: 'AI Teammates',
    tabInbox: 'Action Center',
    tabAnalytics: 'Reports',
    tabSettings: 'Settings',
    tabAutonomy: 'Autonomy Rules',
    tabIntegrations: 'Connected Apps',
    tabImport: 'Upload CSV',
    voicePlaceholder: 'Ask or speak: "Show pending payments" or "Show risky orders"',
    voiceListening: 'Listening...',
    voiceAsk: 'Voice Command',
    approveSend: 'Approve & Send',
    reject: 'Reject',
    snooze: 'Schedule',
    editDraft: 'Edit Message',
    save: 'Save',
    cancel: 'Cancel',
    needApprovalNote: 'Every message waits for your approval unless you turn on auto-send for low-risk tasks.',
  },
  hi: {
    heroEyebrow: 'सेंट्रल AI ऑर्केस्ट्रेटर · 5 विशेषज्ञ AI साथी',
    heroTitle: 'अपने AI साथियों से मिलें। व्यापार का काम पूरा करें।',
    heroSubtitle:
      'समझदार AI एजेंट्स जो आपके व्यापार को समझते हैं, मिलकर निर्णय लेते हैं और ग्राहक कार्य पूरे करते हैं।',
    tryDemoBtn: 'AI साथी देखें',
    seeHowBtn: 'यह कैसे काम करता है',
    startFreeBtn: 'शुरू करें',
    demoBanner: 'डेमो मोड: नमूना दुकान डेटा और सिमुलेटेड संदेश दिखाए जा रहे हैं।',
    liveBanner: 'लाइव मोड: आपकी असली दुकान के खाते से जुड़ा हुआ।',
    navHome: 'होम',
    navTeammates: 'AI साथी',
    navWorkflows: 'वर्कफ़्लो',
    navCapabilities: 'क्षमताएं',
    navImpact: 'प्रभाव',
    navPricing: 'कीमत',
    navPartners: 'ऐप्स',
    navResources: 'गाइड',
    navLogin: 'लॉगिन',
    navConsole: 'वर्कस्पेस',
    tabDashboard: 'AI कमांड सेंटर',
    tabCustomers: 'ग्राहक 360',
    tabOrders: 'ऑर्डर',
    tabCod: 'COD सुरक्षा',
    tabUdhaar: 'उधार वसूली',
    tabAgents: 'AI साथी',
    tabInbox: 'मंजूरी केंद्र',
    tabAnalytics: 'रिपोर्ट्स',
    tabSettings: 'सेटिंग्स',
    tabAutonomy: 'ऑटो नियम',
    tabIntegrations: 'जुड़े ऐप्स',
    tabImport: 'CSV अपलोड',
    voicePlaceholder: 'बोलें या लिखें: "बाकी उधार दिखाओ" या "जोखिम वाले ऑर्डर दिखाओ"',
    voiceListening: 'सुन रहे हैं...',
    voiceAsk: 'वॉइस कमांड',
    approveSend: 'मंजूर करें और भेजें',
    reject: 'अस्वीकार करें',
    snooze: 'शेड्यूल करें',
    editDraft: 'संदेश बदलें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    needApprovalNote: 'आपकी मंजूरी के बिना कोई संदेश नहीं भेजा जाता (जब तक आप ऑटो-सेंड चालू न करें)।',
  },
};

export function t(lang: AppLanguage, key: string): string {
  return DICTIONARY[lang]?.[key] || DICTIONARY.en[key] || key;
}
