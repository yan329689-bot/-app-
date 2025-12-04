
import React, { useState } from 'react';
import { SavedWord } from '../types';
import { Volume2, ChevronLeft, ChevronRight, RotateCw, BookOpen, Image as ImageIcon } from 'lucide-react';
import { generateTTS } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioUtils';

interface FlashcardReviewProps {
  words: SavedWord[];
}

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({ words }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center px-4">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300 mb-2">
          <BookOpen className="w-12 h-12" />
        </div>
        <div>
            <h3 className="text-xl font-bold text-slate-900">生词本是空的</h3>
            <p className="text-slate-500 mt-2">去查词并收藏，这里会出现你的专属闪卡。</p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
  };

  const handlePlayAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAudioLoading(true);
    try {
      const base64 = await generateTTS(currentWord.word);
      if (base64) await playBase64Audio(base64);
    } catch (err) {
      console.error(err);
    } finally {
      setAudioLoading(false);
    }
  };

  const progressPercentage = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] md:min-h-[600px] max-w-md mx-auto px-4 py-6">
      
      {/* Header & Progress */}
      <div className="w-full mb-6 space-y-2">
        <div className="flex justify-between items-end px-2">
            <h2 className="text-2xl font-bold text-slate-800">单词记忆</h2>
            <span className="text-sm font-medium text-slate-500 font-mono">
                {currentIndex + 1} <span className="text-slate-300">/</span> {words.length}
            </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progressPercentage}%` }}
            />
        </div>
      </div>

      {/* 3D Flip Container */}
      <div 
        className="relative w-full aspect-[3/4] max-h-[500px] perspective-1000 group cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-xl rounded-3xl ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* --- FRONT SIDE (Word) --- */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-3xl p-8 flex flex-col items-center justify-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
             {/* Top Badge */}
             <div className="absolute top-6 right-6">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider rounded-full">
                    {currentWord.partOfSpeech}
                </span>
             </div>
             
             {/* Main Content */}
             <div className="flex flex-col items-center text-center space-y-4 z-10 w-full">
                <h3 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight break-words w-full leading-tight">
                    {currentWord.word}
                </h3>
                
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full">
                    <span className="font-serif italic text-slate-500 text-lg">/{currentWord.phonetic}/</span>
                    <button 
                        onClick={handlePlayAudio}
                        className="p-1.5 bg-white text-indigo-600 rounded-full shadow-sm border border-slate-100 hover:text-indigo-700 active:scale-95 transition-all"
                    >
                        <Volume2 className="w-4 h-4" />
                    </button>
                </div>
             </div>
             
             {/* Bottom Hint */}
             <div className="absolute bottom-8 text-slate-300 text-sm flex items-center gap-2 font-medium animate-pulse">
                <RotateCw className="w-4 h-4" />
                <span>点击查看背面</span>
             </div>
          </div>

          {/* --- BACK SIDE (Definition & Context) --- */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-3xl overflow-hidden flex flex-col border border-indigo-100 shadow-sm">
            
            {/* Image Header - Fixed Height */}
            <div className="h-32 shrink-0 relative bg-slate-100 w-full">
                {currentWord.imageUrl ? (
                    <>
                        <img src={currentWord.imageUrl} alt={currentWord.word} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent" />
                    </>
                ) : (
                    <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                         <ImageIcon className="w-8 h-8 text-indigo-200" />
                    </div>
                )}
                {/* Overlay Word on Image */}
                <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="text-xl font-bold drop-shadow-md truncate">{currentWord.word}</h3>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white">
                <div className="space-y-6">
                    {/* Definition */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">中文释义</h4>
                        <p className="text-xl font-bold text-slate-800 leading-snug">
                            {currentWord.definitionCn}
                        </p>
                        <p className="text-sm text-slate-500 leading-relaxed border-l-2 border-slate-100 pl-3">
                            {currentWord.definitionEn}
                        </p>
                    </div>
                    
                    <div className="w-full h-px bg-slate-100" />
                    
                    {/* Example */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">场景例句</h4>
                        <div className="bg-indigo-50/50 p-3 rounded-lg">
                            <p className="text-base italic text-indigo-900/80 leading-relaxed">
                                "{currentWord.exampleSentence}"
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                {currentWord.exampleTranslation}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between w-full max-w-[300px] mt-8 gap-6">
         <button 
            onClick={handlePrev}
            className="flex-1 p-4 rounded-2xl bg-white text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-95 flex justify-center"
         >
            <ChevronLeft className="w-6 h-6" />
         </button>

         <button 
            onClick={handleNext}
            className="flex-1 p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex justify-center"
         >
            <ChevronRight className="w-6 h-6" />
         </button>
      </div>
      
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
      `}</style>
    </div>
  );
};
