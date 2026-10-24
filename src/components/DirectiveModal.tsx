import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, ChevronDown, Sparkles, Search, Download, Upload, Shield,
  Code2, Cloud, ShieldCheck, Database, Layers, Network, BookOpen, GraduationCap, 
  Calculator, Atom, Stethoscope, Pill, Dumbbell, Brain, TrendingUp, Scale, Rocket, 
  Target, ListTodo, Edit3, PenTool, Clapperboard, Globe, Briefcase, HelpCircle, LucideIcon
} from 'lucide-react';
import { 
  DirectiveMode, 
  AssistantCategory, 
  AssistantDomain,
  ASSISTANT_FRAMEWORKS,
  ASSISTANT_DOMAINS,
  ASSISTANT_CATEGORY_TITLES_EN,
  ROLEPLAY_PRESETS,
  RoleplayTemplateItem
} from '../utils/directiveFrameworks.ts';
import { RoleplayProfile } from '../types.ts';

const CATEGORY_ICONS: Record<AssistantCategory, LucideIcon> = {
  coding: Code2,
  devops: Cloud,
  cybersecurity: ShieldCheck,
  data_science: Database,
  database: Layers,
  system_architecture: Network,
  academic_research: BookOpen,
  homework: GraduationCap,
  study: Calculator,
  mathematics: Calculator,
  physics: Atom,
  medical: Stethoscope,
  pharmacology: Pill,
  nutrition_fitness: Dumbbell,
  psychology: Brain,
  finance: TrendingUp,
  legal: Scale,
  startup_business: Rocket,
  marketing_growth: Target,
  project_management: ListTodo,
  technical_writing: Edit3,
  copywriting: PenTool,
  screenplay_creative: Clapperboard,
  translation_linguistics: Globe,
  job_interview: Briefcase,
  critical_thinking: HelpCircle,
  general: Sparkles
};

const AVATAR_EMOJIS = ['🎭', '⚔️', '🌸', '🕵️‍♂️', '🐺', '🖤', '🎀', '🤖', '🧙‍♂️', '👑', '☕', '🌕', '🔥', '🛡️', '⚡', '🌙', '🥀', '❄️'];

interface DirectiveModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  conversationId?: string;
  directive: string;
  directiveMode?: DirectiveMode;
  assistantCategory?: AssistantCategory;
  roleplayProfile?: RoleplayProfile;
  onSaveDirective: (
    directive: string, 
    mode: DirectiveMode, 
    category: AssistantCategory, 
    roleplayProfile?: RoleplayProfile
  ) => void;
  conversationTitle?: string;
  onApplyGreeting?: (greetingText: string) => void;
  uiLanguage?: 'tr' | 'en';
}

