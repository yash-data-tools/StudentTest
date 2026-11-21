import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getActivityLogsList } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const eventType = searchParams.get('event_type') || 'all';
    const userId = searchParams.get('user_id') || undefined;
    const format = searchParams.get('format');

    const logs = await getActivityLogsList({
      searchTerm: search,
      eventType,
      userId,
      limit: 200,
    });

    if (format === 'csv') {
      const headers = ['Log ID', 'Timestamp', 'Student Name', 'Username', 'School', 'Event Type', 'Details'];
      const csvRows = [headers.join(',')];

      for (const log of logs) {
        const detailsStr = JSON.stringify(log.metadata || {}).replace(/"/g, '""');
        const row = [
          `"${log.id}"`,
          `"${log.timestamp}"`,
          `"${log.student_name.replace(/"/g, '""')}"`,
          `"${log.username.replace(/"/g, '""')}"`,
          `"${log.school.replace(/"/g, '""')}"`,
          `"${log.event_type}"`,
          `"${detailsStr}"`,
        ];
        csvRows.push(row.join(','));
      }

      const timestamp = new Date().toISOString().split('T')[0];
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="activity_logs_${timestamp}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Fetch activity logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
