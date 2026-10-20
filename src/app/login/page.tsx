import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { LockKeyhole } from 'lucide-react';
import { login } from './actions';
import { passwordIsConfigured, SESSION_COOKIE, sessionIsValid } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (sessionIsValid((await cookies()).get(SESSION_COOKIE)?.value)) redirect('/');
  const { error } = await searchParams;
  const configured = passwordIsConfigured();
  return <div className="content login-page" style={{ maxWidth: 520, paddingTop: '12vh' }}>
    <div className="card" style={{ padding: 30 }}>
      <div className="stat-icon"><LockKeyhole size={19}/></div>
      <h1 className="heading">Unlock JobHunt</h1>
      <p className="subtle" style={{ margin: '10px 0 24px', fontSize: 14 }}>Enter your password to open your job search workspace.</p>
      {!configured ? <p role="alert" style={{ color: '#a33b34', fontSize: 13 }}>Set APP_PASSWORD in the server environment, then restart the app.</p> : <form action={login}>
        <div className="form-group"><label className="form-label" htmlFor="password">Password</label><input className="field" id="password" name="password" type="password" autoComplete="current-password" required autoFocus/></div>
        {error && <p role="alert" style={{ color: '#a33b34', fontSize: 13, marginTop: 12 }}>Incorrect password. Try again.</p>}
        <button className="btn btn-primary" style={{ marginTop: 18, width: '100%' }}>Log in</button>
      </form>}
    </div>
  </div>;
}
