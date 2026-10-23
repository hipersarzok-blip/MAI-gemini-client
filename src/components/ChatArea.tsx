import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, Key, Globe, ExternalLink, Sparkles, Copy, Check, RotateCcw, 
  Code2, Compass, Search, BookOpen, Square, Shield
} from 'lucide-react';
import { Message, GroundingSource } from '../types.ts';
import { MaiBrandIcon } from './MaiBrandIcon.tsx';

interface ChatAreaProps {
  isDarkMode: boolean;
  messages: Message[];
  streamingChunk: string;
  streamingSources?: GroundingSource[];
  streamingQueries?: string[];
  isStreaming: boolean;
  isSearchingWeb?: boolean;
  isNetworkDone?: boolean;
  onSendMessage: (text: string, webSearch?: boolean) => void;
  onTypingComplete?: () => void;
  onStopGeneration?: () => void;
  directiveText?: string;
  onOpenDirective?: () => void;
  onOpenApiKey: () => void;
  hasApiKey: boolean;
  uiLanguage?: 'tr' | 'en';
}

const GEMINI_SUGGESTIONS_TR = [
  {
    icon: Code2,
    title: 'Kod yaz & hata ayıkla',
    desc: 'TypeScript, Python veya React bileşeni oluştur',
    prompt: 'Bana modern bir TypeScript fonksiyonu veya React hook örneği yaz ve açıkla.',
    enableWebSearch: false
  },
  {
    icon: Compass,
    title: 'Karakter ile rol yap',
    desc: 'Bir anime karakteri veya dedektif ile maceraya atıl',
    prompt: 'Seninle bir rol yapma oyunu oynamak istiyorum, bana uygun bir karakter ve sahne öner.',
    enableWebSearch: false
  },
  {
    icon: Search,
    title: 'Güncel araştırma yap (Web)',
    desc: 'Google Arama ile canlı internet kaynaklarını incele',
    prompt: 'Bugün teknoloji ve yapay zeka dünyasındaki en güncel gelişmeleri web aramasıyla araştırıp özetle.',
    enableWebSearch: true
  },
  {
    icon: BookOpen,
    title: 'Yaratıcı metin & özet',
    desc: 'Fikir beyin fırtınası veya ilgi çekici bir hikaye',
    prompt: 'Bana sürükleyici, kısa bir bilim kurgu hikayesi başlangıcı yaz.',
    enableWebSearch: false
  }
];

