import React, { useState, useRef } from 'react';
import { Search, Volume2, Plus, Check, Loader2, BookOpen, Camera, Image as ImageIcon, ArrowLeft, X, Sparkles } from 'lucide-react';
import { WordDefinition, ImageLabel } from '../types';
import { lookupWordInGemini, generateTTS, analyzeImageForVocabulary, generateWordImage } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioUtils';

interface WordSearchProps {
  onSaveWord: (word: WordDefinition) => void;
  savedWordIds: Set<string>;
}

export const WordSearch: React.FC<WordSearchProps> = ({ onSaveWord, savedWordIds }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WordDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  
  // Image Generation State
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Image Mode State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageLabels, setImageLabels] = useState<ImageLabel[]>([]);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const wordToSearch = textOverride || query;
    if (!wordToSearch.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setGeneratedImage(null);

    try {
      const data = await lookupWordInGemini(wordToSearch.trim());
      setResult(data);
      // Clear query if it was a manual search
      if (!textOverride) setQuery('');

      // Auto-generate mnemonic image in background
      setImageLoading(true);
      generateWordImage(data.word, data.definitionEn)
        .then(url => setGeneratedImage(url))
        .catch(err => console.error("Auto-image gen failed", err))
        .finally(() => setImageLoading(false));

    } catch (err) {
      setError("未找到该单词的释义，请检查拼写或尝试其他单词。");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
    setAudioLoading(true);
    try {
        const base64Audio = await generateTTS(text);
        if (base64Audio) {
            await playBase64Audio(base64Audio);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setAudioLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      
      setUploadedImage(base64String);
      setResult(null); 
      setIsAnalyzingImage(true);
      setImageLabels([]);
      setError(null);

      try {
        const labels = await analyzeImageForVocabulary(base64Data);
        setImageLabels(labels);
      } catch (err) {
        setError("无法分析图片，请重试。");
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const closeDetailView = () => {
      setResult(null);
      setGeneratedImage(null);
  };

  const clearImageMode = () => {
      setUploadedImage(null);
      setImageLabels([]);
      setResult(null);
  };

  const handleSave = () => {
    if (result) {
        // If we have a generated image, save it with the word
        const wordToSave = generatedImage ? { ...result, imageUrl: generatedImage } : result;
        onSaveWord(wordToSave);
    }
  };

  const isSaved = result ? savedWordIds.has(result.word.toLowerCase()) : false;

  // --- View: Detail Definition ---
  if (result) {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button 
                onClick={closeDetailView}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-4 font-medium"
            >
                <ArrowLeft className="w-5 h-5" />
                返回{uploadedImage ? '图片' : '搜索'}
            </button>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="p-6 md:p-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="space-y-2 flex-1">
                        <h3 className="text-4xl font-bold text-slate-900 break-words">{result.word}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-slate-500 text-lg">
                        <span className="font-serif italic">/{result.phonetic}/</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-sm font-bold uppercase text-slate-600 tracking-wide">{result.partOfSpeech}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 md:flex-col lg:flex-row shrink-0">
                        <button
                        onClick={() => handlePlayAudio(result.word)}
                        disabled={audioLoading}
                        className="flex-1 md:flex-none p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center"
                        title="播放发音"
                        >
                        {audioLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6" />}
                        </button>
                        <button
                        onClick={handleSave}
                        disabled={isSaved}
                        className={`flex-1 md:flex-none p-3 rounded-full transition-colors flex items-center justify-center ${
                            isSaved
                            ? 'bg-green-50 text-green-600'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                        title={isSaved ? "已收藏" : "加入生词本"}
                        >
                        {isSaved ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Visual Memory (Image) */}
                {(imageLoading || generatedImage) && (
                    <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                        {imageLoading ? (
                             <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                <span className="text-sm">正在生成助记图片...</span>
                             </div>
                        ) : (
                            <div className="relative group">
                                <img src={generatedImage!} alt="Mnemonic" className="w-full h-64 md:h-80 object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                    <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                                        <Sparkles className="w-4 h-4 text-yellow-300" />
                                        <span>AI 象形助记</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Definitions */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">英文释义</h4>
                        <p className="text-slate-700 leading-relaxed">{result.definitionEn}</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">中文含义</h4>
                        <p className="text-slate-700 leading-relaxed font-medium text-lg">{result.definitionCn}</p>
                    </div>
                </div>

                {/* Example */}
                <div className="bg-indigo-50/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm uppercase tracking-wide">
                    <BookOpen className="w-4 h-4" />
                    <span>场景例句</span>
                </div>
                <p className="text-lg text-slate-800 italic">"{result.exampleSentence}"</p>
                <p className="text-slate-600">{result.exampleTranslation}</p>
                </div>
            </div>
            </div>
        </div>
    );
  }

  // --- View: Image Analysis ---
  if (uploadedImage) {
      return (
          <div className="max-w-2xl mx-auto h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={clearImageMode}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600"
                  >
                     <ArrowLeft className="w-5 h-5" />
                     <span>新搜索</span>
                  </button>
                  <h2 className="text-lg font-bold text-slate-800">点击物品学习单词</h2>
              </div>

              <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 mb-6 group">
                  <img src={uploadedImage} alt="Analyzed" className="w-full h-auto object-contain max-h-[70vh] mx-auto opacity-90" />
                  
                  {isAnalyzingImage && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                          <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
                          <p className="text-white font-medium animate-pulse">正在扫描图片...</p>
                      </div>
                  )}

                  {/* Render Tags */}
                  {!isAnalyzingImage && imageLabels.map((tag, idx) => (
                      <div 
                        key={idx}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/90 hover:bg-white backdrop-blur-md pl-3 pr-2 py-1.5 rounded-full shadow-lg border border-indigo-100 transition-all hover:scale-110 cursor-pointer z-10"
                        style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                        onClick={() => handleSearch(null as any, tag.label)}
                      >
                          <div className="text-left">
                              <p className="text-sm font-bold text-slate-900 leading-none">{tag.label}</p>
                              <p className="text-[10px] text-slate-500 font-serif italic">/{tag.phonetic}/</p>
                          </div>
                          <button
                             onClick={(e) => { e.stopPropagation(); handlePlayAudio(tag.label); }}
                             className="p-1.5 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200"
                          >
                              <Volume2 className="w-3 h-3" />
                          </button>
                      </div>
                  ))}
              </div>
              
              {!isAnalyzingImage && (
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <ImageIcon className="w-5 h-5" />
                        <span>换一张图片</span>
                      </button>
                      <button 
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 p-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      >
                        <Camera className="w-5 h-5" />
                        <span>重拍</span>
                      </button>
                  </div>
              )}

              {/* Hidden Inputs for Retake */}
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                ref={cameraInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
          </div>
      );
  }

  // --- View: Initial Search ---
  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 pt-8 md:pt-12">
      <div className="text-center space-y-3 md:space-y-4">
        <h2 className="text-3xl font-bold text-slate-800">英语词典</h2>
        <p className="text-slate-500">输入单词查询，或通过拍照识别学习</p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入英语单词..."
          className="w-full pl-6 pr-14 py-4 rounded-2xl border-2 border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-3 top-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
        </button>
      </form>

      {/* Photo/Camera Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button 
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border-2 border-slate-100 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
        >
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
            </div>
            <span className="font-semibold text-slate-800">拍照识别</span>
            <span className="text-xs text-slate-400 mt-1">探索真实世界</span>
        </button>

        <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border-2 border-slate-100 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
        >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6" />
            </div>
            <span className="font-semibold text-slate-800">上传图片</span>
            <span className="text-xs text-slate-400 mt-1">识别相册图片</span>
        </button>
      </div>

      {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm">
            {error}
          </div>
      )}

      {/* Hidden Inputs */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};