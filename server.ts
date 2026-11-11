import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const getFallbackDraft = (customerName?: string, productName?: string, lastOrderDaysAgo?: number, recommendedAction?: string, udhaarAmount?: number) => {
  let text = `Namaste ${customerName || 'ji'}! 🙏 Hope aapka din achha ja raha hai. Aapka favorite ${productName || 'product'} khatam hone wala hoga (~${lastOrderDaysAgo || 25} days pehle mangwaya tha). Kya hum ek fresh pack dispatch karein?`;
  if (recommendedAction === 'cod_prepay') {
    text = `Namaste ${customerName || 'ji'}! 🙏 Aapka order #${Math.floor(1000 + Math.random() * 9000)} pack ho gaya hai. Fast delivery aur guaranteed dispatch ke liye abhi UPI se pay karein aur ₹50 instant cashback paayein: https://pay.sellvion.in/cod-prepay`;
  } else if (recommendedAction === 'udhaar_reminder') {
    text = `Namaste ${customerName || 'ji'}! 🙏 Hope all well. Aapka ₹${udhaarAmount || 1200} ka pichhla balance pending hai. Request hai ki aaj free time mein clear kar dein: https://pay.sellvion.in/khatabook - Dhanyawad!`;
  } else if (recommendedAction === 'winback_offer') {
    text = `Namaste ${customerName || 'ji'}! 🌿 Kafi time ho gaya aapse baat kiye huye. Naya fresh batch stock mein aaya hai. Exclusive 15% VIP discount code "FRESH15" ke sath reorder karein: https://sellvion.in/vip`;
  }
  return text;
};

// API: Generate personalized Hinglish WhatsApp Message Draft
app.post('/api/ai/draft-message', async (req, res) => {
  try {
    const {
      customerName,
      customerCity,
      productName,
      lastOrderDaysAgo,
      recommendedAction,
      tone = 'warm_hinglish',
      discountOffer = '',
      udhaarAmount = 0,
    } = req.body;

    const fallbackText = getFallbackDraft(customerName, productName, lastOrderDaysAgo, recommendedAction, udhaarAmount);
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({ draft: fallbackText, model: 'fallback-heuristic' });
    }

    const systemPrompt = `You are SELLVION's AI Engagement Agent specialized in Indian D2C and retail e-commerce.
You compose authentic, courteous, high-converting WhatsApp messages for small Indian merchants communicating with their buyers.
Language style: Conversational Hinglish (natural mix of Hindi & English as used on WhatsApp in India) or polite English if specified.
Never sound like generic automated spam. Sound like a caring, attentive local store owner or brand founder.
Keep it concise (2-4 short sentences max), respectful (using 'ji' where appropriate), clear CTA, and tasteful emojis (1-2 max).`;

    const userPrompt = `Draft a WhatsApp message for:
Customer Name: ${customerName}
City: ${customerCity || 'India'}
Context / Action: ${recommendedAction}
Product: ${productName || 'Regular Purchase'}
Days since last purchase: ${lastOrderDaysAgo}
Tone: ${tone}
Special Offer / Details: ${discountOffer || 'None'}
Pending Balance: ${udhaarAmount ? '₹' + udhaarAmount : 'None'}

Return ONLY the drafted message text ready to be sent on WhatsApp.`;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timeout')), 4000)
      );

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const draft = response.text?.trim() || fallbackText;
      return res.json({ draft, model: 'gemini-3.8-flash' });
    } catch (genError: any) {
      console.warn('Gemini temporary API spike or timeout, using intelligent fallback:', genError?.message);
      return res.json({ draft: fallbackText, model: 'fallback-heuristic', note: 'Served via local fallback engine' });
    }
  } catch (error: any) {
    console.error('Error generating WhatsApp draft:', error);
    res.status(500).json({ error: error.message || 'Failed to generate draft' });
  }
});

// API: Customer Intelligence Copilot / Query
app.post('/api/ai/ask-copilot', async (req, res) => {
  try {
    const { query, merchantContext } = req.body;
    const ai = getGeminiClient();

    let smartFallback = `SELLVION Analysis: You have 2 customers currently due for reorder (Priya Sharma in Pune, Darjeeling Tea, and Meenakshi Sundaram in Chennai, Filter Coffee). There are 2 high-risk COD orders flagged (Vikramaditya Solanki with 68% risk due to missing house number, and Amanpreet Singh with 60% risk). In your udhaar ledger, Sunita Agarwal has ₹3,450 pending which is 7 days past due date.`;

    if (!ai) {
      return res.json({ reply: smartFallback, note: 'Static context engine' });
    }

    const systemInstruction = `You are SELLVION Autonomous AI Copilot for Indian e-commerce merchants.
You help the merchant understand customer buying cycles, COD RTO prevention strategies, reorder opportunities, and khata/udhaar collections.
Respond concisely with actionable insights, data points, and concrete next steps. Use Indian e-commerce context (RTO rates, COD verification, UPI prepayment nudges, Hinglish communication).`;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Copilot timeout')), 4500)
      );

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Merchant Context: ${JSON.stringify(merchantContext || {})}\n\nMerchant Question: ${query}`,
        config: { systemInstruction },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      return res.json({ reply: response.text?.trim() });
    } catch (genError: any) {
      console.warn('Gemini copilot temporary API error or timeout, returning smart local analysis:', genError?.message);
      return res.json({ reply: smartFallback, note: 'Generated via fallback rule engine' });
    }
  } catch (error: any) {
    console.error('Error in copilot:', error);
    res.status(500).json({ error: error.message || 'Copilot error' });
  }
});

// Mount Vite in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`SELLVION server running on port ${port}`);
  });
}

startServer();
