import React from 'react';
import {
  X,
  Settings,
  Sliders,
  Key,
  Sun,
  Moon,
  Check,
  ChevronRight,
  Globe,
  LogIn,
  LogOut
} from 'lucide-react';
import { User } from '../firebase.ts';

interface SettingsModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onOpenDirective: () => void;
  onOpenApiKey: () => void;
  onToggleTheme: () => void;
  onDeleteActiveChat?: () => void;
  hasApiKey: boolean;
  hasDirective: boolean;
  directivePreview?: string;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  availableModels: { id: string; name: string; label: string }[];
  activeConversationTitle?: string;
  uiLanguage: 'tr' | 'en';
  onSetLanguage: (lang: 'tr' | 'en') => void;
  user?: User | null;
  isSyncingCloud?: boolean;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  isDarkMode,
  onClose,
  onOpenDirective,
  onOpenApiKey,
  onToggleTheme,
  hasApiKey,
  hasDirective,
  directivePreview,
  currentModel,
  onSelectModel,
  availableModels,
  activeConversationTitle,
  uiLanguage,
  onSetLanguage,
  user,
  onSignInGoogle,
  onSignOutGoogle
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Animated Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Animated Settings Dialog Container */}
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl z-10 border overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-90 opacity-0 translate-y-5'
        } ${
          isDarkMode
            ? 'bg-[#1e1f20] border-[#2f3032] text-[#e3e3e3]'
            : 'bg-white border-[#e3e8ef] text-[#1f1f1f]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl transition-transform duration-300 ${
                isOpen ? 'rotate-0 scale-100' : '-rotate-45 scale-75'
              } ${
                isDarkMode ? 'bg-[#282a2c] text-[#a8c7fa]' : 'bg-[#e8f0fe] text-[#1a73e8]'
              }`}
            >
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                {uiLanguage === 'tr' ? 'Ayarlar' : 'Settings'}
              </h2>
              {activeConversationTitle && (
                <p
                  className={`text-[11px] truncate max-w-[240px] ${
                    isDarkMode ? 'text-[#9fa1a0]' : 'text-[#747775]'
                  }`}
                >
                  {activeConversationTitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-all duration-200 hover:rotate-90 active:scale-90 ${
              isDarkMode
                ? 'hover:bg-[#282a2c] text-[#c4c7c5]'
                : 'hover:bg-[#f0f4f9] text-[#444746]'
            }`}
            aria-label={uiLanguage === 'tr' ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Section 0: Google Account */}
          <div className="transition-all duration-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60 mb-2 px-1">
              {uiLanguage === 'tr' ? 'Google Hesabı' : 'Google Account'}
            </div>

            {user ? (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-200 ${
                  isDarkMode ? 'bg-[#18191a] border-[#2f3032]' : 'bg-[#f8f9fa] border-[#e3e8ef]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Profile'}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#4285f4] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {(user.displayName || user.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-xs truncate">
                      {user.displayName || (uiLanguage === 'tr' ? 'Google Kullanıcısı' : 'Google User')}
                    </div>
                    <div className="text-[11px] opacity-65 truncate">{user.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSignOutGoogle}
                  className="px-3 py-1.5 rounded-xl bg-[#ea4335]/15 text-[#ea4335] hover:bg-[#ea4335]/25 font-medium text-xs flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{uiLanguage === 'tr' ? 'Çıkış' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#4285f4]/40 bg-[#4285f4]/10 hover:bg-[#4285f4]/20 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#4285f4] text-white transition-transform duration-200 group-hover:scale-105">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#4285f4] dark:text-[#8ab4f8]">
                      {uiLanguage === 'tr' ? 'Google ile Giriş Yap' : 'Sign In with Google'}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-[#9fa1a0]' : 'text-[#747775]'}`}>
                      {uiLanguage === 'tr'
                        ? 'Sohbetlerinizi Google hesabınızla senkronize edin'
                        : 'Sync your conversations with your Google account'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#4285f4] group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          {/* Section 1: Directive & Roleplay */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60 mb-2 px-1">
              {uiLanguage === 'tr' ? 'Yapay Zeka & Direktif' : 'AI & Directives'}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDirective();
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] text-left group cursor-pointer ${
                isDarkMode
                  ? 'bg-[#18191a] hover:bg-[#282a2c] border-[#2f3032]'
                  : 'bg-[#f8f9fa] hover:bg-[#f0f4f9] border-[#e3e8ef]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                    hasDirective
                      ? 'bg-[#4285f4] text-white shadow-xs'
                      : isDarkMode
                        ? 'bg-[#282a2c] text-[#c4c7c5]'
                        : 'bg-white text-[#444746]'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <span>
                      {uiLanguage === 'tr' ? 'Rol Yapma & Direktif' : 'Roleplay & Directives'}
                    </span>
                    {hasDirective && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#4285f4]/15 text-[#4285f4]">
                        {uiLanguage === 'tr' ? 'Aktif' : 'Active'}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-[#9fa1a0]' : 'text-[#747775]'}`}>
                    {directivePreview ||
                      (uiLanguage === 'tr'
                        ? '120+ anime karakteri, Roleplay Engine veya uzmanlık ayarları'
                        : '120+ anime characters, Roleplay Engine or expertise settings')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Section 2: Gemini API Key */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60 mb-2 px-1">
              {uiLanguage === 'tr' ? 'Erişim & Anahtar' : 'Access & API Key'}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenApiKey();
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] text-left group cursor-pointer ${
                hasApiKey
                  ? isDarkMode
                    ? 'bg-[#18191a] hover:bg-[#282a2c] border-[#2f3032]'
                    : 'bg-[#f8f9fa] hover:bg-[#f0f4f9] border-[#e3e8ef]'
                  : 'bg-[#ea4335]/10 border-[#ea4335]/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                    hasApiKey
                      ? 'bg-[#34a853]/15 text-[#34a853]'
                      : 'bg-[#ea4335] text-white animate-pulse'
                  }`}
                >
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <span>{uiLanguage === 'tr' ? 'Gemini API Anahtarı' : 'Gemini API Key'}</span>
                    {hasApiKey ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#34a853]/15 text-[#34a853] flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>{uiLanguage === 'tr' ? 'Tanımlı' : 'Configured'}</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#ea4335] text-white">
                        {uiLanguage === 'tr' ? 'Gerekli' : 'Required'}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-[#9fa1a0]' : 'text-[#747775]'}`}>
                    {hasApiKey
                      ? uiLanguage === 'tr'
                        ? 'Kişisel API anahtarınızı güncelleyin veya kontrol edin'
                        : 'View or update your personal API key'
                      : uiLanguage === 'tr'
                        ? 'Cevap almak için API anahtarınızı girin'
                        : 'Enter your API key to chat with Gemini'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Section 3: Active Gemini Model */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60 mb-2 px-1">
              {uiLanguage === 'tr' ? 'Aktif Gemini Modeli' : 'Active Gemini Model'}
            </div>

            <div
              className={`p-1.5 rounded-2xl border flex flex-col gap-1 ${
                isDarkMode ? 'bg-[#18191a] border-[#2f3032]' : 'bg-[#f8f9fa] border-[#e3e8ef]'
              }`}
            >
              {availableModels.map((m) => {
                const isSelected = m.id === currentModel;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectModel(m.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 text-left active:scale-[0.98] cursor-pointer ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-[#282a2c] text-white font-medium border border-[#3b3d40] shadow-xs'
                          : 'bg-white text-[#1a73e8] font-medium border border-[#dfe3e8] shadow-xs'
                        : 'opacity-70 hover:opacity-100 hover:translate-x-0.5'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">{m.label}</div>
                      <div className="text-[10px] opacity-60 font-mono">{m.id}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#4285f4] shrink-0 animate-scale-in" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Appearance & Theme */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60 mb-2 px-1">
              {uiLanguage === 'tr' ? 'Görünüm & Tema' : 'Appearance & Theme'}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isDarkMode) onToggleTheme();
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                  !isDarkMode
                    ? 'bg-white text-[#1a73e8] border-[#1a73e8] font-semibold shadow-xs'
                    : isDarkMode
                      ? 'bg-[#18191a] border-[#2f3032] opacity-70 hover:opacity-100'
                      : 'bg-gray-100 border-gray-200'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{uiLanguage === 'tr' ? 'Açık Tema' : 'Light Theme'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isDarkMode) onToggleTheme();
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#282a2c] text-white border-[#4285f4] font-semibold shadow-xs'
                    : 'bg-white border-[#dfe3e8] opacity-70 hover:opacity-100'
                }`}
              >
                <Moon className="w-4 h-4 text-[#4285f4]" />
                <span>{uiLanguage === 'tr' ? 'Koyu Tema' : 'Dark Theme'}</span>
              </button>
            </div>
          </div>

          {/* Section 5: UI Language */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#4285f4]" />
                <span>{uiLanguage === 'tr' ? 'Arayüz Dili' : 'UI Language'}</span>
              </div>
              <span className="text-[11px] font-medium text-[#4285f4]">
                {uiLanguage === 'en' ? 'English' : 'Türkçe'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onSetLanguage('en')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                  uiLanguage === 'en'
                    ? 'bg-[#4285f4]/15 border-[#4285f4] text-[#4285f4] font-semibold shadow-xs'
                    : isDarkMode
                      ? 'bg-[#18191a] hover:bg-[#282a2c] border-[#2f3032] text-[#c4c7c5]'
                      : 'bg-[#f8f9fa] hover:bg-[#f0f4f9] border-[#e3e8ef] text-[#444746]'
                }`}
              >
                <span className="text-sm">🇬🇧</span>
                <span>English</span>
                {uiLanguage === 'en' && <Check className="w-3.5 h-3.5 animate-scale-in" />}
              </button>

              <button
                type="button"
                onClick={() => onSetLanguage('tr')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                  uiLanguage === 'tr'
                    ? 'bg-[#4285f4]/15 border-[#4285f4] text-[#4285f4] font-semibold shadow-xs'
                    : isDarkMode
                      ? 'bg-[#18191a] hover:bg-[#282a2c] border-[#2f3032] text-[#c4c7c5]'
                      : 'bg-[#f8f9fa] hover:bg-[#f0f4f9] border-[#e3e8ef] text-[#444746]'
                }`}
              >
                <span className="text-sm">🇹🇷</span>
                <span>Türkçe</span>
                {uiLanguage === 'tr' && <Check className="w-3.5 h-3.5 animate-scale-in" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
