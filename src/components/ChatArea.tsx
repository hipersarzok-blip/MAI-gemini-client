import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Key,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Code2,
  Compass,
  BookOpen,
  Lightbulb,
  Square
} from 'lucide-react';
import { Message } from '../types.ts';

interface ChatAreaProps {
  isDarkMode: boolean;
  messages: Message[];
  streamingChunk: string;
  isStreaming: boolean;
  isNetworkDone?: boolean;
  onSendMessage: (text: string) => void;
  onTypingComplete?: () => void;
  onStopGeneration?: () => void;
  onOpenApiKey: () => void;
  hasApiKey: boolean;
  uiLanguage?: 'tr' | 'en';
}

const GEMINI_SUGGESTIONS_TR = [
  {
    icon: Code2,
    title: 'Kod yaz & hata ayıkla',
    desc: 'TypeScript, Python veya React bileşeni oluştur',
    prompt: 'Bana modern bir TypeScript fonksiyonu veya React hook örneği yaz ve açıkla.'
  },
  {
    icon: Compass,
    title: 'Karakter ile rol yap',
    desc: 'Bir anime karakteri veya dedektif ile maceraya atıl',
    prompt: 'Seninle bir rol yapma oyunu oynamak istiyorum, bana uygun bir karakter ve sahne öner.'
  },
  {
    icon: Lightbulb,
    title: 'Karmaşık bir konuyu açıkla',
    desc: 'Bilim, felsefe veya yazılım mimarisini sadeleştir',
    prompt: 'Kuantum dolanıklığı ve modern şifreleme üzerindeki etkilerini anlaşılır örneklerle açıkla.'
  },
  {
    icon: BookOpen,
    title: 'Yaratıcı metin & hikaye',
    desc: 'Fikir beyin fırtınası veya sürükleyici bir kurgu',
    prompt: 'Bana sürükleyici, kısa bir bilim kurgu hikayesi başlangıcı yaz.'
  }
];

