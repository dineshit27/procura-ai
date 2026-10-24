import React, { useRef, useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff, Landmark, LockKeyhole, ShoppingCart, UserRound } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authConfigurationError, supabase } from '../auth/supabase';
import { useAuth, type WorkspaceRole } from '../auth/AuthContext';
import { demoAccounts } from '../auth/demoAccounts';

const roles: Array<{ value: WorkspaceRole; label: string; description: string; icon: typeof Building2 }> = [
  { value: 'admin', label: 'Admin', description: 'Manage workspace access and settings.', icon: Building2 },
  { value: 'finance_manager', label: 'Finance', description: 'Monitor budgets and financial controls.', icon: Landmark },
  { value: 'procurement_manager', label: 'Procurement', description: 'Review and approve purchasing workflows.', icon: ShoppingCart },
  { value: 'requester', label: 'Requester', description: 'Create and follow purchase requests.', icon: UserRound },
];
const displayRole = (role: WorkspaceRole) => roles.find((item) => item.value === role)?.label ?? role;

export const LoginPage: React.FC = () => {
  const { user, role, roleLoading, refreshRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('requester');
  const [selectedDemo, setSelectedDemo] = useState<WorkspaceRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordInput = useRef<HTMLInputElement>(null);
  if (user && role && !roleLoading) return <Navigate to="/app" replace />;

  async function signIn() {
    if (!supabase || busy) return;
    setMessage(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setMessage('Unable to sign in with those credentials. Check them and try again.'); return; }
      const actualRole = await refreshRole();
      if (!actualRole) { await signOut(); setMessage('Your account has no authorized workspace role. Contact an administrator.'); return; }
      if (actualRole !== selectedRole) { await signOut(); setMessage(`Your account does not have access to the selected workspace. Choose ${displayRole(actualRole)} or contact an administrator.`); return; }
      navigate('/app');
    } catch { setMessage('Unable to sign in right now. Please try again.'); }
    finally { setBusy(false); }
  }

  function selectDemo(demoRole: WorkspaceRole) {
    const account = demoAccounts.find((item) => item.role === demoRole);
    if (!account?.email || busy) return;
    setSelectedDemo(demoRole); setSelectedRole(demoRole); setEmail(account.email); setPassword('');
    setMessage(`${account.label} selected. Enter the temporary demo password provided separately, then sign in.`);
    window.requestAnimationFrame(() => passwordInput.current?.focus());
  }

  return <main className="flex min-h-screen bg-[#fbf9f5] text-[#111827]">
    <section className="relative hidden min-h-screen w-5/12 overflow-hidden bg-[#2457e6] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <img src="https://assets.watermelon.sh/auth-9.avif" alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#071755]/70 via-[#0b2a9b]/20 to-[#2457e6]/10" />
      <div className="relative z-10 flex items-center justify-between"><span className="text-lg font-semibold tracking-tight">PROCURA AI</span><Link to="/" className="flex items-center gap-2 text-sm font-medium text-white/90 transition-colors hover:text-white"><ArrowLeft className="size-4" />Back to website</Link></div>
      <div className="relative z-10"><p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-white/80"><LockKeyhole className="size-3.5" />SECURE PROCUREMENT</p><h1 className="mb-4 max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">Control every<br />purchase decision.</h1><p className="max-w-md text-base font-normal leading-relaxed text-white/90 sm:text-lg">Sign in to manage policy-checked procurement workflows, approvals, and audit-ready purchasing.</p></div>
    </section>
    <section className="flex flex-1 items-center justify-center p-5 sm:p-10"><div className="w-full max-w-2xl">
      <div className="mb-7 border-l-4 border-[#2457e6] pl-4"><p className="font-mono text-xs font-black tracking-widest text-[#2457e6]">PROCURA AI / ACCESS</p><h2 className="mt-2 text-4xl font-black">Sign in to your workspace.</h2><p className="mt-2 text-sm font-medium text-neutral-600">Select the workspace assigned to you, then verify with your account.</p></div>
      {authConfigurationError ? <p className="border-2 border-red-700 bg-red-50 p-4 font-bold text-red-800">{authConfigurationError}</p> : <form onSubmit={(event) => { event.preventDefault(); void signIn(); }} className="space-y-5">
        <fieldset><legend className="mb-2 text-sm font-black">Choose workspace</legend><div className="grid gap-3 sm:grid-cols-2">{roles.map(({ value, label, description, icon: Icon }) => <button key={value} type="button" onClick={() => { setSelectedRole(value); setSelectedDemo(null); }} aria-pressed={selectedRole === value} className={`border-2 border-[#111827] p-4 text-left shadow-[4px_4px_0_#111827] transition ${selectedRole === value ? 'bg-[#e6eefe] ring-2 ring-[#2457e6]' : 'bg-white hover:bg-[#fbf9f5]'}`}><Icon className="mb-2 size-5 text-[#2457e6]"/><span className="block font-black">{label}</span><span className="mt-1 block text-xs font-medium leading-relaxed text-neutral-600">{description}</span></button>)}</div></fieldset>
        <label className="block text-sm font-bold">Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border-2 border-neutral-900 px-3 py-3 font-normal" /></label>
        <label className="block text-sm font-bold">Password<span className="relative mt-1 block"><input ref={passwordInput} type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={selectedDemo ? 'Enter the demo account password' : undefined} className="w-full border-2 border-neutral-900 px-3 py-3 pr-12 font-normal"/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-neutral-600">{showPassword ? <EyeOff className="size-5"/> : <Eye className="size-5"/>}</button></span></label>
        <button disabled={busy} className="w-full border-2 border-[#111827] bg-[#2457e6] px-5 py-4 text-left font-black text-white shadow-[5px_5px_0_#111827] disabled:opacity-60">{busy ? 'Verifying workspace...' : `Sign in to ${displayRole(selectedRole)}`}</button>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold"><Link className="text-[#2457e6] underline" to="/create-account">Create account</Link><Link className="text-[#2457e6] underline" to="/forgot-password">Forgot password?</Link></div>
        {message && <p role="status" aria-live="polite" className="border-2 border-[#2457e6] bg-[#e6eefe] p-3 text-sm font-bold">{message}</p>}
      </form>}
      <section aria-labelledby="quick-demo-access" className="mt-8 border-t-2 border-[#111827] pt-6"><h3 id="quick-demo-access" className="font-mono text-sm font-black uppercase tracking-wider text-[#2457e6]">Quick Demo Access</h3><p className="mt-1 text-sm font-medium text-neutral-600">Select a configured demo account to fill its email. Passwords are provided separately and are never stored here.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{demoAccounts.map((account) => { const configured = Boolean(account.email); const selected = selectedDemo === account.role; return <button key={account.role} type="button" disabled={!configured || busy} onClick={() => selectDemo(account.role)} aria-pressed={selected} className={`border-2 border-[#111827] p-3 text-left shadow-[3px_3px_0_#111827] transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? 'bg-[#e6eefe] ring-2 ring-[#2457e6]' : 'bg-white hover:bg-[#fbf9f5]'}`}><span className="block text-sm font-black">{account.label}</span><span className="mt-1 block text-xs font-medium leading-snug text-neutral-600">{configured ? account.description : `Unavailable: set ${account.emailVariable} and rebuild.`}</span></button>; })}</div>{!demoAccounts.some((account) => account.email) && <p className="mt-3 text-xs font-medium text-neutral-600">Demo access is not configured. Set documented demo email variables for disposable users and rebuild. Passwords must be supplied outside the application.</p>}</section>
    </div></section>
  </main>;
};
