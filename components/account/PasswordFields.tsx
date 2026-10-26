import {MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH} from '@/lib/account/auth';

export function PasswordFields({disabled}: {disabled: boolean}) {
  return <>
    <label className="field">New password
      <input name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} disabled={disabled} aria-describedby="password-help"/>
    </label>
    <p id="password-help" className="muted">Use at least 12 characters. A unique passphrase or a password manager works well.</p>
    <label className="field">Confirm new password
      <input name="confirmation" type="password" autoComplete="new-password" required maxLength={MAX_PASSWORD_LENGTH} disabled={disabled}/>
    </label>
  </>;
}
