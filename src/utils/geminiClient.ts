import { Message, GroundingSource } from '../types.ts';

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
      defaultModel: 'gemini-3.8-flash',
      activeModel: 'gemini-3.8-flash',
      availableModels: [
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Fast & Web Search)', label: 'Gemini 3.8 Flash' },
        { id: 'gemini-flash-latest', name: 'Gemini Flash (Balanced)', label: 'Gemini Flash' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', label: 'Flash-Lite' }
      ]
    };
  }
}

export interface StreamChunkData {
  text?: string;
  sources?: GroundingSource[];
  searchQueries?: string[];
  searching?: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* streamGeminiChat(
  apiKey: string,
  prompt: string,
  history: Message[],
  directive: string,
  model?: string,
  webSearch: boolean = false,
  signal?: AbortSignal,
  uiLanguage: 'tr' | 'en' = 'tr'
): AsyncGenerator<StreamChunkData, void, unknown> {
  const trimmedKey = apiKey?.trim() || '';

  let response: Response | null = null;
  let lastFetchError: Error | null = null;

  // Resilient retry loop on 503 (Model Overloaded) or network congestion
  for (let retry = 0; retry < 3; retry++) {
    try {
      response = await fetch('/api/chat', {
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
          model,
          webSearch,
          uiLanguage
        })
      });

      if (response.status === 503 || response.status === 429) {
        if (retry < 2) {
          await sleep(700 * (retry + 1) + Math.random() * 250);
          continue;
        }
      }

      break;
    } catch (err: any) {
      if (signal?.aborted) throw err;
      lastFetchError = err;
      if (retry < 2) {
        await sleep(500 * (retry + 1));
        continue;
      }
      throw err;
    }
  }

  if (!response) {
    throw (
      lastFetchError ||
      new Error(
        uiLanguage === 'en'
          ? 'Connection could not be established. Please try again.'
          : 'Bağlantı kurulamadı. Lütfen tekrar deneyin.'
      )
    );
  }

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

      const chunkData: StreamChunkData = {};
      let hasData = false;

      if (parsed.searching) {
        chunkData.searching = true;
        hasData = true;
      }

      if (parsed.text) {
        chunkData.text = parsed.text;
        hasData = true;
      }

      if (parsed.sources && Array.isArray(parsed.sources)) {
        chunkData.sources = parsed.sources;
        hasData = true;
      }

      if (parsed.searchQueries && Array.isArray(parsed.searchQueries)) {
        chunkData.searchQueries = parsed.searchQueries;
        hasData = true;
      }

      if (hasData) {
        yield chunkData;
      }
    }
  }
}
