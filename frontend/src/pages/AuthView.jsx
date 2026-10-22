import React, { useState } from 'react';
import { ShieldCheck, LogIn, UserPlus, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import {
  login, register, verifyLoginOtp, verifyRegistrationOtp, resendOtp,
  requestPasswordReset, resetPassword
} from '../api/services';
import { setSession } from '../api/client';
import KycOnboarding from '../components/KycOnboarding';

const DEMO = [
  { label: 'Customer', email: 'priya@staysafe.com', password: 'Customer@123', color: 'bg-teal-600' },
  { label: 'Room Owner', email: 'rahul@staysafe.com', password: 'Owner@123', color: 'bg-blue-600' },
  { label: 'Admin', email: 'admin@staysafe.com', password: 'Admin@123', color: 'bg-purple-600' }
];

export default function AuthView({ onAuth, showToast }) {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('credentials');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'CUSTOMER' });
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownerAuth, setOwnerAuth] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const input = 'w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500';

  const submit = async (e) => {
    e.preventDefault(); setError(''); setNotice(''); setLoading(true);
    try {
      if (step === 'credentials' && mode === 'login') {
        const res = await login(form.email, form.password);
        setChallenge(res); setStep('otp'); setNotice(res.message);
      } else if (step === 'credentials' && mode === 'register') {
        const res = await register(form);
        setChallenge(res); setStep('otp'); setNotice(res.message);
      } else if (step === 'credentials' && mode === 'forgot') {
        const res = await requestPasswordReset(form.email);
        setChallenge(res); setStep('reset'); setNotice(res.message);
      } else if (step === 'otp' && mode === 'login') {
        const res = await verifyLoginOtp(challenge.challengeId, otp);
        setSession(res.token, res.user); onAuth(res);
      } else if (step === 'otp' && mode === 'register') {
        const res = await verifyRegistrationOtp(challenge.challengeId, otp);
        setSession(res.token, res.user);
        if (res.user.role === 'OWNER') setOwnerAuth(res); else onAuth(res);
      } else if (step === 'reset' && mode === 'forgot') {
        await resetPassword(challenge.challengeId, otp, newPassword);
        setMode('login'); setStep('credentials'); setOtp(''); setNewPassword('');
        setChallenge(null); setNotice('Password reset successfully. Sign in with your new password.');
      }
    } catch (err) { setError(err.message || 'Request failed'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!challenge?.challengeId) return;
    setError(''); setNotice(''); setLoading(true);
    try {
      const res = await resendOtp(challenge.challengeId);
      setChallenge(res); setNotice(res.message);
    } catch (err) { setError(err.message || 'Unable to resend code'); }
    finally { setLoading(false); }
  };

  const changeMode = (next) => {
    setMode(next); setStep('credentials'); setChallenge(null); setOtp('');
    setError(''); setNotice(''); setNewPassword('');
  };

  if (ownerAuth) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-5">
          <div className="text-center">
            <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-2">Email verified</span>
            <h1 className="text-2xl font-black text-slate-900">Verify your identity (KYC)</h1>
            <p className="text-xs text-slate-500 mt-1">Required to list properties on StaySafe</p>
          </div>
          <KycOnboarding defaultName={ownerAuth.user.name} continueLabel="Go to Owner Console" onContinue={() => onAuth(ownerAuth)} />
          <button onClick={() => { showToast('You can complete KYC later from your Owner Console'); onAuth(ownerAuth); }} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600">Skip for now — I'll complete KYC later</button>
        </div>
      </div>
    );
  }

  const title = mode === 'forgot' ? 'Reset your password' : mode === 'login' ? 'Welcome back' : 'Create your account';
  const buttonText = loading ? 'Please wait...' :
    step === 'otp' ? 'Verify code' : step === 'reset' ? 'Reset password' :
    mode === 'login' ? 'Continue to email OTP' : mode === 'forgot' ? 'Send reset OTP' :
    form.role === 'OWNER' ? 'Continue to email verification' : 'Create account';

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            {step === 'credentials' && mode === 'register' ? <UserPlus className="w-7 h-7 text-white" /> :
             step === 'reset' ? <KeyRound className="w-7 h-7 text-white" /> :
             step === 'otp' ? <Mail className="w-7 h-7 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-black text-slate-900">{step === 'otp' ? 'Check your email' : title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'otp' ? `Enter the 6-digit code sent to ${challenge?.email || 'your registered email'}` : 'Safe Stays. Better Tomorrows.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {step === 'credentials' && mode === 'register' && <>
            <input className={input} placeholder="Full name" value={form.name} onChange={set('name')} required />
            <input className={input} placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} />
            <select className={input} value={form.role} onChange={set('role')}>
              <option value="CUSTOMER">I'm looking for a stay (Customer)</option>
              <option value="OWNER">I want to list properties (Room Owner)</option>
            </select>
          </>}
          {step === 'credentials' && <>
            <input className={input} type="email" placeholder="Registered email address" value={form.email} onChange={set('email')} required />
            {mode !== 'forgot' && <input className={input} type="password" placeholder="Password (minimum 8 characters)" value={form.password} onChange={set('password')} required minLength={8} />}
          </>}
          {(step === 'otp' || step === 'reset') && <input className={`${input} text-center tracking-[0.4em] text-lg`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required />}
          {step === 'reset' && <input className={input} type="password" autoComplete="new-password" placeholder="New password (minimum 8 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />}
          {error && <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">{error}</p>}
          {notice && <p className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 p-2.5 rounded-lg">{notice}</p>}
          <button disabled={loading || ((step === 'otp' || step === 'reset') && otp.length !== 6)} className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60">
            {step === 'otp' ? <Mail className="w-4 h-4" /> : mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{buttonText}</span>
          </button>
        </form>

        {(step === 'otp' || step === 'reset') && (
          <button type="button" disabled={loading} onClick={handleResend} className="w-full text-xs font-bold text-teal-600 hover:underline disabled:opacity-50">
            Resend code to registered email
          </button>
        )}

        {(step === 'reset' || (step === 'otp' && mode === 'login')) && (
          <button onClick={() => { setStep('credentials'); setOtp(''); setError(''); setNotice(''); setChallenge(null); }} className="w-full text-xs text-slate-500 flex items-center justify-center gap-1 hover:text-teal-600">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
        )}

        {step === 'credentials' && mode === 'login' && (
          <div className="text-center">
            <button onClick={() => changeMode('forgot')} className="text-xs text-teal-600 font-bold hover:underline">Forgot password?</button>
          </div>
        )}
        {step === 'credentials' && mode !== 'forgot' && (
          <p className="text-center text-xs text-slate-500">
            {mode === 'login' ? 'New to StaySafe? ' : 'Already registered? '}
            <button onClick={() => changeMode(mode === 'login' ? 'register' : 'login')} className="text-teal-600 font-bold hover:underline">
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        )}
        {step === 'credentials' && mode === 'login' && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 text-center">Demo accounts (email delivery must be configured)</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map(d => <button key={d.label} type="button" onClick={() => { setForm({ ...form, email: d.email, password: d.password }); showToast(`Filled ${d.label} credentials`); }} className={`${d.color} text-white text-[11px] font-bold py-2 rounded-lg`}>{d.label}</button>)}
            </div>
          </div>
        )}
        {step === 'credentials' && mode === 'forgot' && <button onClick={() => changeMode('login')} className="w-full text-xs text-teal-600 font-bold">Back to sign in</button>}
      </div>
    </div>
  );
}
