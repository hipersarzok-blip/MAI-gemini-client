import { GroundingSource, Message, MessageAttachment } from '../types.ts';

export async function checkServerKeyStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/key-status');
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.hasEnvKey);
  } catch {
    return false;
  }
}

export async function verifyGeminiApiKey(
  apiKey: string,
  uiLanguage: 'tr' | 'en' = 'tr'
): Promise<{
  valid: boolean;
  workingModel?: string;
  keyCount?: number;
  sanitizedKey?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, uiLanguage })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.valid) {
      return {
        valid: false,
        error:
          data.error ||
          (uiLanguage === 'en' ? 'Could not verify API key.' : 'API anahtarı doğrulanamadı.')
      };
    }
    return data;
  } catch (err: any) {
    return {
      valid: false,
      error:
        err?.message ||
        (uiLanguage === 'en' ? 'Connection error during verification.' : 'Doğrulama sırasında bağlantı hatası.')
    };
  }
}

export interface ModelInfo {
  defaultModel: string;
  activeModel: string;
  availableModels: {
    id: string;
    name: string;
    label: string;
  }[];
}

export async function fetchModelInfo(): Promise<ModelInfo> {
  try {
    const res = await fetch('/api/model-info');
    if (!res.ok) throw new Error('Failed to fetch model info');
    return await res.json();
  } catch {
    return {
      defaultModel: 'gemini-3.1-flash-lite',
      activeModel: 'gemini-3.1-flash-lite',
      availableModels: [
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Default)', label: 'Gemini 3.1 Flash Lite' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', label: 'Gemini 3.8 Flash' },
        { id: 'gemini-flash-latest', name: 'Gemini Flash', label: 'Gemini Flash' }
      ]
    };
  }
}

export interface StreamChunkData {
  text?: string;
  sources?: GroundingSource[];
  searchQueries?: string[];
}

export async function* streamGeminiChat(
  apiKey: string,
  prompt: string,
  history: Message[],
  directive: string,
  model: string = 'gemini-3.1-flash-lite',
  signal?: AbortSignal,
  uiLanguage: 'tr' | 'en' = 'en',
  attachments?: MessageAttachment[]
): AsyncGenerator<StreamChunkData, void, unknown> {
  const trimmedKey = apiKey?.trim() || '';

  // Send the full conversation history in the background (only keep heavy binary base64 on the last 2 messages so payload stays fast)
  const totalHistory = history || [];
  const compactHistory = totalHistory.map((m, idx) => {
    const isRecentBinaryTurn = idx >= totalHistory.length - 2;
    return {
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      text: m.text,
      timestamp: m.timestamp,
      attachments: m.attachments
        ? m.attachments.map(({ previewUrl, data, ...rest }) =>
            isRecentBinaryTurn ? { ...rest, data } : rest
          )
        : undefined
    };
  });

  const compactAttachments =
    attachments && attachments.length > 0
      ? attachments.map(({ previewUrl, ...rest }) => rest)
      : undefined;

  const response = await fetch('/api/chat', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      apiKey: trimmedKey,
      prompt,
      history: compactHistory,
      directive,
      model: model || 'gemini-3.1-flash-lite',
      uiLanguage,
      attachments: compactAttachments
    })
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    const msg =
      errorJson?.error ||
      (uiLanguage === 'en'
        ? `Request failed (Error ${response.status})`
        : `İstek başarısız oldu (Hata ${response.status})`);
    throw new Error(msg);
  }

  if (!response.body) {
    throw new Error(
      uiLanguage === 'en'
        ? 'ReadableStream is not supported in this browser.'
        : 'ReadableStream bu tarayıcıda desteklenmiyor.'
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') {
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(dataStr);
      } catch {
        continue;
      }

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      if (parsed.text || parsed.sources || parsed.searchQueries) {
        yield {
          text: parsed.text,
          sources: Array.isArray(parsed.sources) ? parsed.sources : undefined,
          searchQueries: Array.isArray(parsed.searchQueries) ? parsed.searchQueries : undefined
        };
      }
    }
  }
}
