import React, { useState } from 'react';
import { SavedWord } from '../types';
import { Trash2, Volume2, BookOpen, Image as ImageIcon, Video as VideoIcon, Loader2, Sparkles } from 'lucide-react';
import { generateTTS, generateWordImage, generateWordVideo } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioUtils';

interface VocabularyListProps {
  words: SavedWord[];
  onRemoveWord: (id: string) => void;
  onUpdateWord: (id: string, updates: Partial<SavedWord>) => void;
}

const WordItem: React.FC<{
  word: SavedWord;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SavedWord>) => void;
}> = ({ word, onRemove, onUpdate }) => {
  const [imgLoading, setImgLoading] = useState(false);
  const [vidLoading, setVidLoading] = useState(false);

  const playWord = async () => {
     try {
        const base64 = await generateTTS(word.word);
        if (base64) await playBase64Audio(base64);
     } catch (e) {
        console.error(e);
     }
  };

  const handleGenerateImage = async () => {
    setImgLoading(true);
    try {
      const url = await generateWordImage(word.word, word.definitionEn);
      if (url) {
        onUpdate(word.id, { imageUrl: url });
      }
    } catch (e) {
      console.error(e);
      alert("生成图片失败，请重试。");
    } finally {
      setImgLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        const selected = await (window as any).aistudio.openSelectKey();
        if (!selected) return; 
      }
    } catch (e) {
      console.error("Key selection check failed", e);
    }

    setVidLoading(true);
    try {
      const url = await generateWordVideo(word.word, word.exampleSentence);
      if (url) {
        onUpdate(word.id, { videoUrl: url });
      }
    } catch (e) {
      console.error(e);
      alert("生成视频失败，请确保已选择有效的付费 API Key。");
    } finally {
      setVidLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="flex-1 space-y-3 min-w-0">
          {/* Header: Word, Phonetic, POS, Audio */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-2xl font-bold text-slate-900 break-words">{word.word}</h3>
            <span className="font-serif italic text-slate-500 whitespace-nowrap">/{word.phonetic}/</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-100 text-slate-600 whitespace-nowrap">
              {word.partOfSpeech}
            </span>
            <button
              onClick={playWord}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors ml-auto md:ml-0"
              title="播放发音"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          <p className="text-slate-700 font-medium leading-relaxed">{word.definitionCn}</p>
          <p className="text-slate-500 text-sm italic border-l-2 border-slate-200 pl-3 py-1">"{word.exampleSentence}"</p>

          {/* Visual Generation Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {!word.imageUrl && (
              <button
                onClick={handleGenerateImage}
                disabled={imgLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full transition-all active:scale-95 whitespace-nowrap"
              >
                {imgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                <span>生成助记图</span>
              </button>
            )}
            {!word.videoUrl && (
              <button
                onClick={handleGenerateVideo}
                disabled={vidLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-full transition-all active:scale-95 whitespace-nowrap"
              >
                {vidLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <VideoIcon className="w-3.5 h-3.5" />}
                <span>生成视频</span>
              </button>
            )}
          </div>
        </div>

        {/* Media Display - Stacked on mobile, Side on desktop */}
        {(word.imageUrl || word.videoUrl) && (
          <div className="flex gap-3 items-start overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {word.imageUrl && (
              <div className="relative group/img shrink-0">
                 <div className="w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                    <img src={word.imageUrl} alt={word.word} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                 </div>
                 <div className="absolute bottom-1 right-1 bg-black/50 p-1 rounded text-white backdrop-blur-sm">
                    <Sparkles className="w-3 h-3" />
                 </div>
              </div>
            )}
            {word.videoUrl && (
              <div className="w-28 h-28 md:w-32 md:h-32 shrink-0 rounded-lg overflow-hidden bg-black border border-slate-200 shadow-sm relative">
                <video src={word.videoUrl} controls className="w-full h-full object-cover" />
              </div>
            )}
            
            <button
                onClick={() => onRemove(word.id)}
                className="md:hidden p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors self-center"
                title="移除单词"
            >
                <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}

        <button
          onClick={() => onRemove(word.id)}
          className="hidden md:block ml-auto p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors h-fit"
          title="移除单词"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const VocabularyList: React.FC<VocabularyListProps> = ({ words, onRemoveWord, onUpdateWord }) => {
  if (words.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <BookOpen className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">生词本是空的</h3>
        <p className="text-slate-500 max-w-xs mx-auto">去查词并添加一些单词，方便日后复习。</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">生词本</h2>
            <p className="text-slate-500 mt-1">共 {words.length} 个生词</p>
          </div>
      </div>

      <div className="grid gap-4">
        {words.map((word) => (
          <WordItem 
            key={word.id} 
            word={word} 
            onRemove={onRemoveWord} 
            onUpdate={onUpdateWord}
          />
        ))}
      </div>
    </div>
  );
};