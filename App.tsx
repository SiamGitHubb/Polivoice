
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppMode, ChatMessage } from './types';
import { SYSTEM_PROMPTS } from './constants';
import ChatBubble from './components/ChatBubble';
import ArchitectureView from './components/ArchitectureView';
import { GeminiVoiceService } from './services/geminiLiveService';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.STUDY);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'idle'>('idle');
  const [showArch, setShowArch] = useState(false);
  const voiceServiceRef = useRef<GeminiVoiceService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTranscription = useCallback((text: string, role: 'user' | 'assistant') => {
    if (!text.trim()) return;

    setMessages(prev => {
      const last = prev[prev.length - 1];
      // Append if same role to simulate streaming text
      if (last && last.role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = { 
          ...last, 
          text: last.text + text,
          timestamp: new Date() 
        };
        return updated;
      }
      return [
        ...prev, 
        { id: Math.random().toString(), role, text, timestamp: new Date() }
      ];
    });
  }, []);

  const toggleVoice = async () => {
    if (status !== 'idle') {
      voiceServiceRef.current?.stop();
      setStatus('idle');
    } else {
      try {
        if (!voiceServiceRef.current) {
          voiceServiceRef.current = new GeminiVoiceService();
        }
        await voiceServiceRef.current.connect(SYSTEM_PROMPTS[activeMode], {
          onTranscription: handleTranscription,
          onAudioStart: () => {},
          onAudioEnd: () => {},
          onError: (err) => {
            alert(err);
            setStatus('idle');
          },
          onConnectionStatus: setStatus
        });
      } catch (err) {
        console.error("Mic/Service error:", err);
        setStatus('idle');
      }
    }
  };

  const changeMode = (mode: AppMode) => {
    if (status !== 'idle') {
      voiceServiceRef.current?.stop();
      setStatus('idle');
    }
    setActiveMode(mode);
    setMessages([{
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      text: `স্বাগতম! আপনি এখন "${mode} মোড" এ আছেন। আমি আপনাকে কীভাবে সাহায্য করতে পারি?`,
      timestamp: new Date()
    }]);
  };

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      changeMode(AppMode.STUDY);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 border-x border-slate-200 shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 shadow-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : status === 'connecting' ? 'bg-yellow-400' : 'bg-slate-400'}`} />
          <div>
            <h1 className="text-xl font-bold leading-tight">PoliVoice বাংলা</h1>
            <p className="text-[10px] uppercase tracking-wider opacity-70">Political Science AI Assistant</p>
          </div>
        </div>
        <button 
          onClick={() => setShowArch(!showArch)}
          className="p-2 rounded-full hover:bg-emerald-600 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </header>

      {/* Mode Selector */}
      <nav className="flex overflow-x-auto bg-white border-b border-slate-200 p-2 gap-2 shrink-0 scrollbar-hide">
        {Object.values(AppMode).map(mode => (
          <button
            key={mode}
            onClick={() => changeMode(mode)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${
              activeMode === mode 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {mode}
          </button>
        ))}
      </nav>

      {/* Chat History */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
        {showArch ? (
          <ArchitectureView />
        ) : (
          <>
            {messages.map(msg => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {status === 'connecting' && (
              <div className="flex justify-center py-2">
                <div className="bg-slate-200 text-slate-500 text-xs px-3 py-1 rounded-full animate-pulse">
                  সার্ভারে সংযোগ স্থাপন করা হচ্ছে...
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Voice Controls */}
      <footer className="bg-white border-t border-slate-200 p-6 flex flex-col items-center gap-4 shrink-0">
        {status === 'connected' && (
          <div className="voice-wave h-6">
            <div className="wave-bar" style={{ animationDelay: '0s' }}></div>
            <div className="wave-bar" style={{ animationDelay: '0.2s' }}></div>
            <div className="wave-bar" style={{ animationDelay: '0.4s' }}></div>
            <div className="wave-bar" style={{ animationDelay: '0.1s' }}></div>
            <div className="wave-bar" style={{ animationDelay: '0.3s' }}></div>
          </div>
        )}
        
        <button
          onClick={toggleVoice}
          disabled={status === 'connecting'}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-90 ${
            status === 'connected' 
            ? 'bg-red-500 hover:bg-red-600 ring-8 ring-red-50' 
            : status === 'connecting'
            ? 'bg-yellow-500 cursor-not-allowed opacity-80'
            : 'bg-emerald-600 hover:bg-emerald-700 ring-8 ring-emerald-50'
          }`}
        >
          {status === 'connecting' ? (
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          ) : status === 'connected' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
        
        <p className={`text-sm font-bold tracking-tight ${status === 'connected' ? 'text-red-500' : 'text-slate-500'}`}>
          {status === 'connected' ? 'শুনছি... কথা বলুন' : status === 'connecting' ? 'অপেক্ষা করুন...' : 'কথা বলতে ট্যাপ করুন'}
        </p>
      </footer>
    </div>
  );
};

export default App;
