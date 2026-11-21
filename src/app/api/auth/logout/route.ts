import { NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentUser, logActivity } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await logActivity(user.id, 'logout', { username: user.username });
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