const GEMINI_SUGGESTIONS_EN = [
  {
    icon: Code2,
    title: 'Code & Debug',
    desc: 'Generate TypeScript, Python, or React components',
    prompt: 'Write and explain a clean, modern TypeScript utility function or custom React hook.',
    enableWebSearch: false
  },
  {
    icon: Compass,
    title: 'Roleplay with a persona',
    desc: 'Embark on an adventure with an engaging character',
    prompt: 'I want to roleplay with you, suggest a compelling character persona and setting.',
    enableWebSearch: false
  },
  {
    icon: Search,
    title: 'Live Web Research',
    desc: 'Explore up-to-date web sources with Google Search',
    prompt: 'Search the live web and summarize the latest developments in AI and technology today.',
    enableWebSearch: true
  },
  {
    icon: BookOpen,
    title: 'Creative Writing & Summary',
    desc: 'Brainstorm creative concepts or compose a story',
    prompt: 'Write an atmospheric and immersive opening for a sci-fi short story.',
    enableWebSearch: false
  }
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  isDarkMode,
  messages,
  streamingChunk,
  streamingSources,
  streamingQueries,
  isStreaming,
  isSearchingWeb = false,
  isNetworkDone,
  onSendMessage,
  onTypingComplete,
  onStopGeneration,
  directiveText,
  onOpenDirective,
  onOpenApiKey,
  hasApiKey,
  uiLanguage = 'tr'
}) => {
  const isEn = uiLanguage === 'en';
  const [inputText, setInputText] = useState('');
  const [isWebSearch, setIsWebSearch] = useState<boolean>(() => {
    return localStorage.getItem('mai_web_search_enabled') === 'true';
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [displayedStreamingText, setDisplayedStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToggleWebSearch = (nextVal?: boolean) => {
    setIsWebSearch((prev) => {
      const updated = typeof nextVal === 'boolean' ? nextVal : !prev;
      localStorage.setItem('mai_web_search_enabled', String(updated));
      return updated;
    });
  };

  // High-speed real-time token rendering directly from Gemini stream
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedStreamingText('');
      return;
    }

    setDisplayedStreamingText(streamingChunk);

    if (isNetworkDone) {
      onTypingComplete?.();
    }
  }, [isStreaming, streamingChunk, isNetworkDone, onTypingComplete]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedStreamingText, isStreaming, streamingSources]);

  // Keep input in view when mobile virtual keyboard opens/resizes
  useEffect(() => {
    const handleViewportChange = () => {
      if (document.activeElement === textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 50);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, []);

  const handleFocus = () => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      scrollToBottom('smooth');
    }, 120);
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 320);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim(), isWebSearch);
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Render markdown with code block copy support and clean typography
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.replace('```', '').trim() || 'code';
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          const codeString = codeBuffer.join('\n');
          const codeId = `code-${idx}`;
          elements.push(
            <div key={codeId} className="my-3 rounded-2xl overflow-hidden border border-[#2f3032] bg-[#1e1f20] text-[#e3e3e3]">
              <div className="flex items-center justify-between px-4 py-2 bg-[#282a2c] text-xs font-mono text-[#c4c7c5] border-b border-[#2f3032]">
                <span className="uppercase text-[11px] font-semibold tracking-wider">{codeLanguage}</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(codeString, codeId)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  {copiedId === codeId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#34a853]" />
                      <span>{isEn ? 'Copied' : 'Kopyalandı'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Copy Code' : 'Kodu Kopyala'}</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                <code>{codeString}</code>
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="font-semibold text-base mt-3 mb-1.5 tracking-tight text-inherit hyphens-none [word-break:normal] [overflow-wrap:break-word]">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="font-bold text-lg mt-4 mb-2 tracking-tight text-inherit hyphens-none [word-break:normal] [overflow-wrap:break-word]">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="font-bold text-xl mt-5 mb-2.5 tracking-tight text-inherit hyphens-none [word-break:normal] [overflow-wrap:break-word]">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={idx} className="ml-5 list-disc text-[14.5px] leading-relaxed my-0.5 hyphens-none [word-break:normal] [overflow-wrap:break-word]">
            {line.slice(2)}
          </li>
        );
      } else if (!line.trim()) {
        elements.push(<div key={idx} className="h-2" />);
      } else {
        elements.push(
          <p 
            key={idx} 
            className="text-[14.5px] leading-relaxed my-0.5 first:mt-0 last:mb-0 hyphens-none [word-break:normal] [overflow-wrap:break-word]"
          >
            {line}
          </p>
        );
      }
    });

    return <div className="space-y-1 hyphens-none [word-break:normal] [overflow-wrap:break-word]">{elements}</div>;
  };

  // Render Google Search Grounding Chips & Queries
  const renderSources = (sources?: GroundingSource[], queries?: string[]) => {
    const hasSources = Boolean(sources && sources.length > 0);
    const hasQueries = Boolean(queries && queries.length > 0);
    if (!hasSources && !hasQueries) return null;

    return (
      <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 flex flex-col gap-2 animate-in fade-in duration-100">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium opacity-80">
          <Globe className="w-3.5 h-3.5 text-[#4285f4]" />
          <span>
            {hasSources
              ? isEn
                ? `Verified Web Sources (${sources!.length})`
                : `Doğrulanmış Web Kaynakları (${sources!.length})`
              : isEn
                ? 'Google Web Search Executed'
                : 'Google Web Araması Yapıldı'}
          </span>
          {hasQueries && (
            <span className="opacity-65 text-[11px] truncate max-w-[280px] sm:max-w-[420px]">
              • {queries!.join(' • ')}
            </span>
          )}
        </div>

        {hasSources && (
          <div className="flex flex-wrap gap-2 pt-1">
            {sources!.map((src, sIdx) => {
              let domain = '';
              try {
                domain = new URL(src.url).hostname.replace(/^www\./, '');
              } catch {
                domain = src.title;
              }

              return (
                <a
                  key={sIdx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-transform duration-75 active:scale-[0.97] ${
                    isDarkMode
                      ? 'bg-[#1e1f20] hover:bg-[#282a2c] text-[#e3e3e3] border border-[#2f3032]'
                      : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] text-[#1f1f1f] border border-[#dfe3e8]'
                  }`}
                  title={src.title || src.url}
                >
                  <div className="w-4 h-4 rounded-full bg-[#4285f4]/15 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-2.5 h-2.5 text-[#4285f4]" />
                  </div>
                  <span className="truncate max-w-[180px] sm:max-w-[220px]">
                    {src.title || domain}
                  </span>
                  <span className="text-[10px] opacity-50 shrink-0">
                    {domain}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const hasContent = messages.length > 0 || isStreaming || streamingChunk;

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-75 ${
      isDarkMode ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#ffffff] text-[#1f1f1f]'
    }`}>
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 space-y-6 max-w-4xl w-full mx-auto">
        {!hasContent ? (
          /* mAI Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 min-h-[65vh]">
            {/* Minimalist Monochrome MAI Emblem */}
            <div className="mb-4">
              <MaiBrandIcon size={58} invert={!isDarkMode} className="shadow-lg rounded-2xl" />
            </div>

            <div className="mb-6 space-y-1.5 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight select-none">
                <span 
                  className="bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] bg-clip-text text-transparent inline-block pb-0.5"
                  style={{
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {isEn ? 'Hello' : 'Merhaba'}
                </span>
              </h1>
              <p className={`text-xl sm:text-2xl font-medium tracking-tight ${isDarkMode ? 'text-[#c4c7c5]' : 'text-[#444746]'}`}>
                {isEn ? 'How can I help you today?' : 'Bugün nasıl yardımcı olabilirim?'}
              </p>
              {directiveText && directiveText.trim() ? (
                <button
                  type="button"
                  onClick={onOpenDirective}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#4285f4]/15 hover:bg-[#4285f4]/25 text-[#4285f4] dark:text-[#8ab4f8] border border-[#4285f4]/30 mt-3 transition-all active:scale-95 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#34a853]" />
                  <span>
                    {isEn ? 'Active Directive' : 'Aktif Direktif'}:{' '}
                    {directiveText.length > 45 ? directiveText.slice(0, 45) + '...' : directiveText}
                  </span>
                  <span className="underline ml-1 font-semibold">
                    {isEn ? 'Edit' : 'Düzenle'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenDirective}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border mt-3 transition-all active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#2f3032] text-[#c4c7c5]'
                      : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] border-[#dfe3e8] text-[#444746]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#4285f4]" />
                  <span>
                    {isEn
                      ? '🎭 Choose Roleplay Character or Custom Directive'
                      : '🎭 Rol Yapma Karakteri veya Özel Direktif Seç'}
                  </span>
                </button>
              )}
            </div>

            {/* Prompt Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full text-left mt-4">
              {(isEn ? GEMINI_SUGGESTIONS_EN : GEMINI_SUGGESTIONS_TR).map((s, idx) => {
                const IconComponent = s.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (s.enableWebSearch) {
                        handleToggleWebSearch(true);
                      }
                      setInputText(s.prompt);
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-transform duration-75 active:scale-[0.98] flex flex-col justify-between group cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#2f3032] text-[#e3e3e3]'
                        : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] border-[#dfe3e8] text-[#1f1f1f]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm mb-1">{s.title}</div>
                      <div className={`text-xs ${isDarkMode ? 'text-[#9fa1a0]' : 'text-[#5e6266]'}`}>
                        {s.desc}
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <div className={`p-2 rounded-full transition-transform duration-75 group-hover:scale-105 ${
                        isDarkMode ? 'bg-[#282a2c] text-[#4285f4]' : 'bg-white text-[#4285f4]'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!hasApiKey && (
              <button
                onClick={onOpenApiKey}
                className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-[#ea4335] text-white hover:bg-[#d93025] transition-transform duration-75 shadow-md active:scale-95"
              >
                <Key className="w-4 h-4" />
                <span>
                  {isEn ? 'Configure Gemini API Key' : 'Gemini API Anahtarınızı Tanımlayın'}
                </span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Persistent Active Directive & Character Control Bar */}
            <div className="sticky top-0 z-20 pb-2">
              <div
                onClick={onOpenDirective}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-md shadow-xs cursor-pointer transition-all active:scale-[0.99] ${
                  directiveText && directiveText.trim()
                    ? isDarkMode
                      ? 'bg-[#1e1f20]/95 hover:bg-[#282a2c] border-[#4285f4]/40 text-[#e3e3e3]'
                      : 'bg-[#f0f4f9]/95 hover:bg-[#e1e7f0] border-[#4285f4]/40 text-[#1f1f1f]'
                    : isDarkMode
                      ? 'bg-[#18191a]/90 hover:bg-[#202124] border-[#2f3032] text-[#9fa1a0]'
                      : 'bg-[#f8f9fa]/90 hover:bg-[#f0f4f9] border-[#dfe3e8] text-[#5e6266]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#4285f4] shrink-0" />
                  <span className="text-xs font-medium truncate">
                    {directiveText && directiveText.trim()
                      ? `${isEn ? 'Active Persona (Strict v3.0)' : 'Aktif Direktif / Karakter (Sert v3.0)'}: ${directiveText}`
                      : isEn
                        ? 'Standard Chat Mode (Tap to add Directive or Roleplay Persona)'
                        : 'Standart Sohbet Modu (Direktif veya Roleplay karakteri eklemek için dokunun)'}
                  </span>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#4285f4] text-white hover:bg-[#1a73e8] transition-colors">
                  {directiveText && directiveText.trim()
                    ? isEn
                      ? 'Edit Directive'
                      : 'Direktifi Düzenle'
                    : isEn
                      ? 'Add Directive'
                      : 'Direktif Ekle'}
                </span>
              </div>
            </div>

            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isError = !isUser && (msg.text.startsWith('Error: ') || msg.text.startsWith('Hata: '));
              const prevUserMsg = !isUser && idx > 0 && messages[idx - 1]?.role === 'user' ? messages[idx - 1]?.text : null;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start gap-3.5'}`}
                >
                  {/* Minimalist B&W MAI Avatar for Assistant */}
                  {!isUser && (
                    <div className="shrink-0 mt-0.5">
                      <MaiBrandIcon size={30} invert={!isDarkMode} />
                    </div>
                  )}

                  <div className={`flex flex-col ${isUser ? 'items-end max-w-[88%] sm:max-w-[78%]' : 'items-start flex-1 min-w-0'}`}>
                    {isUser ? (
                      <div
                        className={`w-fit min-w-fit rounded-[20px] rounded-br-sm px-4.5 py-2.5 text-[15px] leading-relaxed select-text shadow-2xs whitespace-pre-wrap break-words text-left ${
                          isDarkMode
                            ? 'bg-[#282a2c] text-[#e3e3e3]'
                            : 'bg-[#e9eef6] text-[#1f1f1f]'
                        }`}
                        style={{
                          wordBreak: 'normal',
                          overflowWrap: 'break-word',
                          hyphens: 'none',
                          WebkitHyphens: 'none',
                        }}
                      >
                        {msg.text}
                      </div>
                    ) : (
                      <div
                        className={`w-full text-[14.5px] leading-relaxed break-words ${
                          isError
                            ? 'p-4 rounded-2xl bg-[#ea4335]/10 border border-[#ea4335]/20 text-[#ea4335]'
                            : isDarkMode
                              ? 'text-[#e3e3e3]'
                              : 'text-[#1f1f1f]'
                        }`}
                        style={{
                          wordBreak: 'normal',
                          overflowWrap: 'break-word',
                          hyphens: 'none',
                          WebkitHyphens: 'none',
                        }}
                      >
                        {renderFormattedText(msg.text)}

                        {/* Web Sources & Search Queries */}
                        {(msg.sources || msg.searchQueries) && renderSources(msg.sources, msg.searchQueries)}

                        {/* Error retry action */}
                        {isError && prevUserMsg && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => onSendMessage(prevUserMsg, isWebSearch)}
                              disabled={isStreaming}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#ea4335] text-white hover:bg-[#c5221f] transition-transform duration-75 active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Retry' : 'Tekrar dene'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Copy Action under assistant message */}
                    {!isUser && !isError && (
                      <div className="flex items-center gap-1 mt-2 text-xs opacity-60">
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className={`p-1.5 rounded-full transition-transform duration-75 active:scale-90 ${
                            isDarkMode ? 'hover:bg-[#1e1f20]' : 'hover:bg-[#f0f4f9]'
                          }`}
                          title={isEn ? 'Copy response' : 'Cevabı kopyala'}
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-[#34a853]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Message */}
            {isStreaming && (
              <div className="flex justify-start gap-3.5 animate-in fade-in duration-150">
                <div className="shrink-0 mt-0.5 animate-pulse">
                  <MaiBrandIcon size={30} invert={!isDarkMode} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Status label while streaming or researching */}
                  <div className="flex items-center gap-2 text-xs font-medium text-[#4285f4] mb-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4285f4] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4285f4]"></span>
                    </span>
                    <span>
                      {displayedStreamingText 
                        ? isSearchingWeb || (streamingQueries && streamingQueries.length > 0)
                          ? isEn
                            ? 'Writing with live Google Search sources...'
                            : 'Google Web kaynaklarıyla yanıt yazılıyor...'
                          : isEn
                            ? 'Typing...'
                            : 'Yazıyor...'
                        : isSearchingWeb || (streamingQueries && streamingQueries.length > 0)
                          ? isEn
                            ? 'Searching the live internet via Google...'
                            : "Google'da canlı internet araştırması yapılıyor..."
                          : isEn
                            ? 'Generating instant response...'
                            : 'Cevap hazırlanıyor...'}
                    </span>
                  </div>

                  <div className={`text-[14.5px] leading-relaxed ${isDarkMode ? 'text-[#e3e3e3]' : 'text-[#1f1f1f]'}`}>
                    {displayedStreamingText ? (
                      <>
                        {renderFormattedText(displayedStreamingText)}
                        <span className="inline-block w-2 h-4 ml-1 bg-[#4285f4] animate-pulse align-middle" />
                        {(streamingSources || streamingQueries) && renderSources(streamingSources, streamingQueries)}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 py-2">
                        <span className="w-2 h-2 rounded-full bg-[#4285f4] animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 rounded-full bg-[#9b72cb] animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-[#d96570] animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Floating Input Area */}
      <div className={`p-2.5 sm:p-4 border-t transition-colors shrink-0 sticky bottom-0 z-30 pb-[max(env(safe-area-inset-bottom,0px),10px)] ${
        isDarkMode ? 'border-[#202124] bg-[#131314]' : 'border-[#e3e8ef] bg-[#ffffff]'
      }`}>
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className={`rounded-3xl border transition-all duration-200 px-4 py-3 shadow-xs ${
              isDarkMode 
                ? 'bg-[#1e1f20] border-[#2f3032] focus-within:border-[#4285f4]/80 focus-within:ring-2 focus-within:ring-[#4285f4]/20' 
                : 'bg-[#f0f4f9] border-[#dfe3e8] focus-within:border-[#4285f4]/80 focus-within:ring-2 focus-within:ring-[#4285f4]/20 focus-within:bg-white'
            }`}
          >
            {/* Input Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onClick={handleFocus}
              placeholder={
                isWebSearch
                  ? isEn
                    ? 'Ask mAI... (Live Google Web Search is ON)'
                    : "mAI'a sorun... (Canlı Google Web Araması AÇIK)"
                  : isEn
                    ? 'Message mAI...'
                    : "mAI'a bir mesaj yazın..."
              }
              disabled={isStreaming}
              className={`w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed max-h-40 ${
                isDarkMode ? 'text-white placeholder-[#8e918f]' : 'text-[#1f1f1f] placeholder-[#747775]'
              }`}
            />

            {/* Bottom Controls Row inside input capsule */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-black/5 dark:border-white/5">
              {/* Left: Google Search Grounding toggle pill */}
              <button
                type="button"
                onClick={() => handleToggleWebSearch()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-75 active:scale-95 cursor-pointer ${
                  isWebSearch
                    ? 'bg-[#4285f4] text-white shadow-xs ring-2 ring-[#4285f4]/30'
                    : isDarkMode
                      ? 'bg-[#282a2c] text-[#c4c7c5] hover:text-white'
                      : 'bg-[#e1e7f0] text-[#444746] hover:text-black'
                }`}
                title={
                  isWebSearch
                    ? isEn
                      ? 'Web Search ON (Live Google Search with verified web sources)'
                      : 'Web Araması AÇIK (Canlı Google Arama ile doğrulanmış kaynaklar)'
                    : isEn
                      ? 'Web Search OFF (Instant low-latency response)'
                      : 'Web Araması KAPALI (Anında süper hızlı yanıt)'
                }
              >
                <Globe className={`w-3.5 h-3.5 ${isWebSearch ? 'animate-spin [animation-duration:8s]' : ''}`} />
                <span>
                  {isWebSearch
                    ? isEn
                      ? 'Web Search: ON'
                      : 'Web Arama: Açık'
                    : isEn
                      ? 'Web Search: OFF'
                      : 'Web Arama: Kapalı'}
                </span>
              </button>

              {/* Right: Circular Send Button or Active Stop Button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#ea4335] text-white hover:bg-[#d93025] transition-transform duration-75 active:scale-95 shadow-sm"
                  aria-label={isEn ? 'Stop response' : 'Yanıtı Durdur'}
                  title={isEn ? 'Stop generating response' : 'Yanıt üretimini durdur'}
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isEn ? 'Stop' : 'Durdur'}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`p-2.5 rounded-full transition-transform duration-75 active:scale-90 shrink-0 ${
                    inputText.trim()
                      ? 'bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-sm'
                      : isDarkMode
                        ? 'bg-[#282a2c] text-[#5e6266] cursor-not-allowed'
                        : 'bg-[#dfe3e8] text-[#9fa1a0] cursor-not-allowed'
                  }`}
                  aria-label={isEn ? 'Send message' : 'Mesaj Gönder'}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Disclaimer Microcopy */}
          <div className="text-center mt-2">
            <span className={`text-[11px] ${isDarkMode ? 'text-[#8e918f]' : 'text-[#747775]'}`}>
              {isEn
                ? 'mAI may make mistakes. Verify important information.'
                : 'mAI hata yapabilir, bu nedenle önemli bilgileri kontrol edin.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
