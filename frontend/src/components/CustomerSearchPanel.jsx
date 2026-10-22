import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { getOwnerCustomers } from '../api/services';
import { exportCsv, exportXlsx } from '../utils/export';
import ExportButtons from './ExportButtons';

const customerRow = (c) => ({
  'Customer ID': c.id,
  Name: c.name,
  Email: c.email,
  Phone: c.phone || '',
  'Total Bookings': c.totalBookings,
  'Active Bookings': c.activeBookings,
  'Total Paid (INR)': c.totalPaid,
  'Last Booking': c.lastBooking,
  Properties: c.properties.join('; ')
});

const bookingRow = (b) => ({
  'Booking ID': b.id,
  'Customer Name': b.customerName,
  'Customer Email': b.customerEmail,
  'Customer Phone': b.customerPhone || '',
  Property: b.propertyName,
  Location: b.location,
  'Check-in': b.checkIn,
  'Check-out': b.checkOut,
  Guests: b.guests,
  'Amount (INR)': b.amount,
  Status: b.status,
  'Payment Method': b.paymentMethod,
  'Payment Ref': b.paymentRef
});

const STATUS = { Confirmed: 'bg-teal-100 text-teal-800', Completed: 'bg-slate-200 text-slate-700', Cancelled: 'bg-rose-100 text-rose-700' };

/** Owner section: search + export the customers who booked this owner's properties. */
export default function CustomerSearchPanel({ showToast }) {
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      getOwnerCustomers(q)
        .then(setCustomers)
        .catch((e) => showToast(e.message))
        .finally(() => setLoading(false));
    }, 300); // debounce typing
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const allBookings = customers.flatMap(c => c.bookings);

  const doCsv = () => exportCsv(customers.map(customerRow), 'customers') ? showToast('Customers exported to CSV') : showToast('Nothing to export');
  const doXlsx = () => exportXlsx({ Customers: customers.map(customerRow), Bookings: allBookings.map(bookingRow) }, 'customers')
    ? showToast('Customers exported to Excel') : showToast('Nothing to export');

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer name, email, phone, booking ID or property..."
            className="w-full bg-transparent text-xs font-medium focus:outline-none"
          />
          {q && <button onClick={() => setQ('')}><X className="w-4 h-4 text-slate-400" /></button>}
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-500 font-semibold">{loading ? 'Searching...' : `${customers.length} customer${customers.length === 1 ? '' : 's'}`}</span>
          <ExportButtons onCsv={doCsv} onExcel={doXlsx} disabled={customers.length === 0} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
              <th className="pb-3">Customer</th><th className="pb-3">Contact</th><th className="pb-3">Properties booked</th>
              <th className="pb-3 text-right">Bookings</th><th className="pb-3 text-right">Total paid</th><th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 && (
              <tr><td colSpan="6" className="py-6 text-center text-slate-400 font-semibold">{q ? 'No customers match your search.' : 'No customers have booked your properties yet.'}</td></tr>
            )}
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="py-3"><span className="font-bold text-slate-900 block">{c.name}</span><span className="text-[10px] text-slate-400">ID #{c.id} • last booked {c.lastBooking}</span></td>
                <td className="py-3 text-slate-600"><span className="block">{c.email}</span><span className="text-slate-400">{c.phone || '—'}</span></td>
                <td className="py-3 text-slate-600">{c.properties.join(', ')}</td>
                <td className="py-3 text-right font-bold">{c.totalBookings} <span className="text-[10px] font-normal text-slate-400">({c.activeBookings} active)</span></td>
                <td className="py-3 text-right font-bold text-teal-700">₹{c.totalPaid.toLocaleString()}</td>
                <td className="py-3 text-right"><button onClick={() => setSelected(c)} className="bg-slate-900 hover:bg-teal-600 text-white font-bold px-3 py-1.5 rounded-lg transition">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl max-w-2xl w-full shadow-2xl space-y-4 border border-slate-200 text-xs">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">{selected.name}</h3>
                <p className="text-slate-500">{selected.email} • {selected.phone || 'No phone'} • Customer ID #{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="block text-[10px] uppercase font-bold text-slate-400">Bookings</span><b className="text-lg">{selected.totalBookings}</b></div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="block text-[10px] uppercase font-bold text-slate-400">Active</span><b className="text-lg">{selected.activeBookings}</b></div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="block text-[10px] uppercase font-bold text-slate-400">Total paid</span><b className="text-lg text-teal-700">₹{selected.totalPaid.toLocaleString()}</b></div>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase text-slate-500">Booking history</h4>
              <ExportButtons
                onCsv={() => exportCsv(selected.bookings.map(bookingRow), `customer-${selected.id}-bookings`)}
                onExcel={() => exportXlsx({ Customer: [customerRow(selected)], Bookings: selected.bookings.map(bookingRow) }, `customer-${selected.id}`)}
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {selected.bookings.map(b => (
                <div key={b.dbId} className="p-3 border border-slate-200 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">{b.propertyName} <span className="font-mono text-[10px] text-slate-400">{b.id}</span></span>
                    <span className="text-slate-500">{b.checkIn} → {b.checkOut} • {b.guests} • {b.paymentMethod}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-teal-700 block">₹{b.amount.toLocaleString()}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${STATUS[b.status] || ''}`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
