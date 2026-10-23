import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  X,
  Check,
  Pencil,
  Cloud,
  LogIn,
  LogOut
} from 'lucide-react';
import { Conversation } from '../types.ts';
import { ASSISTANT_FRAMEWORKS, ASSISTANT_CATEGORY_TITLES_EN } from '../utils/directiveFrameworks.ts';
import { User } from '../firebase.ts';
import { MaiBrandIcon } from './MaiBrandIcon.tsx';

interface ConversationDrawerProps {
  isOpen: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onClearAllConversations?: () => void;
  uiLanguage?: 'tr' | 'en';
  user?: User | null;
  isSyncingCloud?: boolean;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
}

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  isDarkMode,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onClearAllConversations,
  uiLanguage = 'tr',
  user,
  isSyncingCloud = false,
  onSignInGoogle,
  onSignOutGoogle
}) => {
  const isEn = uiLanguage === 'en';
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const startRename = (conv: Conversation) => {
    setEditingConvId(conv.id);
    setEditTitleValue(conv.title || (isEn ? 'New Chat' : 'Yeni Sohbet'));
    setConfirmDeleteId(null);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editTitleValue.trim();
    if (trimmed && onRenameConversation) {
      onRenameConversation(id, trimmed);
    }
    setEditingConvId(null);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex transition-all duration-300 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          setConfirmDeleteId(null);
          setEditingConvId(null);
          setShowClearAllConfirm(false);
          onClose();
        }}
      />

      {/* Drawer Container */}
      <div
        className={`relative w-[290px] sm:w-[320px] max-w-[85vw] h-full shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDarkMode
            ? 'bg-[#1e1f20] text-[#e3e3e3] border-r border-[#2f3032]'
            : 'bg-[#f0f4f9] text-[#1f1f1f] border-r border-[#dfe3e8]'
        }`}
      >
        {/* Header with B&W MAI Brand Icon */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MaiBrandIcon size={26} invert={!isDarkMode} />
            <span className="font-semibold text-base tracking-tight">
              {isEn ? 'Conversations' : 'Sohbetler'}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-[#282a2c] text-[#c4c7c5]' : 'hover:bg-[#e1e7f0] text-[#444746]'
            }`}
            aria-label={isEn ? 'Close' : 'Kapat'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Account & Cloud Backup Banner */}
        <div className="px-4 pb-3">
          {user ? (
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                isDarkMode
                  ? 'bg-[#18191a] border-[#2f3032]'
                  : 'bg-white border-[#dfe3e8]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || (isEn ? 'Profile' : 'Profil')}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#4285f4] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(user.displayName || user.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-xs truncate">
                      {user.displayName || (isEn ? 'Google Account' : 'Google Hesabı')}
                    </div>
                    <div className="text-[10px] opacity-65 truncate">{user.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOutGoogle}
                  className="p-1.5 rounded-lg text-[#ea4335] hover:bg-[#ea4335]/10 transition-colors shrink-0 cursor-pointer"
                  title={isEn ? 'Sign Out' : 'Çıkış Yap'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#34a853]">
                <Cloud className={`w-3 h-3 ${isSyncingCloud ? 'animate-pulse text-[#fbbc04]' : ''}`} />
                <span>
                  {isEn
                    ? 'Gmail cloud backup active — chats synced'
                    : 'Gmail bulut yedekleme aktif — sohbetleriniz güvende'}
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignInGoogle}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-2xl text-xs font-semibold bg-[#4285f4] hover:bg-[#1a73e8] text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>
                {isEn
                  ? 'Sign In with Google (Backup Chats)'
                  : 'Google ile Giriş Yap (Sohbetleri Yedekle)'}
              </span>
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-2">
          <button
            onClick={() => {
              setConfirmDeleteId(null);
              setEditingConvId(null);
              onNewChat();
              onClose();
            }}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-full text-xs font-medium transition-transform duration-75 active:scale-[0.98] shadow-xs cursor-pointer ${
              isDarkMode
                ? 'bg-[#282a2c] hover:bg-[#333537] text-white border border-[#3b3d40]'
                : 'bg-white hover:bg-[#fafafa] text-[#1f1f1f] border border-[#dfe3e8]'
            }`}
          >
            <Plus className="w-4 h-4 text-[#4285f4]" />
            <span className="font-medium text-[13px]">
              {isEn ? 'New chat' : 'Yeni sohbet'}
            </span>
          </button>
        </div>

        {/* Recent Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase opacity-50">
            {isEn ? 'Recent Chats' : 'Son Sohbetler'}
          </div>

          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs opacity-50">
              {isEn ? 'No past conversations yet.' : 'Henüz sohbet geçmişi yok.'}
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isConfirming = confirmDeleteId === conv.id;
                const isEditing = editingConvId === conv.id;

                let modeBadge = '';
                if (conv.directiveMode === 'roleplay' || conv.roleplayProfile?.name) {
                  modeBadge = `${conv.roleplayProfile?.avatarEmoji || '🎭'} ${
                    conv.roleplayProfile?.name || (isEn ? 'Roleplay' : 'Rol Yapma')
                  }`;
                } else if (conv.directiveMode === 'assistant' && conv.assistantCategory) {
                  modeBadge = isEn
                    ? ASSISTANT_CATEGORY_TITLES_EN[conv.assistantCategory]?.badge || '💡 Assistant'
                    : ASSISTANT_FRAMEWORKS[conv.assistantCategory]?.badge || '💡 Asistan';
                } else if (conv.directive?.trim()) {
                  modeBadge = isEn ? '⚙️ Custom Directive' : '⚙️ Özel Direktif';
                }

                const displayTitle =
                  conv.title === 'Yeni Sohbet' && isEn
                    ? 'New Chat'
                    : conv.title === 'New Chat' && !isEn
                      ? 'Yeni Sohbet'
                      : conv.title || (isEn ? 'New Chat' : 'Yeni Sohbet');

                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                      isActive
                        ? isDarkMode
                          ? 'bg-[#004a77]/40 text-[#c2e7ff] font-medium'
                          : 'bg-[#d3e3fd] text-[#041e49] font-medium'
                        : isDarkMode
                          ? 'hover:bg-[#282a2c] text-[#c4c7c5]'
                          : 'hover:bg-[#e1e7f0] text-[#444746]'
                    }`}
                    onClick={() => {
                      if (!isConfirming && !isEditing) {
                        onSelectConversation(conv.id);
                        onClose();
                      }
                    }}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(conv.id);
                            if (e.key === 'Escape') setEditingConvId(null);
                          }}
                          autoFocus
                          className={`flex-1 px-2 py-1 rounded-lg text-xs outline-none border ${
                            isDarkMode
                              ? 'bg-[#131314] border-[#4285f4] text-white'
                              : 'bg-white border-[#4285f4] text-black'
                          }`}
                        />
                        <button
                          onClick={() => handleSaveRename(conv.id)}
                          className="p-1 rounded-full text-[#34a853] hover:bg-black/10 dark:hover:bg-white/10"
                          title={isEn ? 'Save' : 'Kaydet'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingConvId(null)}
                          className="p-1 rounded-full text-[#ea4335] hover:bg-black/10 dark:hover:bg-white/10"
                          title={isEn ? 'Cancel' : 'İptal'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                          <MessageSquare
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-[#4285f4]' : 'opacity-60'
                            }`}
                          />
                          <div className="truncate">
                            <div className="truncate text-[13px]">{displayTitle}</div>
                            {modeBadge && (
                              <div className="text-[10px] opacity-75 truncate text-[#4285f4] dark:text-[#8ab4f8]">
                                {modeBadge}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions on Hover or Confirming */}
                        <div className="shrink-0 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          {isConfirming ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  onDeleteConversation(conv.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="p-1 rounded-full bg-[#ea4335] text-white hover:bg-[#c5221f]"
                                title={isEn ? 'Confirm' : 'Onayla'}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                title={isEn ? 'Cancel' : 'İptal'}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => startRename(conv)}
                                className={`p-1 rounded-full opacity-0 group-hover:opacity-100 hover:text-[#4285f4] transition-opacity ${
                                  isActive ? 'opacity-70' : ''
                                }`}
                                title={isEn ? 'Rename Chat' : 'İsim Ver / Yeniden Adlandır'}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(conv.id)}
                                className={`p-1 rounded-full opacity-0 group-hover:opacity-100 hover:text-[#ea4335] transition-opacity ${
                                  isActive ? 'opacity-70' : ''
                                }`}
                                title={isEn ? 'Delete Chat' : 'Sohbeti Sil'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: Clear all option */}
        {conversations.length > 1 && onClearAllConversations && (
          <div className="p-3 border-t border-black/5 dark:border-white/5">
            {showClearAllConfirm ? (
              <div className="flex items-center justify-between p-2 rounded-2xl bg-[#ea4335]/10 text-xs">
                <span className="text-[#ea4335] font-medium text-[11px]">
                  {isEn ? 'Delete all chats?' : 'Tümü silinsin mi?'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onClearAllConversations();
                      setShowClearAllConfirm(false);
                      onClose();
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-[#ea4335] text-white text-[10px] font-medium cursor-pointer"
                  >
                    {isEn ? 'Yes' : 'Evet'}
                  </button>
                  <button
                    onClick={() => setShowClearAllConfirm(false)}
                    className="px-2.5 py-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[10px] cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'Vazgeç'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowClearAllConfirm(true)}
                className={`w-full py-1.5 text-xs text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer ${
                  isDarkMode ? 'hover:text-[#ea4335]' : 'hover:text-[#ea4335]'
                }`}
              >
                {isEn ? 'Clear all conversations' : 'Tüm sohbetleri temizle'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
