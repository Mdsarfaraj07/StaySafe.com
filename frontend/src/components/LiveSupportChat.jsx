import React, { useEffect, useRef, useState } from 'react';
import { Headset, X, Send, MessageCircle, RefreshCw } from 'lucide-react';
import { getChatMessages, sendChatMessage } from '../api/services';

export default function LiveSupportChat({ user, showToast }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const refresh = async () => { try { setMessages(await getChatMessages()); } catch { /* signed-out / transient network */ } };
  useEffect(() => {
    if (!user || user.role === 'ADMIN') return undefined;
    const openChat = () => setOpen(true);
    window.addEventListener('staysafe:open-support-chat', openChat);
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => { window.clearInterval(timer); window.removeEventListener('staysafe:open-support-chat', openChat); };
  }, [user?.id]);
  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);
  if (!user || user.role === 'ADMIN') return null;
  const submit = async (e) => {
    e.preventDefault(); const message = draft.trim(); if (!message || sending) return;
    setSending(true);
    try { const saved = await sendChatMessage(message); setMessages(old => old.some(m => m.id === saved.id) ? old : [...old, saved]); setDraft(''); }
    catch (err) { showToast?.(err.message || 'Could not send message'); }
    finally { setSending(false); }
  };
  return <div className="fixed bottom-5 right-5 z-[60]">
    {open && <section className="mb-3 w-[min(92vw,360px)] h-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between"><div className="flex items-center gap-2"><Headset className="w-5 h-5 text-teal-300"/><div><p className="font-bold text-sm">StaySafe Support</p><p className="text-[11px] text-slate-300">Replies refresh automatically</p></div></div><button onClick={() => setOpen(false)} aria-label="Close chat"><X className="w-5 h-5"/></button></header>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
        {messages.length === 0 && <div className="text-center text-slate-500 text-xs py-10"><MessageCircle className="w-8 h-8 mx-auto mb-2 text-teal-600"/><p className="font-bold">How can we help?</p><p>Send a message to our support team.</p></div>}
        {messages.map(m => <div key={m.id} className={`flex ${m.fromSupport ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${m.fromSupport ? 'bg-white border border-slate-200 text-slate-800' : 'bg-teal-600 text-white'}`}><p className="font-bold mb-1">{m.fromSupport ? 'StaySafe Support' : 'You'}</p><p className="whitespace-pre-wrap break-words">{m.message}</p><p className={`text-[9px] mt-1 ${m.fromSupport ? 'text-slate-400' : 'text-teal-100'}`}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p></div></div>)}
        <div ref={bottomRef}/>
      </div>
      <form onSubmit={submit} className="p-3 border-t border-slate-200 flex gap-2"><input value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} placeholder="Write a message..." className="min-w-0 flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"/><button disabled={sending || !draft.trim()} className="bg-teal-600 text-white rounded-xl px-3 disabled:opacity-50" aria-label="Send message"><Send className="w-4 h-4"/></button></form>
    </section>}
    <button onClick={() => { setOpen(v => !v); if (!open) refresh(); }} className="ml-auto flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-full shadow-xl font-bold text-xs"><MessageCircle className="w-5 h-5"/>{open ? 'Close support' : 'Live support'}{!open && <RefreshCw className="w-3 h-3 opacity-70"/>}</button>
  </div>;
}
