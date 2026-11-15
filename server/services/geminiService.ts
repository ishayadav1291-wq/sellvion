import { GoogleGenAI, Type } from '@google/genai';

const VALID_GEMINI_MODEL = 'gemini-4-hydrogen';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
}

function getClient(): GoogleGenAI | null {
  if (!isGeminiConfigured()) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateCustomerMessage(params: {
  customerName: string;
  customerCity?: string;
  productName?: string;
  lastOrderDaysAgo?: number;
  actionType: string;
  tone?: string;
  language?: string;
  udhaarAmount?: number;
  orderId?: string;
  discountText?: string;
}): Promise<{ draft: string; model: string; isAiGenerated: boolean; note?: string }> {
  const fallback = buildDeterministicMessage(params);
  const ai = getClient();
  if (!ai) {
    return {
      draft: fallback,
      model: 'template-engine',
      isAiGenerated: false,
      note: 'Gemini API key not configured; used deterministic template.',
    };
  }

  const languageLabel =
    params.language === 'hi'
      ? 'Simple Hindi (Devanagari)'
      : params.language === 'en'
      ? 'Simple, warm Indian English'
      : 'Natural conversational Hinglish (polite Hindi + English mix)';

  const systemInstruction = `You are SELLVION's Engagement & Copy Agent for Indian retail stores and D2C sellers.
Write respectful, concise WhatsApp messages (2 to 3 short sentences).
Use simple everyday words easy for buyers to understand.
Language requested: ${languageLabel}.
Never invent payment links or fake claims. Keep tone warm, respectful (use 'ji'), and non-spammy.`;

  const prompt = `Draft a message for:
Customer: ${params.customerName} (${params.customerCity || 'India'})
Purpose: ${params.actionType}
Product: ${params.productName || 'Recent purchase'}
Days since last order: ${params.lastOrderDaysAgo ?? 0}
Order ID: ${params.orderId || 'N/A'}
Pending balance: ${params.udhaarAmount ? `₹${params.udhaarAmount}` : 'None'}
Tone: ${params.tone || 'warm_polite'}
Offer details: ${params.discountText || 'None'}
Return only the message text.`;

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: VALID_GEMINI_MODEL,
        contents: prompt,
        config: { systemInstruction },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini request timed out')), 6000)),
    ]);

    const draft = response.text?.trim();
    if (!draft) {
      return { draft: fallback, model: 'template-engine', isAiGenerated: false };
    }
    return { draft, model: VALID_GEMINI_MODEL, isAiGenerated: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gemini call failed';
    return {
      draft: fallback,
      model: 'template-engine',
      isAiGenerated: false,
      note: `Fallback used (${msg})`,
    };
  }
}

export async function generateCopilotAnalysis(params: {
  query: string;
  context: Record<string, unknown>;
  language?: string;
}): Promise<{ reply: string; model: string; isAiGenerated: boolean }> {
  const ai = getClient();
  const fallback = buildDeterministicCopilotReply(params.query, params.context);
  if (!ai) {
    return { reply: fallback, model: 'rule-summary', isAiGenerated: false };
  }

  const systemInstruction = `You are SELLVION's AI Business Teammate helping Indian retail and D2C store owners.
Speak in simple, clear, jargon-free language (${params.language === 'hi' ? 'Hindi' : 'simple everyday English'}).
Only cite facts, customers, orders, and amounts explicitly present in the provided store context JSON.
Never invent metrics, savings, or success percentages.`;

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: VALID_GEMINI_MODEL,
        contents: `Store Context:\n${JSON.stringify(params.context)}\n\nMerchant Question: ${params.query}`,
        config: { systemInstruction },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Copilot timeout')), 6500)),
    ]);

    return {
      reply: response.text?.trim() || fallback,
      model: VALID_GEMINI_MODEL,
      isAiGenerated: true,
    };
  } catch {
    return { reply: fallback, model: 'rule-summary', isAiGenerated: false };
  }
}

