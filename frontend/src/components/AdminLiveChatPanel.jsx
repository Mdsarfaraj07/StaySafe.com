import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Send, RefreshCw } from 'lucide-react';
import { getAdminChatConversations, getAdminChatMessages, replyAdminChat } from '../api/services';

export default function AdminLiveChatPanel({ showToast }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const refreshConversations = useCallback(async () => { try { setConversations(await getAdminChatConversations()); } catch {} }, []);
  const refreshMessages = useCallback(async (id) => { if (!id) return; try { setMessages(await getAdminChatMessages(id)); } catch {} }, []);
  useEffect(() => {
    refreshConversations(); const t = window.setInterval(refreshConversations, 4000);
    const focus = (event) => { const id = event.detail?.userId; if (id) { getAdminChatConversations().then(list => { setConversations(list); const c = list.find(x => x.userId === Number(id)); if (c) setSelected(c); }).catch(() => {}); } };
    window.addEventListener('staysafe:open-admin-chat', focus);
    return () => { window.clearInterval(t); window.removeEventListener('staysafe:open-admin-chat', focus); };
  }, [refreshConversations]);
  useEffect(() => { if (!selected) return; refreshMessages(selected.userId); const t = window.setInterval(() => refreshMessages(selected.userId), 2500); return () => window.clearInterval(t); }, [selected?.userId, refreshMessages]);
  const submit = async (e) => { e.preventDefault(); if (!selected || !draft.trim() || busy) return; setBusy(true); try { await replyAdminChat(selected.userId, draft.trim()); setDraft(''); await refreshMessages(selected.userId); await refreshConversations(); } catch (err) { showToast?.(err.message); } finally { setBusy(false); } };
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[440px]">
    <aside className="border border-slate-200 rounded-xl overflow-hidden"><div className="p-3 bg-slate-50 border-b flex items-center justify-between"><b className="text-sm">Live conversations</b><RefreshCw className="w-4 h-4 text-slate-400"/></div><div className="max-h-[440px] overflow-y-auto divide-y">{conversations.length === 0 ? <p className="p-5 text-xs text-slate-500">No conversations yet.</p> : conversations.map(c => <button key={c.userId} onClick={() => setSelected(c)} className={`w-full text-left p-3 hover:bg-teal-50 ${selected?.userId === c.userId ? 'bg-teal-50 border-l-4 border-teal-600' : ''}`}><p className="font-bold text-xs text-slate-900">{c.name || 'User'}</p><p className="text-[10px] text-slate-500">{c.email}</p><p className="text-[11px] text-slate-600 mt-1 truncate">{c.lastMessage}</p></button>)}</div></aside>
    <section className="md:col-span-2 border border-slate-200 rounded-xl flex flex-col overflow-hidden"><header className="p-3 bg-slate-900 text-white"><p className="font-bold text-sm">{selected ? `${selected.name} · ${selected.role}` : 'Select a conversation'}</p><p className="text-[10px] text-slate-300">Messages refresh automatically</p></header><div className="flex-1 min-h-[300px] max-h-[370px] overflow-y-auto p-3 bg-slate-50 space-y-2">{!selected ? <div className="text-center text-slate-400 py-20"><MessageCircle className="w-8 h-8 mx-auto mb-2"/><p className="text-xs">Choose a conversation to reply.</p></div> : messages.map(m => <div key={m.id} className={`flex ${m.fromSupport ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl p-3 text-xs ${m.fromSupport ? 'bg-teal-600 text-white' : 'bg-white border text-slate-800'}`}><p className="font-bold mb-1">{m.fromSupport ? 'You · Support' : m.senderName}</p><p className="whitespace-pre-wrap break-words">{m.message}</p><p className="text-[9px] opacity-70 mt-1">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</p></div></div>)}</div><form onSubmit={submit} className="p-3 border-t flex gap-2"><input value={draft} onChange={e => setDraft(e.target.value)} disabled={!selected} maxLength={2000} placeholder="Reply to customer..." className="flex-1 min-w-0 border rounded-xl px-3 py-2 text-xs"/><button disabled={!selected || !draft.trim() || busy} className="bg-teal-600 text-white rounded-xl px-4 disabled:opacity-50"><Send className="w-4 h-4"/></button></form></section>
  </div>;
}
