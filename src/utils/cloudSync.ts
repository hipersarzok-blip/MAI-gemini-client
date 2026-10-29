import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Conversation, Message, RoleplayProfile } from '../types.ts';
import { DirectiveMode, AssistantCategory } from './directiveFrameworks.ts';

// Track known cloud conversation IDs to distinguish create vs update cleanly
const knownCloudConvIds = new Set<string>();
const knownCloudMsgIds = new Set<string>();

/**
 * Ensures an ID adheres strictly to `^[a-zA-Z0-9_\-]+$` and length <= 128
 * and is scoped to the user's UID to prevent cross-user ID collisions.
 */
export function toUserScopedId(userId: string, rawId: string): string {
  const cleanUser = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
  const cleanRaw = rawId.replace(/[^a-zA-Z0-9_-]/g, '') || `item-${Date.now()}`;
  const prefix = `${cleanUser}_`;
  if (cleanRaw.startsWith(prefix)) {
    return cleanRaw.slice(0, 128);
  }
  return `${prefix}${cleanRaw}`.slice(0, 128);
}

function sanitizeRoleplayProfile(profile?: RoleplayProfile): Record<string, unknown> | null {
  if (!profile) return null;
  // Ensure there is at least some meaningful field saved
  const hasContent =
    Boolean(profile.name?.trim()) ||
    Boolean(profile.role?.trim()) ||
    Boolean(profile.personality?.trim()) ||
    Boolean(profile.scenario?.trim()) ||
    Boolean(profile.greeting?.trim()) ||
    Boolean(profile.customRules?.trim());

  if (!hasContent) return null;

  return {
    name: (profile.name || '').slice(0, 200),
    role: (profile.role || '').slice(0, 300),
    avatarEmoji: (profile.avatarEmoji || '🎭').slice(0, 16),
    gender: (profile.gender || 'Kadın').slice(0, 64),
    appearance: (profile.appearance || '').slice(0, 2000),
    personality: (profile.personality || '').slice(0, 4000),
    scenario: (profile.scenario || '').slice(0, 4000),
    relationship: (profile.relationship || '').slice(0, 1000),
    speechStyle: (profile.speechStyle || '').slice(0, 2000),
    emotionalFlaws: (profile.emotionalFlaws || '').slice(0, 3000),
    customRules: (profile.customRules || '').slice(0, 4000),
    greeting: (profile.greeting || '').slice(0, 4000),
    unbreakableImmersion: profile.unbreakableImmersion !== false
  };
}

