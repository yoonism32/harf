'use client';

import {useEffect, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {accountClient, ensureIdentity, type Identity} from '@/lib/account/client';
import {authErrorMessage, passwordError} from '@/lib/account/auth';
import {PasswordFields} from '@/components/account/PasswordFields';

export default function Password() {
  const [owner, setOwner] = useState<Identity>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void ensureIdentity().then(identity => { if (active) setOwner(identity); })
      .catch(error => { if (active) setError(authErrorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner || busy || saved) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get('password') ?? '');
    const invalid = passwordError(password, String(values.get('confirmation') ?? ''));
    setError(invalid ?? '');
    if (invalid) return;
    setBusy(true);
    try {
      const {error} = await accountClient().auth.updateUser({password});
      if (error) throw error;
      form.reset(); setSaved(true);
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="stack">
    <header className="page-header"><h1>Set or change password</h1><p>Use this password to sign in on your other devices. Your account and progress stay the same.</p></header>
    {loading ? <p role="status">Checking your account…</p> : owner ? <>
      <p>Account: {owner.email}</p>
      {saved ? <><p role="status">Password saved. You can now sign in with your email and password on any device.</p><Link className="button button-primary" href="/profile">Back to Profile</Link></> : <form className="stack" method="post" onSubmit={submit}>
        <input type="hidden" name="username" autoComplete="username" value={owner.email}/>
        <PasswordFields disabled={busy}/>
        <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>}
    </> : <p>Sign in or open a password recovery email before choosing a password.</p>}
    {error && <p role="alert" className="error-text">{error}</p>}
    <Link href="/forgot-password">Request a password recovery email</Link>
    <Link href="/login">Back to sign in</Link>
  </div>;
}