export interface ParsedVoiceIntent {
  intent: 'show_udhaar' | 'show_cod_risk' | 'show_reorders' | 'show_orders' | 'prepare_reminders' | 'open_approvals' | 'unknown';
  targetTab: 'dashboard' | 'udhaar' | 'cod-risk' | 'customers' | 'inbox' | 'agents' | 'orders';
  summary: string;
  requiresConfirmation: boolean;
  suggestedWorkflow?: 'reactivation' | 'cod_protection' | 'udhaar_collection';
}

export async function parseVoiceCommand(transcript: string): Promise<ParsedVoiceIntent> {
  const lower = transcript.toLowerCase();

  // Fast deterministic matching for reliability & low latency
  if (lower.includes('udhaar') || lower.includes('pending') || lower.includes('payment') || lower.includes('due') || lower.includes('khata') || lower.includes('बाकी') || lower.includes('బాకీ')) {
    return {
      intent: lower.includes('send') || lower.includes('remind') ? 'prepare_reminders' : 'show_udhaar',
      targetTab: 'udhaar',
      summary: lower.includes('send') || lower.includes('remind')
        ? 'Prepare polite payment reminders for overdue udhaar customers for your approval.'
        : 'Open pending customer udhaar payments.',
      requiresConfirmation: lower.includes('send') || lower.includes('remind'),
      suggestedWorkflow: lower.includes('send') || lower.includes('remind') ? 'udhaar_collection' : undefined,
    };
  }

  if (lower.includes('risk') || lower.includes('cod') || lower.includes('return') || lower.includes('rto') || lower.includes('ऑर्डर')) {
    return {
      intent: 'show_cod_risk',
      targetTab: 'cod-risk',
      summary: 'Open orders that may be returned.',
      requiresConfirmation: false,
      suggestedWorkflow: 'cod_protection',
    };
  }

  if (lower.includes('order')) {
    return {
      intent: 'show_orders',
      targetTab: 'orders',
      summary: 'Open all store orders.',
      requiresConfirmation: false,
    };
  }

  if (lower.includes('inactive') || lower.includes('haven\'t purchased') || lower.includes('reorder') || lower.includes('reminder') || lower.includes('stopped')) {
    return {
      intent: 'prepare_reminders',
      targetTab: 'customers',
      summary: 'Prepare follow-up messages for customers who have not purchased recently (requires your approval before sending).',
      requiresConfirmation: true,
      suggestedWorkflow: 'reactivation',
    };
  }

  if (lower.includes('approv') || lower.includes('inbox') || lower.includes('action')) {
    return {
      intent: 'open_approvals',
      targetTab: 'inbox',
      summary: 'Open Action Center.',
      requiresConfirmation: false,
    };
  }

  const ai = getClient();
  if (!ai) {
    return {
      intent: 'unknown',
      targetTab: 'dashboard',
      summary: `Could not match "${transcript}" to a specific command. Try "Show pending customer payments" or "Show today's risky orders".`,
      requiresConfirmation: false,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: VALID_GEMINI_MODEL,
      contents: `Classify this merchant voice command: "${transcript}"`,
      config: {
        systemInstruction: 'Map the merchant voice command into one of the structured intents for SELLVION.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: 'One of: show_udhaar, show_cod_risk, show_reorders, prepare_reminders, open_approvals, unknown',
            },
            targetTab: {
              type: Type.STRING,
              description: 'One of: dashboard, udhaar, cod-risk, customers, inbox, agents',
            },
            summary: { type: Type.STRING },
            requiresConfirmation: { type: Type.BOOLEAN },
          },
        },
      },
    });
    const parsed = JSON.parse(response.text || '{}') as Partial<ParsedVoiceIntent>;
    return {
      intent: parsed.intent || 'unknown',
      targetTab: parsed.targetTab || 'dashboard',
      summary: parsed.summary || 'Open dashboard',
      requiresConfirmation: Boolean(parsed.requiresConfirmation),
    };
  } catch {
    return {
      intent: 'unknown',
      targetTab: 'dashboard',
      summary: `Could not process "${transcript}". Please try a simpler command.`,
      requiresConfirmation: false,
    };
  }
}

