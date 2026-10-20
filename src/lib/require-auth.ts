import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, sessionIsValid } from './auth';

export async function requireAuth(): Promise<void> {
  if (!sessionIsValid((await cookies()).get(SESSION_COOKIE)?.value)) redirect('/login');
}
