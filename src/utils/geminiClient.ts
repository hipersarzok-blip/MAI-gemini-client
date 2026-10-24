import { Message } from '../types.ts';

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
}

export async function* streamGeminiChat(
  apiKey: string,
  prompt: string,
  history: Message[],
  directive: string,
  model: string = 'gemini-3.1-flash-lite',
  signal?: AbortSignal,
  uiLanguage: 'tr' | 'en' = 'en'
): AsyncGenerator<StreamChunkData, void, unknown> {
  const trimmedKey = apiKey?.trim() || '';

  const response = await fetch('/api/chat', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      apiKey: trimmedKey,
      prompt,
      history,
      directive,
      model: model || 'gemini-3.1-flash-lite',
      uiLanguage
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

      if (parsed.text) {
        yield { text: parsed.text };
      }
    }
  }
}
