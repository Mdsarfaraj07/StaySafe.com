import React from 'react';

export default function Footer({ showToast }) {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold">S</div>
          <div>
            <span className="text-white font-bold text-base block">StaySafe Technologies</span>
            <span className="text-xs text-slate-500">© 2026 StaySafe Inc. Safe Stays. Better Tomorrows.</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 font-medium">
          <button onClick={() => showToast('Privacy Policy Details')} className="hover:text-teal-400">Privacy Policy</button>
          <button onClick={() => showToast('Terms of Service')} className="hover:text-teal-400">Terms of Service</button>
          <button onClick={() => showToast('24/7 Helpline Active')} className="hover:text-teal-400">Security Hotline</button>
          <button onClick={() => showToast('Partner Portal Active')} className="hover:text-teal-400">Partner With Us</button>
        </div>
      </div>
    </footer>
  );
}
