import {describe, expect, it} from 'vitest';
import {AuthApiError} from '@supabase/supabase-js';
import {authErrorMessage, callbackError, passwordError} from '../auth';

describe('password validation', () => {
  it('preserves spaces and checks confirmation without silently changing the password', () => {
    expect(passwordError(' a long passphrase ', 'a long passphrase')).toContain('do not match');
    expect(passwordError(' a long passphrase ', ' a long passphrase ')).toBeNull();
    expect(passwordError('short', 'short')).toContain('12 characters');
    expect(passwordError('a'.repeat(129), 'a'.repeat(129))).toContain('128 characters');
  });
});

describe('auth failures', () => {
  it('distinguishes password failures from email delivery limits', () => {
    expect(authErrorMessage(new AuthApiError('provider text', 400, 'invalid_credentials'))).toContain('Email or password not recognised');
    expect(authErrorMessage(new AuthApiError('provider text', 429, 'over_email_send_rate_limit'))).toContain('Password sign-in is still available');
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toContain('Check your connection');
  });
  it('handles query and fragment callback errors without echoing untrusted descriptions', () => {
    expect(callbackError('?error_code=otp_expired', '')).toContain('invalid or has expired');
    expect(callbackError('', '#error_code=otp_expired')).toContain('invalid or has expired');
    expect(callbackError('?error=access_denied&error_description=UNTRUSTED', '')).not.toContain('UNTRUSTED');
    expect(callbackError('?code=test', '')).toBeNull();
  });
});
