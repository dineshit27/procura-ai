import React, { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { ArrowLeft, LockKeyhole, UserRoundCheck } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authConfigurationError, supabase } from '../auth/supabase';
import { useAuth } from '../auth/AuthContext';

const container: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: .1 } } };
const item: Variants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };
const demoCredentials = { email: 'm.dinesh.it27@gmail.com', password: '1234567890' };

export const LoginPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/app" replace />;

  const signInWithCredentials = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword(demoCredentials);
    setBusy(false);
    if (error) setMessage(error.message);
    else navigate('/app');
  };

  const signInAsGuest = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) setMessage(error.message);
    else navigate('/app');
  };

  return <main className="flex min-h-screen flex-col bg-[#FBF9F5] text-[#111827] lg:flex-row">
    <section className="relative flex min-h-[42vh] w-full flex-col justify-between overflow-hidden border-b-2 border-[#111827] bg-[#2457E6] p-7 sm:p-10 lg:min-h-screen lg:w-1/2 lg:border-b-0 lg:border-r-2">
      <img src="https://assets.watermelon.sh/auth-9.avif" alt="Abstract royal-blue background" className="absolute inset-0 size-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0B1E78]/35 via-transparent to-[#2457E6]/15" />
      <div aria-hidden="true" className="absolute -right-12 -top-12 size-64 rotate-12 border-2 border-[#111827] bg-white/20 shadow-[10px_10px_0_#111827]" />
      <div aria-hidden="true" className="absolute -bottom-16 left-10 size-48 border-2 border-[#111827] bg-[#E6EEFE] shadow-[10px_10px_0_#111827]" />
      <div className="relative z-10 flex items-center justify-between"><span className="border-2 border-[#111827] bg-white px-3 py-1 text-lg font-black text-[#2457E6] shadow-[3px_3px_0_#111827]">PROCURA AI</span><Link to="/" className="flex items-center gap-2 border-2 border-white bg-[#111827] px-3 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#111827]"><ArrowLeft className="size-4" />Back to website</Link></div>
      <div className="relative z-10 mt-12 lg:mt-0"><p className="mb-4 inline-flex items-center gap-2 border-2 border-[#111827] bg-white px-3 py-1.5 font-mono text-xs font-black text-[#2457E6] shadow-[3px_3px_0_#111827]"><LockKeyhole className="size-3.5" />SECURE PROCUREMENT</p><h1 className="mb-4 max-w-xl text-4xl font-black leading-[1.02] text-white sm:text-6xl">Control every<br />purchase decision.</h1><p className="max-w-md border-l-4 border-white pl-4 text-base font-medium leading-relaxed text-white sm:text-lg">Sign in to manage policy-checked procurement workflows, approvals, and audit-ready purchasing.</p></div>
    </section>
    <section className="flex w-full items-center justify-center bg-white p-6 sm:p-12 lg:w-1/2">
      <motion.div variants={container} initial="hidden" animate="visible" className="w-full max-w-md">
        <motion.div variants={item} className="mb-8 border-l-4 border-[#2457E6] pl-4">
          <p className="mb-2 font-mono text-xs font-black tracking-widest text-[#2457E6]">PROCURA AI / ACCESS</p>
          <h2 className="mb-2 text-4xl font-black tracking-tight text-[#111827]">Welcome back.</h2>
          <p className="text-[15px] font-medium leading-relaxed text-neutral-600">Choose an access method to enter your procurement workspace.</p>
        </motion.div>
        {authConfigurationError ? <p className="border-2 border-red-700 bg-red-50 p-4 text-sm font-bold text-red-800 shadow-[4px_4px_0_#991B1B]">{authConfigurationError}</p> : <div className="flex flex-col gap-4">
          <motion.button variants={item} type="button" onClick={signInWithCredentials} disabled={busy} className="w-full border-2 border-[#111827] bg-[#2457E6] px-5 py-4 text-left font-black text-white shadow-[5px_5px_0_#111827] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111827] disabled:cursor-not-allowed disabled:opacity-60"><span className="block text-base">{busy ? 'Signing in…' : 'Login with credentials'}</span><span className="mt-1 block text-xs font-medium text-white/80">Use the configured Procura AI workspace account</span></motion.button>
          <motion.button variants={item} type="button" onClick={signInAsGuest} disabled={busy} className="inline-flex w-full items-center justify-between border-2 border-[#111827] bg-white px-5 py-4 text-left font-black text-[#111827] shadow-[5px_5px_0_#2457E6] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#2457E6] disabled:cursor-not-allowed disabled:opacity-60"><span><span className="block text-base">Guest login</span><span className="mt-1 block text-xs font-medium text-neutral-500">Explore with limited, anonymous access</span></span><UserRoundCheck className="size-5 text-[#2457E6]" /></motion.button>
          {message && <motion.p variants={item} role="status" className="border-2 border-[#2457E6] bg-[#E6EEFE] p-3 text-sm font-bold text-[#111827]">{message}</motion.p>}
        </div>}
        <motion.p variants={item} className="mt-10 border-t-2 border-[#111827] pt-4 text-[13px] font-medium text-neutral-600">Need access? Ask your Procura AI administrator for an invitation.</motion.p>
      </motion.div>
    </section>
  </main>;
};
