/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, RoleplayProfile } from './types.ts';
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
        } catch (err) {
          console.error('Error syncing initial local chats to Google account:', err);
        } finally {
          setIsSyncingCloud(false);
        }

        let initialCloudCheckDone = false;

        unsubscribeCloud = subscribeToUserChats(
          currentUser.uid,
          (cloudConvs) => {
            if (cloudConvs.length > 0) {
              setConversations((prev) => {
                const cloudMap = new Map(cloudConvs.map((c) => [c.id, c]));
                for (const localC of prev) {
                  const scopedId = toUserScopedId(currentUser.uid, localC.id);
                  if (!cloudMap.has(scopedId) && localC.id === scopedId) {
                    cloudMap.set(localC.id, localC);
                  }
                }
                const merged = Array.from(cloudMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
                return merged.length > 0 ? merged : cloudConvs;
              });

              setActiveConversationId((prevActiveId) => {
                const scopedPrev = toUserScopedId(currentUser.uid, prevActiveId);
                if (cloudConvs.some((c) => c.id === prevActiveId)) return prevActiveId;
                if (cloudConvs.some((c) => c.id === scopedPrev)) return scopedPrev;
                return cloudConvs[0].id;
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
              const merged = { ...prev, ...cloudMsgsByConv };
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
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
    } catch (error) {
      console.error('Google Sign-Out error:', error);
    }
  };

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isNetworkDone, setIsNetworkDone] = useState(false);
  const [streamingChunk, setStreamingChunk] = useState('');
  const [pendingAiMessage, setPendingAiMessage] = useState<Message | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAccumulatedRef = useRef<string>('');
  const activeConvIdRef = useRef<string>('');

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
    localStorage.setItem('mai_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('mai_messages_map', JSON.stringify(messagesMap));
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

    const starterMsg: Message = {
      id: msgId,
      conversationId: convId,
      role: 'model',
      text: greetingText.trim(),
      timestamp: Date.now()
    };

    setMessagesMap((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), starterMsg]
    }));

    if (user) {
      setIsSyncingCloud(true);
      saveMessageToCloud(user.uid, starterMsg, { ...activeConversation, id: convId })
        .catch((err) => console.error('Failed to sync greeting message:', err))
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
        .catch((err) => console.error('Failed to sync directive update:', err))
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
        .catch((err) => console.error('Failed to sync new conversation:', err))
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
        .catch((err) => console.error('Failed to sync renamed conversation:', err))
        .finally(() => setIsSyncingCloud(false));
    }
  };

  const handleDeleteConversation = (id: string) => {
    const msgsToDelete = messagesMap[id] || [];
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);

    setMessagesMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (user) {
      setIsSyncingCloud(true);
      deleteConversationFromCloud(user.uid, id, msgsToDelete)
        .catch((err) => console.error('Failed to delete conversation from cloud:', err))
        .finally(() => setIsSyncingCloud(false));
    }

    if (activeConversationId === id) {
      if (updated.length > 0) {
        setActiveConversationId(updated[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  const handleClearAllConversations = () => {
    const prevConvs = [...conversations];
    const prevMsgs = { ...messagesMap };

    setConversations([]);
    setMessagesMap({});
    localStorage.removeItem('mai_conversations');
    localStorage.removeItem('mai_messages_map');

    if (user) {
      setIsSyncingCloud(true);
      Promise.all(
        prevConvs.map((c) => deleteConversationFromCloud(user.uid, c.id, prevMsgs[c.id] || []))
      )
        .catch((err) => console.error('Failed to clear cloud conversations:', err))
        .finally(() => setIsSyncingCloud(false));
    }

    handleNewChat();
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

    if (currentText && convId) {
      const rawAiId = `msg-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const aiMsgId = user ? toUserScopedId(user.uid, rawAiId) : rawAiId;
      const partialAiMessage: Message = {
        id: aiMsgId,
        conversationId: convId,
        role: 'model',
        text: currentText,
        timestamp: Date.now()
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

    setIsStreaming(false);
    setIsNetworkDone(false);
    setStreamingChunk('');
    setPendingAiMessage(null);
    currentAccumulatedRef.current = '';
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversation) return;
    const conversationId = user ? toUserScopedId(user.uid, activeConversation.id) : activeConversation.id;
    activeConvIdRef.current = conversationId;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const rawUserMsgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userMsgId = user ? toUserScopedId(user.uid, rawUserMsgId) : rawUserMsgId;

    const userMessage: Message = {
      id: userMsgId,
      conversationId,
      role: 'user',
      text,
      timestamp: Date.now()
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
      const title =
        activeConversation.directiveMode === 'roleplay' && activeConversation.roleplayProfile?.name?.trim()
          ? `${activeConversation.roleplayProfile.avatarEmoji || '🎭'} ${activeConversation.roleplayProfile.name.trim()}`
          : text.length > 30
            ? text.slice(0, 30) + '...'
            : text;
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
        .catch((err) => console.error('Cloud sync error on user message:', err))
        .finally(() => setIsSyncingCloud(false));
    }

    // Start ultra-fast streaming from Gemini
    setIsStreaming(true);
    setIsNetworkDone(false);
    setStreamingChunk('');
    setPendingAiMessage(null);
    currentAccumulatedRef.current = '';

    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
    }
    watchdogTimerRef.current = setTimeout(() => {
      handleStopGeneration();
    }, 25000);

    const effectiveDirective = buildCombinedDirective(
      updatedConvObj.directive || '',
      updatedConvObj.directiveMode || (updatedConvObj.roleplayProfile?.name ? 'roleplay' : 'other'),
      updatedConvObj.assistantCategory || 'general',
      updatedConvObj.roleplayProfile
    );

    let accumulatedText = '';

    try {
      const stream = streamGeminiChat(
        apiKey,
        text,
        currentMessages,
        effectiveDirective,
        selectedModel,
        controller.signal,
        uiLanguage
      );

      for await (const chunk of stream) {
        if (chunk.text) {
          accumulatedText += chunk.text;
          currentAccumulatedRef.current = accumulatedText;
          setStreamingChunk(accumulatedText);
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
        timestamp: Date.now()
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
          .catch((err) => console.error('Cloud sync error on AI message:', err))
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
          currentModel={selectedModel}
          onSelectModel={handleSelectModel}
          availableModels={availableModels}
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
          onSendMessage={handleSendMessage}
          onTypingComplete={handleTypingComplete}
          onStopGeneration={handleStopGeneration}
          onOpenApiKey={() => setIsApiKeyModalOpen(true)}
          hasApiKey={hasActiveKey}
          uiLanguage={uiLanguage}
        />

        {/* Conversation Drawer */}
        <ConversationDrawer
          isOpen={isDrawerOpen}
          isDarkMode={isDarkMode}
          onClose={() => setIsDrawerOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversation?.id || activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewChat={() => handleNewChat()}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onClearAllConversations={handleClearAllConversations}
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
          currentModel={selectedModel}
          onSelectModel={handleSelectModel}
          availableModels={availableModels}
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
