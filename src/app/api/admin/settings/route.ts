import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { readLocalDB, writeLocalDB } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = readLocalDB();
    const regMode = db.system_settings.find(s => s.key === 'registration_mode')?.value || 'open';

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

    const db = readLocalDB();
    let setting = db.system_settings.find(s => s.key === 'registration_mode');
    if (!setting) {
      setting = { key: 'registration_mode', value: registration_mode };
      db.system_settings.push(setting);
    } else {
      setting.value = registration_mode;
    }

    writeLocalDB(db);

    await logActivity(user.id, 'settings_updated', { registration_mode });

    return NextResponse.json({ success: true, registration_mode });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
