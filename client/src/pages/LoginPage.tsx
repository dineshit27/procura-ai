import React, { useRef, useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authConfigurationError, supabase } from '../auth/supabase';
import { useAuth } from '../auth/AuthContext';
import { demoAccounts, type DemoRole } from '../auth/demoAccounts';

const container: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: .1 } } };
const item: Variants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export const LoginPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDemo, setSelectedDemo] = useState<DemoRole | null>(null);
  const authInFlight = useRef(false);
  const passwordInput = useRef<HTMLInputElement>(null);
  if (user) return <Navigate to="/app" replace />;

  const signInWithCredentials = async () => {
    if (!supabase || authInFlight.current) return;
    if (!email || !password) {
      setMessage(selectedDemo && !password
        ? 'Enter the password for the selected demo account. Demo passwords are never stored in the app.'
        : 'Enter both email and password to sign in.');
      return;
    }
    authInFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        setMessage('Signed in successfully. Opening your workspace…');
        navigate('/app');
      }
    } catch {
      setMessage('Unable to sign in right now. Please try again.');
    } finally {
      authInFlight.current = false;
      setBusy(false);
    }
  };

  const selectDemo = (role: DemoRole) => {
    const account = demoAccounts.find((item) => item.role === role)!;
    if (!account.email || authInFlight.current) return;
    setSelectedDemo(role);
    setEmail(account.email);
    setPassword('');
    setMessage(`${account.label} selected. Enter the temporary demo password provided in the judge packet.`);
    window.requestAnimationFrame(() => passwordInput.current?.focus());
  };

  return <main className="flex min-h-screen flex-col bg-[#FBF9F5] text-[#111827] lg:flex-row">
    <section className="relative flex min-h-[42vh] w-full flex-col justify-between overflow-hidden bg-[#2457E6] p-7 sm:p-10 lg:min-h-screen lg:w-1/2">
      <img src="https://assets.watermelon.sh/auth-9.avif" alt="Abstract royal-blue background" className="absolute inset-0 size-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#071755]/70 via-[#0B2A9B]/20 to-[#2457E6]/10" />
      <div className="relative z-10 flex items-center justify-between"><span className="text-lg font-semibold tracking-tight text-white">PROCURA AI</span><Link to="/" className="flex items-center gap-2 text-sm font-medium text-white/90 transition-colors hover:text-white"><ArrowLeft className="size-4" />Back to website</Link></div>
      <div className="relative z-10 mt-12 lg:mt-0"><p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-white/80"><LockKeyhole className="size-3.5" />SECURE PROCUREMENT</p><h1 className="mb-4 max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">Control every<br />purchase decision.</h1><p className="max-w-md text-base font-normal leading-relaxed text-white/90 sm:text-lg">Sign in to manage policy-checked procurement workflows, approvals, and audit-ready purchasing.</p></div>
    </section>
    <section className="flex w-full items-center justify-center bg-white p-6 sm:p-12 lg:w-1/2">
      <motion.div variants={container} initial="hidden" animate="visible" className="w-full max-w-md">
        <motion.div variants={item} className="mb-8 border-l-4 border-[#2457E6] pl-4"><p className="mb-2 font-mono text-xs font-black tracking-widest text-[#2457E6]">PROCURA AI / ACCESS</p><h2 className="mb-2 text-4xl font-black tracking-tight text-[#111827]">Welcome back.</h2><p className="text-[15px] font-medium leading-relaxed text-neutral-600">Sign in with your assigned Procura AI account.</p></motion.div>
        {authConfigurationError ? <p className="border-2 border-red-700 bg-red-50 p-4 text-sm font-bold text-red-800 shadow-[4px_4px_0_#991B1B]">{authConfigurationError}</p> : <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void signInWithCredentials(); }}>
          <label className="text-sm font-bold">Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full border-2 border-neutral-900 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-bold">Password<input ref={passwordInput} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={selectedDemo ? 'Enter the demo account password' : undefined} className="mt-1 w-full border-2 border-neutral-900 px-3 py-2 font-normal" /></label>
          <motion.button variants={item} type="submit" disabled={busy} className="w-full border-2 border-[#111827] bg-[#2457E6] px-5 py-4 text-left font-black text-white shadow-[5px_5px_0_#111827] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111827] disabled:cursor-not-allowed disabled:opacity-60"><span className="block text-base">{busy ? 'Signing in…' : 'Sign in'}</span><span className="mt-1 block text-xs font-medium text-white/80">Use your Procura AI workspace account</span></motion.button>
          {message && <motion.p variants={item} role="status" aria-live="polite" className="border-2 border-[#2457E6] bg-[#E6EEFE] p-3 text-sm font-bold text-[#111827]">{message}</motion.p>}
        </form>}
        <motion.section variants={item} aria-labelledby="quick-demo-access" className="mt-8 border-t-2 border-[#111827] pt-6">
          <h3 id="quick-demo-access" className="font-mono text-sm font-black uppercase tracking-wider text-[#2457E6]">Quick Demo Access</h3>
          <p className="mt-1 text-sm font-medium text-neutral-600">Explore Procura AI using dedicated demo accounts.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {demoAccounts.map((account) => {
              const configured = Boolean(account.email);
              const selected = selectedDemo === account.role;
              return <button key={account.role} type="button" disabled={!configured || busy} onClick={() => selectDemo(account.role)} className={`border-2 border-[#111827] p-3 text-left shadow-[3px_3px_0_#111827] transition-all disabled:cursor-not-allowed disabled:opacity-45 ${selected ? 'bg-[#E6EEFE] ring-2 ring-[#2457E6]' : 'bg-white hover:bg-[#FBF9F5]'}`}>
                <span className="block text-sm font-black">{account.label}</span>
                <span className="mt-1 block text-xs font-medium leading-snug text-neutral-600">{configured ? account.description : `Set ${account.emailVariable} and rebuild.`}</span>
              </button>;
            })}
          </div>
          {!demoAccounts.some((account) => account.email) && <p className="mt-3 text-xs font-medium text-neutral-600">Demo access is not configured. Set the documented <code>VITE_DEMO_*_EMAIL</code> values for disposable demo users and rebuild the frontend.</p>}
        </motion.section>
        <motion.p variants={item} className="mt-10 border-t-2 border-[#111827] pt-4 text-[13px] font-medium text-neutral-600">Need access? Ask your Procura AI administrator for an invitation.</motion.p>
      </motion.div>
    </section>
  </main>;
};
