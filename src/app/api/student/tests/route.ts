import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAvailableTestsForStudent } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tests = await getAvailableTestsForStudent(user.id);
    return NextResponse.json({ success: true, tests });
  } catch (error: any) {
    console.error('Fetch student tests error:', error);
    return NextResponse.json({ error: 'Failed to fetch available tests' }, { status: 500 });
  }
}
