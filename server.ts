import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

/**
 * Formats the system directive with strict persona adherence AND mandatory user-language matching.
 * When no custom directive or roleplay persona is active, acts as a normal helpful assistant without roleplaying.
 */
function formatEnforcedDirective(rawDirective?: string, latestUserPrompt?: string): string {
  const trimmed = rawDirective?.trim() || '';
  const samplePrompt = (latestUserPrompt || '').trim().slice(0, 200);

  if (!trimmed) {
    return `You are a helpful, accurate, and natural AI assistant.
1. Always respond in the exact same language as the user's latest message ("${samplePrompt}"). If the user writes in English, respond 100% in English. If the user writes in Turkish, respond 100% in Turkish.
2. Answer directly and conversationally as an AI assistant. Do NOT roleplay, adopt a fictional persona, or write physical actions inside *asterisks* unless the user explicitly asks you to roleplay in their message.`;
  }

  return `[CRITICAL LANGUAGE MATCHING LAW — HIGHEST PRIORITY]
1. Detect the language of the user's latest message: "${samplePrompt}".
2. You MUST write 100% of your response in the EXACT SAME LANGUAGE that the user used in their latest message!
3. Even if the directive, character profile, rules, or opening greeting below are written in Turkish (or English), COMPLETELY IGNORE the language of the profile sheet and translate your response naturally into the user's language:
   - If the user writes in English -> Respond 100% in English.
   - If the user writes in Turkish -> Respond 100% in Turkish.
   - Never mix Turkish narration with English dialogue or vice versa unless the user explicitly asks you to.

[STRICT SYSTEM DIRECTIVE PROTOCOL]
The <DIRECTIVE> block below defines your core identity, character, rules, and behavior. Follow it with 100% fidelity in every message while speaking in the user's language:

<DIRECTIVE>
${trimmed}
</DIRECTIVE>

MANDATORY EXECUTION LAWS:
1. LANGUAGE LOCK: Always respond in the exact language of the user's latest message ("${samplePrompt}").
2. IDENTITY & STYLE LOCK (ZERO DRIFT): Never drift from the character, tone, vocabulary, emotional flaws, and rules defined in the directive regardless of conversation length.
3. FOURTH WALL PROTECTION: If the directive defines a roleplay character or persona, never say "As an AI", "As a language model", or "How can I help you today?". Stay completely in-character at all times.
4. ROLEPLAY SCENE FORMAT: If the directive is a roleplay persona, write physical actions, gestures, gazes, tone shifts, and inner feelings inside *asterisks*, and write spoken dialogue naturally.
5. NO GODMODING: Never dictate what the user says, thinks, or does; only enact your own character or role.`;
}

function getGenAIClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

/**
 * Resolves UI model IDs to real, fast Gemini API model endpoints with multi-bucket failover
 * so 429 rate-limit or 503 server-busy spikes on one bucket seamlessly fail over to another.
 */
function buildModelFailoverChain(requestedModel?: string): string[] {
  const req = (requestedModel || 'gemini-3.1-flash-lite').trim();

  let primary = 'gemini-3.1-flash-lite-preview';
  if (req === 'gemini-3.1-flash-lite' || req === 'gemini-3.1-flash-lite-preview') {
    primary = 'gemini-3.1-flash-lite-preview';
  } else if (req === 'gemini-3.8-flash' || req === 'gemini-3-flash-preview') {
    primary = 'gemini-3-flash-preview';
  } else if (req === 'gemini-flash-latest' || req === 'gemini-2.5-flash') {
    primary = 'gemini-2.5-flash';
  } else {
    primary = req;
  }

  const chain = [
    primary,
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
    'gemini-flash-latest'
  ];

  return chain.filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);
}

/**
 * Normalizes multi-turn chat history into strictly compliant Gemini contents:
 * 1. Must alternate strictly: user -> model -> user -> model ...
 * 2. Must start with role: 'user' (discards leading model greetings/bot starters)
 * 3. Merges consecutive messages with the same role into a single message
 * 4. Discards past error notices or empty response notices to keep context clean
 * 5. Appends the new prompt as the final user message
 */