export const DirectiveModal: React.FC<DirectiveModalProps> = ({
  isOpen,
  isDarkMode,
  onClose,
  conversationId,
  directive,
  directiveMode = 'other',
  assistantCategory = 'general',
  roleplayProfile,
  onSaveDirective,
  conversationTitle,
  onApplyGreeting,
  uiLanguage = 'tr'
}) => {
  const isEn = uiLanguage === 'en';

  const effectiveInitialMode: DirectiveMode =
    directiveMode === 'roleplay' || Boolean(roleplayProfile?.name?.trim())
      ? 'roleplay'
      : directiveMode === 'assistant'
        ? 'assistant'
        : 'other';

  const [selectedMode, setSelectedMode] = useState<DirectiveMode>(effectiveInitialMode);
  const [selectedCategory, setSelectedCategory] = useState<AssistantCategory>(assistantCategory || 'general');
  const [activeDomain, setActiveDomain] = useState<AssistantDomain | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customText, setCustomText] = useState(directive || '');

  // Roleplay character fields
  const [rpName, setRpName] = useState(roleplayProfile?.name || '');
  const [rpRole, setRpRole] = useState(roleplayProfile?.role || '');
  const [rpAvatar, setRpAvatar] = useState(roleplayProfile?.avatarEmoji || '🎭');
  const [rpGender, setRpGender] = useState(roleplayProfile?.gender || (isEn ? 'Female' : 'Kadın'));
  const [rpAppearance, setRpAppearance] = useState(roleplayProfile?.appearance || '');
  const [rpPersonality, setRpPersonality] = useState(roleplayProfile?.personality || '');
  const [rpScenario, setRpScenario] = useState(roleplayProfile?.scenario || '');
  const [rpRelationship, setRpRelationship] = useState(roleplayProfile?.relationship || '');
  const [rpSpeechStyle, setRpSpeechStyle] = useState(roleplayProfile?.speechStyle || '');
  const [rpEmotionalFlaws, setRpEmotionalFlaws] = useState(roleplayProfile?.emotionalFlaws || '');
  const [rpCustomRules, setRpCustomRules] = useState(roleplayProfile?.customRules || '');
  const [rpGreeting, setRpGreeting] = useState(roleplayProfile?.greeting || '');
  const [autoInsertGreeting, setAutoInsertGreeting] = useState(false);

  // Preset filter
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [presetGenderFilter, setPresetGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');
  const [showPresetsView, setShowPresetsView] = useState(false);

  const wasOpenRef = React.useRef<boolean>(false);
  const lastConvIdRef = React.useRef<string | undefined>(conversationId);

  // Sync form state ONLY when modal opens or active conversation changes
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    const convChanged = conversationId !== lastConvIdRef.current;
    wasOpenRef.current = isOpen;
    lastConvIdRef.current = conversationId;

    if (!justOpened && !convChanged) return;

    const resolvedMode: DirectiveMode =
      directiveMode === 'roleplay' || Boolean(roleplayProfile?.name?.trim())
        ? 'roleplay'
        : directiveMode === 'assistant'
          ? 'assistant'
          : 'other';

    setCustomText(directive || '');
    setSelectedMode(resolvedMode);
    setSelectedCategory(assistantCategory || 'general');
    setSearchQuery('');
    setActiveDomain('all');
    setShowPresetsView(false);
    setAutoInsertGreeting(false);

    if (roleplayProfile && (
      roleplayProfile.name ||
      roleplayProfile.role ||
      roleplayProfile.personality ||
      roleplayProfile.scenario ||
      roleplayProfile.greeting ||
      roleplayProfile.customRules
    )) {
      setRpName(roleplayProfile.name || '');
      setRpRole(roleplayProfile.role || '');
      setRpAvatar(roleplayProfile.avatarEmoji || '🎭');
      setRpGender(roleplayProfile.gender || (isEn ? 'Female' : 'Kadın'));
      setRpAppearance(roleplayProfile.appearance || '');
      setRpPersonality(roleplayProfile.personality || '');
      setRpScenario(roleplayProfile.scenario || '');
      setRpRelationship(roleplayProfile.relationship || '');
      setRpSpeechStyle(roleplayProfile.speechStyle || '');
      setRpEmotionalFlaws(roleplayProfile.emotionalFlaws || '');
      setRpCustomRules(roleplayProfile.customRules || '');
      setRpGreeting(roleplayProfile.greeting || '');
    } else if (convChanged) {
      setRpName('');
      setRpRole('');
      setRpAvatar('🎭');
      setRpGender(isEn ? 'Female' : 'Kadın');
      setRpAppearance('');
      setRpPersonality('');
      setRpScenario('');
      setRpRelationship('');
      setRpSpeechStyle('');
      setRpEmotionalFlaws('');
      setRpCustomRules('');
      setRpGreeting('');
    }
  }, [isOpen, conversationId, directive, directiveMode, assistantCategory, roleplayProfile, isEn]);

  const loadPreset = (preset: RoleplayTemplateItem) => {
    setRpName(preset.charName);
    setRpRole(preset.role);
    setRpAvatar(preset.avatarEmoji);
    setRpGender(preset.gender);
    setRpAppearance(preset.appearance);
    setRpPersonality(preset.personality);
    setRpScenario(preset.scenario);
    setRpRelationship(preset.relationship);
    setRpSpeechStyle(preset.speechStyle);
    setRpEmotionalFlaws(preset.emotionalFlaws);
    setRpCustomRules(preset.customRules || '');
    setRpGreeting(preset.greeting);
    setShowPresetsView(false);
  };

  const handleExportCharacter = () => {
    const cardData = {
      spec: 'character_card_v1',
      name: rpName,
      role: rpRole,
      avatarEmoji: rpAvatar,
      gender: rpGender,
      appearance: rpAppearance,
      personality: rpPersonality,
      emotionalFlaws: rpEmotionalFlaws,
      scenario: rpScenario,
      relationship: rpRelationship,
      speechStyle: rpSpeechStyle,
      customRules: rpCustomRules,
      greeting: rpGreeting,
      exportedAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(cardData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(rpName || 'character').toLowerCase().replace(/\s+/g, '_')}_card.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCharacter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.name) setRpName(parsed.name);
        if (parsed.role) setRpRole(parsed.role);
        if (parsed.avatarEmoji) setRpAvatar(parsed.avatarEmoji);
        if (parsed.gender) setRpGender(parsed.gender);
        if (parsed.appearance) setRpAppearance(parsed.appearance);
        if (parsed.personality) setRpPersonality(parsed.personality);
        if (parsed.emotionalFlaws) setRpEmotionalFlaws(parsed.emotionalFlaws);
        if (parsed.scenario) setRpScenario(parsed.scenario);
        if (parsed.relationship) setRpRelationship(parsed.relationship);
        if (parsed.speechStyle) setRpSpeechStyle(parsed.speechStyle);
        if (parsed.customRules) setRpCustomRules(parsed.customRules);
        if (parsed.greeting) setRpGreeting(parsed.greeting);
      } catch {
        // Ignore invalid json
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (selectedMode === 'roleplay') {
      setRpName('');
      setRpRole('');
      setRpAvatar('🎭');
      setRpGender(isEn ? 'Female' : 'Kadın');
      setRpAppearance('');
      setRpPersonality('');
      setRpScenario('');
      setRpRelationship('');
      setRpSpeechStyle('');
      setRpEmotionalFlaws('');
      setRpCustomRules('');
      setRpGreeting('');
    } else {
      setCustomText('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const hasRpData = Boolean(
      rpName.trim() ||
      rpRole.trim() ||
      rpPersonality.trim() ||
      rpScenario.trim() ||
      rpAppearance.trim() ||
      rpRelationship.trim() ||
      rpSpeechStyle.trim() ||
      rpEmotionalFlaws.trim() ||
      rpGreeting.trim() ||
      rpCustomRules.trim()
    );

    const finalRpProfile: RoleplayProfile | undefined = hasRpData
      ? {
          name: rpName.trim(),
          role: rpRole.trim(),
          avatarEmoji: rpAvatar,
          gender: rpGender.trim(),
          appearance: rpAppearance.trim(),
          personality: rpPersonality.trim(),
          scenario: rpScenario.trim(),
          relationship: rpRelationship.trim(),
          speechStyle: rpSpeechStyle.trim(),
          emotionalFlaws: rpEmotionalFlaws.trim(),
          customRules: rpCustomRules.trim(),
          greeting: rpGreeting.trim(),
          unbreakableImmersion: true
        }
      : undefined;

    const effectiveModeToSave: DirectiveMode =
      selectedMode === 'roleplay' && !hasRpData && !customText.trim()
        ? 'other'
        : selectedMode;

    onSaveDirective(customText.trim(), effectiveModeToSave, selectedCategory, finalRpProfile);

    if (effectiveModeToSave === 'roleplay' && autoInsertGreeting && rpGreeting.trim()) {
      onApplyGreeting?.(rpGreeting.trim());
    }

    onClose();
  };

  const filteredPresets = useMemo(() => {
    const q = presetSearchQuery.toLowerCase().trim();
    return ROLEPLAY_PRESETS.filter((p) => {
      if (selectedGenre !== 'all' && p.genre !== selectedGenre) return false;
      if (presetGenderFilter === 'female' && !p.gender.toLowerCase().includes('kadın') && !p.gender.toLowerCase().includes('female')) {
        return false;
      }
      if (presetGenderFilter === 'male' && !p.gender.toLowerCase().includes('erkek') && !p.gender.toLowerCase().includes('male')) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.charName.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.personality.toLowerCase().includes(q)
      );
    });
  }, [selectedGenre, presetGenderFilter, presetSearchQuery]);

  const filteredCategories = useMemo(() => {
    const list = Object.values(ASSISTANT_FRAMEWORKS);
    return list.filter((cat) => {
      const matchesDomain = activeDomain === 'all' || cat.domain === activeDomain;
      const q = searchQuery.toLowerCase().trim();
      const enTitle = ASSISTANT_CATEGORY_TITLES_EN[cat.id as AssistantCategory]?.title || '';
      const enDesc = ASSISTANT_CATEGORY_TITLES_EN[cat.id as AssistantCategory]?.description || '';
      const matchesSearch = !q || 
        cat.title.toLowerCase().includes(q) || 
        cat.description.toLowerCase().includes(q) ||
        enTitle.toLowerCase().includes(q) ||
        enDesc.toLowerCase().includes(q);
      return matchesDomain && matchesSearch;
    });
  }, [activeDomain, searchQuery]);

  const genderOptions = isEn
    ? [
        { val: 'Erkek', label: 'Male' },
        { val: 'Kadın', label: 'Female' },
        { val: 'Diğer', label: 'Other' }
      ]
    : [
        { val: 'Erkek', label: 'Erkek' },
        { val: 'Kadın', label: 'Kadın' },
        { val: 'Diğer', label: 'Diğer' }
      ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 transition-all duration-300 ${
      isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Main Modal Container */}
      <div className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl z-10 border transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
        isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-5'
      } ${
        isDarkMode 
          ? 'bg-[#1e1f20] border-[#2f3032] text-[#e3e3e3]' 
          : 'bg-white border-[#e3e8ef] text-[#1f1f1f]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={`text-lg transition-transform duration-300 inline-block ${isOpen ? 'scale-100 rotate-0' : 'scale-75 -rotate-12'}`}>
              {selectedMode === 'roleplay' ? rpAvatar || '🎭' : '⚙️'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">
                  {selectedMode === 'roleplay'
                    ? isEn
                      ? 'Roleplay Engine'
                      : 'Rol Yapma Motoru'
                    : isEn
                      ? 'Chat Directive & Persona'
                      : 'Sohbet Direktifi & Kişilik'}
                </h2>
              </div>
              {conversationTitle && (
                <p className={`text-[11px] truncate max-w-[280px] sm:max-w-[400px] ${isDarkMode ? 'text-[#9fa1a0]' : 'text-[#747775]'}`}>
                  {conversationTitle}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-full transition-all duration-200 hover:rotate-90 active:scale-90 ${
              isDarkMode ? 'hover:bg-[#282a2c] text-[#c4c7c5]' : 'hover:bg-[#f0f4f9] text-[#444746]'
            }`}
            aria-label={isEn ? 'Close' : 'Kapat'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
          {/* Segmented Mode Selector */}
          <div className={`p-1 rounded-xl flex items-center gap-1 border ${
            isDarkMode ? 'bg-[#131314] border-[#2b2d30]' : 'bg-[#f0f4f9] border-[#dfe3e8]'
          }`}>
            <button
              type="button"
              onClick={() => setSelectedMode('roleplay')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-all text-center flex items-center justify-center gap-1.5 ${
                selectedMode === 'roleplay'
                  ? isDarkMode 
                    ? 'bg-[#282a2c] text-white shadow-xs font-semibold' 
                    : 'bg-white text-[#1a73e8] shadow-xs font-semibold'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span>🎭 {isEn ? 'Roleplay Engine' : 'Rol Yapma Motoru'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('assistant')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-all text-center flex items-center justify-center gap-1.5 ${
                selectedMode === 'assistant'
                  ? isDarkMode 
                    ? 'bg-[#282a2c] text-white shadow-xs font-semibold' 
                    : 'bg-white text-[#1a73e8] shadow-xs font-semibold'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span>🤖 {isEn ? 'Expert Assistant' : 'Uzman Asistan'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('other')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-all text-center flex items-center justify-center gap-1.5 ${
                selectedMode === 'other'
                  ? isDarkMode 
                    ? 'bg-[#282a2c] text-white shadow-xs font-semibold' 
                    : 'bg-white text-[#1a73e8] shadow-xs font-semibold'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span>✍️ {isEn ? 'Custom Directive' : 'Serbest Direktif'}</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* MODE 1: ROLEPLAY - ADVANCED CHARACTER.AI & EMOCHI ENGINE  */}
          {/* ========================================================= */}
          {selectedMode === 'roleplay' && (
            <div key="tab-roleplay" className="space-y-3.5 pt-1 animate-fade-up">
              {/* Presets and Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPresetsView(!showPresetsView)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4285f4] text-white font-medium hover:bg-[#1a73e8] transition-colors shadow-xs text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isEn
                        ? `Character Presets (${ROLEPLAY_PRESETS.length})`
                        : `Hazır Karakterler (${ROLEPLAY_PRESETS.length})`}
                    </span>
                    <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${showPresetsView ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title={isEn ? 'Import JSON Character Card' : 'JSON Karakter Kartı İçe Aktar'}
                  >
                    <Upload className="w-3 h-3 text-[#4285f4]" />
                    <span className="text-[11px]">{isEn ? 'Import' : 'İçe Aktar'}</span>
                    <input type="file" accept=".json" onChange={handleImportCharacter} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleExportCharacter}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title={isEn ? 'Export character as JSON' : 'Karakteri JSON olarak dışa aktar'}
                  >
                    <Download className="w-3 h-3 text-[#34a853]" />
                    <span className="text-[11px]">{isEn ? 'Export' : 'Dışa Aktar'}</span>
                  </button>
                </div>
              </div>

              {/* Presets Gallery Accordion */}
              {showPresetsView && (
                <div className="p-3 rounded-xl border border-[#4285f4]/30 bg-[#4285f4]/5 space-y-2.5 animate-accordion">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#4285f4]/20">
                    <span className="font-semibold text-xs text-[#4285f4]">
                      {isEn
                        ? `Select a Character (${filteredPresets.length})`
                        : `Hazır Karakter Seçin (${filteredPresets.length})`}
                    </span>
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      {[
                        { id: 'all', label: isEn ? 'All' : 'Tümü' },
                        { id: 'anime', label: 'Anime (110)' },
                        { id: 'scifi', label: isEn ? 'Sci-Fi' : 'Siberpunk' },
                        { id: 'fantasy', label: isEn ? 'Fantasy' : 'Fantastik' },
                        { id: 'drama', label: isEn ? 'Drama' : 'Dram' },
                        { id: 'romance', label: isEn ? 'Romance' : 'Romantizm' },
                        { id: 'thriller', label: isEn ? 'Thriller' : 'Gerilim' },
                      ].map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGenre(g.id)}
                          className={`px-2 py-0.5 rounded-md transition-colors ${
                            selectedGenre === g.id 
                              ? 'bg-[#4285f4] text-white font-medium' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search & Gender Filter Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div
                      className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                        isDarkMode ? 'bg-[#131314] border-[#2f3032]' : 'bg-white border-[#dfe3e8]'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
                      <input
                        type="text"
                        value={presetSearchQuery}
                        onChange={(e) => setPresetSearchQuery(e.target.value)}
                        placeholder={
                          isEn
                            ? 'Search 120 characters or anime (e.g. Gojo, Frieren, Zero Two, Levi)...'
                            : '120 karakter veya anime ara (Örn: Gojo, Frieren, Zero Two, Levi)...'
                        }
                        className="w-full bg-transparent outline-none text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] shrink-0">
                      {[
                        { id: 'all' as const, label: isEn ? 'All Genders' : 'Tüm Cinsiyetler' },
                        { id: 'female' as const, label: isEn ? '♀ Female (85+)' : '♀ Kız (85+)' },
                        { id: 'male' as const, label: isEn ? '♂ Male (30+)' : '♂ Erkek (30+)' }
                      ].map((gf) => (
                        <button
                          key={gf.id}
                          type="button"
                          onClick={() => setPresetGenderFilter(gf.id)}
                          className={`px-2.5 py-1 rounded-lg border transition-colors ${
                            presetGenderFilter === gf.id
                              ? 'bg-[#4285f4] border-[#4285f4] text-white font-semibold'
                              : isDarkMode
                                ? 'bg-[#18191a] border-[#2f3032] text-[#c4c7c5]'
                                : 'bg-white border-[#dfe3e8] text-[#444746]'
                          }`}
                        >
                          {gf.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {filteredPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => loadPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 hover:border-[#4285f4] hover:bg-[#4285f4]/10 ${
                          isDarkMode ? 'bg-[#18191a] border-[#2f3032]' : 'bg-white border-[#dfe3e8]'
                        }`}
                      >
                        <span className="text-2xl shrink-0 p-1 rounded-lg bg-black/5 dark:bg-white/5">{preset.avatarEmoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs truncate">{preset.charName}</span>
                            <span className="text-[10px] opacity-60 ml-1">
                              {isEn
                                ? preset.gender.startsWith('Kadın')
                                  ? 'Female'
                                  : preset.gender.startsWith('Erkek')
                                    ? 'Male'
                                    : preset.gender
                                : preset.gender}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#4285f4] block truncate">{preset.role}</span>
                          <p className="text-[10px] opacity-70 line-clamp-2 mt-0.5 leading-tight">{preset.personality}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Avatar Emoji Selector & Character Name */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'Icon / Emoji' : 'Simge / Emoji'}
                  </label>
                  <div className="relative">
                    <select
                      value={rpAvatar}
                      onChange={(e) => setRpAvatar(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-sm appearance-none outline-none ${
                        isDarkMode ? 'bg-[#131314] border-[#2f3032] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] text-black'
                      }`}
                    >
                      {AVATAR_EMOJIS.map(em => (
                        <option key={em} value={em}>{em}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-2.5 pointer-events-none text-xs">▼</div>
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'Character Name' : 'Karakter Adı'}
                  </label>
                  <input
                    type="text"
                    value={rpName}
                    onChange={(e) => setRpName(e.target.value)}
                    placeholder={isEn ? 'e.g. Asuka, Marin, Detective Vural...' : 'Örn: Alya, Dedektif Murat...'}
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                      isDarkMode 
                        ? 'bg-[#131314] border-[#2f3032] focus:border-[#4285f4] text-white' 
                        : 'bg-[#f0f4f9] border-[#dfe3e8] focus:border-[#4285f4] text-black'
                    }`}
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'Gender / Identity' : 'Cinsiyet / Kimlik'}
                  </label>
                  <div className={`flex rounded-xl p-0.5 border ${
                    isDarkMode ? 'bg-[#131314] border-[#2f3032]' : 'bg-[#f0f4f9] border-[#dfe3e8]'
                  }`}>
                    {genderOptions.map((g) => (
                      <button
                        key={g.val}
                        type="button"
                        onClick={() => setRpGender(g.val)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          rpGender === g.val || rpGender === g.label
                            ? isDarkMode ? 'bg-[#282a2c] text-white shadow-xs' : 'bg-white text-black shadow-xs'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Role / Archetype & Relationship Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'Role / Archetype' : 'Rol / Arketip'}
                  </label>
                  <input
                    type="text"
                    value={rpRole}
                    onChange={(e) => setRpRole(e.target.value)}
                    placeholder={
                      isEn
                        ? 'e.g. Royal Guard, Tsundere Pilot, Noir Cyber Detective'
                        : 'Örn: Kraliyet Muhafızı, Tsundere Öğrenci, Yaralı Siber Dedektif'
                    }
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                      isDarkMode ? 'bg-[#131314] border-[#2f3032] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'Relationship with User' : 'Kullanıcı ile İlişki Dinamiği'}
                  </label>
                  <input
                    type="text"
                    value={rpRelationship}
                    onChange={(e) => setRpRelationship(e.target.value)}
                    placeholder={
                      isEn
                        ? 'e.g. Enemies to Lovers, Childhood Friend, Protector'
                        : 'Örn: Yabancı, Düşmandan Aşığa, Çocukluk Arkadaşı, Koruyucu'
                    }
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                      isDarkMode ? 'bg-[#131314] border-[#2f3032] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] text-black'
                    }`}
                  />
                </div>
              </div>

              {/* Personality & Mannerisms */}
              <div>
                <label className="block text-[11px] opacity-70 mb-1">
                  {isEn ? 'Personality, Temperament & Mannerisms' : 'Kişilik, Tavır & Davranış Alışkanlıkları'}
                </label>
                <textarea
                  rows={2}
                  value={rpPersonality}
                  onChange={(e) => setRpPersonality(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Character temperament and reactions... e.g. Proud, sarcastic, hides sorrow behind anger...'
                      : 'Karakterin huyu, mizacı, nasıl tepki verdiği... Örn: Gururlu, alaycı, öfkesiyle hüznünü gizleyen, sana karşı içinde çelişkiler yaşayan...'
                  }
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors resize-none leading-relaxed ${
                    isDarkMode ? 'bg-[#131314] border-[#2f3032] focus:border-[#4285f4] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] focus:border-[#4285f4] text-black'
                  }`}
                />
              </div>

              {/* Emotional Flaws */}
              <div>
                <label className="block text-[11px] font-semibold mb-1 text-[#ea4335] dark:text-[#ff8a80] flex items-center gap-1.5">
                  <span>
                    {isEn
                      ? '💔 Emotional Wounds, Vulnerabilities & Inner Conflict'
                      : '💔 Duygusal Acılar, Zaaflar & İçsel Çatışma'}
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={rpEmotionalFlaws}
                  onChange={(e) => setRpEmotionalFlaws(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Past trauma, fears, and emotional vulnerabilities... e.g. Afraid of abandonment, masks affection with toughness...'
                      : 'Karakterin acıları, geçmiş travmaları, zaafları, korkuları... Örn: Geçmişte ortağını kaybettiği için kimseye bağlanmaktan korkar; sevgisini sertleşerek gizler...'
                  }
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors resize-none leading-relaxed border-[#ea4335]/30 focus:border-[#ea4335] ${
                    isDarkMode ? 'bg-[#131314] text-white' : 'bg-[#fff8f7] text-black'
                  }`}
                />
              </div>

              {/* Appearance & World / Scenario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'Appearance, Age & Outfit' : 'Görünüş, Yaş & Kıyafet'}
                  </label>
                  <input
                    type="text"
                    value={rpAppearance}
                    onChange={(e) => setRpAppearance(e.target.value)}
                    placeholder={
                      isEn
                        ? 'e.g. 24yo, messy dark hair, pale skin, black leather jacket'
                        : 'Örn: 24 yaşlarında, darmadağınık siyah saçlı, solgun tenli, siyah deri ceketli'
                    }
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                      isDarkMode ? 'bg-[#131314] border-[#2f3032] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'World, Setting & Atmosphere' : 'Dünya, Mekan & Atmosfer'}
                  </label>
                  <input
                    type="text"
                    value={rpScenario}
                    onChange={(e) => setRpScenario(e.target.value)}
                    placeholder={
                      isEn
                        ? 'e.g. Rainy abandoned train station waiting room at midnight'
                        : 'Örn: Yağmurlu terk edilmiş eski bir tren garı bekleme salonu'
                    }
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                      isDarkMode ? 'bg-[#131314] border-[#2f3032] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] text-black'
                    }`}
                  />
                </div>
              </div>

              {/* Speech Style & Custom Boundaries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'Speech Style & Cadence' : 'Konuşma Tarzı & Replik Ritmi'}
                  </label>
                  <input
                    type="text"
                    value={rpSpeechStyle}
                    onChange={(e) => setRpSpeechStyle(e.target.value)}
                    placeholder={
                      isEn
                        ? 'e.g. Soft-spoken, hesitates often, avoids eye contact'
                        : 'Örn: Kısık sesli, duraksayarak konuşur, gözlerini kaçırır'
                    }
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                      isDarkMode ? 'bg-[#131314] border-[#2f3032] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] opacity-70 mb-1">
                    {isEn ? 'Custom Rules / Boundaries (Optional)' : 'Özel Tabular / Sınırlar (Opsiyonel)'}
                  </label>
                  <input
                    type="text"
                    value={rpCustomRules}
                    onChange={(e) => setRpCustomRules(e.target.value)}
                    placeholder={
                      isEn
                        ? 'e.g. Never talks about the past easily, slow to trust'
                        : 'Örn: Asla geçmişinden bahsetmek istemez, kolay güvenmez'
                    }
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                      isDarkMode ? 'bg-[#131314] border-[#2f3032] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] text-black'
                    }`}
                  />
                </div>
              </div>

              {/* Opening Greeting with Auto-insert toggle */}
              <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium opacity-80">
                    {isEn
                      ? '🎬 Character Opening Scene & First Line (Starter)'
                      : '🎬 Karakterin Açılış Sahnesi & İlk Cümlesi (Starter)'}
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#4285f4]">
                    <input
                      type="checkbox"
                      checked={autoInsertGreeting}
                      onChange={(e) => setAutoInsertGreeting(e.target.checked)}
                      className="rounded accent-[#4285f4]"
                    />
                    <span>
                      {isEn
                        ? 'Send as opening message upon save'
                        : 'Kaydedince sohbete açılış mesajı olarak gönder'}
                    </span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={rpGreeting}
                  onChange={(e) => setRpGreeting(e.target.value)}
                  placeholder={
                    isEn
                      ? 'e.g. *Folds arms and stares out the rain-streaked window.* "So you came... For a moment, I thought you wouldn\'t."'
                      : 'Örn: *Kollarını göğsünde kavuşturup ıslak pencereye doğru bakar.* "Geldin demek... Ben de bir an gelmeyeceğini sanmıştım."'
                  }
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors resize-none leading-relaxed ${
                    isDarkMode ? 'bg-[#131314] border-[#2f3032] text-white' : 'bg-[#f0f4f9] border-[#dfe3e8] text-black'
                  }`}
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 2: ASSISTANT - CLEAN DISCIPLINE SELECTOR             */}
          {/* ========================================================= */}
          {selectedMode === 'assistant' && (
            <div key="tab-assistant" className="space-y-3 pt-1 animate-fade-up">
              {/* Search */}
              <div className="flex items-center gap-2">
                <div className={`flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  isDarkMode ? 'bg-[#131314] border-[#2f3032]' : 'bg-[#f0f4f9] border-[#dfe3e8]'
                }`}>
                  <Search className="w-3.5 h-3.5 opacity-40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Search expertise (coding, medical, finance, legal)...'
                        : 'Uzmanlık ara (kodlama, tıp, finans, hukuk)...'
                    }
                    className="w-full bg-transparent outline-none text-xs"
                  />
                </div>
              </div>

              {/* Domain Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                {ASSISTANT_DOMAINS.map((dom) => (
                  <button
                    key={dom.id}
                    type="button"
                    onClick={() => setActiveDomain(dom.id)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
                      activeDomain === dom.id
                        ? isDarkMode ? 'bg-[#282a2c] text-white font-medium' : 'bg-[#e1e7f0] text-[#1a73e8] font-semibold'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isEn ? dom.labelEn : dom.label}
                  </button>
                ))}
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const IconComp = CATEGORY_ICONS[cat.id as AssistantCategory] || Sparkles;
                  const displayTitle = isEn
                    ? ASSISTANT_CATEGORY_TITLES_EN[cat.id as AssistantCategory]?.title || cat.title
                    : cat.title;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as AssistantCategory)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all ${
                        isSelected
                          ? isDarkMode 
                            ? 'bg-[#282a2c] border-[#4285f4] text-white' 
                            : 'bg-[#e9eef6] border-[#1a73e8] text-[#1a73e8] font-medium'
                          : isDarkMode 
                            ? 'border-transparent hover:bg-[#282a2c]/40 text-[#c4c7c5]' 
                            : 'border-transparent hover:bg-[#f0f4f9] text-[#444746]'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate text-xs">{displayTitle}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Focus */}
              <div>
                <label className="block text-[11px] opacity-70 mb-1">
                  {isEn
                    ? `Custom Focus or Instructions (${ASSISTANT_CATEGORY_TITLES_EN[selectedCategory]?.title || ASSISTANT_FRAMEWORKS[selectedCategory]?.title})`
                    : `Özel Odak veya Talimatlar (${ASSISTANT_FRAMEWORKS[selectedCategory]?.title})`}
                </label>
                <textarea
                  rows={2}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder={
                    isEn
                      ? 'e.g. Use React & TypeScript only, include detailed architectural comments...'
                      : 'Örn: Sadece React ve TypeScript kullan, kodlarda Türkçe yorum satırı ekle...'
                  }
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors resize-none leading-relaxed ${
                    isDarkMode 
                      ? 'bg-[#131314] border-[#2f3032] focus:border-[#4285f4] text-white' 
                      : 'bg-[#f0f4f9] border-[#dfe3e8] focus:border-[#4285f4] text-black'
                  }`}
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 3: OTHER - PURE MINIMAL CUSTOM PROMPT                 */}
          {/* ========================================================= */}
          {selectedMode === 'other' && (
            <div key="tab-other" className="space-y-3 pt-1 animate-fade-up">
              {rpName.trim() && (
                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  isDarkMode ? 'bg-[#4285f4]/10 border-[#4285f4]/30 text-[#e3e3e3]' : 'bg-[#e8f0fe] border-[#4285f4]/30 text-[#1f1f1f]'
                }`}>
                  <div className="text-xs">
                    <span className="font-semibold text-[#4285f4] dark:text-[#8ab4f8]">
                      {rpAvatar} {rpName}
                    </span>{' '}
                    <span>
                      {isEn
                        ? 'character profile is preserved. Would you like to edit the character or export its traits into text?'
                        : 'karakter profiliniz korunuyor. Karakter özelliklerini düzenlemek veya metne aktarmak ister misiniz?'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedMode('roleplay')}
                      className="px-2.5 py-1 rounded-lg bg-[#4285f4] text-white text-[11px] font-medium hover:bg-[#1a73e8] transition-colors cursor-pointer"
                    >
                      {isEn ? '🎭 Edit Character' : '🎭 Karakteri Düzenle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const compiled = [
                          `Karakter Adı: ${rpName}`,
                          rpRole ? `Rol / Arketip: ${rpRole}` : '',
                          rpGender ? `Cinsiyet: ${rpGender}` : '',
                          rpAppearance ? `Görünüş: ${rpAppearance}` : '',
                          rpPersonality ? `Kişilik: ${rpPersonality}` : '',
                          rpEmotionalFlaws ? `Duygusal Zaaflar & Angst: ${rpEmotionalFlaws}` : '',
                          rpScenario ? `Dünya & Senaryo: ${rpScenario}` : '',
                          rpRelationship ? `Kullanıcı ile İlişki: ${rpRelationship}` : '',
                          rpSpeechStyle ? `Konuşma Tarzı: ${rpSpeechStyle}` : '',
                          rpCustomRules ? `Özel Kurallar: ${rpCustomRules}` : '',
                          rpGreeting ? `Açılış Sahnesi: ${rpGreeting}` : ''
                        ].filter(Boolean).join('\n');
                        setCustomText((prev) => (prev.trim() ? `${prev.trim()}\n\n${compiled}` : compiled));
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                        isDarkMode ? 'border-[#4285f4]/40 text-[#8ab4f8] hover:bg-white/5' : 'border-[#4285f4]/40 text-[#1a73e8] hover:bg-black/5'
                      }`}
                    >
                      {isEn ? 'Copy to Text' : 'Metne Aktar'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] opacity-70">
                  {isEn
                    ? 'Custom System Directive (Free-Form Instructions)'
                    : 'Özel Sistem Direktifi (Serbest Talimatlar)'}
                </label>
                <textarea
                  rows={7}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Write the rules, tone, persona, or domain instructions you want the AI to strictly obey throughout the conversation...'
                      : 'Yapay zekanın sohbet boyunca benimsemesini istediğiniz kuralları, üslubu veya uzmanlık alanını buraya serbestçe yazın ve dilediğiniz zaman güncelleyin...'
                  }
                  className={`w-full p-3.5 rounded-xl border outline-none text-xs transition-colors resize-none leading-relaxed ${
                    isDarkMode 
                      ? 'bg-[#131314] border-[#2f3032] focus:border-[#4285f4] text-white' 
                      : 'bg-[#f0f4f9] border-[#dfe3e8] focus:border-[#4285f4] text-black'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={handleReset}
              className={`text-[11px] opacity-50 hover:opacity-100 transition-opacity ${
                isDarkMode ? 'hover:text-white' : 'hover:text-black'
              }`}
            >
              {isEn ? 'Clear Form' : 'Formu Temizle'}
            </button>

            <div className="flex items-center gap-2">
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
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all shadow-xs active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEn ? 'Save & Apply' : 'Kaydet & Uygula'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