export async function saveConversationToCloud(
  userId: string,
  conv: Conversation
): Promise<string> {
  const cloudId = toUserScopedId(userId, conv.id);
  const path = `conversations/${cloudId}`;
  const docRef = doc(db, 'conversations', cloudId);

  const safeTitle = (conv.title || 'Yeni Sohbet').trim().slice(0, 500) || 'Yeni Sohbet';
  const safeDirective = (conv.directive || '').slice(0, 50000);
  const safeMode: DirectiveMode =
    conv.directiveMode === 'roleplay' || conv.directiveMode === 'assistant' || conv.directiveMode === 'other'
      ? conv.directiveMode
      : conv.roleplayProfile?.name?.trim()
        ? 'roleplay'
        : 'other';
  const safeCategory: AssistantCategory = (conv.assistantCategory || 'general') as AssistantCategory;
  const safeProfile = sanitizeRoleplayProfile(conv.roleplayProfile);
  const clientCreatedAt = typeof conv.createdAt === 'number' ? conv.createdAt : Date.now();
  const clientUpdatedAt = typeof conv.updatedAt === 'number' ? conv.updatedAt : Date.now();

  try {
    let existsInCloud = knownCloudConvIds.has(cloudId);
    if (!existsInCloud) {
      try {
        const snap = await getDoc(docRef);
        existsInCloud = snap.exists();
        if (existsInCloud) {
          knownCloudConvIds.add(cloudId);
        }
      } catch {
        existsInCloud = false;
      }
    }

    if (existsInCloud) {
      await updateDoc(docRef, {
        title: safeTitle,
        directive: safeDirective,
        directiveMode: safeMode,
        assistantCategory: safeCategory.slice(0, 64),
        roleplayProfile: safeProfile,
        clientUpdatedAt,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(docRef, {
        id: cloudId,
        userId,
        title: safeTitle,
        directive: safeDirective,
        directiveMode: safeMode,
        assistantCategory: safeCategory.slice(0, 64),
        roleplayProfile: safeProfile,
        clientCreatedAt,
        clientUpdatedAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      knownCloudConvIds.add(cloudId);
    }
    return cloudId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return cloudId;
  }
}

export async function saveMessageToCloud(
  userId: string,
  msg: Message,
  parentConv?: Conversation
): Promise<string> {
  const cloudConvId = toUserScopedId(userId, msg.conversationId);
  const cloudMsgId = toUserScopedId(userId, msg.id);
  const path = `messages/${cloudMsgId}`;
  const docRef = doc(db, 'messages', cloudMsgId);

  // Ensure parent conversation exists in Firestore before creating message (Master Gate requirement)
  if (!knownCloudConvIds.has(cloudConvId) && parentConv) {
    await saveConversationToCloud(userId, { ...parentConv, id: cloudConvId });
  }

  const safeText = (msg.text || ' ').slice(0, 100000);
  const safeRole = msg.role === 'model' ? 'model' : 'user';
  const safeTimestamp = typeof msg.timestamp === 'number' ? msg.timestamp : Date.now();

  const payload: Record<string, unknown> = {
    id: cloudMsgId,
    conversationId: cloudConvId,
    userId,
    role: safeRole,
    text: safeText,
    timestamp: safeTimestamp,
    createdAt: serverTimestamp()
  };

  if (msg.sources && msg.sources.length > 0) {
    payload.sources = msg.sources.slice(0, 30).map((s) => ({
      title: (s.title || '').slice(0, 300),
      url: (s.url || '').slice(0, 1000)
    }));
  }

  if (msg.searchQueries && msg.searchQueries.length > 0) {
    payload.searchQueries = msg.searchQueries
      .slice(0, 20)
      .map((q) => String(q).slice(0, 500));
  }

  try {
    let exists = knownCloudMsgIds.has(cloudMsgId);
    let existingText: string | undefined;
    if (!exists) {
      try {
        const snap = await getDoc(docRef);
        exists = snap.exists();
        if (exists) {
          knownCloudMsgIds.add(cloudMsgId);
          existingText = snap.data()?.text;
        }
      } catch {
        exists = false;
      }
    }

    if (exists) {
      if (existingText !== safeText) {
        await updateDoc(docRef, {
          text: safeText
        });
      }
    } else {
      await setDoc(docRef, payload);
      knownCloudMsgIds.add(cloudMsgId);
    }
    return cloudMsgId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return cloudMsgId;
  }
}

// Track deleted conversation IDs so in-flight snapshots never re-add deleted chats
const deletedConvIds = new Set<string>(
  (() => {
    try {
      const saved = localStorage.getItem('mai_deleted_conv_ids_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(-300);
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  })()
);

function persistDeletedConvIds() {
  try {
    const arr = Array.from(deletedConvIds).slice(-300);
    localStorage.setItem('mai_deleted_conv_ids_v1', JSON.stringify(arr));
  } catch {
    // Ignore storage quota errors
  }
}

export function markConversationDeletedLocal(conversationId: string, userId?: string): void {
  deletedConvIds.add(conversationId);
  knownCloudConvIds.delete(conversationId);
  if (userId) {
    const scoped = toUserScopedId(userId, conversationId);
    deletedConvIds.add(scoped);
    knownCloudConvIds.delete(scoped);
  }
  persistDeletedConvIds();
}

export function isConversationDeleted(conversationId: string, userId?: string): boolean {
  if (deletedConvIds.has(conversationId)) return true;
  if (userId && deletedConvIds.has(toUserScopedId(userId, conversationId))) return true;
  return false;
}

export async function deleteMessagesFromCloud(
  userId: string,
  messagesToDelete: Message[]
): Promise<void> {
  await Promise.allSettled(
    messagesToDelete.map(async (m) => {
      const cloudMsgId = toUserScopedId(userId, m.id);
      knownCloudMsgIds.delete(cloudMsgId);
      await deleteDoc(doc(db, 'messages', cloudMsgId));
    })
  );
}

export async function deleteConversationFromCloud(
  userId: string,
  conversationId: string,
  messagesForConv: Message[] = []
): Promise<void> {
  const cloudConvId = toUserScopedId(userId, conversationId);
  const convPath = `conversations/${cloudConvId}`;
  markConversationDeletedLocal(conversationId, userId);

  try {
    // Delete the conversation document first so snapshot immediately removes it
    await deleteDoc(doc(db, 'conversations', cloudConvId));
    await deleteMessagesFromCloud(userId, messagesForConv);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, convPath);
  }
}

export function subscribeToUserChats(
  userId: string,
  onConversationsLoaded: (convs: Conversation[]) => void,
  onMessagesLoaded: (msgsByConv: Record<string, Message[]>) => void
): Unsubscribe {
  const convQuery = query(
    collection(db, 'conversations'),
    where('userId', '==', userId)
  );

  const msgQuery = query(
    collection(db, 'messages'),
    where('userId', '==', userId)
  );

  const unsubConvs = onSnapshot(
    convQuery,
    (snapshot) => {
      const loaded: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        if (isConversationDeleted(docSnap.id, userId)) {
          return;
        }
        const data = docSnap.data();
        knownCloudConvIds.add(docSnap.id);
        loaded.push({
          id: docSnap.id,
          title: data.title || 'New Chat',
          directive: data.directive || '',
          directiveMode: (data.directiveMode as DirectiveMode) || (data.roleplayProfile?.name ? 'roleplay' : 'other'),
          assistantCategory: (data.assistantCategory as AssistantCategory) || 'general',
          roleplayProfile: data.roleplayProfile ? (data.roleplayProfile as RoleplayProfile) : undefined,
          createdAt: typeof data.clientCreatedAt === 'number' ? data.clientCreatedAt : Date.now(),
          updatedAt: typeof data.clientUpdatedAt === 'number' ? data.clientUpdatedAt : Date.now()
        });
      });
      loaded.sort((a, b) => b.updatedAt - a.updatedAt);
      onConversationsLoaded(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    }
  );

  const unsubMsgs = onSnapshot(
    msgQuery,
    (snapshot) => {
      const grouped: Record<string, Message[]> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        knownCloudMsgIds.add(docSnap.id);
        const convId = data.conversationId as string;
        if (!grouped[convId]) {
          grouped[convId] = [];
        }
        grouped[convId].push({
          id: docSnap.id,
          conversationId: convId,
          role: data.role === 'model' ? 'model' : 'user',
          text: data.text || '',
          sources: Array.isArray(data.sources) ? data.sources : undefined,
          searchQueries: Array.isArray(data.searchQueries) ? data.searchQueries : undefined,
          timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now()
        });
      });

      Object.keys(grouped).forEach((convId) => {
        grouped[convId].sort((a, b) => a.timestamp - b.timestamp);
      });

      onMessagesLoaded(grouped);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    }
  );

  return () => {
    unsubConvs();
    unsubMsgs();
  };
}
