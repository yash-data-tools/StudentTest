import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const res = await query(`SELECT value FROM system_settings WHERE key = 'registration_mode'`);
    let regMode = 'open';
    if (res.rowCount > 0) {
      const val = res.rows[0].value;
      regMode = typeof val === 'string' ? val.replace(/"/g, '') : val;
    }

    return NextResponse.json({
      success: true,
      settings: {
        registration_mode: regMode,
      },
    });
  } catch (error: any) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { registration_mode } = body;

    if (!['open', 'approval_required'].includes(registration_mode)) {
      return NextResponse.json({ error: 'Invalid registration mode setting.' }, { status: 400 });
    }

    await query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ('registration_mode', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(registration_mode)]
    );

    await logActivity(user.id, 'settings_updated', { registration_mode });

    return NextResponse.json({ success: true, registration_mode });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