const GEMINI_SUGGESTIONS_EN = [
  {
    icon: Code2,
    title: 'Code & Debug',
    desc: 'Generate TypeScript, Python, or React components',
    prompt: 'Write and explain a clean, modern TypeScript utility function or custom React hook.'
  },
  {
    icon: Compass,
    title: 'Roleplay with a persona',
    desc: 'Embark on an adventure with an anime or fictional character',
    prompt: 'I want to roleplay with you, suggest a compelling character persona and setting.'
  },
  {
    icon: Lightbulb,
    title: 'Explain a complex concept',
    desc: 'Break down science, architecture, or philosophy clearly',
    prompt: 'Explain how distributed consensus algorithms work using a clear real-world analogy.'
  },
  {
    icon: BookOpen,
    title: 'Creative Writing & Story',
    desc: 'Brainstorm creative concepts or compose a story',
    prompt: 'Write an atmospheric and immersive opening for a sci-fi short story.'
  }
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  isDarkMode,
  messages,
  streamingChunk,
  isStreaming,
  isNetworkDone,
  onSendMessage,
  onTypingComplete,
  onStopGeneration,
  onOpenApiKey,
  hasApiKey,
  uiLanguage = 'en'
}) => {
  const isEn = uiLanguage === 'en';
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [displayedStreamingText, setDisplayedStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (messages.length > 0 || isStreaming) {
      scrollToBottom();
    }
  }, [messages, displayedStreamingText, isStreaming]);

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
      if (messages.length > 0) {
        scrollToBottom('smooth');
      }
    }, 120);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
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

  const hasContent = messages.length > 0 || isStreaming || Boolean(streamingChunk);

  return (
    <div
      className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden transition-colors duration-75 ${
        isDarkMode ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#ffffff] text-[#1f1f1f]'
      }`}
    >
      {/* Scrollable Chat Viewport */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 max-w-4xl w-full mx-auto flex flex-col">
        {!hasContent ? (
          /* Vertically Centered Welcome Screen */
          <div className="flex-1 my-auto flex flex-col items-center justify-center text-center px-4 py-8 animate-fade-up">
            <div className="mb-8 space-y-2 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight select-none">
                <span
                  className="bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] bg-clip-text text-transparent inline-block pb-0.5"
                  style={{
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {isEn ? 'Hello' : 'Merhaba'}
                </span>
              </h1>
              <p className={`text-xl sm:text-2xl font-medium tracking-tight ${isDarkMode ? 'text-[#c4c7c5]' : 'text-[#444746]'}`}>
                {isEn ? 'How can I help you today?' : 'Bugün nasıl yardımcı olabilirim?'}
              </p>
            </div>

            {/* Prompt Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full text-left">
              {(isEn ? GEMINI_SUGGESTIONS_EN : GEMINI_SUGGESTIONS_TR).map((s, idx) => {
                const IconComponent = s.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(s.prompt);
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] flex flex-col justify-between group cursor-pointer animate-fade-up ${
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
                      <div
                        className={`p-2 rounded-full transition-transform duration-200 group-hover:scale-110 ${
                          isDarkMode ? 'bg-[#282a2c] text-[#4285f4]' : 'bg-white text-[#4285f4]'
                        }`}
                      >
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
                className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-[#ea4335] text-white hover:bg-[#d93025] transition-all duration-200 shadow-md active:scale-95"
              >
                <Key className="w-4 h-4" />
                <span>
                  {isEn ? 'Configure Gemini API Key' : 'Gemini API Anahtarınızı Tanımlayın'}
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isError = !isUser && (msg.text.startsWith('Error: ') || msg.text.startsWith('Hata: '));
              const prevUserMsg =
                !isUser && idx > 0 && messages[idx - 1]?.role === 'user' ? messages[idx - 1]?.text : null;

              return (
                <div
                  key={msg.id}
                  className={`flex animate-fade-up ${isUser ? 'justify-end' : 'justify-start gap-3'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1a73e8] via-[#9b72cb] to-[#d96570] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      isUser ? 'items-end max-w-[88%] sm:max-w-[78%]' : 'items-start flex-1 min-w-0'
                    }`}
                  >
                    {isUser ? (
                      <div
                        className={`w-fit min-w-fit rounded-[20px] rounded-br-sm px-4.5 py-2.5 text-[15px] leading-relaxed select-text shadow-2xs whitespace-pre-wrap break-words text-left transition-all duration-200 ${
                          isDarkMode
                            ? 'bg-[#282a2c] text-[#e3e3e3]'
                            : 'bg-[#e9eef6] text-[#1f1f1f]'
                        }`}
                        style={{
                          wordBreak: 'normal',
                          overflowWrap: 'break-word',
                          hyphens: 'none',
                          WebkitHyphens: 'none'
                        }}
                      >
                        {msg.text}
                      </div>
                    ) : (
                      <div
                        className={`w-full text-[14.5px] leading-relaxed break-words transition-all duration-200 ${
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
                          WebkitHyphens: 'none'
                        }}
                      >
                        {renderFormattedText(msg.text)}

                        {isError && prevUserMsg && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => onSendMessage(prevUserMsg)}
                              disabled={isStreaming}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#ea4335] text-white hover:bg-[#c5221f] transition-all duration-200 active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Retry' : 'Tekrar dene'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {!isUser && !isError && (
                      <div className="flex items-center gap-1 mt-2 text-xs opacity-60">
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className={`p-1.5 rounded-full transition-all duration-200 active:scale-90 ${
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
              <div className="flex justify-start gap-3 animate-fade-up">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1a73e8] via-[#9b72cb] to-[#d96570] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-[14.5px] leading-relaxed ${isDarkMode ? 'text-[#e3e3e3]' : 'text-[#1f1f1f]'}`}>
                    {displayedStreamingText ? (
                      <>
                        {renderFormattedText(displayedStreamingText)}
                        <span className="inline-block w-2 h-4 ml-1 bg-[#4285f4] animate-pulse align-middle" />
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
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        className={`p-2.5 sm:p-4 border-t transition-colors shrink-0 sticky bottom-0 z-30 pb-[max(env(safe-area-inset-bottom,0px),10px)] ${
          isDarkMode ? 'border-[#202124] bg-[#131314]' : 'border-[#e3e8ef] bg-[#ffffff]'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className={`flex items-end gap-2 rounded-3xl border transition-all duration-200 px-4 py-2.5 shadow-xs ${
              isDarkMode
                ? 'bg-[#1e1f20] border-[#2f3032] focus-within:border-[#4285f4]/80 focus-within:ring-2 focus-within:ring-[#4285f4]/20'
                : 'bg-[#f0f4f9] border-[#dfe3e8] focus-within:border-[#4285f4]/80 focus-within:ring-2 focus-within:ring-[#4285f4]/20 focus-within:bg-white'
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onClick={handleFocus}
              placeholder={isEn ? 'Message mAI...' : "mAI'a bir mesaj yazın..."}
              disabled={isStreaming}
              className={`flex-1 bg-transparent resize-none outline-none text-[15px] leading-relaxed max-h-40 py-1 ${
                isDarkMode ? 'text-white placeholder-[#8e918f]' : 'text-[#1f1f1f] placeholder-[#747775]'
              }`}
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#ea4335] text-white hover:bg-[#d93025] transition-transform duration-75 active:scale-95 shadow-sm shrink-0"
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
          </form>

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
