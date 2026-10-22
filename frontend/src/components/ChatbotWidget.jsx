import React, { useState } from 'react';
import { Bot, Minimize2, Send } from 'lucide-react';
import { CHAT_PROMPTS, getBotReply } from '../data/chatbot.js';

const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ChatbotWidget() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am StaySafe AI Assistant. How can I help you find or manage your safe stay today?', time: 'Just now' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    setChatMessages(prev => [...prev, { sender: 'user', text, time: timeNow() }]);
    if (!textToSend) setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'bot', text: getBotReply(text), time: timeNow() }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isChatOpen ? (
        <button
          onClick={() => setIsChatOpen(true)}
          className="group flex items-center space-x-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition transform duration-200 border-2 border-white/20"
        >
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
          </div>
          <span className="font-extrabold text-xs tracking-wider uppercase pr-1 hidden sm:inline">StaySafe AI</span>
        </button>
      ) : (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-80 sm:w-96 flex flex-col overflow-hidden max-h-[520px] transition duration-300">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-400 to-blue-500 flex items-center justify-center text-slate-950 font-black shadow">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">StaySafe AI Assistant</h3>
                <span className="text-[10px] text-teal-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block"></span>
                  <span>Online • Instant Help</span>
                </span>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-50 min-h-[260px] max-h-[300px] text-xs">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none'}`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <span className={`block text-[9px] mt-1 ${msg.sender === 'user' ? 'text-teal-200 text-right' : 'text-slate-400'}`}>{msg.time}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm rounded-bl-none flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 overflow-x-auto flex space-x-1.5 scrollbar-none">
            {CHAT_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-slate-200 shrink-0 transition"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about verifications, refunds, stays..."
              className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none focus:border-teal-500"
            />
            <button onClick={() => handleSendMessage()} className="bg-gradient-to-r from-teal-500 to-blue-600 text-white p-2.5 rounded-xl hover:opacity-90 transition shadow">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
