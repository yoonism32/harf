'use client';

import {useEffect, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {accountClient, accountConfigured} from '@/lib/account/client';
import {authErrorMessage, passwordError} from '@/lib/account/auth';
import {PasswordFields} from './PasswordFields';

type Mode = 'login' | 'signup' | 'recover';
const copy = {
  login: {title: 'Sign in to Harf', description: 'Use your email and password to continue your progress on this device.', button: 'Sign in'},
  signup: {title: 'Create your Harf account', description: 'Save your progress across devices. Confirm your email once, then sign in with your password.', button: 'Create account'},
  recover: {title: 'Set or reset your password', description: 'Already used an email sign-in link? Set a password for that same account here. Your progress stays with your account.', button: 'Send password recovery email'},
};

export function AuthForm({mode}: {mode: Mode}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [checking, setChecking] = useState(accountConfigured);
  const text = copy[mode];

  useEffect(() => {
    if (!accountConfigured) return;
    // Do not expose an interactive server-rendered form before its handler exists.
    if (mode === 'recover') { setChecking(false); return; }
    let active = true;
    void accountClient().auth.getSession().then(({data, error}) => {
      if (!active) return;
      if (error) setError(authErrorMessage(error));
      else if (data.session) location.replace('/profile');
    }).catch(error => { if (active) setError(authErrorMessage(error)); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || message) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get('email') ?? '').trim();
    const password = String(values.get('password') ?? '');
    setError(''); setConfirmationEmail('');
    if (mode === 'signup') {
      const invalid = passwordError(password, String(values.get('confirmation') ?? ''));
      if (invalid) { setError(invalid); return; }
    }
    setBusy(true);
    try {
      const auth = accountClient().auth;
      const callback = `${location.origin}/auth/callback`;
      if (mode === 'login') {
        const {error} = await auth.signInWithPassword({email, password});
        if (error) {
          if (error.code === 'email_not_confirmed') setConfirmationEmail(email);
          throw error;
        }
        form.reset();
        // A full reload releases the guest cache before opening the account.
        location.replace('/profile');
      } else if (mode === 'signup') {
        const {data, error} = await auth.signUp({email, password, options: {emailRedirectTo: callback}});
        if (error) throw error;
        form.reset();
        if (data.session) location.replace('/profile');
        else setMessage('Check your email to confirm your account. Open the link in this browser. If you already have an account, sign in or reset your password instead.');
      } else {
        const {error} = await auth.resetPasswordForEmail(email, {redirectTo: callback});
        if (error) throw error;
        form.reset();
        setMessage('If an account exists for that email, a password recovery link is on its way. Open the newest link in this browser to choose your password.');
      }
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function resendConfirmation() {
    if (busy || !confirmationEmail) return;
    setBusy(true); setError('');
    try {
      const {error} = await accountClient().auth.resend({type: 'signup', email: confirmationEmail, options: {emailRedirectTo: `${location.origin}/auth/callback`}});
      if (error) throw error;
      setConfirmationEmail('');
      setMessage('Check your email for a confirmation link. Open the newest link in this browser, then sign in.');
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="stack">
    <header className="page-header"><h1>{text.title}</h1><p>{text.description}</p></header>
    {mode === 'signup' && <p>A new account starts fresh. Guest progress stays separate in this browser.</p>}
    {!accountConfigured ? <p role="alert">Account connection is not configured on this installation.</p> : checking ? <p role="status">Checking your account…</p> : <form className="stack" method="post" onSubmit={submit}>
      <label className="field">Email address<input name="email" type="email" autoComplete="username" required maxLength={254} disabled={busy || !!message} onChange={() => setConfirmationEmail('')}/></label>
      {mode === 'login' && <label className="field">Password<input name="password" type="password" autoComplete="current-password" required disabled={busy || !!message}/></label>}
      {mode === 'signup' && <PasswordFields disabled={busy || !!message}/>}
      <button className="button button-primary" disabled={busy || !!message}>{busy ? 'Please wait…' : text.button}</button>
    </form>}
    {error && <p role="alert" className="error-text">{error}</p>}
    {!!confirmationEmail && <button className="button button-secondary" disabled={busy} onClick={() => void resendConfirmation()}>Resend confirmation email</button>}
    {message && <p role="status">{message}</p>}
    {mode === 'login' ? <>
      <p>You’ll stay signed in on this browser until you sign out or your session ends.</p>
      <Link href="/forgot-password">Forgot your password or previously used email links?</Link>
      <Link href="/signup">Create an account</Link>
    </> : <Link href="/login">Back to sign in</Link>}
    <Link href="/today">Continue without an account</Link>
  </div>;
}
