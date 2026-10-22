import React, { useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { assetUrl } from '../api/client';
import { createPaymentOrder, verifyPayment } from '../api/services';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) { resolve(true); return; }
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

/**
 * Razorpay Checkout flow:
 *  1. server creates an order (price comes from the DB)
 *  2. Razorpay Checkout collects the payment (UPI / cards / netbanking / wallets)
 *  3. server verifies the signature, re-checks the payment with Razorpay, captures it and creates the booking
 * If the tab is closed after paying, the payment.captured webhook still creates the booking.
 */
export default function BookingPaymentView({ property, draft, user, onBack, onDone }) {
  const room = property.rooms?.find(r => r.id === draft.roomId);
  const price = room ? room.pricePerBed : property.price;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    setLoading(true);
    setError('');
    try {
      if (!(await loadRazorpay())) throw new Error('Could not load Razorpay. Check your internet connection and try again.');
      const order = await createPaymentOrder({ propertyId: property.id, checkIn: draft.checkIn, checkOut: draft.checkOut, guests: draft.guests, roomId: draft.roomId });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'StaySafe',
        description: order.description,
        order_id: order.orderId,
        prefill: { name: user.name, email: user.email, contact: (user.phone || '').replace(/[^\d+]/g, '') },
        notes: { property: property.name },
        theme: { color: '#0d9488' },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (resp) => {
          try {
            await verifyPayment({
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature
            });
            onDone();
          } catch (e) {
            setError(`${e.message} If money was deducted, your booking is confirmed automatically within a few minutes (check My Bookings).`);
            setLoading(false);
          }
        }
      });
      rzp.on('payment.failed', (r) => {
        setError(r.error?.description || 'Payment failed. Please try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={onBack} className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-teal-600 transition mb-6 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-fit">
        <ArrowLeft className="w-4 h-4" /><span>Back</span>
      </button>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">Checkout & Secure Payment</h2>

        <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <img src={assetUrl(property.image)} alt={property.name} className="w-16 h-16 rounded-xl object-cover" />
          <div>
            <h4 className="font-bold text-sm text-slate-900">{property.name}</h4>
            <p className="text-xs text-slate-500">{property.location}</p>
            <span className="text-xs font-bold text-teal-700 mt-1 block">{room ? `${room.label} • ` : ''}₹{price.toLocaleString()} / bed / month</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="block text-[10px] uppercase font-bold text-slate-400">Check-in</span><b>{draft.checkIn}</b></div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="block text-[10px] uppercase font-bold text-slate-400">Check-out</span><b>{draft.checkOut}</b></div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="block text-[10px] uppercase font-bold text-slate-400">Occupancy</span><b>{room ? room.label : draft.guests}</b></div>
        </div>

        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Pay with <b>UPI, cards, net banking or wallets</b> on Razorpay's secure checkout. Free cancellation up to 48 hours before check-in with an automatic refund to your original payment method.</span>
        </div>

        <p className="text-[11px] text-slate-500 flex items-center space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-teal-600" />
          <span>Refundable security deposit of ₹{property.deposit.toLocaleString()} is collected at check-in.</span>
        </p>

        {error && <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">{error}</p>}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total Payable</span>
            <span className="text-2xl font-black text-teal-700">₹{price.toLocaleString()}</span>
          </div>
          <button onClick={pay} disabled={loading} className="bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition text-sm disabled:opacity-60">
            {loading ? 'Processing...' : 'Pay Now via Razorpay'}
          </button>
        </div>
      </div>
    </div>
  );
}
