import React, { useState } from 'react';
import { 
  Folder, 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  Smartphone, 
  Layers, 
  Database, 
  Palette, 
  Settings2,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { ANDROID_PROJECT_FILES, AndroidFile } from '../data/androidProjectData.ts';
import { downloadAndroidProjectZip } from '../utils/zipExporter.ts';

interface AndroidProjectViewerProps {
  isDarkMode: boolean;
}

export const AndroidProjectViewer: React.FC<AndroidProjectViewerProps> = ({ isDarkMode }) => {
  const [selectedFile, setSelectedFile] = useState<AndroidFile>(ANDROID_PROJECT_FILES[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Files', icon: Layers },
    { id: 'config', label: 'Gradle & Config', icon: Settings2 },
    { id: 'kotlin-core', label: 'App & Activity', icon: Smartphone },
    { id: 'kotlin-data', label: 'Data & Room DB', icon: Database },
    { id: 'kotlin-ui', label: 'Compose UI', icon: Palette },
    { id: 'res', label: 'XML Resources', icon: FileCode },
  ];

  const filteredFiles = ANDROID_PROJECT_FILES.filter((file) => {
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    const matchesSearch = file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadAndroidProjectZip();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate project zip: ' + (err as Error).message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden ${
      isDarkMode ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#f8f9fa] text-[#1f1f1f]'
    }`}>
      {/* Top Banner with Download & Build instructions */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDarkMode ? 'bg-[#1e1f20] border-[#282a2c]' : 'bg-white border-[#e5e7eb]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isDarkMode ? 'bg-[#282a2c] text-[#a8c7fa]' : 'bg-[#f0f4f9] text-[#0b57d0]'
          }`}>
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base">mAI Android Native Projesi (Kotlin &amp; Jetpack Compose)</h2>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                isDarkMode ? 'bg-[#282a2c] text-[#a8c7fa]' : 'bg-[#e8f0fe] text-[#0b57d0]'
              }`}>
                Android Studio İçin Hazır
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-[#c4c7c5]' : 'text-[#444746]'}`}>
              {ANDROID_PROJECT_FILES.length} kaynak dosya · Jetpack Compose · Room Database · Gemini API (Flash-Lite / Flash / 3.8 Flash)
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-transform duration-75 active:scale-95 shadow-sm cursor-pointer ${
            isDarkMode
              ? 'bg-[#a8c7fa] text-[#131314] hover:bg-white'
              : 'bg-[#0b57d0] text-white hover:bg-[#0842a0]'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'ZIP Oluşturuluyor...' : 'Android Studio Projesini İndir (.ZIP)'}</span>
        </button>
      </div>

      {/* Main Content: Split Pane */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: File Tree & Category Filter */}
        <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${
          isDarkMode ? 'bg-[#18191a] border-[#282a2c]' : 'bg-[#ffffff] border-[#e5e7eb]'
        }`}>
          {/* Categories Tab Strip */}
          <div className="p-2 border-b border-black/5 dark:border-white/5 flex gap-1 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? isDarkMode
                      ? 'bg-[#282a2c] text-white shadow-xs'
                      : 'bg-[#f0f4f9] text-[#0b57d0] font-semibold'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="p-2 border-b border-black/5 dark:border-white/5">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs px-3 py-1.5 rounded-lg border outline-none ${
                isDarkMode 
                  ? 'bg-[#1e1f20] border-[#282a2c] focus:border-[#a8c7fa] text-white' 
                  : 'bg-[#f8f9fa] border-[#e5e7eb] focus:border-[#0b57d0]'
              }`}
            />
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-[#282a2c] text-white font-medium border border-[#3f4144]'
                        : 'bg-[#e8f0fe] text-[#0b57d0] font-semibold border border-[#d2e3fc]'
                      : isDarkMode
                        ? 'hover:bg-[#282a2c]/50 text-[#c4c7c5]'
                        : 'hover:bg-gray-100 text-[#444746]'
                  }`}
                >
                  <FileCode className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isSelected ? (isDarkMode ? 'text-[#a8c7fa]' : 'text-[#0b57d0]') : 'opacity-60'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-mono">{file.name}</div>
                    <div className="text-[10px] opacity-60 truncate font-mono">{file.path}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick build tip */}
          <div className={`p-3 border-t text-[11px] leading-relaxed ${
            isDarkMode ? 'border-[#282a2c] text-[#c4c7c5] bg-[#1e1f20]' : 'border-[#e5e7eb] text-[#444746] bg-[#f8f9fa]'
          }`}>
            <div className="flex items-center gap-1 font-semibold mb-1">
              <Terminal className="w-3.5 h-3.5 text-emerald-500" />
              <span>Android Studio Quickstart</span>
            </div>
            <p className="opacity-80">
              Download zip or copy files into your Android Studio project. Requires <strong>compileSdk 35</strong> &amp; <strong>Java 17</strong>.
            </p>
          </div>
        </div>

        {/* Right Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* File Header */}
          <div className={`p-3 border-b flex items-center justify-between gap-2 ${
            isDarkMode ? 'bg-[#18191a] border-[#282a2c]' : 'bg-[#ffffff] border-[#e5e7eb]'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="w-4 h-4 opacity-50 shrink-0" />
              <span className="font-mono text-xs font-semibold truncate">{selectedFile.path}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase shrink-0 ${
                isDarkMode ? 'bg-[#282a2c] text-[#a8c7fa]' : 'bg-[#f0f4f9] text-[#0b57d0]'
              }`}>
                {selectedFile.language}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  copied
                    ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                    : isDarkMode
                      ? 'border-[#282a2c] hover:bg-[#282a2c] text-[#e3e3e3]'
                      : 'border-[#e5e7eb] hover:bg-gray-100 text-[#1f1f1f]'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy File'}</span>
              </button>
            </div>
          </div>

          {/* Description bar */}
          <div className={`px-4 py-2 border-b text-xs ${
            isDarkMode ? 'bg-[#1e1f20]/60 border-[#282a2c] text-[#c4c7c5]' : 'bg-gray-50 border-[#e5e7eb] text-[#444746]'
          }`}>
            {selectedFile.description}
          </div>

          {/* Code content */}
          <div className="flex-1 overflow-auto bg-[#1e1f20] text-[#e3e3e3] p-4 font-mono text-xs leading-relaxed selection:bg-blue-500/30">
            <pre className="overflow-x-auto whitespace-pre">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
