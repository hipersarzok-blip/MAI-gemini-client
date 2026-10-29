import { DirectiveMode, AssistantCategory } from './utils/directiveFrameworks.ts';

export interface GroundingSource {
  title: string;
  url: string;
}

export interface RoleplayProfile {
  name: string;
  personality: string;
  gender: string;
  appearance: string;
  scenario: string;
  role?: string;             // Karakter arketipleri: Komutan, Dedektif, Büyücü, Terapist, Android, vb.
  avatarEmoji?: string;      // 🎭, ⚔️, 🌸, 🕵️‍♂️, 🐺, 🖤, 🤖, 👑
  relationship?: string;     // Kullanıcı ile ilişki: Yabancı, Düşman, Yakın Dost, Aşık, vb.
  speechStyle?: string;      // Konuşma tarzı, edebi üslup, ses tonu
  emotionalFlaws?: string;   // C.ai & Emochi: acılar, travma, zaaflar ve içsel çatışmalar (Angst)
  customRules?: string;      // Özel kurallar veya tabular
  greeting?: string;         // Karakterin açılış mesajı / ilk repliği
  unbreakableImmersion?: boolean; // 4. duvarı asla yıkmama kuralı
}

export interface SavedCharacter {
  id: string;
  createdAt: number;
  updatedAt: number;
  profile: RoleplayProfile;
}


export interface MessageAttachment {
  id: string;
  name: string;
  mimeType: string;
  /** Raw base64 payload (without data:...;base64, prefix) for images/PDFs */
  data?: string;
  /** Data URL for rendering image thumbnail in the chat UI */
  previewUrl?: string;
  /** Extracted UTF-8 text content for code/text files */
  textContent?: string;
  size?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  variants?: string[];
  activeVariantIndex?: number;
  attachments?: MessageAttachment[];
  starred?: boolean;
  sources?: GroundingSource[];
  searchQueries?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  directive: string;
  directiveMode?: DirectiveMode;
  assistantCategory?: AssistantCategory;
  roleplayProfile?: RoleplayProfile;
  createdAt: number;
  updatedAt: number;
}
