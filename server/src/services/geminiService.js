export class GeminiService {
  static getApiKey() {
    return process.env.GEMINI_API_KEY || '';
  }

  static isConfigured() {
    const key = this.getApiKey();
    return Boolean(key && key.length > 5);
  }

  /**
   * Calls Google Gemini REST API to generate conversational text
   */
  static async generateText({ prompt, systemInstruction = '', fallbackText = '' }) {
    const apiKey = this.getApiKey();
    if (!apiKey) return fallbackText;

    try {
      // Direct Google Gemini Flash endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn('Gemini API returned error status:', res.status, errorData.error?.message || errorData);
        return fallbackText;
      }

      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return candidateText ? candidateText.trim() : fallbackText;
    } catch (err) {
      console.warn('GeminiService fallback triggered:', err.message);
      return fallbackText;
    }
  }

  /**
   * Generates natural language explanation for negotiation terms
   */
  static async draftNegotiationNote({ role, offerCents, listPriceCents, counterCents, fallback }) {
    const prompt = `You are a professional AI e-commerce agent (${role}).
The item list price is $${(listPriceCents / 100).toFixed(2)}.
The proposed offer is $${(offerCents / 100).toFixed(2)}.
${counterCents ? `The calculated counter-offer is $${(counterCents / 100).toFixed(2)}.` : ''}
Write one single polite, concise sentence explaining this offer or counter-offer to the other agent.`;

    return this.generateText({
      prompt,
      systemInstruction: 'Provide only 1 concise, professional sentence.',
      fallbackText: fallback,
    });
  }
}
