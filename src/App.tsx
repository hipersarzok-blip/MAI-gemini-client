/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Conversation,
  GroundingSource,
  Message,
  MessageAttachment,
  RoleplayProfile,
  SavedCharacter
} from './types.ts';
import { TopAppBar } from './components/TopAppBar.tsx';
import { ConversationDrawer } from './components/ConversationDrawer.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { ApiKeyModal } from './components/ApiKeyModal.tsx';
import { DirectiveModal } from './components/DirectiveModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { streamGeminiChat, checkServerKeyStatus, fetchModelInfo, ModelInfo } from './utils/geminiClient.ts';
import {
  buildCombinedDirective,
  DirectiveMode,
  AssistantCategory,
  ASSISTANT_FRAMEWORKS,
  ASSISTANT_CATEGORY_TITLES_EN
} from './utils/directiveFrameworks.ts';
import {
  auth,
  User,
  onAuthStateChanged,
  signInWithGoogle,
  signOutGoogle
} from './firebase.ts';
import {
  subscribeToUserChats,
  saveConversationToCloud,
  saveMessageToCloud,
  deleteConversationFromCloud,
  deleteMessagesFromCloud,
  markConversationDeletedLocal,
  isConversationDeleted,
  toUserScopedId
} from './utils/cloudSync.ts';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('mai_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });

  // API Key state
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('mai_gemini_api_key') || '';
  });

  // Default UI Language = English ('en') on initial launch
  const [uiLanguage, setUiLanguage] = useState<'tr' | 'en'>(() => {
    return (localStorage.getItem('mai_ui_lang_v3') as 'tr' | 'en') || 'en';
  });

  const handleSetLanguage = (lang: 'tr' | 'en') => {
    setUiLanguage(lang);
    localStorage.setItem('mai_ui_lang_v3', lang);
  };

  // Default Model = gemini-3.1-flash-lite on initial launch
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem('mai_selected_model_v3');
    return saved || 'gemini-3.1-flash-lite';
  });

  const [availableModels, setAvailableModels] = useState<ModelInfo['availableModels']>([
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Ultra-Fast Default)', label: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', label: 'Gemini 3.8 Flash' },
    { id: 'gemini-flash-latest', name: 'Gemini Flash', label: 'Gemini Flash' }
  ]);

  const [hasEnvKey, setHasEnvKey] = useState<boolean>(false);

  // Firebase Auth User & Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  useEffect(() => {
    checkServerKeyStatus().then((status) => setHasEnvKey(status));
    fetchModelInfo().then((info) => {
      setAvailableModels(info.availableModels);
      if (!localStorage.getItem('mai_selected_model_v3')) {
        setSelectedModel(info.defaultModel || 'gemini-3.1-flash-lite');
      }
    });
  }, []);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('mai_selected_model_v3', modelId);
  };

  const hasActiveKey = Boolean((apiKey && apiKey.trim()) || hasEnvKey);

  // Modal dialog states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDirectiveModalOpen, setIsDirectiveModalOpen] = useState(false);
  const [inChatSearch, setInChatSearch] = useState<string>('');

  // H1: Saved Character Library (Karakter Kütüphanem) state
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacter[]>(() => {
    try {
      const saved = localStorage.getItem('mai_saved_characters_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  const handleSaveCharacterToLibrary = (profile: RoleplayProfile) => {
    if (!profile.name?.trim()) return;
    const normalizedName = profile.name.trim().toLowerCase();
    const now = Date.now();

    setSavedCharacters((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.profile.name.trim().toLowerCase() === normalizedName
      );
      let next: SavedCharacter[];
      if (existingIdx !== -1) {
        next = prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, updatedAt: now, profile: { ...profile } }
            : item
        );
      } else {
        const newItem: SavedCharacter = {
          id: `char-${now}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: now,
          updatedAt: now,
          profile: { ...profile }
        };
        next = [newItem, ...prev];
      }
      try {
        localStorage.setItem('mai_saved_characters_v1', JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const handleDeleteCharacterFromLibrary = (id: string) => {
    setSavedCharacters((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('mai_saved_characters_v1', JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  // Dynamic Mobile Keyboard & Visual Viewport height handler
  const [viewportHeight, setViewportHeight] = useState<string>('100dvh');

  useEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
      } else {
        setViewportHeight(`${window.innerHeight}px`);
      }
    };

    updateHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
      window.visualViewport.addEventListener('scroll', updateHeight);
    }
    window.addEventListener('resize', updateHeight);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight);
        window.visualViewport.removeEventListener('scroll', updateHeight);
      }
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>(() => {
      try {
        const saved = localStorage.getItem('mai_conversations');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((c: Conversation) => !isConversationDeleted(c.id));
            if (valid.length > 0) return valid;
          }
        }
      } catch {
        // Fallback
      }
      const defaultConv: Conversation = {
        id: 'default-conv-1',
        title: 'New Chat',
        directive: '',
        directiveMode: 'other',
        assistantCategory: 'general',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      return [defaultConv];
    });

    const [activeConversationId, setActiveConversationId] = useState<string>(() => {
      return conversations[0]?.id || 'default-conv-1';
    });

    // Messages state (keyed by conversationId)
    const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
      try {
        const saved = localStorage.getItem('mai_messages_map');
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback
      }
      return {};
    });

    const conversationsRef = useRef<Conversation[]>(conversations);
    conversationsRef.current = conversations;
    const messagesMapRef = useRef<Record<string, Message[]>>(messagesMap);
    messagesMapRef.current = messagesMap;

    // Listen to Firebase Auth state and subscribe to Firestore cloud chats
    useEffect(() => {
      let unsubscribeCloud: (() => void) | null = null;

      const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        setIsAuthLoading(false);

        if (unsubscribeCloud) {
          unsubscribeCloud();
          unsubscribeCloud = null;
        }

        if (currentUser) {
          setIsSyncingCloud(true);
          try {
            const localConvs = conversationsRef.current;
            const localMsgs = messagesMapRef.current;
            for (const conv of localConvs) {
              if (isConversationDeleted(conv.id, currentUser.uid)) continue;
              const convMessages = localMsgs[conv.id] || [];
              const hasDirectiveOrProfile =
                Boolean(conv.directive?.trim()) ||
                Boolean(conv.roleplayProfile?.name?.trim()) ||
                conv.directiveMode === 'assistant';
              const isAlreadyScoped = conv.id.startsWith(`${currentUser.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36)}_`);

              if ((convMessages.length > 0 || hasDirectiveOrProfile) && !isAlreadyScoped) {
                const cloudConvId = await saveConversationToCloud(currentUser.uid, conv);
                for (const m of convMessages) {
                  await saveMessageToCloud(
                    currentUser.uid,
                    { ...m, conversationId: cloudConvId },
                    { ...conv, id: cloudConvId }
                  );
                }
              }
            }
          } catch {
            // Local storage remains the source of truth if cloud sync is temporarily offline
          } finally {
            setIsSyncingCloud(false);
          }

          let initialCloudCheckDone = false;

          unsubscribeCloud = subscribeToUserChats(
            currentUser.uid,
            (cloudConvs) => {
              const filteredCloudConvs = cloudConvs.filter(
                (c) => !isConversationDeleted(c.id, currentUser.uid)
              );
              if (filteredCloudConvs.length > 0) {
                setConversations((prev) => {
                  const cloudMap = new Map(filteredCloudConvs.map((c) => [c.id, c]));
                  for (const localC of prev) {
                    if (isConversationDeleted(localC.id, currentUser.uid)) continue;
                    const scopedId = toUserScopedId(currentUser.uid, localC.id);
                    if (!cloudMap.has(scopedId) && localC.id === scopedId) {
                      cloudMap.set(localC.id, localC);
                    }
                  }
                  const merged = Array.from(cloudMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
                  return merged.length > 0 ? merged : filteredCloudConvs;
                });

                setActiveConversationId((prevActiveId) => {
                  const scopedPrev = toUserScopedId(currentUser.uid, prevActiveId);
                  if (filteredCloudConvs.some((c) => c.id === prevActiveId)) return prevActiveId;
                  if (filteredCloudConvs.some((c) => c.id === scopedPrev)) return scopedPrev;
                  return filteredCloudConvs[0].id;
                });
            } else if (!initialCloudCheckDone) {
              initialCloudCheckDone = true;
              const newId = toUserScopedId(currentUser.uid, `conv-${Date.now()}`);
              const starterConv: Conversation = {
                id: newId,
                title: uiLanguage === 'tr' ? 'Yeni Sohbet' : 'New Chat',
                directive: '',
                directiveMode: 'other',
                assistantCategory: 'general',
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              setConversations([starterConv]);
              setActiveConversationId(newId);
              saveConversationToCloud(currentUser.uid, starterConv).catch(() => {});
            }
            initialCloudCheckDone = true;
          },
          (cloudMsgsByConv) => {
            setMessagesMap((prev) => {
              const merged: Record<string, Message[]> = { ...prev };
              for (const [convId, cloudMsgs] of Object.entries(cloudMsgsByConv)) {
                const localList = prev[convId] || [];
                const localById = new Map(localList.map((m) => [m.id, m]));
                merged[convId] = cloudMsgs.map((cm) => {
                  const localMsg = localById.get(cm.id);
                  if (localMsg) {
                    return {
                      ...cm,
                      variants:
                        localMsg.variants && localMsg.variants.length > 0
                          ? localMsg.variants
                          : cm.variants,
                      activeVariantIndex:
                        localMsg.activeVariantIndex !== undefined
                          ? localMsg.activeVariantIndex
                          : cm.activeVariantIndex,
                      attachments:
                        localMsg.attachments && localMsg.attachments.length > 0
                          ? localMsg.attachments
                          : cm.attachments,
                      sources:
                        localMsg.sources && localMsg.sources.length > 0
                          ? localMsg.sources
                          : cm.sources,
                      searchQueries:
                        localMsg.searchQueries && localMsg.searchQueries.length > 0
                          ? localMsg.searchQueries
                          : cm.searchQueries,
                      starred: localMsg.starred !== undefined ? localMsg.starred : cm.starred
                    };
                  }
                  return cm;
                });
              }
              return merged;
            });
          }
        );
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCloud) {
        unsubscribeCloud();
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // Ignore popup closed by user or cancelled popup request
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
    } catch {
      // Ignore sign-out errors
    }
  };

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isNetworkDone, setIsNetworkDone] = useState(false);
  const [streamingChunk, setStreamingChunk] = useState('');
  const [pendingAiMessage, setPendingAiMessage] = useState<Message | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [continuingMessageId, setContinuingMessageId] = useState<string | null>(null);
  const [forkNotice, setForkNotice] = useState<{
    parentId: string;
    parentTitle: string;
    branchTitle: string;
    messageCount: number;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAccumulatedRef = useRef<string>('');
  const activeConvIdRef = useRef<string>('');
  const regeneratingMsgIdRef = useRef<string | null>(null);
  const continuingMsgIdRef = useRef<string | null>(null);

  // Persist theme
  useEffect(() => {
    localStorage.setItem('mai_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('mai_conversations', JSON.stringify(conversations));
    } catch {
      // Ignore storage quota errors
    }
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem('mai_messages_map', JSON.stringify(messagesMap));
    } catch {
      // Ignore storage quota errors
    }
  }, [messagesMap]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];
  const activeMessages = activeConversation ? (messagesMap[activeConversation.id] || []) : [];

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('mai_gemini_api_key', key);
  };

  const handleApplyGreeting = (greetingText: string) => {
    if (!activeConversation || !greetingText.trim()) return;
    const convId = user ? toUserScopedId(user.uid, activeConversation.id) : activeConversation.id;
    const rawMsgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const msgId = user ? toUserScopedId(user.uid, rawMsgId) : rawMsgId;
    const trimmed = greetingText.trim();

    const starterMsg: Message = {
      id: msgId,
      conversationId: convId,
      role: 'model',
      text: trimmed,
      timestamp: Date.now(),
      variants: [trimmed],
      activeVariantIndex: 0
    };

    setMessagesMap((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), starterMsg]
    }));

    if (user) {
      setIsSyncingCloud(true);
      saveMessageToCloud(user.uid, starterMsg, { ...activeConversation, id: convId })
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }
  };

  const handleSaveDirective = (
    newDirective: string,
    mode: DirectiveMode = 'other',
    category: AssistantCategory = 'general',
    roleplayProfile?: RoleplayProfile
  ) => {
    if (!activeConversation) return;
    const targetId = user ? toUserScopedId(user.uid, activeConversation.id) : activeConversation.id;

    let updatedTitle = activeConversation.title;
    if (
      (updatedTitle === 'New Chat' || updatedTitle === 'Yeni Sohbet') &&
      mode === 'roleplay' &&
      roleplayProfile?.name?.trim()
    ) {
      updatedTitle = `${roleplayProfile.avatarEmoji || '🎭'} ${roleplayProfile.name.trim()}`;
    }

    const updatedConv: Conversation = {
      ...activeConversation,
      id: targetId,
      title: updatedTitle,
      directive: newDirective,
      directiveMode: mode,
      assistantCategory: category,
      roleplayProfile,
      updatedAt: Date.now()
    };

    setConversations((prev) =>
      prev.map((conv) => (conv.id === activeConversation.id || conv.id === targetId ? updatedConv : conv))
    );
    if (activeConversationId !== targetId) {
      setActiveConversationId(targetId);
    }

    if (user) {
      setIsSyncingCloud(true);
      saveConversationToCloud(user.uid, updatedConv)
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }
  };

  const handleNewChat = (initialDirective = '') => {
    const rawId = `conv-${Date.now()}`;
    const newId = user ? toUserScopedId(user.uid, rawId) : rawId;
    const newConv: Conversation = {
      id: newId,
      title: uiLanguage === 'tr' ? 'Yeni Sohbet' : 'New Chat',
      directive: initialDirective,
      directiveMode: 'other',
      assistantCategory: 'general',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);

    if (user) {
      setIsSyncingCloud(true);
      saveConversationToCloud(user.uid, newConv)
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }
  };

  // H1: Start a brand new chat directly with a saved character from Karakter Kütüphanem
  const handleStartNewChatWithCharacter = (profile: RoleplayProfile) => {
    const rawId = `conv-${Date.now()}`;
    const newId = user ? toUserScopedId(user.uid, rawId) : rawId;
    const charTitle = `${profile.avatarEmoji || '🎭'} ${profile.name.trim()}`;
    const now = Date.now();

    const newConv: Conversation = {
      id: newId,
      title: charTitle,
      directive: '',
      directiveMode: 'roleplay',
      assistantCategory: 'general',
      roleplayProfile: { ...profile, unbreakableImmersion: true },
      createdAt: now,
      updatedAt: now
    };

    const greetingText = profile.greeting?.trim();
    let starterMessage: Message | null = null;
    if (greetingText) {
      const rawMsgId = `msg-${now}-${Math.random().toString(36).slice(2, 7)}`;
      const msgId = user ? toUserScopedId(user.uid, rawMsgId) : rawMsgId;
      starterMessage = {
        id: msgId,
        conversationId: newId,
        role: 'model',
        text: greetingText,
        timestamp: now,
        variants: [greetingText],
        activeVariantIndex: 0
      };
    }

    setConversations((prev) => [newConv, ...prev]);
    if (starterMessage) {
      const msgToInsert = starterMessage;
      setMessagesMap((prev) => ({
        ...prev,
        [newId]: [msgToInsert]
      }));
    }
    setForkNotice(null);
    setInChatSearch('');
    setActiveConversationId(newId);

    if (user) {
      setIsSyncingCloud(true);
      saveConversationToCloud(user.uid, newConv)
        .then(() =>
          starterMessage ? saveMessageToCloud(user.uid, starterMessage, newConv) : Promise.resolve('')
        )
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const targetConv = conversations.find((c) => c.id === id);
    const updatedConv: Conversation | undefined = targetConv
      ? { ...targetConv, title: trimmed, updatedAt: Date.now() }
      : undefined;

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c))
    );

    if (user && updatedConv) {
      setIsSyncingCloud(true);
      saveConversationToCloud(user.uid, updatedConv)
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }
  };

  const handleDeleteConversation = (id: string) => {
    markConversationDeletedLocal(id, user?.uid);
    const scopedId = user ? toUserScopedId(user.uid, id) : id;
    const msgsToDelete = messagesMap[id] || messagesMap[scopedId] || [];
    const updated = conversations.filter((c) => c.id !== id && c.id !== scopedId);
    setConversations(updated);

    setMessagesMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      delete copy[scopedId];
      return copy;
    });

    if (user) {
      setIsSyncingCloud(true);
      deleteConversationFromCloud(user.uid, id, msgsToDelete)
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }

    if (activeConversationId === id || activeConversationId === scopedId) {
      if (updated.length > 0) {
        setActiveConversationId(updated[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    const currentText = currentAccumulatedRef.current.trim();
    const convId = activeConvIdRef.current;
    const regenId = regeneratingMsgIdRef.current;
    const contId = continuingMsgIdRef.current;

    if (currentText && convId) {
      if (contId) {
        // Save partial continuation onto existing AI message
        let updatedTargetMsg: Message | null = null;
        setMessagesMap((prev) => {
          const existingList = prev[convId] || [];
          const nextList = existingList.map((m) => {
            if (m.id !== contId) return m;
            const combined = `${m.text.trimEnd()}\n\n${currentText}`;
            const vars = m.variants && m.variants.length > 0 ? [...m.variants] : [m.text];
            const activeIdx =
              m.activeVariantIndex !== undefined &&
              m.activeVariantIndex >= 0 &&
              m.activeVariantIndex < vars.length
                ? m.activeVariantIndex
                : vars.length - 1;
            vars[activeIdx] = combined;
            const updated: Message = {
              ...m,
              text: combined,
              variants: vars,
              activeVariantIndex: activeIdx
            };
            updatedTargetMsg = updated;
            return updated;
          });
          return { ...prev, [convId]: nextList };
        });

        if (user && updatedTargetMsg) {
          const parentConv = conversationsRef.current.find((c) => c.id === convId);
          saveMessageToCloud(user.uid, updatedTargetMsg, parentConv).catch(() => {});
        }
      } else if (regenId) {
        // Save partial swipe variant onto existing AI message
        let updatedTargetMsg: Message | null = null;
        setMessagesMap((prev) => {
          const existingList = prev[convId] || [];
          const nextList = existingList.map((m) => {
            if (m.id !== regenId) return m;
            const prevVariants = m.variants && m.variants.length > 0 ? m.variants : [m.text];
            const nextVariants = [...prevVariants, currentText];
            const updated: Message = {
              ...m,
              text: currentText,
              variants: nextVariants,
              activeVariantIndex: nextVariants.length - 1
            };
            updatedTargetMsg = updated;
            return updated;
          });
          return { ...prev, [convId]: nextList };
        });

        if (user && updatedTargetMsg) {
          const parentConv = conversationsRef.current.find((c) => c.id === convId);
          saveMessageToCloud(user.uid, updatedTargetMsg, parentConv).catch(() => {});
        }
      } else {
        const rawAiId = `msg-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const aiMsgId = user ? toUserScopedId(user.uid, rawAiId) : rawAiId;
        const partialAiMessage: Message = {
          id: aiMsgId,
          conversationId: convId,
          role: 'model',
          text: currentText,
          timestamp: Date.now(),
          variants: [currentText],
          activeVariantIndex: 0
        };

        setMessagesMap((prev) => {
          const existingList = prev[convId] || [];
          return {
            ...prev,
            [convId]: [...existingList, partialAiMessage]
          };
        });

        if (user) {
          const parentConv = conversationsRef.current.find((c) => c.id === convId);
          saveMessageToCloud(user.uid, partialAiMessage, parentConv).catch(() => {});
        }
      }
    }

    setIsStreaming(false);
    setIsNetworkDone(false);
    setStreamingChunk('');
    setPendingAiMessage(null);
    setRegeneratingMessageId(null);
    setContinuingMessageId(null);
    regeneratingMsgIdRef.current = null;
    continuingMsgIdRef.current = null;
    currentAccumulatedRef.current = '';
  };

  // A2: Switch between saved AI response variants (< 1 / 3 >)
  const handleSelectVariant = (messageId: string, variantIndex: number) => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    let updatedTarget: Message | null = null;

    setMessagesMap((prev) => {
      const list = prev[convId] || [];
      const nextList = list.map((m) => {
        if (m.id !== messageId || !m.variants || !m.variants[variantIndex]) return m;
        const updated: Message = {
          ...m,
          text: m.variants[variantIndex],
          activeVariantIndex: variantIndex
        };
        updatedTarget = updated;
        return updated;
      });
      return { ...prev, [convId]: nextList };
    });

    if (user && updatedTarget) {
      saveMessageToCloud(user.uid, updatedTarget, activeConversation).catch(() => {});
    }
  };

  // A2: Generate a new alternative AI response (Swipe / Regenerate) for a specific AI message
  const handleRegenerateMessage = async (messageId: string) => {
    if (!activeConversation || isStreaming) return;
    const convId = user ? toUserScopedId(user.uid, activeConversation.id) : activeConversation.id;
    const currentMessages = messagesMap[convId] || messagesMap[activeConversation.id] || [];
    const targetIdx = currentMessages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const targetMsg = currentMessages[targetIdx];
    if (targetMsg.role !== 'model') return;

    // Find the user message right before this AI message (or construct prompt if greeting/starter)
    const precedingMessages = currentMessages.slice(0, targetIdx);
    const lastUserIdx = [...precedingMessages].reverse().findIndex((m) => m.role === 'user');
    let promptText = '';
    let promptAttachments: MessageAttachment[] | undefined = undefined;
    let historyBeforePrompt: Message[] = [];

    const isRoleplay =
      activeConversation.directiveMode === 'roleplay' ||
      Boolean(activeConversation.roleplayProfile?.name?.trim());

    if (lastUserIdx !== -1) {
      const actualUserIdx = precedingMessages.length - 1 - lastUserIdx;
      promptText = precedingMessages[actualUserIdx].text;
      promptAttachments = precedingMessages[actualUserIdx].attachments;
      historyBeforePrompt = precedingMessages.slice(0, actualUserIdx);
    } else {
      promptText = isRoleplay
        ? uiLanguage === 'tr'
          ? 'Karakterinle uyumlu alternatif, farklı bir açılış veya devam mesajı yaz.'
          : 'Write an alternative, fresh response or opening in character.'
        : uiLanguage === 'tr'
          ? 'Alternatif ve farklı bir yanıt oluştur.'
          : 'Generate an alternative, fresh response.';
      historyBeforePrompt = [];
    }

    activeConvIdRef.current = convId;
    regeneratingMsgIdRef.current = messageId;
    setRegeneratingMessageId(messageId);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setIsNetworkDone(false);
    setStreamingChunk('');
    setPendingAiMessage(null);
    currentAccumulatedRef.current = '';

    const resetWatchdog = () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
      watchdogTimerRef.current = setTimeout(() => {
        handleStopGeneration();
      }, 90000);
    };
    resetWatchdog();

    const existingVariants =
      targetMsg.variants && targetMsg.variants.length > 0 ? targetMsg.variants : [targetMsg.text];

    const baseDirective = buildCombinedDirective(
      activeConversation.directive || '',
      activeConversation.directiveMode || (activeConversation.roleplayProfile?.name ? 'roleplay' : 'other'),
      activeConversation.assistantCategory || 'general',
      activeConversation.roleplayProfile
    );

    const variationPromptSuffix =
      existingVariants.length > 0
        ? isRoleplay
          ? `\n\n[ALTERNATIVE RESPONSE: Provide a fresh, distinct response angle, action, or dialogue compared to your previous version. Keep the same language as the user.]`
          : `\n\n[ALTERNATIVE RESPONSE: Provide a fresh, distinct, and direct answer compared to your previous version. Do NOT use roleplay or *asterisks*. Keep the same language as the user.]`
        : '';

    let accumulatedText = '';
    let latestSources: GroundingSource[] | undefined;
    let latestSearchQueries: string[] | undefined;

    try {
      const stream = streamGeminiChat(
        apiKey,
        promptText + variationPromptSuffix,
        historyBeforePrompt,
        baseDirective,
        selectedModel,
        controller.signal,
        uiLanguage,
        promptAttachments
      );

      for await (const chunk of stream) {
        if (chunk.text) {
          resetWatchdog();
          accumulatedText += chunk.text;
          currentAccumulatedRef.current = accumulatedText;
          setStreamingChunk(accumulatedText);
        }
        if (chunk.sources && chunk.sources.length > 0) {
          latestSources = chunk.sources;
        }
        if (chunk.searchQueries && chunk.searchQueries.length > 0) {
          latestSearchQueries = chunk.searchQueries;
        }
      }

      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      const finalText = accumulatedText.trim();
      if (finalText) {
        let updatedAiMsg: Message | null = null;
        setMessagesMap((prev) => {
          const list = prev[convId] || [];
          const nextList = list.map((m) => {
            if (m.id !== messageId) return m;
            const prevVars = m.variants && m.variants.length > 0 ? m.variants : [m.text];
            const nextVars = [...prevVars, finalText];
            const updated: Message = {
              ...m,
              text: finalText,
              variants: nextVars,
              activeVariantIndex: nextVars.length - 1,
              sources: latestSources || m.sources,
              searchQueries: latestSearchQueries || m.searchQueries
            };
            updatedAiMsg = updated;
            return updated;
          });
          return { ...prev, [convId]: nextList };
        });

        if (user && updatedAiMsg) {
          setIsSyncingCloud(true);
          saveMessageToCloud(user.uid, updatedAiMsg, activeConversation)
            .catch(() => {})
            .finally(() => setIsSyncingCloud(false));
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
    } finally {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      setIsStreaming(false);
      setIsNetworkDone(false);
      setStreamingChunk('');
      setPendingAiMessage(null);
      setRegeneratingMessageId(null);
      regeneratingMsgIdRef.current = null;
      currentAccumulatedRef.current = '';
    }
  };

  // H4: Continue / Advance Roleplay Scene seamlessly without inserting a user message
  const handleContinueMessage = async (messageId: string) => {
    if (!activeConversation || isStreaming) return;
    const convId = user ? toUserScopedId(user.uid, activeConversation.id) : activeConversation.id;
    const currentMessages = messagesMap[convId] || messagesMap[activeConversation.id] || [];
    const targetIdx = currentMessages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const targetMsg = currentMessages[targetIdx];
    if (targetMsg.role !== 'model') return;

    activeConvIdRef.current = convId;
    continuingMsgIdRef.current = messageId;
    setContinuingMessageId(messageId);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setIsNetworkDone(false);
    setStreamingChunk('');
    setPendingAiMessage(null);
    currentAccumulatedRef.current = '';

    const resetWatchdog = () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
      watchdogTimerRef.current = setTimeout(() => {
        handleStopGeneration();
      }, 90000);
    };
    resetWatchdog();

    const baseDirective = buildCombinedDirective(
      activeConversation.directive || '',
      activeConversation.directiveMode || (activeConversation.roleplayProfile?.name ? 'roleplay' : 'other'),
      activeConversation.assistantCategory || 'general',
      activeConversation.roleplayProfile
    );

    const historyIncludingTarget = currentMessages.slice(0, targetIdx + 1);
    const continuePrompt =
      uiLanguage === 'tr'
        ? `[SAHNEYİ DEVAM ETTİR / CONTINUE SCENE: Bir önceki yanıtın "${targetMsg.text.slice(-140)}" kısmında kaldı. Araya kullanıcı mesajı girmeden, önceki metni tekrar etmeden, tam kaldığın yerden karakterin eylemlerini, duygularını, atmosferi veya konuşmasını doğal bir şekilde ilerletip sahneyi devam ettir.]`
        : `[CONTINUE SCENE: Your previous response ended with "${targetMsg.text.slice(-140)}". Seamlessly continue and advance the scene, character actions, atmosphere, or dialogue right from where you left off without repeating what you already wrote.]`;

    let accumulatedText = '';

    try {
      const stream = streamGeminiChat(
        apiKey,
        continuePrompt,
        historyIncludingTarget,
        baseDirective,
        selectedModel,
        controller.signal,
        uiLanguage
      );

      for await (const chunk of stream) {
        if (chunk.text) {
          resetWatchdog();
          accumulatedText += chunk.text;
          currentAccumulatedRef.current = accumulatedText;
          setStreamingChunk(accumulatedText);
        }
      }

      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      const finalContinuation = accumulatedText.trim();
      if (finalContinuation) {
        let updatedAiMsg: Message | null = null;
        setMessagesMap((prev) => {
          const list = prev[convId] || [];
          const nextList = list.map((m) => {
            if (m.id !== messageId) return m;
            const combinedText = `${m.text.trimEnd()}\n\n${finalContinuation}`;
            const vars = m.variants && m.variants.length > 0 ? [...m.variants] : [m.text];
            const activeIdx =
              m.activeVariantIndex !== undefined &&
              m.activeVariantIndex >= 0 &&
              m.activeVariantIndex < vars.length
                ? m.activeVariantIndex
                : vars.length - 1;
            vars[activeIdx] = combinedText;
            const updated: Message = {
              ...m,
              text: combinedText,
              variants: vars,
              activeVariantIndex: activeIdx
            };
            updatedAiMsg = updated;
            return updated;
          });
          return { ...prev, [convId]: nextList };
        });

        if (user && updatedAiMsg) {
          setIsSyncingCloud(true);
          saveMessageToCloud(user.uid, updatedAiMsg, activeConversation)
            .catch(() => {})
            .finally(() => setIsSyncingCloud(false));
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
    } finally {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      setIsStreaming(false);
      setIsNetworkDone(false);
      setStreamingChunk('');
      setPendingAiMessage(null);
      setContinuingMessageId(null);
      continuingMsgIdRef.current = null;
      currentAccumulatedRef.current = '';
    }
  };

  // A3: Rewind conversation to a specific message (deleting all messages after it)
  const handleRewindToMessage = (messageId: string) => {
    if (!activeConversation || isStreaming) return;
    const convId = activeConversation.id;
    const currentMessages = messagesMap[convId] || [];
    const targetIdx = currentMessages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1 || targetIdx === currentMessages.length - 1) return;

    const keptMessages = currentMessages.slice(0, targetIdx + 1);
    const removedMessages = currentMessages.slice(targetIdx + 1);

    setMessagesMap((prev) => ({
      ...prev,
      [convId]: keptMessages
    }));

    if (user && removedMessages.length > 0) {
      setIsSyncingCloud(true);
      deleteMessagesFromCloud(user.uid, removedMessages)
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }
  };

  // G3: Fork / Branch conversation from a specific message into a new conversation
  const handleForkFromMessage = (messageId: string) => {
    if (!activeConversation || isStreaming) return;
    const convId = activeConversation.id;
    const currentMessages = messagesMap[convId] || [];
    const targetIdx = currentMessages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const messagesToClone = currentMessages.slice(0, targetIdx + 1);
    const rawNewConvId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newConvId = user ? toUserScopedId(user.uid, rawNewConvId) : rawNewConvId;

    const cleanBaseTitle = activeConversation.title
      .replace(/^🌿\s*/, '')
      .replace(/\s*\((Dal|Branch)(\s*#\d+)?\)$/i, '')
      .trim();
    const branchSuffix = uiLanguage === 'en' ? '(Branch)' : '(Dal)';
    const branchTitle = `🌿 ${cleanBaseTitle} ${branchSuffix}`;

    const now = Date.now();
    const branchedConv: Conversation = {
      ...activeConversation,
      id: newConvId,
      title: branchTitle,
      roleplayProfile: activeConversation.roleplayProfile
        ? { ...activeConversation.roleplayProfile }
        : undefined,
      createdAt: now,
      updatedAt: now
    };

    const baseTime = now - messagesToClone.length * 10;
    const clonedMessages: Message[] = messagesToClone.map((m, idx) => {
      const rawMsgId = `msg-fork-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      const msgId = user ? toUserScopedId(user.uid, rawMsgId) : rawMsgId;
      return {
        ...m,
        id: msgId,
        conversationId: newConvId,
        timestamp: m.timestamp || baseTime + idx * 10,
        variants: m.variants ? [...m.variants] : undefined,
        attachments: m.attachments ? m.attachments.map((att) => ({ ...att })) : undefined
      };
    });

    setConversations((prev) => [branchedConv, ...prev]);
    setMessagesMap((prev) => ({
      ...prev,
      [newConvId]: clonedMessages
    }));
    setInChatSearch('');
    setActiveConversationId(newConvId);
    setForkNotice({
      parentId: activeConversation.id,
      parentTitle: activeConversation.title,
      branchTitle,
      messageCount: clonedMessages.length
    });

    if (user) {
      setIsSyncingCloud(true);
      saveConversationToCloud(user.uid, branchedConv)
        .then(() =>
          Promise.all(
            clonedMessages.map((cm) => saveMessageToCloud(user.uid, cm, branchedConv))
          )
        )
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }
  };

  // A3: Edit a user or AI message inline (optionally rewinding & regenerating after a user message edit)
  const handleEditMessage = async (messageId: string, newText: string, regenerateAfter = false) => {
    if (!activeConversation || !newText.trim() || isStreaming) return;
    const convId = user ? toUserScopedId(user.uid, activeConversation.id) : activeConversation.id;
    const currentMessages = messagesMap[convId] || messagesMap[activeConversation.id] || [];
    const targetIdx = currentMessages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const trimmed = newText.trim();
    const targetMsg = currentMessages[targetIdx];

    let updatedMsg: Message = {
      ...targetMsg,
      text: trimmed
    };

    if (targetMsg.role === 'model') {
      const vars =
        targetMsg.variants && targetMsg.variants.length > 0 ? [...targetMsg.variants] : [targetMsg.text];
      const activeIdx =
        targetMsg.activeVariantIndex !== undefined &&
        targetMsg.activeVariantIndex >= 0 &&
        targetMsg.activeVariantIndex < vars.length
          ? targetMsg.activeVariantIndex
          : vars.length - 1;
      vars[activeIdx] = trimmed;
      updatedMsg = {
        ...updatedMsg,
        variants: vars,
        activeVariantIndex: activeIdx
      };
    }

    if (!regenerateAfter || targetMsg.role !== 'user') {
      setMessagesMap((prev) => ({
        ...prev,
        [convId]: (prev[convId] || []).map((m) => (m.id === messageId ? updatedMsg : m))
      }));

      if (user) {
        setIsSyncingCloud(true);
        saveMessageToCloud(user.uid, updatedMsg, activeConversation)
          .catch(() => {})
          .finally(() => setIsSyncingCloud(false));
      }
      return;
    }

    // regenerateAfter === true on a user message:
    // 1. Keep messages up to targetIdx (with edited user message) and remove subsequent messages
    const historyBeforeUserMsg = currentMessages.slice(0, targetIdx);
    const keptMessages = [...historyBeforeUserMsg, updatedMsg];
    const removedMessages = currentMessages.slice(targetIdx + 1);

    setMessagesMap((prev) => ({
      ...prev,
      [convId]: keptMessages
    }));

    if (user) {
      setIsSyncingCloud(true);
      Promise.all([
        saveMessageToCloud(user.uid, updatedMsg, activeConversation),
        removedMessages.length > 0 ? deleteMessagesFromCloud(user.uid, removedMessages) : Promise.resolve()
      ])
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }

    // 2. Stream a fresh AI response to the edited user message
    activeConvIdRef.current = convId;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setIsNetworkDone(false);
    setStreamingChunk('');
    setPendingAiMessage(null);
    currentAccumulatedRef.current = '';

    const resetWatchdog = () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
      watchdogTimerRef.current = setTimeout(() => {
        handleStopGeneration();
      }, 90000);
    };
    resetWatchdog();

    const effectiveDirective = buildCombinedDirective(
      activeConversation.directive || '',
      activeConversation.directiveMode || (activeConversation.roleplayProfile?.name ? 'roleplay' : 'other'),
      activeConversation.assistantCategory || 'general',
      activeConversation.roleplayProfile
    );

    let accumulatedText = '';
    let latestSources: GroundingSource[] | undefined;
    let latestSearchQueries: string[] | undefined;

    try {
      const stream = streamGeminiChat(
        apiKey,
        trimmed,
        historyBeforeUserMsg,
        effectiveDirective,
        selectedModel,
        controller.signal,
        uiLanguage,
        updatedMsg.attachments
      );

      for await (const chunk of stream) {
        if (chunk.text) {
          resetWatchdog();
          accumulatedText += chunk.text;
          currentAccumulatedRef.current = accumulatedText;
          setStreamingChunk(accumulatedText);
        }
        if (chunk.sources && chunk.sources.length > 0) {
          latestSources = chunk.sources;
        }
        if (chunk.searchQueries && chunk.searchQueries.length > 0) {
          latestSearchQueries = chunk.searchQueries;
        }
      }

      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      const defaultEmptyNotice =
        uiLanguage === 'tr'
          ? 'Üzgünüm, yanıt oluşturulurken anlık bir gecikme yaşandı. Lütfen mesajınızı tekrar iletin.'
          : 'I apologize, there was a temporary delay generating the response. Please try sending your message again.';
      const finalText = accumulatedText.trim() || defaultEmptyNotice;
      const rawAiMsgId = `msg-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const aiMsgId = user ? toUserScopedId(user.uid, rawAiMsgId) : rawAiMsgId;

      const aiMessage: Message = {
        id: aiMsgId,
        conversationId: convId,
        role: 'model',
        text: finalText,
        timestamp: Date.now(),
        variants: [finalText],
        activeVariantIndex: 0,
        sources: latestSources,
        searchQueries: latestSearchQueries
      };

      setMessagesMap((prev) => ({
        ...prev,
        [convId]: [...(prev[convId] || []), aiMessage]
      }));

      if (user) {
        setIsSyncingCloud(true);
        saveMessageToCloud(user.uid, aiMessage, activeConversation)
          .catch(() => {})
          .finally(() => setIsSyncingCloud(false));
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
    } finally {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      setIsStreaming(false);
      setIsNetworkDone(false);
      setStreamingChunk('');
      setPendingAiMessage(null);
      currentAccumulatedRef.current = '';
    }
  };

  const handleSendMessage = async (text: string, attachments?: MessageAttachment[]) => {
    if (!activeConversation) return;
    const hasAttachments = Boolean(attachments && attachments.length > 0);
    if (!text.trim() && !hasAttachments) return;

    const conversationId = user ? toUserScopedId(user.uid, activeConversation.id) : activeConversation.id;
    activeConvIdRef.current = conversationId;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const rawUserMsgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userMsgId = user ? toUserScopedId(user.uid, rawUserMsgId) : rawUserMsgId;

    const isRoleplay =
      activeConversation.directiveMode === 'roleplay' ||
      Boolean(activeConversation.roleplayProfile?.name?.trim());

    const fallbackTextForAttachment = hasAttachments
      ? isRoleplay
        ? uiLanguage === 'tr'
          ? '*Sana bu görseli/dosyayı gösterir.*'
          : '*Shows you this image/file.*'
        : uiLanguage === 'tr'
          ? 'Bu görseli/dosyayı incele ve analiz et.'
          : 'Analyze and explain this image/file.'
      : '';

    const displayText = text.trim() || fallbackTextForAttachment;

    const userMessage: Message = {
      id: userMsgId,
      conversationId,
      role: 'user',
      text: displayText,
      timestamp: Date.now(),
      attachments: hasAttachments ? attachments : undefined
    };

    const currentMessages = messagesMap[conversationId] || messagesMap[activeConversation.id] || [];
    let updatedConvObj: Conversation = {
      ...activeConversation,
      id: conversationId,
      updatedAt: Date.now()
    };

    if (
      currentMessages.length === 0 &&
      (activeConversation.title === 'New Chat' || activeConversation.title === 'Yeni Sohbet')
    ) {
      const titleSource = text.trim() || attachments?.[0]?.name || displayText;
      const title =
        activeConversation.directiveMode === 'roleplay' && activeConversation.roleplayProfile?.name?.trim()
          ? `${activeConversation.roleplayProfile.avatarEmoji || '🎭'} ${activeConversation.roleplayProfile.name.trim()}`
          : titleSource.length > 30
            ? titleSource.slice(0, 30) + '...'
            : titleSource;
      updatedConvObj = {
        ...updatedConvObj,
        title
      };
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id || c.id === conversationId ? updatedConvObj : c))
    );
    if (activeConversationId !== conversationId) {
      setActiveConversationId(conversationId);
    }

    const updatedMessages = [...currentMessages, userMessage];
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: updatedMessages
    }));

    if (user) {
      setIsSyncingCloud(true);
      saveConversationToCloud(user.uid, updatedConvObj)
        .then(() => saveMessageToCloud(user.uid, userMessage, updatedConvObj))
        .catch(() => {})
        .finally(() => setIsSyncingCloud(false));
    }

    // Start ultra-fast streaming from Gemini
    setIsStreaming(true);
    setIsNetworkDone(false);
    setStreamingChunk('');
    setPendingAiMessage(null);
    currentAccumulatedRef.current = '';

    const resetWatchdog = () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
      watchdogTimerRef.current = setTimeout(() => {
        handleStopGeneration();
      }, 90000);
    };
    resetWatchdog();

    const effectiveDirective = buildCombinedDirective(
      updatedConvObj.directive || '',
      updatedConvObj.directiveMode || (updatedConvObj.roleplayProfile?.name ? 'roleplay' : 'other'),
      updatedConvObj.assistantCategory || 'general',
      updatedConvObj.roleplayProfile
    );

    let accumulatedText = '';
    let latestSources: GroundingSource[] | undefined;
    let latestSearchQueries: string[] | undefined;

    try {
      const stream = streamGeminiChat(
        apiKey,
        displayText,
        currentMessages,
        effectiveDirective,
        selectedModel,
        controller.signal,
        uiLanguage,
        attachments
      );

      for await (const chunk of stream) {
        if (chunk.text) {
          resetWatchdog();
          accumulatedText += chunk.text;
          currentAccumulatedRef.current = accumulatedText;
          setStreamingChunk(accumulatedText);
        }
        if (chunk.sources && chunk.sources.length > 0) {
          latestSources = chunk.sources;
        }
        if (chunk.searchQueries && chunk.searchQueries.length > 0) {
          latestSearchQueries = chunk.searchQueries;
        }
      }

      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      const defaultEmptyNotice =
        uiLanguage === 'tr'
          ? 'Üzgünüm, yanıt oluşturulurken anlık bir gecikme yaşandı. Lütfen mesajınızı tekrar iletin.'
          : 'I apologize, there was a temporary delay generating the response. Please try sending your message again.';
      const finalText = accumulatedText.trim() || defaultEmptyNotice;
      const rawAiMsgId = `msg-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const aiMsgId = user ? toUserScopedId(user.uid, rawAiMsgId) : rawAiMsgId;

      const aiMessage: Message = {
        id: aiMsgId,
        conversationId,
        role: 'model',
        text: finalText,
        timestamp: Date.now(),
        variants: [finalText],
        activeVariantIndex: 0,
        sources: latestSources,
        searchQueries: latestSearchQueries
      };

      setMessagesMap((prev) => {
        const existingList = prev[conversationId] || [];
        if (existingList.some((m) => m.id === aiMessage.id)) {
          return prev;
        }
        return {
          ...prev,
          [conversationId]: [...existingList, aiMessage]
        };
      });

      if (user) {
        setIsSyncingCloud(true);
        saveMessageToCloud(user.uid, aiMessage, updatedConvObj)
          .catch(() => {})
          .finally(() => setIsSyncingCloud(false));
      }

      setIsStreaming(false);
      setIsNetworkDone(false);
      setStreamingChunk('');
      setPendingAiMessage(null);
      currentAccumulatedRef.current = '';
    } catch (err: unknown) {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      if ((err as Error)?.name === 'AbortError') {
        return;
      }

      const errorMessage =
        (err as Error)?.message ||
        (uiLanguage === 'en' ? 'Could not connect to Gemini.' : 'Gemini ile bağlantı kurulamadı.');
      const prefix = uiLanguage === 'en' ? 'Error' : 'Hata';
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        conversationId,
        role: 'model',
        text: `${prefix}: ${errorMessage}`,
        timestamp: Date.now()
      };
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), errorMsg]
      }));
      setIsStreaming(false);
      setIsNetworkDone(false);
      setStreamingChunk('');
      setPendingAiMessage(null);
      currentAccumulatedRef.current = '';
    }
  };

  const handleTypingComplete = () => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (pendingAiMessage) {
      const msg = pendingAiMessage;
      const convId = msg.conversationId;
      setMessagesMap((prev) => {
        const existingList = prev[convId] || [];
        if (existingList.some((m) => m.id === msg.id)) {
          return prev;
        }
        return {
          ...prev,
          [convId]: [...existingList, msg]
        };
      });
    }
    setIsStreaming(false);
    setIsNetworkDone(false);
    setStreamingChunk('');
    setPendingAiMessage(null);
    currentAccumulatedRef.current = '';
  };

  const hasActiveDirective = Boolean(
    (activeConversation?.directive && activeConversation.directive.trim()) ||
      activeConversation?.roleplayProfile?.name?.trim() ||
      (activeConversation?.directiveMode === 'assistant' && activeConversation.assistantCategory)
  );

  const activeDirectiveDisplay =
    (activeConversation?.directiveMode === 'roleplay' || activeConversation?.roleplayProfile?.name?.trim()) &&
    activeConversation?.roleplayProfile?.name?.trim()
      ? `${activeConversation.roleplayProfile.avatarEmoji || '🎭'} ${activeConversation.roleplayProfile.name}`
      : activeConversation?.directiveMode === 'assistant' && activeConversation?.assistantCategory
        ? `💡 ${
            uiLanguage === 'en'
              ? ASSISTANT_CATEGORY_TITLES_EN[activeConversation.assistantCategory]?.title || 'Expert'
              : ASSISTANT_FRAMEWORKS[activeConversation.assistantCategory]?.title || 'Uzman'
          }`
        : activeConversation?.directive?.trim() || '';

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex flex-col font-sans transition-colors duration-150 overflow-hidden relative ${
        isDarkMode ? 'dark bg-[#131314] text-[#e3e3e3]' : 'bg-[#ffffff] text-[#1f1f1f]'
      }`}
      style={{ height: viewportHeight }}
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Top App Bar */}
        <TopAppBar
          isDarkMode={isDarkMode}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenDirective={() => setIsDirectiveModalOpen(true)}
          hasApiKey={hasActiveKey}
          hasDirective={hasActiveDirective}
          directiveBadgeText={activeDirectiveDisplay}
          activeConversationTitle={activeConversation?.title}
          onRenameActiveChat={(newTitle) =>
            activeConversation && handleRenameConversation(activeConversation.id, newTitle)
          }
          inChatSearch={inChatSearch}
          onChangeInChatSearch={setInChatSearch}
          hasMessagesInActiveChat={activeMessages.length > 0}
          uiLanguage={uiLanguage}
          user={user}
          isAuthLoading={isAuthLoading}
          isSyncingCloud={isSyncingCloud}
          onSignInGoogle={handleGoogleSignIn}
          onSignOutGoogle={handleGoogleSignOut}
        />

        {/* Main Chat Area */}
        <ChatArea
          isDarkMode={isDarkMode}
          messages={activeMessages}
          streamingChunk={streamingChunk}
          isStreaming={isStreaming}
          isNetworkDone={isNetworkDone}
          inChatSearch={inChatSearch}
          onClearInChatSearch={() => setInChatSearch('')}
          onSendMessage={handleSendMessage}
          onTypingComplete={handleTypingComplete}
          onStopGeneration={handleStopGeneration}
          onOpenApiKey={() => setIsApiKeyModalOpen(true)}
          hasApiKey={hasActiveKey}
          currentModel={selectedModel}
          onSelectModel={handleSelectModel}
          availableModels={availableModels}
          uiLanguage={uiLanguage}
          regeneratingMessageId={regeneratingMessageId}
          onRegenerateMessage={handleRegenerateMessage}
          onSelectVariant={handleSelectVariant}
          onEditMessage={handleEditMessage}
          onRewindToMessage={handleRewindToMessage}
          onForkFromMessage={handleForkFromMessage}
          isRoleplayMode={Boolean(
            activeConversation?.directiveMode === 'roleplay' ||
              activeConversation?.roleplayProfile?.name?.trim()
          )}
          continuingMessageId={continuingMessageId}
          onContinueMessage={handleContinueMessage}
          forkNotice={forkNotice}
          onReturnToParentChat={(parentId) => {
            setForkNotice(null);
            setInChatSearch('');
            setActiveConversationId(parentId);
          }}
          onDismissForkNotice={() => setForkNotice(null)}
        />

        {/* Conversation Drawer */}
        <ConversationDrawer
          isOpen={isDrawerOpen}
          isDarkMode={isDarkMode}
          onClose={() => setIsDrawerOpen(false)}
          conversations={conversations}
          messagesMap={messagesMap}
          activeConversationId={activeConversation?.id || activeConversationId}
          onSelectConversation={(id) => {
            setForkNotice(null);
            setInChatSearch('');
            setActiveConversationId(id);
          }}
          onNewChat={() => {
            setForkNotice(null);
            setInChatSearch('');
            handleNewChat();
          }}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          uiLanguage={uiLanguage}
          user={user}
          isSyncingCloud={isSyncingCloud}
          onSignInGoogle={handleGoogleSignIn}
          onSignOutGoogle={handleGoogleSignOut}
        />

        {/* API Key Modal */}
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          isDarkMode={isDarkMode}
          onClose={() => setIsApiKeyModalOpen(false)}
          apiKey={apiKey}
          onSaveApiKey={handleSaveApiKey}
          hasEnvKey={hasEnvKey}
          uiLanguage={uiLanguage}
        />

        {/* Directive Modal */}
        <DirectiveModal
          isOpen={isDirectiveModalOpen}
          isDarkMode={isDarkMode}
          onClose={() => setIsDirectiveModalOpen(false)}
          conversationId={activeConversation?.id}
          directive={activeConversation?.directive || ''}
          directiveMode={
            activeConversation?.directiveMode ||
            (activeConversation?.roleplayProfile?.name?.trim() ? 'roleplay' : 'other')
          }
          assistantCategory={activeConversation?.assistantCategory || 'general'}
          roleplayProfile={activeConversation?.roleplayProfile}
          onSaveDirective={handleSaveDirective}
          conversationTitle={activeConversation?.title}
          onApplyGreeting={handleApplyGreeting}
          savedCharacters={savedCharacters}
          onSaveCharacterToLibrary={handleSaveCharacterToLibrary}
          onDeleteCharacterFromLibrary={handleDeleteCharacterFromLibrary}
          onStartNewChatWithCharacter={handleStartNewChatWithCharacter}
          uiLanguage={uiLanguage}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          isDarkMode={isDarkMode}
          onClose={() => setIsSettingsModalOpen(false)}
          onOpenDirective={() => setIsDirectiveModalOpen(true)}
          onOpenApiKey={() => setIsApiKeyModalOpen(true)}
          onToggleTheme={handleToggleTheme}
          onDeleteActiveChat={() =>
            activeConversation && handleDeleteConversation(activeConversation.id)
          }
          hasApiKey={hasActiveKey}
          hasDirective={hasActiveDirective}
          directivePreview={activeDirectiveDisplay}
          activeConversationTitle={activeConversation?.title}
          uiLanguage={uiLanguage}
          onSetLanguage={handleSetLanguage}
          user={user}
          isSyncingCloud={isSyncingCloud}
          onSignInGoogle={handleGoogleSignIn}
          onSignOutGoogle={handleGoogleSignOut}
        />
      </div>
    </div>
  );
}
