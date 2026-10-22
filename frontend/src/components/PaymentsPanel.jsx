import React, { useState, useEffect, useCallback } from 'react';
import { getAdminPayments, adminRefundPayment, getAdminWebhooks } from '../api/services';
import { exportCsv, exportXlsx } from '../utils/export';
import ExportButtons from './ExportButtons';

const FILTERS = ['ALL', 'CAPTURED', 'CREATED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
const BADGE = {
  CAPTURED: 'bg-teal-100 text-teal-800', AUTHORIZED: 'bg-blue-100 text-blue-800', CREATED: 'bg-slate-200 text-slate-700',
  FAILED: 'bg-rose-100 text-rose-700', REFUNDED: 'bg-purple-100 text-purple-800', PARTIALLY_REFUNDED: 'bg-purple-100 text-purple-800'
};
const WH_BADGE = { PROCESSED: 'bg-teal-100 text-teal-800', IGNORED: 'bg-slate-200 text-slate-700', FAILED: 'bg-rose-100 text-rose-700', RECEIVED: 'bg-amber-100 text-amber-800' };

const row = (p) => ({
  'Payment ID': p.paymentId || '', 'Order ID': p.orderId, Booking: p.bookingCode || '', Customer: p.customerName,
  Email: p.customerEmail, Property: p.propertyName, 'Amount (INR)': p.amount, Status: p.status, Method: p.method || '',
  'Refunded (INR)': p.refundedAmount, 'Refund status': p.refundStatus, Dispute: p.disputeStatus || '', Created: p.createdAt
});

/** Admin: Razorpay payments, refunds and the webhook delivery log. */
export default function PaymentsPanel({ showToast, onChanged }) {
  const [filter, setFilter] = useState('ALL');
  const [view, setView] = useState('payments');
  const [payments, setPayments] = useState([]);
  const [hooks, setHooks] = useState([]);

  const load = useCallback(() => {
    getAdminPayments(filter).then(setPayments).catch((e) => showToast(e.message));
    getAdminWebhooks().then(setHooks).catch(() => {});
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const refund = async (p) => {
    const input = window.prompt(`Refund amount in ₹ for ${p.customerName} (max ${p.amount}). Leave empty for a full refund:`, String(p.amount));
    if (input === null) return;
    const amt = input.trim() === '' ? null : Number(input);
    if (amt !== null && (!Number.isInteger(amt) || amt <= 0 || amt > p.amount)) { showToast('Enter a whole amount between 1 and ' + p.amount); return; }
    try { await adminRefundPayment(p.id, amt); showToast('Refund initiated with Razorpay'); load(); onChanged?.(); }
    catch (e) { showToast(e.message); }
  };

  const canRefund = (p) => p.status === 'CAPTURED' && (p.refundStatus === 'NONE' || p.refundStatus === 'FAILED' || !p.refundStatus);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-slate-100 rounded-xl p-1">
          {['payments', 'webhooks'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${view === v ? 'bg-purple-600 text-white shadow' : 'text-slate-600'}`}>{v === 'webhooks' ? 'Webhook log' : 'Payments'}</button>
          ))}
        </div>
        {view === 'payments' && (
          <ExportButtons disabled={payments.length === 0}
            onCsv={() => exportCsv(payments.map(row), 'payments')}
            onExcel={() => exportXlsx({ Payments: payments.map(row) }, 'payments')} />
        )}
      </div>

      {view === 'payments' && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{f.replace('_', ' ')}</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                <th className="pb-3">Payment</th><th className="pb-3">Customer</th><th className="pb-3">Property</th><th className="pb-3 text-right">Amount</th>
                <th className="pb-3">Status</th><th className="pb-3">Refund / dispute</th><th className="pb-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 && <tr><td colSpan="7" className="py-6 text-center text-slate-400 font-semibold">No payments.</td></tr>}
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3"><span className="font-mono text-[10px] block">{p.paymentId || p.orderId}</span><span className="text-slate-400">{p.method || '—'} • {p.bookingCode || 'no booking'}</span></td>
                    <td className="py-3"><b className="block text-slate-900">{p.customerName}</b><span className="text-slate-400">{p.customerEmail}</span></td>
                    <td className="py-3 text-slate-600">{p.propertyName}</td>
                    <td className="py-3 text-right font-bold text-teal-700">₹{p.amount.toLocaleString()}</td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded font-bold text-[10px] ${BADGE[p.status] || ''}`}>{p.status.replace('_', ' ')}</span>{p.failureReason && <span className="block text-[10px] text-rose-600 mt-0.5">{p.failureReason}</span>}</td>
                    <td className="py-3 text-slate-600">{p.refundStatus !== 'NONE' ? `Refund ${p.refundStatus.toLowerCase()} (₹${p.refundedAmount})` : '—'}{p.disputeStatus && <span className="block text-amber-700 font-semibold">Dispute: {p.disputeStatus.replace('_', ' ')}</span>}</td>
                    <td className="py-3 text-right">{canRefund(p) && <button onClick={() => refund(p)} className="border border-slate-200 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50">Refund</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'webhooks' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]"><th className="pb-3">Event</th><th className="pb-3">Event ID</th><th className="pb-3">Status</th><th className="pb-3">Received</th><th className="pb-3">Error</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {hooks.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-slate-400 font-semibold">No webhook deliveries yet.</td></tr>}
              {hooks.map(h => (
                <tr key={h.id}>
                  <td className="py-2.5 font-bold text-slate-900">{h.eventType}</td>
                  <td className="py-2.5 font-mono text-[10px] text-slate-500">{h.eventId}</td>
                  <td className="py-2.5"><span className={`px-2 py-0.5 rounded font-bold text-[10px] ${WH_BADGE[h.status] || ''}`}>{h.status}</span></td>
                  <td className="py-2.5 text-slate-500">{h.receivedAt?.slice(0, 19).replace('T', ' ')}</td>
                  <td className="py-2.5 text-rose-600">{h.error || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
