import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  ChevronDown,
  Check,
  X,
  Pencil,
  Settings,
  Sliders,
  LogOut,
  LogIn
} from 'lucide-react';
import { User } from '../firebase.ts';

interface TopAppBarProps {
  isDarkMode: boolean;
  onOpenDrawer: () => void;
  onOpenSettings: () => void;
  onOpenDirective: () => void;
  hasApiKey: boolean;
  hasDirective: boolean;
  directiveBadgeText?: string;
  activeConversationTitle?: string;
  onRenameActiveChat?: (newTitle: string) => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  availableModels: { id: string; name: string; label: string }[];
  uiLanguage?: 'tr' | 'en';
  user?: User | null;
  isAuthLoading?: boolean;
  isSyncingCloud?: boolean;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  isDarkMode,
  onOpenDrawer,
  onOpenSettings,
  onOpenDirective,
  hasApiKey,
  hasDirective,
  directiveBadgeText,
  activeConversationTitle,
  onRenameActiveChat,
  currentModel,
  onSelectModel,
  availableModels,
  uiLanguage = 'en',
  user,
  isAuthLoading = false,
  onSignInGoogle,
  onSignOutGoogle
}) => {
  const isEn = uiLanguage === 'en';
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitleInput, setNewTitleInput] = useState(activeConversationTitle || '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewTitleInput(activeConversationTitle || '');
    setIsEditingTitle(false);
  }, [activeConversationTitle]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveTitle = () => {
    const trimmed = newTitleInput.trim();
    if (trimmed && onRenameActiveChat) {
      onRenameActiveChat(trimmed);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setNewTitleInput(activeConversationTitle || '');
      setIsEditingTitle(false);
    }
  };

  const activeModelObj = availableModels.find((m) => m.id === currentModel) || {
    id: currentModel,
    name: currentModel,
    label: currentModel
  };

  const localizedActiveTitle =
    activeConversationTitle === 'Yeni Sohbet' && isEn
      ? 'New Chat'
      : activeConversationTitle === 'New Chat' && !isEn
        ? 'Yeni Sohbet'
        : activeConversationTitle;

  return (
    <header
      className={`h-14 border-b flex items-center justify-between px-2.5 sm:px-4 select-none sticky top-0 z-40 shrink-0 backdrop-blur-md shadow-xs ${
        isDarkMode
          ? 'bg-[#131314]/95 border-[#202124] text-[#e3e3e3]'
          : 'bg-[#ffffff]/95 border-[#e3e8ef] text-[#1f1f1f]'
      }`}
    >
      {/* Top App Bar Left: Drawer Menu & Model Selector */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <button
          onClick={onOpenDrawer}
          className={`p-2 rounded-full transition-transform active:scale-95 duration-75 shrink-0 ${
            isDarkMode
              ? 'hover:bg-[#1e1f20] text-[#c4c7c5]'
              : 'hover:bg-[#f0f4f9] text-[#444746]'
          }`}
          aria-label={isEn ? 'Open conversation menu' : 'Sohbetler menüsünü aç'}
          title={isEn ? 'Conversations' : 'Sohbetler'}
        >
          <Menu className="w-5 h-5" />
        </button>

        <span
          onClick={onOpenDrawer}
          className="text-base font-bold tracking-tight cursor-pointer select-none px-1"
        >
          mAI
        </span>

        {/* Model Selector Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-transform duration-75 active:scale-95 ${
              isDarkMode
                ? 'bg-[#1e1f20] hover:bg-[#282a2c] text-[#e3e3e3] border border-[#2f3032]'
                : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] text-[#1f1f1f] border border-[#dfe3e8]'
            }`}
            title={`${isEn ? 'Active Model' : 'Aktif Model'}: ${activeModelObj.name}`}
          >
            <span className="truncate max-w-[115px] sm:max-w-[160px]">{activeModelObj.label}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${
                isModelDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isModelDropdownOpen && (
            <div
              className={`absolute top-full left-0 mt-1.5 w-60 rounded-2xl shadow-xl border py-1.5 z-50 animate-scale-in origin-top-left ${
                isDarkMode
                  ? 'bg-[#1e1f20] border-[#2f3032] text-[#e3e3e3]'
                  : 'bg-white border-[#e3e8ef] text-[#1f1f1f]'
              }`}
            >
              <div className="px-3 py-1 text-[11px] font-medium opacity-50 uppercase tracking-wider">
                {isEn ? 'Model Selection' : 'Model Seçimi'}
              </div>
              {availableModels.map((m) => {
                const isSelected = m.id === currentModel;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectModel(m.id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-[#282a2c] font-medium text-white'
                          : 'bg-[#e9eef6] font-medium text-[#1a73e8]'
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
      </div>

      {/* Top App Bar Right Actions: Chat Title, Quick Directive Edit, Google Account, & Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {localizedActiveTitle &&
          (isEditingTitle ? (
            <div className="hidden md:flex items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
              <input
                ref={titleInputRef}
                type="text"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                className="bg-transparent text-xs outline-none w-24 sm:w-36 font-medium"
                placeholder={isEn ? 'Chat title...' : 'Sohbet adı...'}
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 rounded-full text-[#34a853] hover:bg-black/10 dark:hover:bg-white/10"
                title={isEn ? 'Save' : 'Kaydet'}
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setNewTitleInput(activeConversationTitle || '');
                  setIsEditingTitle(false);
                }}
                className="p-1 rounded-full text-[#ea4335] hover:bg-black/10 dark:hover:bg-white/10"
                title={isEn ? 'Cancel' : 'İptal'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className={`hidden md:flex group items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-normal cursor-pointer transition-transform active:scale-95 duration-75 ${
                isDarkMode
                  ? 'bg-[#1e1f20] hover:bg-[#282a2c] text-[#9fa1a0] hover:text-white'
                  : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] text-[#5e6266] hover:text-black'
              }`}
              title={isEn ? 'Click to rename chat' : 'Sohbete isim vermek için tıklayın'}
            >
              <span className="truncate max-w-[130px]">{localizedActiveTitle}</span>
              <Pencil className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ))}

        {/* Directive / Roleplay Button */}
        <button
          type="button"
          onClick={onOpenDirective}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-transform duration-75 active:scale-95 cursor-pointer ${
            hasDirective
              ? 'bg-[#4285f4]/15 hover:bg-[#4285f4]/25 text-[#4285f4] dark:text-[#8ab4f8] border border-[#4285f4]/35'
              : isDarkMode
                ? 'bg-[#1e1f20] hover:bg-[#282a2c] text-[#c4c7c5] border border-[#2f3032]'
                : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] text-[#444746] border border-[#dfe3e8]'
          }`}
          title={isEn ? 'Edit Directive & Roleplay Persona' : 'Direktif ve Rol Yapma Karakterini Düzenle'}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[95px] sm:max-w-[140px]">
            {hasDirective && directiveBadgeText
              ? directiveBadgeText
              : isEn
                ? 'Directive'
                : 'Direktif'}
          </span>
        </button>

        {/* Google Sign-In / User Profile Pill */}
        {!isAuthLoading && (
          <div className="relative" ref={accountRef}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className={`flex items-center p-1 rounded-full text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#1e1f20] hover:bg-[#282a2c] border-[#2f3032] text-[#e3e3e3]'
                      : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] border-[#dfe3e8] text-[#1f1f1f]'
                  }`}
                  title={user.email || (isEn ? 'Google Account' : 'Google Hesabı')}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || (isEn ? 'Profile' : 'Profil')}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#4285f4] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      {(user.displayName || user.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {isAccountMenuOpen && (
                  <div
                    className={`absolute right-0 top-full mt-1.5 w-60 rounded-2xl shadow-xl border p-3 z-50 animate-scale-in origin-top-right ${
                      isDarkMode
                        ? 'bg-[#1e1f20] border-[#2f3032] text-[#e3e3e3]'
                        : 'bg-white border-[#e3e8ef] text-[#1f1f1f]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-black/5 dark:border-white/5">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#4285f4] text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {(user.displayName || user.email || 'G')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs truncate">
                          {user.displayName || (isEn ? 'Google User' : 'Google Kullanıcısı')}
                        </div>
                        <div className="text-[11px] opacity-65 truncate">{user.email}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onSignOutGoogle?.();
                      }}
                      className={`w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#282a2c] hover:bg-[#ea4335]/20 text-[#ff8a80]'
                          : 'bg-[#f8f9fa] hover:bg-[#ea4335]/10 text-[#d93025]'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Sign Out' : 'Çıkış Yap'}</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium bg-[#4285f4] hover:bg-[#1a73e8] text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                title={isEn ? 'Sign in with Google' : 'Google ile giriş yapın'}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {isEn ? 'Google Sign In' : 'Google ile Giriş'}
                </span>
                <span className="sm:hidden">{isEn ? 'Sign In' : 'Giriş'}</span>
              </button>
            )}
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-transform duration-75 active:scale-95 ${
            !hasApiKey
              ? 'bg-[#ea4335] text-white shadow-xs animate-pulse'
              : isDarkMode
                ? 'bg-[#1e1f20] hover:bg-[#282a2c] text-[#c4c7c5] border border-[#2f3032]'
                : 'bg-[#f0f4f9] hover:bg-[#e1e7f0] text-[#444746] border border-[#dfe3e8]'
          }`}
          aria-label={isEn ? 'Settings Menu' : 'Ayarlar Menüsü'}
          title={isEn ? 'Settings' : 'Ayarlar'}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isEn ? 'Settings' : 'Ayarlar'}</span>
        </button>
      </div>
    </header>
  );
};