function buildCompliantGeminiContents(history: any[], prompt: string): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const validMessages: Array<{ role: 'user' | 'model'; text: string }> = [];

  for (const m of history || []) {
    if (!m || typeof m.text !== 'string') continue;
    const text = m.text.trim();
    if (!text) continue;

    const lower = text.toLowerCase();
    if (
      text.startsWith('Error: ') ||
      text.startsWith('Hata: ') ||
      text === 'No response returned.' ||
      lower.includes('yanıt üretilemedi') ||
      lower.includes('cevap üretilemedi') ||
      lower.includes('yanıtı tamamlayamadı') ||
      lower.includes('no response was generated') ||
      lower.includes('no response received') ||
      lower.includes('could not complete a response') ||
      lower.includes('kota / istek limiti') ||
      lower.includes('model yoğunluğu') ||
      lower.includes('bağlantı gecikmesi yaşandı') ||
      lower.includes('temporary delay generating') ||
      lower.includes('brief connection delay') ||
      lower.includes('rate limit') ||
      lower.includes('hız limiti') ||
      lower.includes('model busy') ||
      lower.includes('hata 503') ||
      lower.includes('hata 429')
    ) {
      continue;
    }

    const role: 'user' | 'model' = (m.role === 'user' || m.role === 'human') ? 'user' : 'model';
    validMessages.push({ role, text });
  }

  // Keep up to 10 recent turns for fast first-token latency and low token usage
  const sliced = validMessages.slice(-10);

  while (sliced.length > 0 && sliced[0].role === 'model') {
    sliced.shift();
  }

  const alternating: Array<{ role: 'user' | 'model'; text: string }> = [];
  for (const item of sliced) {
    if (alternating.length === 0) {
      if (item.role === 'user') {
        alternating.push({ ...item });
      }
    } else {
      const last = alternating[alternating.length - 1];
      if (last.role === item.role) {
        last.text = `${last.text}\n\n${item.text}`;
      } else {
        alternating.push({ ...item });
      }
    }
  }

  const cleanPrompt = prompt.trim();
  if (alternating.length === 0) {
    alternating.push({ role: 'user', text: cleanPrompt });
  } else {
    const last = alternating[alternating.length - 1];
    if (last.role === 'user') {
      last.text = `${last.text}\n\n${cleanPrompt}`;
    } else {
      alternating.push({ role: 'user', text: cleanPrompt });
    }
  }

  return alternating.map((item) => ({
    role: item.role,
    parts: [{ text: item.text }]
  }));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });

  app.get('/api/key-status', (_req, res) => {
    const envKey = process.env.GEMINI_API_KEY;
    const hasValidEnvKey = Boolean(envKey && envKey.trim() !== '' && envKey !== 'MY_GEMINI_API_KEY');
    res.json({ hasEnvKey: hasValidEnvKey });
  });

  // Default model is gemini-3.1-flash-lite for ultra-fast responses
  app.get('/api/model-info', (_req, res) => {
    res.json({
      defaultModel: 'gemini-3.1-flash-lite',
      activeModel: 'gemini-3.1-flash-lite',
      availableModels: [
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Default)', label: 'Gemini 3.1 Flash Lite' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', label: 'Gemini 3.8 Flash' },
        { id: 'gemini-flash-latest', name: 'Gemini Flash', label: 'Gemini Flash' }
      ]
    });
  });

  // Ultra-fast streaming endpoint for Gemini chat with multi-bucket rate-limit failover
  app.post('/api/chat', async (req, res) => {
    let heartbeat: NodeJS.Timeout | null = null;
    try {
      const { apiKey: customKey, prompt, history, directive, model: requestedModel, uiLanguage } = req.body;
      const isEn = uiLanguage !== 'tr';
      const envKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
        ? process.env.GEMINI_API_KEY.trim()
        : '';
      const trimmedCustomKey = (customKey && typeof customKey === 'string') ? customKey.trim() : '';

      // Build list of candidate API keys (try user's custom key first if provided, then fallback to server envKey)
      const candidateKeys = [trimmedCustomKey, envKey].filter((k, idx, self) => Boolean(k) && self.indexOf(k) === idx);

      if (candidateKeys.length === 0) {
        return res.status(400).json({
          error: isEn
            ? 'Gemini API key not found. Please enter your API key in Settings (⚙️) at the top right.'
            : 'Gemini API anahtarı bulunamadı. Lütfen sağ üstteki Ayarlar (⚙️) menüsünden API anahtarınızı girin.'
        });
      }

      const contents = buildCompliantGeminiContents(history, prompt);

      // Zero-buffering SSE headers
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform, private');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Content-Encoding', 'none');
      res.flushHeaders();

      res.write(': ping\n\n');
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }

      heartbeat = setInterval(() => {
        if (!res.writableEnded) {
          res.write(': heartbeat\n\n');
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        }
      }, 2000);

      const fallbackModels = buildModelFailoverChain(requestedModel);
      const sysInstruction = formatEnforcedDirective(directive, prompt);

      const config: Record<string, unknown> = {
        temperature: 0.8,
        systemInstruction: sysInstruction,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      };

      let lastError: unknown = null;
      let totalStreamedTextLength = 0;

      // Try candidate API keys and model buckets seamlessly
      for (const activeKey of candidateKeys) {
        if (totalStreamedTextLength > 0) break;
        const ai = getGenAIClient(activeKey);

        for (let i = 0; i < fallbackModels.length; i++) {
          if (totalStreamedTextLength > 0) break;
          const modelToTry = fallbackModels[i];

          try {
            const responseStream = await withTimeout(
              ai.models.generateContentStream({
                model: modelToTry,
                contents,
                config
              }),
              12000,
              `generateContentStream(${modelToTry})`
            );

            for await (const chunk of responseStream) {
              let chunkText = '';
              try {
                chunkText = chunk.text || '';
              } catch {
                chunkText = '';
              }

              if (!chunkText && (chunk as any).candidates?.[0]?.content?.parts) {
                for (const part of (chunk as any).candidates[0].content.parts) {
                  if (typeof part.text === 'string' && part.text && !part.thought) {
                    chunkText += part.text;
                  }
                }
              }

              if (chunkText) {
                totalStreamedTextLength += chunkText.length;
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                if (typeof (res as any).flush === 'function') {
                  (res as any).flush();
                }
              }
            }

            if (totalStreamedTextLength > 0) {
              break;
            }
          } catch (err: unknown) {
            lastError = err;
            if (totalStreamedTextLength > 0) {
              break;
            }
            const errMsg = String((err as Error)?.message || '');
            // If invalid API key (400/403), break out of model loop to try next candidate key if available
            if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')) {
              break;
            }
            // If rate limit (429) or busy (503), wait a short 250ms before trying the next model bucket
            if (errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('UNAVAILABLE')) {
              await sleep(250);
            }
            continue;
          }
        }

        // Non-streaming fallback if stream yielded 0 characters
        if (totalStreamedTextLength === 0) {
          for (const modelToTry of ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite-preview']) {
            if (totalStreamedTextLength > 0) break;
            try {
              const directRes = await withTimeout(
                ai.models.generateContent({
                  model: modelToTry,
                  contents,
                  config: config as any
                }),
                10000,
                `generateContent(${modelToTry})`
              );

              let directText = '';
              try {
                directText = directRes.text || '';
              } catch {
                directText = '';
              }
              if (!directText && (directRes as any).candidates?.[0]?.content?.parts) {
                for (const part of (directRes as any).candidates[0].content.parts) {
                  if (typeof part.text === 'string' && part.text && !part.thought) {
                    directText += part.text;
                  }
                }
              }

              if (directText && directText.trim().length > 0) {
                totalStreamedTextLength += directText.length;
                res.write(`data: ${JSON.stringify({ text: directText })}\n\n`);
                if (typeof (res as any).flush === 'function') {
                  (res as any).flush();
                }
                break;
              }
            } catch (fallbackErr) {
              lastError = fallbackErr;
            }
          }
        }
      }

      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      if (totalStreamedTextLength === 0 && lastError) {
        throw lastError;
      }

      if (totalStreamedTextLength === 0) {
        const fallbackNotice = isEn
          ? 'Sorry, there was a brief connection delay while generating the response. Please send your message again.'
          : 'Üzgünüm, şu anda yanıt oluşturulurken kısa süreli bir bağlantı gecikmesi yaşandı. Lütfen mesajınızı tekrar gönderebilir misiniz?';
        res.write(`data: ${JSON.stringify({ text: fallbackNotice })}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: unknown) {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      console.error('Gemini call error:', err);
      const isEn = req.body?.uiLanguage !== 'tr';
      const rawMessage = (err as Error)?.message || 'Failed to call Gemini API';

      let userFriendlyMessage = rawMessage;
      if (rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('overloaded') || rawMessage.includes('high demand') || rawMessage.includes('TIMEOUT')) {
        userFriendlyMessage = isEn
          ? 'Servers are momentarily busy. Please click Retry or send your message again.'
          : 'Sunucular şu an yoğun. Lütfen Tekrar Dene butonuna tıklayın veya mesajınızı yeniden gönderin.';
      } else if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('quota')) {
        userFriendlyMessage = isEn
          ? 'API quota reached for this key. Please wait a few seconds or add a personal Gemini API key in Settings (⚙️).'
          : 'API hız limitine ulaşıldı. Lütfen birkaç saniye bekleyin veya Ayarlar (⚙️) menüsünden kendi API anahtarınızı ekleyin.';
      } else if (rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('403')) {
        userFriendlyMessage = isEn
          ? 'Access Denied (403): Please check your Gemini API key in Settings (⚙️).'
          : 'Erişim Reddedildi (403): Lütfen Ayarlar (⚙️) menüsünden Gemini API anahtarınızı kontrol edin.';
      } else if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('400')) {
        userFriendlyMessage = isEn
          ? 'Invalid API Key: Please verify or clear your custom Gemini API key in Settings (⚙️).'
          : 'Geçersiz API Anahtarı: Lütfen Ayarlar (⚙️) menüsündeki API anahtarınızı kontrol edin veya temizleyin.';
      }

      if (!res.headersSent) {
        res.status(500).json({ error: userFriendlyMessage });
      } else {
        res.write(`data: ${JSON.stringify({ error: userFriendlyMessage })}\n\n`);
        res.end();
      }
    }
  });

  const distPath = path.resolve(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(distPath, 'index.html'));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`mAI server listening on port ${PORT}`);
  });
}

startServer();