function buildDeterministicMessage(params: {
  customerName: string;
  productName?: string;
  lastOrderDaysAgo?: number;
  actionType: string;
  language?: string;
  udhaarAmount?: number;
  orderId?: string;
}): string {
  const name = params.customerName || 'ji';
  if (params.language === 'hi') {
    if (params.actionType === 'udhaar_reminder') {
      return `नमस्ते ${name} जी! आपका ₹${params.udhaarAmount || 0} का बकाया भुगतान लंबित है। कृपया सुविधा अनुसार भुगतान कर दें। धन्यवाद!`;
    }
    if (params.actionType === 'cod_prepay' || params.actionType === 'cod_verify') {
      return `नमस्ते ${name} जी! आपका ऑर्डर ${params.orderId || ''} भेजने के लिए तैयार है। कृपया डिलीवरी पता कन्फर्म करें।`;
    }
    return `नमस्ते ${name} जी! आपका पसंदीदा ${params.productName || 'सामान'} लगभग समाप्त हो रहा होगा। क्या हम नया पैक भेजें?`;
  }

  if (params.actionType === 'cod_prepay') {
    return `Namaste ${name} ji! 🙏 Your order ${params.orderId || ''} is packed. Please confirm your full house/flat address, or reply if you would like a UPI prepayment link.`;
  }
  if (params.actionType === 'cod_verify') {
    return `Namaste ${name} ji! 🙏 Before we dispatch order ${params.orderId || ''}, please reply "CONFIRM" with your house/flat number so delivery is smooth.`;
  }
  if (params.actionType === 'udhaar_reminder') {
    return `Namaste ${name} ji! 🙏 Friendly reminder that ₹${(params.udhaarAmount || 0).toLocaleString('en-IN')} is pending on your khata account. Please clear when convenient. Thank you!`;
  }
  if (params.actionType === 'winback_offer') {
    return `Namaste ${name} ji! 🌿 We missed you at our store. Fresh stock of ${params.productName || 'your favorite items'} is in — reply YES to reorder anytime.`;
  }
  return `Namaste ${name} ji! 🙏 Hope you are doing well. Your ${params.productName || 'regular order'} (~${params.lastOrderDaysAgo || 28} days ago) may be running low. Should we dispatch a fresh pack?`;
}

function buildDeterministicCopilotReply(query: string, context: Record<string, unknown>): string {
  const customersCount = Number(context.totalCustomers ?? 0);
  const dueReorders = Array.isArray(context.dueForReorder) ? context.dueForReorder : [];
  const highRiskOrders = Array.isArray(context.highRiskOrders) ? context.highRiskOrders : [];
  const overdueUdhaar = Array.isArray(context.overdueUdhaar) ? context.overdueUdhaar : [];
  const totalUdhaar = overdueUdhaar.reduce((sum: number, item: { amount?: number }) => sum + (item.amount || 0), 0);

  if (query.toLowerCase().includes('udhaar') || query.toLowerCase().includes('overdue')) {
    return overdueUdhaar.length
      ? `You have ${overdueUdhaar.length} customer(s) with pending udhaar totalling ₹${totalUdhaar.toLocaleString('en-IN')}. You can review or prepare polite reminders in Udhaar & Collections.`
      : 'There are currently zero overdue udhaar balances in your store records.';
  }
  if (query.toLowerCase().includes('cod') || query.toLowerCase().includes('risk')) {
    return highRiskOrders.length
      ? `${highRiskOrders.length} COD order(s) are currently flagged for verification before dispatch. Open COD RTO Protection to inspect the reasons and verify addresses.`
      : 'No high-risk COD orders are currently flagged.';
  }
  return `Store Summary (${customersCount} customers): ${dueReorders.length} customer(s) are in their reorder window, ${highRiskOrders.length} COD order(s) need verification, and ${overdueUdhaar.length} udhaar account(s) have ₹${totalUdhaar.toLocaleString('en-IN')} pending.`;
}
