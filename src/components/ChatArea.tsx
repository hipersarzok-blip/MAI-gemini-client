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
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Pencil,
  History,
  X,
  Plus,
  FileText,
  FileCode,
  Image as ImageIcon,
  ZoomIn,
  Search,
  Download,
  GitBranch,
  ArrowLeft,
  FastForward,
  Globe,
  ExternalLink
} from 'lucide-react';
import { Message, MessageAttachment } from '../types.ts';

interface ChatAreaProps {
  isDarkMode: boolean;
  messages: Message[];
  streamingChunk: string;
  isStreaming: boolean;
  regeneratingMessageId?: string | null;
  isNetworkDone?: boolean;
  inChatSearch?: string;
  onClearInChatSearch?: () => void;
  onSendMessage: (text: string, attachments?: MessageAttachment[]) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onSelectVariant?: (messageId: string, variantIndex: number) => void;
  onEditMessage?: (messageId: string, newText: string, regenerateAfter?: boolean) => void;
  onRewindToMessage?: (messageId: string) => void;
  onForkFromMessage?: (messageId: string) => void;
  isRoleplayMode?: boolean;
  continuingMessageId?: string | null;
  onContinueMessage?: (messageId: string) => void;
  forkNotice?: {
    parentId: string;
    parentTitle: string;
    branchTitle: string;
    messageCount: number;
  } | null;
  onReturnToParentChat?: (parentId: string) => void;
  onDismissForkNotice?: () => void;
  onTypingComplete?: () => void;
  onStopGeneration?: () => void;
  onOpenApiKey: () => void;
  hasApiKey: boolean;
  currentModel?: string;
  onSelectModel?: (modelId: string) => void;
  availableModels?: { id: string; name: string; label: string }[];
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

function compressImageFile(file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const resultStr = reader.result as string;
      const img = new Image();
      img.onerror = () => {
        const base64 = resultStr.includes('base64,') ? resultStr.split('base64,')[1] : resultStr;
        resolve({ dataUrl: resultStr, base64, mimeType: file.type || 'image/jpeg' });
      };
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const base64 = resultStr.includes('base64,') ? resultStr.split('base64,')[1] : resultStr;
          resolve({ dataUrl: resultStr, base64, mimeType: file.type || 'image/jpeg' });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outMime = file.type === 'image/png' && file.size < 400 * 1024 ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outMime, 0.84);
        const base64 = dataUrl.split('base64,')[1] || '';
        resolve({ dataUrl, base64, mimeType: outMime });
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes('base64,') ? res.split('base64,')[1] : res;
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  isDarkMode,
  messages,
  streamingChunk,
  isStreaming,
  regeneratingMessageId = null,
  isNetworkDone,
  inChatSearch = '',
  onClearInChatSearch,
  onSendMessage,
  onRegenerateMessage,
  onSelectVariant,
  onEditMessage,
  onRewindToMessage,
  onForkFromMessage,
  isRoleplayMode = false,
  continuingMessageId = null,
  onContinueMessage,
  forkNotice = null,
  onReturnToParentChat,
  onDismissForkNotice,
  onTypingComplete,
  onStopGeneration,
  onOpenApiKey,
  hasApiKey,
  currentModel = 'gemini-3.1-flash-lite',
  onSelectModel,
  availableModels = [],
  uiLanguage = 'en'
}) => {
  const isEn = uiLanguage === 'en';
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadedCodeId, setDownloadedCodeId] = useState<string | null>(null);
  const [displayedStreamingText, setDisplayedStreamingText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [confirmRewindId, setConfirmRewindId] = useState<string | null>(null);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeModelObj = availableModels.find((m) => m.id === currentModel) || {
    id: currentModel,
    name: currentModel,
    label: currentModel.replace(/^gemini-/i, '')
  };
  const compactModelLabel = activeModelObj.label.replace(/^Gemini\s+/i, '');

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
    if ((messages.length > 0 || isStreaming) && !editingMessageId && !regeneratingMessageId) {
      scrollToBottom();
    }
  }, [messages.length, displayedStreamingText, isStreaming, editingMessageId, regeneratingMessageId]);

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

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsProcessingFiles(true);
    try {
      const added: MessageAttachment[] = [];
      for (const file of fileArray.slice(0, 10)) {
        const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const lowerName = file.name.toLowerCase();

        if (file.type.startsWith('image/')) {
          const { dataUrl, base64, mimeType } = await compressImageFile(file);
          added.push({
            id,
            name: file.name || 'image.jpg',
            mimeType,
            data: base64,
            previewUrl: dataUrl,
            size: file.size
          });
        } else if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
          if (file.size > 15 * 1024 * 1024) continue;
          const base64 = await readFileAsBase64(file);
          added.push({
            id,
            name: file.name,
            mimeType: 'application/pdf',
            data: base64,
            size: file.size
          });
        } else {
          const textContent = await file.text();
          added.push({
            id,
            name: file.name,
            mimeType: file.type || 'text/plain',
            textContent: textContent.slice(0, 60000),
            size: file.size
          });
        }
      }

      if (added.length > 0) {
        setPendingAttachments((prev) => [...prev, ...added].slice(0, 10));
      }
    } catch {
      // Ignore unreadable file
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && pendingAttachments.length === 0) || isStreaming || isProcessingFiles) return;
    const attachmentsToSend = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;
    onSendMessage(inputText.trim(), attachmentsToSend);
    setInputText('');
    setPendingAttachments([]);

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

  const handleDownloadCodeTxt = (codeString: string, codeLanguage: string, codeId: string) => {
    const safeLang = (codeLanguage || 'code').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'code';
    const blob = new Blob([codeString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${isEn ? 'code' : 'kod'}-${safeLang}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedCodeId(codeId);
    setTimeout(() => {
      setDownloadedCodeId(null);
    }, 2000);
  };

  const startEditingMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
    setConfirmRewindId(null);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEditedMessage = (msg: Message, regenerateAfter: boolean = false) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    onEditMessage?.(msg.id, trimmed, regenerateAfter);
    setEditingMessageId(null);
    setEditingText('');
  };

  /**
   * C1: Roleplay & Markdown Inline Syntax Highlighter (Character.ai / Emochi style)
   */
  const renderInlineTokens = (lineText: string) => {
    const tokenRegex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|"[^"\n]+"|“[^”\n]+”)/g;
    const parts = lineText.split(tokenRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={i} className="font-semibold text-inherit">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em
            key={i}
            className={`italic font-normal ${
              isDarkMode ? 'text-[#9aa8c7]' : 'text-[#526077]'
            }`}
          >
            {part.slice(1, -1)}
          </em>
        );
      }

      if (
        (part.startsWith('"') && part.endsWith('"') && part.length > 2) ||
        (part.startsWith('“') && part.endsWith('”') && part.length > 2)
      ) {
        return (
          <span
            key={i}
            className={`font-medium ${
              isDarkMode ? 'text-[#ffffff]' : 'text-[#0f172a]'
            }`}
          >
            {part}
          </span>
        );
      }

      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
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
                <div className="flex items-center gap-3">
                  {/* Download Code Block as .TXT Button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadCodeTxt(codeString, codeLanguage, codeId)}
                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    title={isEn ? 'Download code block as .txt' : 'Kod bloğunu .txt olarak indir'}
                  >
                    {downloadedCodeId === codeId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#34a853]" />
                        <span>{isEn ? 'Downloaded' : 'İndirildi'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Download .TXT' : '.TXT İndir'}</span>
                      </>
                    )}
                  </button>

                  {/* Copy Code Block Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(codeString, codeId)}
                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
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
            {renderInlineTokens(line.replace('### ', ''))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="font-bold text-lg mt-4 mb-2 tracking-tight text-inherit hyphens-none [word-break:normal] [overflow-wrap:break-word]">
            {renderInlineTokens(line.replace('## ', ''))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="font-bold text-xl mt-5 mb-2.5 tracking-tight text-inherit hyphens-none [word-break:normal] [overflow-wrap:break-word]">
            {renderInlineTokens(line.replace('# ', ''))}
          </h1>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={idx} className="ml-5 list-disc text-[14.5px] leading-relaxed my-0.5 hyphens-none [word-break:normal] [overflow-wrap:break-word]">
            {renderInlineTokens(line.slice(2))}
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
            {renderInlineTokens(line)}
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
          <div className="space-y-5">
            {/* G3: Branch / Fork Notification Banner */}
            {forkNotice && (
              <div
                className={`flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl border text-xs animate-scale-in ${
                  isDarkMode
                    ? 'bg-[#1e1f20]/90 border-[#9b72cb]/40 text-[#e3e3e3]'
                    : 'bg-[#f8f5ff] border-[#9b72cb]/35 text-[#1f1f1f]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#9b72cb]/20 text-[#9b72cb] flex items-center justify-center shrink-0">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-medium">
                    {isEn
                      ? `Branched from "${forkNotice.parentTitle}" (${forkNotice.messageCount} messages cloned)`
                      : `"${forkNotice.parentTitle}" sohbetinden dallandırıldı (${forkNotice.messageCount} mesaj kopyalandı)`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onReturnToParentChat && (
                    <button
                      type="button"
                      onClick={() => onReturnToParentChat(forkNotice.parentId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-all active:scale-95 cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#282a2c] hover:bg-[#333537] text-[#c4c7c5] hover:text-white border border-[#3b3d40]'
                          : 'bg-white hover:bg-[#f0f4f9] text-[#444746] hover:text-black border border-[#dfe3e8]'
                      }`}
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>{isEn ? 'Original Chat' : 'Ana Sohbete Dön'}</span>
                    </button>
                  )}
                  {onDismissForkNotice && (
                    <button
                      type="button"
                      onClick={onDismissForkNotice}
                      className="p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                      title={isEn ? 'Dismiss' : 'Kapat'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Empty State when TopAppBar In-Chat Search has no matches */}
            {inChatSearch.trim() &&
              messages.filter((m) =>
                m.text.toLowerCase().includes(inChatSearch.trim().toLowerCase())
              ).length === 0 && (
                <div
                  className={`p-8 rounded-2xl border text-center space-y-2.5 animate-fade-up ${
                    isDarkMode
                      ? 'bg-[#1e1f20]/60 border-[#2f3032] text-[#c4c7c5]'
                      : 'bg-[#f8fafd] border-[#dfe3e8] text-[#444746]'
                  }`}
                >
                  <Search className="w-7 h-7 mx-auto text-[#4285f4] opacity-80" />
                  <p className="text-sm font-semibold">
                    {isEn ? 'No matching messages found' : 'Eşleşen mesaj bulunamadı'}
                  </p>
                  <p className="text-xs opacity-75">
                    {isEn
                      ? 'Try a different search keyword in the top search bar.'
                      : 'Üstteki arama çubuğunda farklı bir kelime deneyin.'}
                  </p>
                  {onClearInChatSearch && (
                    <button
                      type="button"
                      onClick={onClearInChatSearch}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#4285f4] text-white hover:bg-[#1a73e8] transition-all active:scale-95 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Clear Search' : 'Aramayı Temizle'}</span>
                    </button>
                  )}
                </div>
              )}

            {messages.map((msg, idx) => {
              if (
                inChatSearch.trim() &&
                !msg.text.toLowerCase().includes(inChatSearch.trim().toLowerCase())
              ) {
                return null;
              }
              const isUser = msg.role === 'user';
              const isError = !isUser && (msg.text.startsWith('Error: ') || msg.text.startsWith('Hata: '));
              const prevUserMsg =
                !isUser && idx > 0 && messages[idx - 1]?.role === 'user' ? messages[idx - 1]?.text : null;
              const isEditingThis = editingMessageId === msg.id;
              const isRegeneratingThis = isStreaming && regeneratingMessageId === msg.id;
              const isContinuingThis = isStreaming && continuingMessageId === msg.id;
              const isNotLastMessage = idx < messages.length - 1;
              const isLastMessage = idx === messages.length - 1;

              const variants = msg.variants && msg.variants.length > 0 ? msg.variants : [msg.text];
              const activeVarIdx =
                typeof msg.activeVariantIndex === 'number' &&
                msg.activeVariantIndex >= 0 &&
                msg.activeVariantIndex < variants.length
                  ? msg.activeVariantIndex
                  : variants.length - 1;

              return (
                <div
                  id={`msg-item-${msg.id}`}
                  key={msg.id}
                  className={`group flex animate-fade-up ${isUser ? 'justify-end' : 'justify-start gap-3'}`}
                >
                  {!isUser && (
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr from-[#1a73e8] via-[#9b72cb] to-[#d96570] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                        isRegeneratingThis || isContinuingThis ? 'animate-pulse' : ''
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      isUser ? 'items-end max-w-[88%] sm:max-w-[78%]' : 'items-start flex-1 min-w-0'
                    }`}
                  >
                    {isEditingThis ? (
                      /* Inline Message Editor (A3) */
                      <div
                        className={`w-full rounded-2xl border p-3 space-y-2.5 animate-scale-in ${
                          isDarkMode
                            ? 'bg-[#1e1f20] border-[#4285f4]/60 text-[#e3e3e3]'
                            : 'bg-[#f8f9fa] border-[#4285f4]/60 text-[#1f1f1f]'
                        }`}
                      >
                        <textarea
                          rows={Math.min(Math.max(editingText.split('\n').length, 2), 8)}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          autoFocus
                          className={`w-full bg-transparent resize-y outline-none text-[14.5px] leading-relaxed p-1 ${
                            isDarkMode ? 'text-white' : 'text-black'
                          }`}
                        />
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1.5 border-t border-black/10 dark:border-white/10">
                          <button
                            type="button"
                            onClick={cancelEditingMessage}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                              isDarkMode
                                ? 'hover:bg-[#282a2c] text-[#c4c7c5]'
                                : 'hover:bg-[#e1e7f0] text-[#444746]'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Cancel' : 'İptal'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => saveEditedMessage(msg, false)}
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                              isDarkMode
                                ? 'bg-[#282a2c] hover:bg-[#333537] text-white border border-[#3b3d40]'
                                : 'bg-white hover:bg-[#f0f4f9] text-[#1f1f1f] border border-[#dfe3e8]'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 text-[#34a853]" />
                            <span>{isEn ? 'Save' : 'Kaydet'}</span>
                          </button>

                          {isUser && (
                            <button
                              type="button"
                              onClick={() => saveEditedMessage(msg, true)}
                              disabled={isStreaming}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all active:scale-95 shadow-xs cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Save & Regenerate' : 'Kaydet & Yanıtı Yenile'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : isUser ? (
                      <div className="flex flex-col items-end gap-2 max-w-full">
                        {/* B2: Multimodal Attachments inside User Message */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap justify-end gap-2 max-w-full">
                            {msg.attachments.map((att) => {
                              const isImg =
                                att.mimeType.startsWith('image/') && (att.previewUrl || att.data);
                              const imgSrc =
                                att.previewUrl ||
                                (att.data ? `data:${att.mimeType};base64,${att.data}` : '');

                              if (isImg && imgSrc) {
                                return (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => setLightboxImage({ url: imgSrc, name: att.name })}
                                    className={`group/img relative overflow-hidden rounded-2xl border shadow-xs transition-all hover:scale-[1.01] active:scale-98 cursor-pointer ${
                                      isDarkMode ? 'border-[#333537] bg-[#1e1f20]' : 'border-[#dfe3e8] bg-[#f0f4f9]'
                                    }`}
                                    title={isEn ? 'Click to enlarge' : 'Büyütmek için tıkla'}
                                  >
                                    <img
                                      src={imgSrc}
                                      alt={att.name}
                                      className="max-h-56 sm:max-h-64 max-w-[240px] sm:max-w-[300px] w-auto h-auto object-cover block"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center">
                                      <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow" />
                                    </div>
                                  </button>
                                );
                              }

                              const isPdf = att.mimeType === 'application/pdf';
                              return (
                                <div
                                  key={att.id}
                                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-xs font-medium shadow-2xs ${
                                    isDarkMode
                                      ? 'bg-[#1e1f20] border-[#333537] text-[#e3e3e3]'
                                      : 'bg-[#f0f4f9] border-[#dfe3e8] text-[#1f1f1f]'
                                  }`}
                                >
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                      isPdf
                                        ? 'bg-[#ea4335]/15 text-[#ea4335]'
                                        : 'bg-[#4285f4]/15 text-[#4285f4]'
                                    }`}
                                  >
                                    {isPdf ? (
                                      <FileText className="w-4 h-4" />
                                    ) : (
                                      <FileCode className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0 max-w-[180px] sm:max-w-[220px] text-left">
                                    <div className="truncate font-semibold">{att.name}</div>
                                    <div
                                      className={`text-[10px] uppercase tracking-wider ${
                                        isDarkMode ? 'text-[#8e918f]' : 'text-[#5e6266]'
                                      }`}
                                    >
                                      {isPdf ? 'PDF' : isEn ? 'Code / Text' : 'Kod / Metin'}
                                      {att.size ? ` • ${Math.max(1, Math.round(att.size / 1024))} KB` : ''}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {msg.text && (
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
                            {renderFormattedText(msg.text)}
                          </div>
                        )}
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
                        {isRegeneratingThis ? (
                          <div>
                            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#4285f4]">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>
                                {isEn
                                  ? `Generating response #${variants.length + 1}...`
                                  : `${variants.length + 1}. alternatif yanıt üretiliyor...`}
                              </span>
                            </div>
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
                        ) : isContinuingThis ? (
                          <div>
                            {renderFormattedText(
                              displayedStreamingText
                                ? `${msg.text.trimEnd()}\n\n${displayedStreamingText}`
                                : msg.text
                            )}
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#9b72cb] dark:text-[#d0bcff]">
                              <FastForward className="w-3 h-3 animate-pulse" />
                              <span>
                                {isEn ? 'Continuing scene...' : 'Sahne devam ettiriliyor...'}
                              </span>
                              <span className="inline-block w-2 h-3.5 ml-0.5 bg-[#9b72cb] animate-pulse align-middle" />
                            </div>
                          </div>
                        ) : (
                          renderFormattedText(msg.text)
                        )}

                        {isError && prevUserMsg && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() =>
                                onSendMessage(
                                  prevUserMsg,
                                  idx > 0 ? messages[idx - 1]?.attachments : undefined
                                )
                              }
                              disabled={isStreaming}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#ea4335] text-white hover:bg-[#c5221f] transition-all duration-200 active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Retry' : 'Tekrar dene'}</span>
                            </button>
                          </div>
                        )}

                        {/* Google Search Grounding Sources & Queries */}
                        {!isError &&
                          !isRegeneratingThis &&
                          ((msg.sources && msg.sources.length > 0) ||
                            (msg.searchQueries && msg.searchQueries.length > 0)) && (
                            <div
                              className={`mt-3 pt-2.5 border-t space-y-2 text-xs ${
                                isDarkMode ? 'border-[#2f3032]' : 'border-[#dfe3e8]'
                              }`}
                            >
                              {msg.searchQueries && msg.searchQueries.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                      isDarkMode ? 'text-[#8ab4f8]' : 'text-[#1a73e8]'
                                    }`}
                                  >
                                    <Search className="w-3 h-3" />
                                    <span>{isEn ? 'Searched:' : 'Aranan:'}</span>
                                  </span>
                                  {msg.searchQueries.slice(0, 4).map((q, qIdx) => (
                                    <span
                                      key={qIdx}
                                      className={`px-2 py-0.5 rounded-full text-[11px] border ${
                                        isDarkMode
                                          ? 'bg-[#1e1f20] border-[#2f3032] text-[#c4c7c5]'
                                          : 'bg-[#f0f4f9] border-[#dfe3e8] text-[#444746]'
                                      }`}
                                    >
                                      {q}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {msg.sources && msg.sources.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                      isDarkMode ? 'text-[#9fa1a0]' : 'text-[#5e6266]'
                                    }`}
                                  >
                                    <Globe className="w-3 h-3 text-[#34a853]" />
                                    <span>{isEn ? 'Web Sources:' : 'Web Kaynakları:'}</span>
                                  </span>
                                  {msg.sources.slice(0, 6).map((src, sIdx) => (
                                    <a
                                      key={sIdx}
                                      href={src.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors max-w-[220px] ${
                                        isDarkMode
                                          ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#2f3032] text-[#8ab4f8]'
                                          : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] border-[#dfe3e8] text-[#1a73e8]'
                                      }`}
                                      title={src.url}
                                    >
                                      <span className="truncate">{src.title || src.url}</span>
                                      <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-75" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Message Action Toolbar: Swipe/Regenerate (A2) + Continue Scene (H4) + Edit & Rewind (A3) + Copy */}
                    {!isEditingThis && !isRegeneratingThis && !isContinuingThis && (
                      <div
                        className={`flex flex-wrap items-center gap-1 mt-1.5 text-xs transition-opacity duration-150 ${
                          isUser
                            ? 'opacity-70 sm:opacity-0 sm:group-hover:opacity-90 justify-end'
                            : 'opacity-85 justify-start'
                        }`}
                      >
                        {/* A2: Variant Switcher (< 1/3 >) & Regenerate for Model Messages */}
                        {!isUser && !isError && (
                          <div
                            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 border mr-1 ${
                              isDarkMode
                                ? 'bg-[#1e1f20] border-[#2f3032] text-[#c4c7c5]'
                                : 'bg-[#f0f4f9] border-[#dfe3e8] text-[#444746]'
                            }`}
                          >
                            {variants.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  disabled={activeVarIdx === 0 || isStreaming}
                                  onClick={() => onSelectVariant?.(msg.id, activeVarIdx - 1)}
                                  className="p-1 rounded-full hover:text-[#4285f4] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                  title={isEn ? 'Previous response' : 'Önceki yanıt'}
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[11px] font-semibold px-1 select-none tabular-nums">
                                  {activeVarIdx + 1} / {variants.length}
                                </span>
                                <button
                                  type="button"
                                  disabled={isStreaming}
                                  onClick={() => {
                                    if (activeVarIdx < variants.length - 1) {
                                      onSelectVariant?.(msg.id, activeVarIdx + 1);
                                    } else if (prevUserMsg) {
                                      onRegenerateMessage?.(msg.id);
                                    }
                                  }}
                                  className="p-1 rounded-full hover:text-[#4285f4] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                  title={
                                    activeVarIdx < variants.length - 1
                                      ? isEn
                                        ? 'Next response'
                                        : 'Sonraki yanıt'
                                      : isEn
                                        ? 'Generate new alternative response'
                                        : 'Yeni alternatif yanıt üret'
                                  }
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {prevUserMsg && (
                              <button
                                type="button"
                                disabled={isStreaming}
                                onClick={() => onRegenerateMessage?.(msg.id)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full hover:text-[#4285f4] disabled:opacity-40 transition-colors cursor-pointer"
                                title={
                                  isEn
                                    ? 'Generate alternative response (Swipe)'
                                    : 'Yeni alternatif yanıt üret (Swipe)'
                                }
                              >
                                <RefreshCw className="w-3 h-3" />
                                {variants.length === 1 && (
                                  <span className="text-[11px] font-medium">
                                    {isEn ? 'Swipe' : 'Yenile'}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {/* H4: Continue Scene Button — STRICTLY visible ONLY when Roleplay Directive is active on the last AI message */}
                        {isRoleplayMode && !isUser && !isError && isLastMessage && onContinueMessage && (
                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() => onContinueMessage(msg.id)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 border text-[11px] font-semibold transition-all duration-150 active:scale-95 mr-0.5 cursor-pointer disabled:opacity-40 ${
                              isDarkMode
                                ? 'bg-[#9b72cb]/15 hover:bg-[#9b72cb]/25 border-[#9b72cb]/40 text-[#d0bcff]'
                                : 'bg-[#f3e8ff] hover:bg-[#e9d5ff] border-[#9b72cb]/40 text-[#6b21a8]'
                            }`}
                            title={
                              isEn
                                ? 'Continue the roleplay scene or unfinished response without sending a message'
                                : 'Araya mesaj yazmadan sahneyi veya yarım kalan yanıtı kaldığı yerden devam ettir'
                            }
                          >
                            <FastForward className="w-3 h-3" />
                            <span>{isEn ? 'Continue' : 'Devam Ettir'}</span>
                          </button>
                        )}

                        {/* Copy Button */}
                        {!isError && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className={`p-1.5 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                              isDarkMode ? 'hover:bg-[#1e1f20] text-[#9fa1a0] hover:text-white' : 'hover:bg-[#f0f4f9] text-[#5e6266] hover:text-black'
                            }`}
                            title={isEn ? 'Copy message' : 'Mesajı kopyala'}
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-[#34a853]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* A3: Edit Message Button */}
                        {!isError && (
                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() => startEditingMessage(msg)}
                            className={`p-1.5 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                              isDarkMode ? 'hover:bg-[#1e1f20] text-[#9fa1a0] hover:text-white' : 'hover:bg-[#f0f4f9] text-[#5e6266] hover:text-black'
                            }`}
                            title={isEn ? 'Edit message' : 'Mesajı düzenle'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* G3: Branch / Fork Conversation from this Message */}
                        {!isError && onForkFromMessage && (
                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() => onForkFromMessage(msg.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                              isDarkMode
                                ? 'hover:bg-[#1e1f20] text-[#9fa1a0] hover:text-[#c58af9]'
                                : 'hover:bg-[#f0f4f9] text-[#5e6266] hover:text-[#7627bb]'
                            }`}
                            title={
                              isEn
                                ? 'Branch into a new chat from this point (keeps original chat intact)'
                                : 'Ana sohbeti bozmadan bu noktadan yeni bir sohbet dalı oluştur'
                            }
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden sm:inline">
                              {isEn ? 'Branch' : 'Dallandır'}
                            </span>
                          </button>
                        )}

                        {/* A3: Rewind Here Button (for messages before the end of the chat) */}
                        {isNotLastMessage && (
                          confirmRewindId === msg.id ? (
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] animate-scale-in ${
                                isDarkMode
                                  ? 'bg-[#ea4335]/15 border-[#ea4335]/40 text-[#ff8a80]'
                                  : 'bg-[#ea4335]/10 border-[#ea4335]/30 text-[#d93025]'
                              }`}
                            >
                              <span>{isEn ? 'Rewind here?' : 'Buraya sarılsın mı?'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onRewindToMessage?.(msg.id);
                                  setConfirmRewindId(null);
                                }}
                                className="px-1.5 py-0.5 rounded-full bg-[#ea4335] text-white font-semibold hover:bg-[#c5221f] cursor-pointer"
                              >
                                {isEn ? 'Yes' : 'Evet'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRewindId(null)}
                                className="px-1 py-0.5 opacity-75 hover:opacity-100 cursor-pointer"
                              >
                                {isEn ? 'No' : 'Hayır'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isStreaming}
                              onClick={() => setConfirmRewindId(msg.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                                isDarkMode
                                  ? 'hover:bg-[#1e1f20] text-[#9fa1a0] hover:text-[#ff8a80]'
                                  : 'hover:bg-[#f0f4f9] text-[#5e6266] hover:text-[#d93025]'
                              }`}
                              title={
                                isEn
                                  ? 'Rewind story to this message (deletes subsequent messages)'
                                  : 'Hikayeyi bu mesaja geri sar (sonraki mesajları siler)'
                              }
                            >
                              <History className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">
                                {isEn ? 'Rewind' : 'Geri Sar'}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Message (only when creating a brand-new message at the bottom, not regenerating or continuing an existing one) */}
            {isStreaming && !regeneratingMessageId && !continuingMessageId && (
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

      {/* Input Area with B2 Multimodal Attachment Picker, Paste & Drag-Drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDraggingOver) setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
          }
        }}
        className={`p-2.5 sm:p-4 border-t transition-colors shrink-0 sticky bottom-0 z-30 pb-[max(env(safe-area-inset-bottom,0px),10px)] ${
          isDarkMode ? 'border-[#202124] bg-[#131314]' : 'border-[#e3e8ef] bg-[#ffffff]'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.json,.csv,.js,.jsx,.ts,.tsx,.py,.html,.css,.sql,.xml,.yaml,.yml,.c,.cpp,.h,.java,.cs,.go,.rs,.php,.rb,.sh"
            onChange={handleFileChange}
            className="hidden"
          />

          <form
            onSubmit={handleSubmit}
            className={`flex flex-col rounded-3xl border transition-all duration-200 px-3 sm:px-4 py-2 shadow-xs ${
              isDraggingOver
                ? 'border-[#4285f4] ring-2 ring-[#4285f4]/30 bg-[#4285f4]/5'
                : isDarkMode
                  ? 'bg-[#1e1f20] border-[#2f3032] focus-within:border-[#4285f4]/80 focus-within:ring-2 focus-within:ring-[#4285f4]/20'
                  : 'bg-[#f0f4f9] border-[#dfe3e8] focus-within:border-[#4285f4]/80 focus-within:ring-2 focus-within:ring-[#4285f4]/20 focus-within:bg-white'
            }`}
          >
            {/* Pending Attachments Preview Strip */}
            {(pendingAttachments.length > 0 || isProcessingFiles) && (
              <div className="flex flex-wrap items-center gap-2 pb-2.5 mb-2 border-b border-black/10 dark:border-white/10 animate-fade-up">
                {pendingAttachments.map((att) => {
                  const isImg = att.mimeType.startsWith('image/') && (att.previewUrl || att.data);
                  const imgSrc =
                    att.previewUrl || (att.data ? `data:${att.mimeType};base64,${att.data}` : '');

                  return (
                    <div
                      key={att.id}
                      className={`relative group/att flex items-center gap-2 rounded-2xl border p-1.5 pr-2.5 text-xs transition-all animate-scale-in ${
                        isDarkMode
                          ? 'bg-[#282a2c] border-[#3b3d40] text-[#e3e3e3]'
                          : 'bg-white border-[#dfe3e8] text-[#1f1f1f]'
                      }`}
                    >
                      {isImg && imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={att.name}
                          onClick={() => setLightboxImage({ url: imgSrc, name: att.name })}
                          className="w-11 h-11 rounded-xl object-cover cursor-pointer shrink-0 border border-black/10 dark:border-white/10"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            att.mimeType === 'application/pdf'
                              ? 'bg-[#ea4335]/15 text-[#ea4335]'
                              : 'bg-[#4285f4]/15 text-[#4285f4]'
                          }`}
                        >
                          {att.mimeType === 'application/pdf' ? (
                            <FileText className="w-5 h-5" />
                          ) : (
                            <FileCode className="w-5 h-5" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 max-w-[130px] sm:max-w-[160px]">
                        <div className="truncate font-medium text-[11.5px]">{att.name}</div>
                        <div
                          className={`text-[10px] ${
                            isDarkMode ? 'text-[#8e918f]' : 'text-[#5e6266]'
                          }`}
                        >
                          {isImg
                            ? isEn
                              ? 'Image'
                              : 'Görsel'
                            : att.mimeType === 'application/pdf'
                              ? 'PDF'
                              : isEn
                                ? 'Code / File'
                                : 'Kod / Dosya'}
                          {att.size ? ` • ${Math.max(1, Math.round(att.size / 1024))} KB` : ''}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[#9fa1a0] hover:text-[#ea4335] transition-colors cursor-pointer"
                        title={isEn ? 'Remove attachment' : 'Eki kaldır'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {isProcessingFiles && (
                  <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#4285f4]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEn ? 'Processing file...' : 'Dosya hazırlanıyor...'}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-end gap-1.5 sm:gap-2">
              {/* + Add Image / File Button */}
              <button
                type="button"
                disabled={isStreaming || isProcessingFiles || pendingAttachments.length >= 10}
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-full transition-all duration-150 active:scale-90 shrink-0 cursor-pointer ${
                  isDarkMode
                    ? 'hover:bg-[#282a2c] text-[#c4c7c5] hover:text-white disabled:opacity-40'
                    : 'hover:bg-[#e1e7f0] text-[#444746] hover:text-black disabled:opacity-40'
                }`}
                title={
                  isEn
                    ? 'Attach image, screenshot, PDF, or code file (+)'
                    : 'Resim, ekran görüntüsü, PDF veya kod dosyası ekle (+)'
                }
                aria-label={isEn ? 'Add attachment' : 'Dosya veya görsel ekle'}
              >
                <Plus className="w-5 h-5" />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={handleFocus}
                onClick={handleFocus}
                placeholder={
                  pendingAttachments.length > 0
                    ? isEn
                      ? 'Add a message or press Send...'
                      : 'Mesajınızı ekleyin veya doğrudan Gönderin...'
                    : isEn
                      ? 'Message mAI... (or paste/drop an image)'
                      : "mAI'a bir mesaj yazın... (veya görsel/dosya ekleyin)"
                }
                disabled={isStreaming}
                className={`flex-1 bg-transparent resize-none outline-none text-[15px] leading-relaxed max-h-40 py-1 min-w-0 ${
                  isDarkMode ? 'text-white placeholder-[#8e918f]' : 'text-[#1f1f1f] placeholder-[#747775]'
                }`}
              />

              {/* Gemini-Style Model Selector Inside Input Bubble */}
              {availableModels.length > 0 && onSelectModel && (
                <div className="relative shrink-0 self-center" ref={modelDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsModelMenuOpen((prev) => !prev)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#282a2c]/80 hover:bg-[#333537] text-[#c4c7c5] hover:text-white border border-[#3b3d40]/70'
                        : 'bg-white/80 hover:bg-[#e1e7f0] text-[#444746] hover:text-[#1f1f1f] border border-[#dfe3e8]'
                    }`}
                    title={`${isEn ? 'Select Model' : 'Model Seç'}: ${activeModelObj.name}`}
                  >
                    <span className="truncate max-w-[85px] sm:max-w-[130px]">
                      {compactModelLabel}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 opacity-65 transition-transform duration-150 ${
                        isModelMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isModelMenuOpen && (
                    <div
                      className={`absolute bottom-full right-0 mb-2 w-60 rounded-2xl shadow-2xl border py-1.5 z-50 animate-scale-in origin-bottom-right ${
                        isDarkMode
                          ? 'bg-[#1e1f20] border-[#2f3032] text-[#e3e3e3]'
                          : 'bg-white border-[#e3e8ef] text-[#1f1f1f]'
                      }`}
                    >
                      <div className="px-3 py-1 text-[11px] font-semibold opacity-50 uppercase tracking-wider">
                        {isEn ? 'Choose Model' : 'Model Seçimi'}
                      </div>
                      {availableModels.map((m) => {
                        const isSelected = m.id === currentModel;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onSelectModel(m.id);
                              setIsModelMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-[#282a2c] font-semibold text-white'
                                  : 'bg-[#e9eef6] font-semibold text-[#1a73e8]'
                                : isDarkMode
                                  ? 'hover:bg-[#282a2c]/60'
                                  : 'hover:bg-[#f0f4f9]'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="font-medium">{m.label}</div>
                              <div className="text-[10px] opacity-60 truncate">{m.id}</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 shrink-0 text-[#4285f4]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

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
                  disabled={(!inputText.trim() && pendingAttachments.length === 0) || isProcessingFiles}
                  className={`p-2.5 rounded-full transition-transform duration-75 active:scale-90 shrink-0 ${
                    inputText.trim() || pendingAttachments.length > 0
                      ? 'bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-sm cursor-pointer'
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

          <div className="text-center mt-2">
            <span className={`text-[11px] ${isDarkMode ? 'text-[#8e918f]' : 'text-[#747775]'}`}>
              {isEn
                ? 'mAI may make mistakes. Verify important information.'
                : 'mAI hata yapabilir, bu nedenle önemli bilgileri kontrol edin.'}
            </span>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox for Image Attachments */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-4xl flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2 text-white/90 text-xs font-medium truncate">
              <ImageIcon className="w-4 h-4 text-[#8ab4f8] shrink-0" />
              <span className="truncate">{lightboxImage.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label={isEn ? 'Close preview' : 'Önizlemeyi kapat'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl border border-white/10 animate-scale-in"
          />
        </div>
      )}
    </div>
  );
};
