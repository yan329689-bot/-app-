import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Radio, Loader2, MessageCircle } from 'lucide-react';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

export const LivePractice: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  // Audio Contexts & Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<GainNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session tracking
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const apiKey = process.env.API_KEY;

  const cleanup = () => {
    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop script processor
    if (processorRef.current && inputAudioContextRef.current) {
        processorRef.current.disconnect();
        sourceNodeRef.current?.disconnect();
    }

    // Stop audio sources
    if (sourcesRef.current.size > 0) {
        sourcesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        sourcesRef.current.clear();
    }
    
    setIsConnected(false);
    setVolume(0);
    nextStartTimeRef.current = 0;
  };

  const connect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      inputNodeRef.current = inputCtx.createGain();
      outputNodeRef.current = outputCtx.createGain();

      // Get Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect Live Session
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Connection opened");
            setIsConnected(true);
            setIsConnecting(false);

            // Setup Audio Processing Pipeline
            const source = inputCtx.createMediaStreamSource(stream);
            sourceNodeRef.current = source;
            
            // Buffer size 4096 provides a balance between latency and processing overhead
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              // Simple volume meter visualization
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1)); // Scale up for visibility

              const pcmBlob = createBlob(inputData);
              
              sessionPromise.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    ctx,
                    24000,
                    1
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination); // Connect directly to destination for now
                
                source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }

            // Handle Interruptions
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
                sourcesRef.current.forEach(source => {
                    try { source.stop(); } catch(e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Connection closed");
            cleanup();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("连接发生错误，请稍后重试。");
            cleanup();
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: "You are a friendly, encouraging English tutor. Help the user practice conversational English. Correct their grammar gently if they make mistakes, but keep the conversation flowing naturally. Keep your responses relatively short. Speak in English, but if the user asks in Chinese, you can explain in Chinese.",
        },
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (e) {
      console.error("Setup Error", e);
      setError("无法访问麦克风或连接 AI 服务。");
      setIsConnecting(false);
    }
  };

  const handleToggle = () => {
    if (isConnected) {
        cleanup();
    } else {
        connect();
    }
  };

  useEffect(() => {
    return () => {
        cleanup();
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto text-center space-y-8 py-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">口语练习室</h2>
        <p className="text-slate-500">与 AI 导师进行实时对话练习，提升口语自信。</p>
      </div>

      <div className="relative flex items-center justify-center py-10">
         {/* Visualizer Rings */}
         {isConnected && (
            <>
                <div className="absolute w-48 h-48 bg-indigo-100 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }}></div>
                <div className="absolute w-40 h-40 bg-indigo-200 rounded-full animate-pulse opacity-50" style={{ transform: `scale(${1 + volume})` }}></div>
            </>
         )}
         
         <button
            onClick={handleToggle}
            disabled={isConnecting}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 ${
                isConnected 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
         >
            {isConnecting ? (
                <Loader2 className="w-12 h-12 animate-spin" />
            ) : isConnected ? (
                <MicOff className="w-12 h-12" />
            ) : (
                <Mic className="w-12 h-12" />
            )}
         </button>
      </div>

      <div className="h-12">
          {isConnected ? (
             <div className="flex items-center justify-center gap-2 text-green-600 font-medium animate-pulse">
                <Radio className="w-5 h-5" />
                <span>通话中 (Live)</span>
             </div>
          ) : (
             <div className="text-slate-400">
                点击麦克风开始对话
             </div>
          )}
      </div>

      {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">
            {error}
          </div>
      )}

      <div className="bg-blue-50 rounded-xl p-6 text-left border border-blue-100">
        <div className="flex items-start gap-3">
            <MessageCircle className="w-6 h-6 text-blue-600 mt-1" />
            <div>
                <h4 className="font-bold text-blue-900">练习贴士:</h4>
                <ul className="text-blue-800 text-sm space-y-1 mt-2 list-disc list-inside">
                    <li>发音清晰自然，像聊天一样。</li>
                    <li>遇到不懂的单词可以直接询问 AI 解释。</li>
                    <li>尝试使用刚才在生词本里学到的新单词。</li>
                    <li>不用担心语法错误，大胆开口是关键。</li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};