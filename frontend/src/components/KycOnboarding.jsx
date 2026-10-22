import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { startDigiLocker, submitManualKyc } from '../api/services';

const ID_TYPES = [
  { id: 'PAN', label: 'PAN Card', placeholder: 'ABCDE1234F' },
  { id: 'AADHAAR', label: 'Aadhaar', placeholder: '12-digit Aadhaar number' },
  { id: 'PASSPORT', label: 'Passport', placeholder: 'A1234567' },
  { id: 'VOTER_ID', label: 'Voter ID (EPIC)', placeholder: 'ABC1234567' },
  { id: 'DRIVING_LICENSE', label: 'Driving Licence', placeholder: 'KA0120110012345' }
];

const eighteenYearsAgo = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

const input = 'w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500';
const label = 'block text-[10px] uppercase font-bold text-slate-400 mb-1';

/**
 * Owner KYC onboarding through DigiLocker OAuth or manual review.
 * DigiLocker authorization does not by itself establish a CKYC registry match.
 */
export default function KycOnboarding({ onSubmitted, onContinue, continueLabel = 'Continue', defaultName = '' }) {
  const [step, setStep] = useState('lookup');           // lookup | manual | done
  const [form, setForm] = useState({ idType: 'PAN', idNumber: '', dob: '', consent: false });
  const [manual, setManual] = useState({ fullName: defaultName, address: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const idMeta = ID_TYPES.find(t => t.id === form.idType);
  const payload = () => ({ idType: form.idType, idNumber: form.idNumber, dob: form.dob, consent: form.consent });

  const run = async (fn) => {
    setError('');
    setLoading(true);
    try { await fn(); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const search = (e) => {
    e.preventDefault();
    if (!form.consent) {
      setError('Please provide consent before continuing to DigiLocker.');
      return;
    }
    run(async () => {
      const res = await startDigiLocker({ consent: true });
      if (!res?.authorizationUrl) throw new Error('DigiLocker authorization could not be started.');
      window.location.assign(res.authorizationUrl);
    });
  };

  const submitManual = (e) => {
    e.preventDefault();
    run(async () => {
      const kyc = await submitManualKyc({ ...payload(), fullName: manual.fullName, address: manual.address });
      setResult(kyc); setStep('done'); onSubmitted?.(kyc);
    });
  };

  const ErrorBox = () => error ? <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">{error}</p> : null;

  const Consent = () => (
    <label className="flex items-start space-x-2 text-[11px] text-slate-600 cursor-pointer">
      <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-0.5 accent-teal-600" />
      <span>{step === 'manual'
        ? 'I consent to StaySafe using the identity details I provide for manual verification and review.'
        : 'I consent to being redirected to DigiLocker and to StaySafe accessing my account details and eligible issued-document metadata for identity verification. I understand this does not itself perform a CKYC registry lookup.'}</span>
    </label>
  );

  // ---------- DONE ----------
  if (step === 'done' && result) {
    const verified = result.status === 'VERIFIED';
    return (
      <div className="text-center space-y-3 py-2">
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${verified ? 'bg-teal-100' : 'bg-amber-100'}`}>
          {verified ? <CheckCircle className="w-8 h-8 text-teal-600" /> : <FileText className="w-8 h-8 text-amber-600" />}
        </div>
        <h3 className="font-black text-slate-900 text-lg">{verified ? (result.source === 'CKYC' ? 'KYC verified via CKYC' : 'Identity review approved') : 'KYC submitted for review'}</h3>
        <p className="text-xs text-slate-500">
          {verified
            ? (result.source === 'CKYC'
              ? `Your ${result.idType.replace('_', ' ')} (${result.idMasked}) matched CKYC record ${result.ckycNumber}.`
              : 'Your identity review has been approved.')
            : `Our team will review your ${result.idType.replace('_', ' ')} (${result.idMasked}) shortly. You can submit listings meanwhile — they go live once KYC is approved.`}
        </p>
        {onContinue && (
          <button onClick={onContinue} className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold px-6 py-2.5 rounded-xl shadow">{continueLabel}</button>
        )}
      </div>
    );
  }

  // ---------- MANUAL ----------
  if (step === 'manual') {
    return (
      <form onSubmit={submitManual} className="space-y-3">
        {notice && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{notice}</span>
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>ID type</label>
            <select className={input} value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}>
              {ID_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>ID number</label>
            <input className={input} value={form.idNumber} placeholder={idMeta.placeholder} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Full name (as on ID)</label>
            <input className={input} value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} required />
          </div>
          <div>
            <label className={label}>Date of birth</label>
            <input type="date" max={eighteenYearsAgo()} className={input} value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className={label}>Address (as on ID)</label>
          <textarea className={`${input} h-20`} value={manual.address} onChange={(e) => setManual({ ...manual, address: e.target.value })} required />
        </div>
        <Consent />
        <ErrorBox />
        <div className="flex space-x-2">
          <button type="button" onClick={() => { setStep('lookup'); setError(''); }} className="w-full bg-slate-100 font-bold py-2.5 rounded-xl text-xs">Back to DigiLocker</button>
          <button disabled={loading} className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-xl text-xs shadow disabled:opacity-60">{loading ? 'Submitting...' : 'Submit for review'}</button>
        </div>
      </form>
    );
  }

  // ---------- DIGILOCKER AUTHORIZATION ----------
  return (
    <form onSubmit={search} className="space-y-3">
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-2">
        <p className="font-bold text-sm text-teal-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Verify using DigiLocker
        </p>
        <p className="text-xs leading-5 text-teal-900">
          Continue to DigiLocker to sign in and approve sharing. StaySafe will use the authorized account details
          and issued-document metadata to start your identity review. Your verification remains pending until
          the required document and KYC checks are completed.
        </p>
      </div>
      <Consent />
      <ErrorBox />
      <button disabled={loading || !form.consent} className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 rounded-xl shadow flex items-center justify-center space-x-2 disabled:opacity-60">
        <ShieldCheck className="w-4 h-4" />
        <span>{loading ? 'Connecting to DigiLocker...' : 'Continue with DigiLocker'}</span>
      </button>
      <button type="button" onClick={() => { setStep('manual'); setError(''); setNotice(''); }} className="w-full text-xs font-bold text-teal-700 hover:underline">
        Submit details for manual review instead
      </button>
      <p className="text-[10px] text-slate-400 text-center">
        Secure redirect flow. DigiLocker access requires StaySafe to be approved as a requester and configured with valid credentials.
      </p>
    </form>
  );
}
