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

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
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
