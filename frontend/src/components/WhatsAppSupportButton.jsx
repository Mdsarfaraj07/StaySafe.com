import React from 'react';
import { MessageCircle } from 'lucide-react';

/** Free click-to-chat handoff to WhatsApp; it does not read or sync WhatsApp messages. */
export default function WhatsAppSupportButton({ user }) {
  const phone = (import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
  if (!phone) return null;

  const message = user
    ? `Hello StaySafe Support, I need help with my account.\nName: ${user.name || 'StaySafe user'}\nEmail: ${user.email || 'Not provided'}`
    : 'Hello StaySafe Support, I need help with finding or booking accommodation.';
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with StaySafe support on WhatsApp"
      title="Chat with StaySafe support on WhatsApp"
      className="fixed bottom-5 left-5 z-[60] flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 text-xs font-bold text-white shadow-xl transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
    >
      <MessageCircle className="h-5 w-5" />
      <span>WhatsApp support</span>
    </a>
  );
}
