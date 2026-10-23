import React, { useState, useEffect } from 'react';
import { Key, X, Check, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  hasEnvKey?: boolean;
  uiLanguage?: 'tr' | 'en';
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

  useEffect(() => {
    setKeyValue(apiKey);
  }, [apiKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(keyValue.trim());
    onClose();
  };

  const handleClear = () => {
    setKeyValue('');
    onSaveApiKey('');
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
      isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 border transform transition-all duration-200 ease-out ${
        isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'
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
                {isEn ? 'Uninterrupted access with your own API quota' : 'Kendi API kotanızla kesintisiz kullanım'}
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

        {hasEnvKey && (
          <div className={`mb-4 p-3 rounded-2xl text-xs ${
            isDarkMode ? 'bg-[#282a2c] text-[#c4c7c5]' : 'bg-[#e9eef6] text-[#041e49]'
          }`}>
            {isEn
              ? 'Server environment key is active. You may optionally enter your own custom key below.'
              : 'Sunucu ortam anahtarı devrede. İsteğe bağlı olarak kendi özel anahtarınızı da girebilirsiniz.'}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium opacity-80">
                API Key
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
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="AIzaSy..."
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
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
        </form>
      </div>
    </div>
  );
};
