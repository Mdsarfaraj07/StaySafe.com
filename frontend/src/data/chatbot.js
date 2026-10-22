export const CHAT_PROMPTS = [
  'How does property verification work?',
  'Can I cancel or refund my booking?',
  'How to list my property as an Owner?',
  'What safety features does StaySafe guarantee?'
];

export const CHAT_KNOWLEDGE_BASE = {
  verification: 'StaySafe conducts 4-step verification: 1) Govt ID check of owner, 2) Property deed audit, 3) On-site safety audit (CCTV/locks), 4) verified tenant reviews.',
  cancel: 'You can cancel free of charge up to 48 hours before check-in. Full refunds are processed directly via Razorpay into your original payment method within 3-5 business days.',
  list: "To list a property: Register or sign in as a Room Owner, open your Owner Console, and click 'Add New Property'. Our team will audit documents in 24 hours.",
  safety: 'We ensure 24/7 emergency hotline access, female-friendly PG tagging, double-authenticated gate keys, and zero unverified third-party brokers.',
  default: "I'm StaySafe AI Assistant! I can help you find verified stays, understand booking processes, assist room owners with listings, and answer safety queries. Feel free to ask anything!"
};

export function getBotReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes('verification') || lower.includes('verify') || lower.includes('passport')) return CHAT_KNOWLEDGE_BASE.verification;
  if (lower.includes('cancel') || lower.includes('refund') || lower.includes('money')) return CHAT_KNOWLEDGE_BASE.cancel;
  if (lower.includes('list') || lower.includes('owner') || lower.includes('host') || lower.includes('add')) return CHAT_KNOWLEDGE_BASE.list;
  if (lower.includes('safety') || lower.includes('safe') || lower.includes('security') || lower.includes('female')) return CHAT_KNOWLEDGE_BASE.safety;
  return CHAT_KNOWLEDGE_BASE.default;
}
