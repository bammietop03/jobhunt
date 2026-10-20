'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, passwordMatches, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function login(form: FormData) {
  const password = form.get('password');
  if (typeof password !== 'string' || !passwordMatches(password)) redirect('/login?error=1');
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect('/');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
