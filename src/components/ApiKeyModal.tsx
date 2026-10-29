import React, { useState, useEffect } from 'react';
import { Key, X, Check, ExternalLink, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { verifyGeminiApiKey } from '../utils/geminiClient.ts';

interface ApiKeyModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  hasEnvKey?: boolean;
  uiLanguage?: 'tr' | 'en';
}

function sanitizeKeyInput(raw: string): string {
  const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!cleaned) return '';
  const matches = cleaned.match(/AIza[a-zA-Z0-9_-]{30,}/g);
  if (matches && matches.length > 0) {
    return Array.from(new Set(matches.map((k) => k.trim()))).join('\n');
  }
  return cleaned
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^["'`]+|["'`]+$/g, '').trim())
    .filter(Boolean)
    .join('\n');
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  isDarkMode,
  onClose,
  apiKey,
  onSaveApiKey,
  hasEnvKey,
  uiLanguage = 'tr'
}) => {
  const isEn = uiLanguage === 'en';
  const [keyValue, setKeyValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setKeyValue(apiKey);
    setTestStatus(null);
  }, [apiKey, isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeKeyInput(keyValue);
    setKeyValue(sanitized);
    onSaveApiKey(sanitized);
    onClose();
  };

  const handleTestKey = async () => {
    const sanitized = sanitizeKeyInput(keyValue);
    if (!sanitized) {
      setTestStatus({
        type: 'error',
        message: isEn ? 'Please enter an API key first.' : 'Lütfen önce bir API anahtarı girin.'
      });
      return;
    }
    setKeyValue(sanitized);
    setIsTesting(true);
    setTestStatus(null);
    const result = await verifyGeminiApiKey(sanitized, uiLanguage);
    setIsTesting(false);

    if (result.valid) {
      const finalKey = result.sanitizedKey || sanitized;
      setKeyValue(finalKey);
      onSaveApiKey(finalKey);
      setTestStatus({
        type: 'success',
        message: isEn
          ? `Verified & Saved! Active bucket: ${result.workingModel}${
              (result.keyCount || 1) > 1 ? ` (${result.keyCount} keys rotating)` : ''
            }`
          : `Doğrulandı ve Kaydedildi! Aktif model: ${result.workingModel}${
              (result.keyCount || 1) > 1 ? ` (${result.keyCount} anahtar rotasyonda)` : ''
            }`
      });
    } else {
      setTestStatus({
        type: 'error',
        message:
          result.error ||
          (isEn ? 'Could not verify API key.' : 'API anahtarı doğrulanamadı.')
      });
    }
  };

  const handleClear = () => {
    setKeyValue('');
    setTestStatus(null);
    onSaveApiKey('');
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
      isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 border transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-5'
      } ${
        isDarkMode 
          ? 'bg-[#1e1f20] border-[#2f3032] text-[#e3e3e3]' 
          : 'bg-white border-[#dfe3e8] text-[#1f1f1f]'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#4285f4]/15 flex items-center justify-center text-[#4285f4]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                {isEn ? 'Gemini API Key' : 'Gemini API Anahtarı'}
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-[#9fa1a0]' : 'text-[#5e6266]'}`}>
                {isEn
                  ? 'Supports single key or multiple keys (auto-rotation)'
                  : 'Tek veya çoklu API anahtarı (otomatik rotasyon) desteklenir'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-[#282a2c] text-[#c4c7c5]' : 'hover:bg-[#f0f4f9] text-[#444746]'
            }`}
            aria-label={isEn ? 'Close' : 'Kapat'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Important Project Quota Explanation */}
        <div className={`mb-4 p-3 rounded-2xl text-[11.5px] leading-relaxed border ${
          isDarkMode
            ? 'bg-[#282a2c]/80 border-[#3c4043] text-[#d2d5d9]'
            : 'bg-[#f0f4f9] border-[#d3e3fd] text-[#1f1f1f]'
        }`}>
          <span className="font-semibold text-[#4285f4]">
            {isEn ? '💡 Why does a new key say Quota Reached?' : '💡 Yeni anahtar neden kota doldu der?'}
          </span>{' '}
          {isEn
            ? 'Google AI Studio enforces quotas per Google Cloud Project, not per key! When creating a new key, select "Create API key in new project" (or paste multiple keys separated by commas/newlines below).'
            : 'Google AI Studio kotaları anahtar başına değil PROJE başına tanımlar! Yeni anahtar alırken mevcut projeyi değil, "Create API key in new project" (Yeni projede oluştur) seçeneğini seçin. Birden fazla anahtarı virgül veya alt satırla da yapıştırabilirsiniz.'}
        </div>

        {hasEnvKey && !keyValue.trim() && (
          <div className={`mb-3 p-2.5 rounded-xl text-xs ${
            isDarkMode ? 'bg-[#282a2c] text-[#c4c7c5]' : 'bg-[#e9eef6] text-[#041e49]'
          }`}>
            {isEn
              ? 'Server backup key is present. Enter your own key below for dedicated quota.'
              : 'Sunucu yedek anahtarı mevcut. Kendi özel kotanız için aşağıya anahtarınızı girin.'}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium opacity-80">
                {isEn ? 'API Key(s)' : 'API Anahtarı (Tek veya Çoklu)'}
              </label>
              {keyValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-[#ea4335] hover:underline"
                >
                  {isEn ? 'Clear' : 'Temizle'}
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  if (testStatus) setTestStatus(null);
                }}
                placeholder={isEn ? 'AIzaSy... (or multiple keys separated by comma)' : 'AIzaSy... (veya virgülle ayrılmış çoklu anahtar)'}
                className={`w-full px-4 py-2.5 rounded-2xl border text-sm outline-none transition-all pr-16 ${
                  isDarkMode 
                    ? 'bg-[#131314] border-[#2f3032] focus:border-[#4285f4] text-white placeholder-[#747775]' 
                    : 'bg-[#f0f4f9] border-[#dfe3e8] focus:border-[#4285f4] text-black placeholder-[#9fa1a0]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium opacity-60 hover:opacity-100"
              >
                {showKey ? (isEn ? 'Hide' : 'Gizle') : (isEn ? 'Show' : 'Göster')}
              </button>
            </div>
          </div>

          {testStatus && (
            <div
              className={`flex items-start gap-2 p-3 rounded-2xl text-xs leading-relaxed border ${
                testStatus.type === 'success'
                  ? isDarkMode
                    ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDarkMode
                    ? 'bg-red-950/40 border-red-800/50 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {testStatus.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          <div className={`text-xs leading-relaxed ${isDarkMode ? 'text-[#9fa1a0]' : 'text-[#5e6266]'}`}>
            {isEn ? "Don't have a key?" : 'Anahtarınız yok mu?'}{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4285f4] hover:underline inline-flex items-center gap-1 font-medium"
            >
              {isEn ? 'Get one free from Google AI Studio' : "Google AI Studio'dan ücretsiz alın"}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !keyValue.trim()}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 ${
                isDarkMode
                  ? 'border-[#3c4043] hover:bg-[#282a2c] text-[#a8c7fa]'
                  : 'border-[#d3e3fd] hover:bg-[#f0f4f9] text-[#1a73e8]'
              }`}
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>{isEn ? 'Test & Verify' : 'Test Et ve Kaydet'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                  isDarkMode ? 'hover:bg-[#282a2c] text-[#c4c7c5]' : 'hover:bg-[#f0f4f9] text-[#444746]'
                }`}
              >
                {isEn ? 'Cancel' : 'Vazgeç'}
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium bg-[#1a73e8] text-white hover:bg-[#1557b0] transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEn ? 'Save' : 'Kaydet'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

