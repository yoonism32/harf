import {isAuthError} from '@supabase/supabase-js';

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'Use at least 12 characters for your password.';
  if (password.length > MAX_PASSWORD_LENGTH) return 'Use no more than 128 characters for your password.';
  if (password !== confirmation) return 'The passwords do not match.';
  return null;
}

export function authErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials': return 'Email or password not recognised. Try again, or reset your password.';
      case 'email_not_confirmed': return 'Confirm your email before signing in. You can resend the confirmation below.';
      case 'over_email_send_rate_limit': return 'The email sending limit has been reached. Wait before requesting another email. Password sign-in is still available.';
      case 'over_request_rate_limit': return 'Too many attempts. Wait a minute before trying again.';
      case 'weak_password': return 'Choose a stronger password, using a longer unique phrase.';
      case 'same_password': return 'Choose a password different from your current password.';
      case 'reauthentication_needed':
      case 'reauthentication_not_valid': return 'Use the password recovery link below to verify your account before changing your password.';
      default: return error.message;
    }
  }
  return 'Could not connect to your account. Check your connection and try again.';
}

export function callbackError(search: string, hash: string): string | null {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const code = query.get('error_code') ?? fragment.get('error_code');
  if (code === 'otp_expired') return 'This email link is invalid or has expired. Request a new confirmation or password recovery email.';
  if (code || query.has('error') || fragment.has('error')) return 'This email link could not be verified. Try signing in, or request a new password recovery email.';
  return null;
}

export function accountDestination(redirectType: string | null | undefined) {
  return redirectType === 'recovery' ? '/account/password' : '/profile';
}
