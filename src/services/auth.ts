import { supabase } from './supabaseClient';
import type { Provider } from '@supabase/supabase-js';
import type { Profile } from '../types';

// ─────────────────────────────────────────────────────────────
// Auth helpers wrapping Supabase Auth
// ─────────────────────────────────────────────────────────────

/**
 * Sign in an existing user with email + password.
 *
 * @throws Error if authentication fails.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Register a new user.
 *
 * A row in `public.profile_invest` with `role = 'user'` is created automatically
 * by the `handle_new_user` database trigger after the auth user is inserted.
 *
 * @throws Error if registration fails.
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Sign in with a third-party OAuth provider (e.g. 'google', 'github').
 * Redirects the browser to the provider consent screen.
 * After approval, Supabase redirects back to `redirectTo`.
 */
export async function signInWithProvider(provider: Provider) {
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
}

/**
 * Sign out the current user and clear the local session.
 *
 * @throws Error on failure.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Return the currently authenticated user together with their profile row.
 *
 * @returns Object `{ user, profile }` where `profile` may be `null` if not
 *          yet created (e.g., email unconfirmed).
 */
export async function getCurrentUser(): Promise<{
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'];
  profile: Profile | null;
}> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user) return { user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .from('profile_invest')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.warn('Profile not found yet:', profileError.message);
    return { user, profile: null };
  }

  return { user, profile: profile as Profile };
}
