import React, { useState, useEffect } from 'react';
import { Book, Search, Mic, Layers } from 'lucide-react';
import { WordSearch } from './components/WordSearch';
import { VocabularyList } from './components/VocabularyList';
import { LivePractice } from './components/LivePractice';
import { FlashcardReview } from './components/FlashcardReview';
import { AppTab, SavedWord, WordDefinition } from './types';

const STORAGE_KEY = 'linguaflow_vocab_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.SEARCH);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSavedWords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load vocabulary", e);
      }
    }
  }, []);

  // Save to local storage whenever list changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedWords));
  }, [savedWords]);

  const handleSaveWord = (wordDef: WordDefinition) => {
    const newWord: SavedWord = {
      ...wordDef,
      id: crypto.randomUUID(),
      addedAt: Date.now(),
    };
    setSavedWords((prev) => [newWord, ...prev]);
  };

  const handleRemoveWord = (id: string) => {
    setSavedWords((prev) => prev.filter((w) => w.id !== id));
  };

  const handleUpdateWord = (id: string, updates: Partial<SavedWord>) => {
    setSavedWords((prev) => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  // Derived state for quick lookup
  const savedWordIds = new Set(savedWords.map(w => w.word.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-28 md:pb-4 pt-6 md:pt-10">
        {activeTab === AppTab.SEARCH && (
          <div className="animate-fade-in">
            <WordSearch onSaveWord={handleSaveWord} savedWordIds={savedWordIds} />
          </div>
        )}
        {activeTab === AppTab.NOTEBOOK && (
          <div className="animate-fade-in">
            <VocabularyList 
              words={savedWords} 
              onRemoveWord={handleRemoveWord} 
              onUpdateWord={handleUpdateWord}
            />
          </div>
        )}
        {activeTab === AppTab.FLASHCARDS && (
          <div className="animate-fade-in">
            <FlashcardReview words={savedWords} />
          </div>
        )}
        {activeTab === AppTab.PRACTICE && (
          <div className="animate-fade-in">
            <LivePractice />
          </div>
        )}
      </main>

      {/* Mobile/Tablet Navigation Bar (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-2 py-2 md:static md:bg-transparent md:border-none md:flex md:justify-center md:mb-6 order-last md:order-first z-50 md:backdrop-blur-none">
        <nav className="grid grid-cols-4 gap-1 md:flex md:gap-3 w-full md:w-auto max-w-md md:max-w-none mx-auto md:bg-white md:px-4 md:py-2 md:rounded-full md:shadow-lg md:border border-slate-100">
          <NavButton 
            active={activeTab === AppTab.SEARCH} 
            onClick={() => setActiveTab(AppTab.SEARCH)} 
            icon={<Search className="w-5 h-5 md:w-5 md:h-5" />} 
            label="查词" 
          />
          <NavButton 
            active={activeTab === AppTab.NOTEBOOK} 
            onClick={() => setActiveTab(AppTab.NOTEBOOK)} 
            icon={<Book className="w-5 h-5 md:w-5 md:h-5" />} 
            label="生词本" 
          />
          <NavButton 
            active={activeTab === AppTab.FLASHCARDS} 
            onClick={() => setActiveTab(AppTab.FLASHCARDS)} 
            icon={<Layers className="w-5 h-5 md:w-5 md:h-5" />} 
            label="闪卡" 
          />
          <NavButton 
            active={activeTab === AppTab.PRACTICE} 
            onClick={() => setActiveTab(AppTab.PRACTICE)} 
            icon={<Mic className="w-5 h-5 md:w-5 md:h-5" />} 
            label="口语" 
          />
        </nav>
      </div>
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col md:flex-row items-center md:gap-2 p-2 md:px-5 rounded-xl md:rounded-full transition-all duration-300 justify-center whitespace-nowrap ${
      active 
        ? 'text-indigo-600 bg-indigo-50' 
        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">{label}</span>
  </button>
);