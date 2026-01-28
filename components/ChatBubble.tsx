
import React from 'react';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';
  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
        isAssistant 
          ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none' 
          : 'bg-emerald-600 text-white rounded-tr-none'
      }`}>
        <p className="text-[15px] leading-relaxed">{message.text}</p>
        <span className={`text-[10px] block mt-1 ${isAssistant ? 'text-slate-400' : 'text-emerald-100'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default ChatBubble;
