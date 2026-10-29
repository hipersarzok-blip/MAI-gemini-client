import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 3000;

/**
 * Formats the system directive with strict persona adherence AND mandatory user-language matching.
 * When no custom directive or roleplay persona is active, acts as a normal helpful assistant without roleplaying.
 */
function formatEnforcedDirective(rawDirective?: string, latestUserPrompt?: string): string {
  const trimmed = rawDirective?.trim() || '';
  const samplePrompt = (latestUserPrompt || '').trim().slice(0, 200);

  if (!trimmed) {
    return `You are a helpful, accurate, and natural AI assistant with live Google Search access (current year: 2026).
1. Always respond in the exact same language as the user's latest message ("${samplePrompt}"). If the user writes in English, respond 100% in English. If the user writes in Turkish, respond 100% in Turkish.
2. Answer directly, thoroughly, and conversationally as an AI assistant.
3. REAL-TIME INTERNET & MEME/TREND RESEARCH: You have live Google Search access. Whenever the user asks you to research ("araştır"), or asks about a current/viral meme, internet trend, slang, recent event, news, person, or anything from 2024–2026, ALWAYS use your Google Search tool to look it up on the live web (KnowYourMeme, Reddit, social media, news, etc.) and explain its origin, meaning, and context clearly. NEVER say your knowledge stops in 2023 or 2024.
4. STRICT RULE: Do NOT roleplay, adopt a fictional persona, or write physical actions/narration inside *asterisks* unless the user explicitly asks you to roleplay in their message.
5. When the user sends multiple images, screenshots, or code files (either in one message or across consecutive messages), analyze EVERY single image and code file thoroughly one by one without skipping or stopping after the first one.`;
  }

  const isRoleplayDirective = trimmed.includes('[HYPER-REALISTIC ROLEPLAY ENGINE DIRECTIVE]');

  if (!isRoleplayDirective) {
    return `[CRITICAL LANGUAGE MATCHING LAW — HIGHEST PRIORITY]
1. Detect the language of the user's latest message: "${samplePrompt}".
2. You MUST write 100% of your response in the EXACT SAME LANGUAGE that the user used in their latest message!

[SYSTEM DIRECTIVE]
<DIRECTIVE>
${trimmed}
</DIRECTIVE>

MANDATORY EXECUTION RULES:
1. LANGUAGE LOCK: Always respond in the exact language of the user's latest message.
2. REAL-TIME GOOGLE SEARCH ACCESS (CURRENT YEAR: 2026): You have live Google Search access. When the user asks to research ("araştır") or asks about current events, viral memes, trends, recent technologies, or real-time facts, use Google Search to retrieve up-to-date web information. Never claim a 2023/2024 cutoff.
3. STRICT NON-ROLEPLAY RULE: Follow the instructions and expertise in <DIRECTIVE> strictly as an AI assistant/expert. Do NOT roleplay, do NOT invent fictional scenes, and do NOT write physical actions inside *asterisks* unless the user explicitly asks for roleplay.
4. MULTI-FILE & MULTI-IMAGE COMPLETENESS: If the user provides multiple images or code files, analyze ALL of them completely one by one without stopping after the first.`;
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
3. FOURTH WALL PROTECTION: Never say "As an AI", "As a language model", or "How can I help you today?". Stay completely in-character at all times.
4. ROLEPLAY SCENE FORMAT: Write physical actions, gestures, gazes, tone shifts, and inner feelings inside *asterisks*, and write spoken dialogue naturally.
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

function parseApiKeys(raw?: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!cleaned || cleaned === 'MY_GEMINI_API_KEY') return [];
  const matches = cleaned.match(/AIza[a-zA-Z0-9_-]{30,}/g);
  if (matches && matches.length > 0) {
    return Array.from(new Set(matches.map((k) => k.trim())));
  }
  return Array.from(
    new Set(
      cleaned
        .split(/[\s,;]+/)
        .map((t) => t.replace(/^["'`]+|["'`]+$/g, '').trim())
        .filter((k) => k.length > 10 && k !== 'MY_GEMINI_API_KEY')
    )
  );
}

// Tracks models that recently returned 503 (overloaded) or 429 so subsequent requests skip them for 30s
const modelCooldownUntil = new Map<string, number>();

function markModelUnhealthy(modelId: string, durationMs = 30_000) {
  modelCooldownUntil.set(modelId, Date.now() + durationMs);
}

function isModelHealthy(modelId: string): boolean {
  const until = modelCooldownUntil.get(modelId);
  if (!until) return true;
  if (Date.now() > until) {
    modelCooldownUntil.delete(modelId);
    return true;
  }
  return false;
}

/**
 * Resolves UI model IDs to full-intelligence Gemini API model endpoints with automatic 503/429 failover.
 * Never downgrades reasoning quality; only fails over to the next high-capability model if a bucket returns 503/429.
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

  const baseChain = [
    primary,
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite'
  ];

  const unique = baseChain.filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);
  const healthy = unique.filter((m) => isModelHealthy(m));
  const cooling = unique.filter((m) => !isModelHealthy(m));
  return [...healthy, ...cooling];
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function buildMessagePartsFromAttachments(
  rawText: string,
  attachments?: any[],
  includeBinaryData: boolean = true,
  isCurrentTurn: boolean = false
): GeminiPart[] {
  const parts: GeminiPart[] = [];
  let textBlocks: string[] = [];
  let attachmentCount = 0;

  if (Array.isArray(attachments) && attachments.length > 0) {
    attachments.forEach((att, idx) => {
      if (!att || typeof att !== 'object') return;
      const mimeType = typeof att.mimeType === 'string' ? att.mimeType : '';
      const name = typeof att.name === 'string' ? att.name : `file-${idx + 1}`;
      const itemNum = idx + 1;

      // Text / code file content
      if (typeof att.textContent === 'string' && att.textContent.trim()) {
        attachmentCount++;
        const snippet = att.textContent.slice(0, 60000);
        textBlocks.push(
          `\n=== [Attached Code/Text File #${itemNum} of ${attachments.length}: ${name}] ===\n${snippet}\n=== [End of File #${itemNum}: ${name}] ===`
        );
        return;
      }

      // Binary image or PDF inlineData
      if (
        typeof att.data === 'string' &&
        att.data.trim() &&
        (mimeType.startsWith('image/') || mimeType === 'application/pdf')
      ) {
        attachmentCount++;
        if (includeBinaryData) {
          const cleanBase64 = att.data.includes('base64,')
            ? att.data.split('base64,')[1].trim()
            : att.data.trim();
          if (cleanBase64) {
            parts.push({
              text: `[Attached ${mimeType === 'application/pdf' ? 'PDF Document' : 'Image'} #${itemNum} of ${attachments.length}: "${name}"]`
            });
            parts.push({
              inlineData: {
                mimeType,
                data: cleanBase64
              }
            });
          }
        } else {
          textBlocks.push(`[Previously Attached Image/PDF: "${name}"]`);
        }
      }
    });
  }

  let finalText = (rawText || '').trim();
  if (textBlocks.length > 0) {
    finalText = [finalText, ...textBlocks].filter(Boolean).join('\n\n');
  }

  if (isCurrentTurn && attachmentCount > 1) {
    finalText += `\n\n[MULTI-ATTACHMENT INSTRUCTION: The user has attached ${attachmentCount} files/images above (#1 through #${attachmentCount}). You MUST examine and address ALL ${attachmentCount} items thoroughly one by one (#1, #2, etc.) in your response. Do NOT stop after analyzing only the first item.]`;
  }

  if (!finalText && parts.length > 0) {
    finalText = 'Please examine all attached media/documents thoroughly and respond accordingly.';
  }

  if (finalText) {
    parts.push({ text: finalText });
  }

  return parts;
}

/**
 * Normalizes multi-turn chat history into strictly compliant Gemini contents:
 * 1. Must alternate strictly: user -> model -> user -> model ...
 * 2. Must start with role: 'user' (discards leading model greetings/bot starters)
 * 3. Merges consecutive messages with the same role into a single message
 * 4. Discards past error notices or empty response notices to keep context clean
 * 5. Appends the new prompt and multimodal attachments as the final user message
 */
function buildCompliantGeminiContents(
  history: any[],
  prompt: string,
  currentAttachments?: any[]
): Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> {
  const rawHistory = Array.isArray(history) ? history : [];
  const filteredHistory: any[] = [];

  for (const m of rawHistory) {
    if (!m) continue;
    const rawText = typeof m.text === 'string' ? m.text.trim() : '';
    const hasAtms = Array.isArray(m.attachments) && m.attachments.length > 0;
    if (!rawText && !hasAtms) continue;

    const lower = rawText.toLowerCase();
    if (
      rawText.startsWith('Error: ') ||
      rawText.startsWith('Hata: ') ||
      rawText === 'No response returned.' ||
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

    filteredHistory.push(m);
  }

  // Keep full conversation history in context (no artificial 10-message cutoff)
  const sliced = [...filteredHistory];

  while (sliced.length > 0 && sliced[0].role === 'model') {
    sliced.shift();
  }

  const hasCurrentBinaryAttachment =
    Array.isArray(currentAttachments) &&
    currentAttachments.some(
      (a) => a && typeof a.data === 'string' && a.data.trim().length > 0
    );

  const alternating: Array<{
    role: 'user' | 'model';
    parts: GeminiPart[];
  }> = [];

  sliced.forEach((m, idx) => {
    const role: 'user' | 'model' = m.role === 'user' || m.role === 'human' ? 'user' : 'model';
    const rawText = typeof m.text === 'string' ? m.text.trim() : '';
    // Only include heavy binary inlineData for the most recent historical turn if the current turn doesn't already have new images,
    // so new images in the 2nd/3rd turn are never overshadowed by old images from earlier turns
    const isVeryRecentTurn = idx >= sliced.length - 2;
    const includeBinary = !hasCurrentBinaryAttachment && isVeryRecentTurn;

    const msgParts = buildMessagePartsFromAttachments(
      rawText,
      m.attachments,
      includeBinary,
      false
    );
    if (msgParts.length === 0) return;

    if (alternating.length === 0) {
      if (role === 'user') {
        alternating.push({ role: 'user', parts: [...msgParts] });
      }
    } else {
      const last = alternating[alternating.length - 1];
      if (last.role === role) {
        last.parts.push(...msgParts);
      } else {
        alternating.push({ role, parts: [...msgParts] });
      }
    }
  });

  const currentParts = buildMessagePartsFromAttachments(
    prompt || '',
    currentAttachments,
    true,
    true
  );

  if (alternating.length === 0) {
    alternating.push({
      role: 'user',
      parts: currentParts.length > 0 ? currentParts : [{ text: prompt || '...' }]
    });
  } else {
    const last = alternating[alternating.length - 1];
    if (last.role === 'user') {
      last.parts.push(...currentParts);
    } else {
      alternating.push({
        role: 'user',
        parts: currentParts.length > 0 ? currentParts : [{ text: prompt || '...' }]
      });
    }
  }

  return alternating.map((item) => ({
    role: item.role,
    parts: item.parts.length > 0 ? item.parts : [{ text: '...' }]
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

interface LiveWebSnippet {
  title: string;
  url: string;
  snippet: string;
  sourceName: string;
}

function stripHtmlTags(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchQueriesFromPrompt(rawPrompt: string): string[] {
  const stopWordsRegex =
    /(?:^|\s+)(?:bana|lütfen|lutfen|acaba|şimdi|simdi|hemen|internette\S*|internetten\S*|webde\S*|webden\S*|google\S*|araştır\S*|arastir\S*|anlat\S*|açıkla\S*|acikla\S*|söyle\S*|soyle\S*|nedir\S*|ne\s+demek\S*|ne\s+anlama\s+geliyor|olayı\s+ne\S*|olayi\s+ne\S*|hakkında\s+bilgi\s+ver|biliyor\s+musun|biliyormusun|var\s+ya|şu\s+an\S*|şuan\S*|su\s+an\S*|yaygın\s+olan|ünlü\s+bir|unlu\s+bir|popüler\s+bir|populer\s+bir)(?=\s+|$)/gi;

  let cleaned = (rawPrompt || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[?!.,;:"'`()[\]{}]+/g, ' ')
    .replace(stopWordsRegex, ' ')
    .replace(stopWordsRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const baseQuery = cleaned.length >= 2 ? cleaned.slice(0, 120) : rawPrompt.trim().slice(0, 120);
  const queries: string[] = [baseQuery];

  const isMemeOrTrend = /(meme|mim|akım|akim|viral|trend|tiktok|shitpost|slang|knowyourmeme|brainrot)/i.test(
    rawPrompt
  );

  if (isMemeOrTrend) {
    const coreTopic = baseQuery
      .replace(/(?:^|\s+)(?:meme\S*|mim\S*|akım\S*|akim\S*|viral\S*|trend\S*|güncel\S*|guncel\S*|ünlü\S*|unlu\S*|yaygın\S*|yaygin\S*|nedir\S*|ne\b)(?=\s+|$)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (coreTopic.length >= 2) {
      queries.unshift(`${coreTopic} meme knowyourmeme`);
      queries.push(`${coreTopic} meme`);
    } else {
      queries.unshift('popular viral memes 2024 2025 knowyourmeme');
    }
  } else {
    // Also strip trailing Turkish question particles for a cleaner core search query
    const coreTopic = baseQuery
      .replace(/(?:^|\s+)(?:kimdir\S*|nedir\S*|ne\b|mi\b|mı\b|mu\b|mü\b|nasıl\S*|nasil\S*)(?=\s+|$)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (coreTopic.length >= 2 && coreTopic !== baseQuery) {
      queries.unshift(coreTopic);
    }
  }

  return Array.from(new Set(queries.filter(Boolean))).slice(0, 3);
}

async function searchDuckDuckGoHtml(query: string): Promise<LiveWebSnippet[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await withTimeout(
      fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      }),
      4000,
      'ddgSearch'
    );
    if (!res.ok) return [];
    const html = await res.text();
    const results: LiveWebSnippet[] = [];

    // DuckDuckGo uses class="links_main links_deep result__body"
    const blocks = html.split(/result__body"/i).slice(1, 9);
    for (const block of blocks) {
      const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i
      );
      if (!titleMatch) continue;

      let rawHref = titleMatch[1] || '';
      const uddgMatch = rawHref.match(/[?&]uddg=([^&]+)/);
      if (uddgMatch && uddgMatch[1]) {
        try {
          rawHref = decodeURIComponent(uddgMatch[1]);
        } catch {
          // keep rawHref
        }
      }
      if (!rawHref.startsWith('http')) continue;

      const title = stripHtmlTags(titleMatch[2] || '');
      const snippet = stripHtmlTags(snippetMatch?.[1] || snippetMatch?.[2] || '');
      if (title && snippet) {
        results.push({
          title,
          url: rawHref,
          snippet,
          sourceName: rawHref.includes('knowyourmeme.com') ? 'KnowYourMeme' : 'Web'
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function searchRedditPublic(query: string): Promise<LiveWebSnippet[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=4`;
    const res = await withTimeout(
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; mAI-Web-Research/2.0)'
        }
      }),
      3500,
      'redditSearch'
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    const children = data?.data?.children;
    if (!Array.isArray(children)) return [];

    const results: LiveWebSnippet[] = [];
    for (const item of children.slice(0, 4)) {
      const post = item?.data;
      if (!post?.title) continue;
      const permalink = post.permalink ? `https://www.reddit.com${post.permalink}` : 'https://www.reddit.com';
      const selfText =
        typeof post.selftext === 'string' ? post.selftext.replace(/\s+/g, ' ').trim().slice(0, 450) : '';
      const sub = post.subreddit_name_prefixed || 'r/reddit';
      results.push({
        title: `${post.title} (${sub})`,
        url: permalink,
        snippet: selfText || post.title,
        sourceName: 'Reddit'
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function searchWikipediaApi(query: string, lang: 'tr' | 'en'): Promise<LiveWebSnippet[]> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=900&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=2&utf8=1&format=json`;
    const res = await withTimeout(
      fetch(url, {
        headers: { 'User-Agent': 'mAI-Assistant/2.0 (https://ai.studio)' }
      }),
      3200,
      `wiki-${lang}`
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    const pagesObj = data?.query?.pages;
    if (!pagesObj || typeof pagesObj !== 'object') return [];

    const pages = Object.values(pagesObj) as any[];
    return pages
      .filter((p) => p?.title && p?.extract)
      .slice(0, 2)
      .map((p: any) => ({
        title: `${p.title} (${lang.toUpperCase()} Wikipedia)`,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(p.title).replace(/\s+/g, '_'))}`,
        snippet: String(p.extract).replace(/\s+/g, ' ').trim(),
        sourceName: 'Wikipedia'
      }));
  } catch {
    return [];
  }
}

async function searchGoogleNewsRss(query: string): Promise<LiveWebSnippet[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`;
    const res = await withTimeout(
      fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      3200,
      'googleNewsRss'
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split('<item>').slice(1, 5);
    const results: LiveWebSnippet[] = [];

    for (const item of items) {
      const title = stripHtmlTags(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
      const link = stripHtmlTags(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
      const pubDate = stripHtmlTags(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '');
      const desc = stripHtmlTags(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '');
      if (title && link) {
        results.push({
          title,
          url: link,
          snippet: `${pubDate ? `[${pubDate}] ` : ''}${desc || title}`,
          sourceName: 'Google News'
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function performLiveWebSearch(rawPrompt: string): Promise<{
  contextBlock: string;
  sources: { title: string; url: string }[];
  queries: string[];
}> {
  const queries = buildSearchQueriesFromPrompt(rawPrompt);
  const primaryQuery = queries[0] || rawPrompt.trim().slice(0, 100);
  const secondaryQuery = queries[1];

  const tasks: Promise<LiveWebSnippet[]>[] = [
    searchDuckDuckGoHtml(primaryQuery),
    searchWikipediaApi(primaryQuery, 'en'),
    searchWikipediaApi(primaryQuery, 'tr'),
    searchRedditPublic(primaryQuery),
    searchGoogleNewsRss(primaryQuery)
  ];

  if (secondaryQuery && secondaryQuery !== primaryQuery) {
    tasks.unshift(searchDuckDuckGoHtml(secondaryQuery));
    tasks.push(searchWikipediaApi(secondaryQuery, 'en'));
  }

  const settled = await Promise.allSettled(tasks);
  const allSnippets: LiveWebSnippet[] = [];
  const seenUrls = new Set<string>();

  for (const s of settled) {
    if (s.status === 'fulfilled' && Array.isArray(s.value)) {
      for (const item of s.value) {
        if (!item.url || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        allSnippets.push(item);
      }
    }
  }

  if (allSnippets.length === 0) {
    return { contextBlock: '', sources: [], queries };
  }

  const topSnippets = allSnippets.slice(0, 12);
  const formattedLines = topSnippets.map(
    (s, i) =>
      `[${i + 1}] (${s.sourceName}) ${s.title}\nURL: ${s.url}\nİçerik / Özet: ${s.snippet}`
  );

  const contextBlock = `\n\n=== [CANLI İNTERNET ARAŞTIRMASI SONUÇLARI / LIVE WEB SEARCH RESULTS (2026)] ===
Aranan Sorgular: ${queries.join(' | ')}

${formattedLines.join('\n\n')}
=== [CANLI İNTERNET VERİSİ SONU] ===
[KRİTİK ZORUNLU TALİMAT: Yukarıdaki canlı internet araştırma sonuçları şu an (2026 yılında) gerçek zamanlı olarak Web, KnowYourMeme, Wikipedia, Reddit ve Google Haberler üzerinden çekilmiştir. Kullanıcının sorusunu doğrudan bu güncel verilere dayanarak detaylı, doğru ve net şekilde yanıtla. ASLA "bilgim 2023/2024 ile sınırlı", "internete erişimim yok" veya "güncel verilere ulaşamıyorum" DEME!]`;

  const sources = topSnippets.slice(0, 6).map((s) => ({
    title: s.title,
    url: s.url
  }));

  return { contextBlock, sources, queries };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

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

  // Verify user's Gemini API key(s)
  app.post('/api/verify-key', async (req, res) => {
    try {
      const { apiKey, uiLanguage } = req.body || {};
      const isEn = uiLanguage === 'en';
      const keys = parseApiKeys(apiKey);
      if (keys.length === 0) {
        return res.status(400).json({
          valid: false,
          error: isEn ? 'Please enter a valid Gemini API key.' : 'Lütfen geçerli bir Gemini API anahtarı girin.'
        });
      }

      const testModels = buildModelFailoverChain('gemini-3.1-flash-lite');
      let lastErr = '';

      for (const k of keys) {
        const ai = getGenAIClient(k);
        for (const m of testModels) {
          try {
            await withTimeout(
              ai.models.generateContent({
                model: m,
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
                config: {
                  maxOutputTokens: 8
                }
              }),
              8000,
              `verify(${m})`
            );
            return res.json({
              valid: true,
              workingModel: m,
              keyCount: keys.length,
              sanitizedKey: keys.join('\n')
            });
          } catch (err: any) {
            lastErr = String(err?.message || '');
            if (lastErr.includes('503') || lastErr.includes('UNAVAILABLE')) {
              markModelUnhealthy(m, 30_000);
            }
            if (lastErr.includes('API_KEY_INVALID') || lastErr.includes('PERMISSION_DENIED')) {
              break;
            }
          }
        }
      }

      return res.status(400).json({
        valid: false,
        error: isEn
          ? `Key verification failed: ${lastErr || 'Invalid key or quota exceeded.'}`
          : `Anahtar doğrulanamadı: ${lastErr || 'Geçersiz anahtar veya kota dolu.'}`
      });
    } catch (err: any) {
      return res.status(500).json({
        valid: false,
        error: err?.message || 'Verification failed'
      });
    }
  });

  // Ultra-fast streaming endpoint for Gemini chat with multi-bucket rate-limit & 503 failover
  app.post('/api/chat', async (req, res) => {
    let heartbeat: NodeJS.Timeout | null = null;
    try {
      const {
        apiKey: customKey,
        prompt,
        history,
        directive,
        model: requestedModel,
        uiLanguage,
        attachments
      } = req.body;
      const isEn = uiLanguage !== 'tr';

      // Build list of candidate API keys (supports multiple newline/comma-separated keys + server env key)
      const userKeys = parseApiKeys(customKey);
      const envKeys = parseApiKeys(process.env.GEMINI_API_KEY);
      const candidateKeys = [...userKeys, ...envKeys].filter(
        (k, idx, self) => Boolean(k) && self.indexOf(k) === idx
      );

      if (candidateKeys.length === 0) {
        return res.status(400).json({
          error: isEn
            ? 'Gemini API key not found. Please enter your API key in Settings (⚙️) at the top right.'
            : 'Gemini API anahtarı bulunamadı. Lütfen sağ üstteki Ayarlar (⚙️) menüsünden API anahtarınızı girin.'
        });
      }

      const contents = buildCompliantGeminiContents(history, prompt, attachments);

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

      const rawDir = typeof directive === 'string' ? directive : '';
      const isRoleplayMode = rawDir.includes('[HYPER-REALISTIC ROLEPLAY ENGINE DIRECTIVE]');
      const isAssistantMode = rawDir.includes('[EXPERT ASSISTANT ENGINE DIRECTIVE]');

      // Detect web research / meme / current-events / factual question intent (Turkish-suffix & Unicode safe)
      const promptLower = (typeof prompt === 'string' ? prompt : '').toLocaleLowerCase('tr-TR');
      const hasExplicitSearchIntent =
        /(?:^|[\s.,?!'"()[\]{}:;-])(araştır|arastir|internette|internetten|webde|webden|google|meme|mim|akım|akim|viral|trend|brainrot|shitpost|güncel|guncel|şu an|şuan|su an|bugün|bugun|son dakika|haber|2024|2025|2026|kimdir|nedir|ne demek|olayı|olayi|kaç tl|kac tl|dolar|euro|bitcoin|altın|fiyat|hava durumu|maç|skor|search|look up|lookup|latest|current|news|reddit|tiktok|twitter|knowyourmeme)/i.test(
          promptLower
        ) ||
        (!isRoleplayMode &&
          (/(?:^|[\s.,?!'"()[\]{}:;-])(kim\b|ne\b|nasıl|nasil|nerede|ne zaman|hangi|niye|neden|anlat|açıkla|acikla|bilgi ver)/i.test(
            promptLower
          ) ||
            promptLower.includes('?'))) ||
        /https?:\/\//i.test(promptLower);

      const hasUrlInPrompt = /https?:\/\/\S+/i.test(promptLower);

      const collectedSourcesMap = new Map<string, { title: string; url: string }>();
      const collectedQueriesSet = new Set<string>();

      // If search/meme/current-info intent is detected, run our quota-free Server-Side Live Web Search immediately!
      let liveSearchContext = '';
      if (hasExplicitSearchIntent && typeof prompt === 'string' && prompt.trim()) {
        const liveResult = await performLiveWebSearch(prompt);
        liveSearchContext = liveResult.contextBlock;
        for (const q of liveResult.queries) {
          collectedQueriesSet.add(q);
        }
        for (const src of liveResult.sources) {
          if (!collectedSourcesMap.has(src.url)) {
            collectedSourcesMap.set(src.url, src);
          }
        }
      }

      // Append live web search context to the final user turn so every model (including Flash Lite) has real-time internet knowledge without 429 search quota errors
      const enrichedContents = liveSearchContext
        ? contents.map((item, idx) => {
            if (idx === contents.length - 1 && item.role === 'user') {
              return {
                ...item,
                parts: [...item.parts, { text: liveSearchContext }]
              };
            }
            return item;
          })
        : contents;

      const fallbackModels = buildModelFailoverChain(requestedModel);
      const sysInstruction = formatEnforcedDirective(directive, prompt);

      // Dynamic Temperature: Roleplay = 0.95, Expert Assistant = 0.25, Default/Custom = 0.75
      const dynamicTemperature = isRoleplayMode
        ? 0.95
        : isAssistantMode
          ? 0.25
          : 0.75;

      const activeTools: Array<Record<string, unknown>> = [];
      if (hasExplicitSearchIntent) {
        activeTools.push({ googleSearch: {} });
        if (hasUrlInPrompt) {
          activeTools.push({ urlContext: {} });
        }
      }

      // Base config without tools (used for normal chat AND as primary/fallback with our server-side liveSearchContext)
      const baseConfig: Record<string, unknown> = {
        temperature: dynamicTemperature,
        systemInstruction: sysInstruction,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      };

      const configWithTools: Record<string, unknown> =
        activeTools.length > 0 ? { ...baseConfig, tools: activeTools } : baseConfig;

      // Stream initial server-side search queries & sources if found
      if (collectedSourcesMap.size > 0 || collectedQueriesSet.size > 0) {
        res.write(
          `data: ${JSON.stringify({
            sources: Array.from(collectedSourcesMap.values()),
            searchQueries: Array.from(collectedQueriesSet)
          })}\n\n`
        );
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }

      const extractGroundingFromResponse = (respObj: any) => {
        const gm = respObj?.candidates?.[0]?.groundingMetadata;
        if (!gm) return false;
        let added = false;

        if (Array.isArray(gm.webSearchQueries)) {
          for (const q of gm.webSearchQueries) {
            if (typeof q === 'string' && q.trim()) {
              const trimmedQ = q.trim();
              if (!collectedQueriesSet.has(trimmedQ)) {
                collectedQueriesSet.add(trimmedQ);
                added = true;
              }
            }
          }
        }

        if (Array.isArray(gm.groundingChunks)) {
          for (const ch of gm.groundingChunks) {
            const uri = ch?.web?.uri;
            const title = ch?.web?.title;
            if (typeof uri === 'string' && uri.trim()) {
              const cleanUrl = uri.trim();
              if (!collectedSourcesMap.has(cleanUrl)) {
                collectedSourcesMap.set(cleanUrl, {
                  title: (typeof title === 'string' && title.trim()) ? title.trim() : cleanUrl,
                  url: cleanUrl
                });
                added = true;
              }
            }
          }
        }
        return added;
      };

      let lastError: unknown = null;
      let totalStreamedTextLength = 0;

      // Try candidate API keys and model buckets seamlessly
      for (const activeKey of candidateKeys) {
        if (totalStreamedTextLength > 0) break;
        const ai = getGenAIClient(activeKey);

        // If liveSearchContext already fetched rich web results, use baseConfig first so we never hit 429 on free keys!
        // Otherwise try configWithTools first, then baseConfig.
        const configPasses =
          activeTools.length > 0 && !liveSearchContext
            ? [configWithTools, baseConfig]
            : [baseConfig];

        for (let passIdx = 0; passIdx < configPasses.length; passIdx++) {
          if (totalStreamedTextLength > 0) break;
          const activeConfig = configPasses[passIdx];
          const isToolPass = activeConfig === configWithTools && activeTools.length > 0;

          for (let i = 0; i < fallbackModels.length; i++) {
            if (totalStreamedTextLength > 0) break;
            const modelToTry = fallbackModels[i];

            try {
              const responseStream = await withTimeout(
                ai.models.generateContentStream({
                  model: modelToTry,
                  contents: enrichedContents,
                  config: activeConfig
                }),
                45000,
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

                const hasNewGrounding = extractGroundingFromResponse(chunk);

                if (chunkText) {
                  totalStreamedTextLength += chunkText.length;
                  res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                  if (typeof (res as any).flush === 'function') {
                    (res as any).flush();
                  }
                }

                if (hasNewGrounding) {
                  res.write(
                    `data: ${JSON.stringify({
                      sources: Array.from(collectedSourcesMap.values()),
                      searchQueries: Array.from(collectedQueriesSet)
                    })}\n\n`
                  );
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
              // If invalid API key, break out of model loop to try next candidate key if available
              if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')) {
                break;
              }
              // If tool pass failed on this model, continue to try next model or fall back to Pass 2
              if (isToolPass) {
                continue;
              }
              // If 503 overloaded, 429 rate-limited, or timed out on standard pass, mark model on 15s cooldown and fail over
              if (
                errMsg.includes('503') ||
                errMsg.includes('429') ||
                errMsg.includes('RESOURCE_EXHAUSTED') ||
                errMsg.includes('UNAVAILABLE') ||
                errMsg.includes('overloaded') ||
                errMsg.includes('TIMEOUT')
              ) {
                markModelUnhealthy(modelToTry, 15_000);
                await sleep(80);
              }
              continue;
            }
          }
        }

        // Non-streaming fallback if stream yielded 0 characters (always uses baseConfig with enrichedContents)
        if (totalStreamedTextLength === 0) {
          for (const modelToTry of [
            'gemini-3.1-flash-lite-preview',
            'gemini-2.5-flash-lite',
            'gemini-3-flash-preview',
            'gemini-2.5-flash',
            'gemini-flash-latest'
          ]) {
            if (totalStreamedTextLength > 0) break;
            try {
              const directRes = await withTimeout(
                ai.models.generateContent({
                  model: modelToTry,
                  contents: enrichedContents,
                  config: baseConfig as any
                }),
                30000,
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

              extractGroundingFromResponse(directRes);

              if (directText && directText.trim().length > 0) {
                totalStreamedTextLength += directText.length;
                res.write(
                  `data: ${JSON.stringify({
                    text: directText,
                    ...(collectedSourcesMap.size > 0
                      ? { sources: Array.from(collectedSourcesMap.values()) }
                      : {}),
                    ...(collectedQueriesSet.size > 0
                      ? { searchQueries: Array.from(collectedQueriesSet) }
                      : {})
                  })}\n\n`
                );
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
      } else if (rawMessage.includes('API_KEY_INVALID')) {
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
  const isProduction = process.env.NODE_ENV === 'production';

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
