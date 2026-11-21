import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { getStudentsList } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';

    const students = await getStudentsList();

    // STRICT SANITIZATION: Never include passwords or hashes!
    const sanitizedStudents = students.map(s => ({
      student_id: s.id,
      name: s.real_name,
      school: s.school || 'N/A',
      username: s.username,
      registration_date: s.created_at,
      account_status: s.status,
      last_login: s.last_login_at || 'Never',
      total_test_attempts: s.total_attempts,
      average_score: s.average_score !== null ? `${s.average_score}%` : 'N/A',
    }));

    await logActivity(user.id, 'student_data_exported', {
      format,
      record_count: sanitizedStudents.length,
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const headers = [
        'Student ID',
        'Real Name',
        'School Name',
        'Username',
        'Registration Date',
        'Account Status',
        'Last Login',
        'Test Attempts',
        'Average Score',
      ];

      const csvRows = [headers.join(',')];

      for (const s of sanitizedStudents) {
        const row = [
          `"${s.student_id}"`,
          `"${s.name.replace(/"/g, '""')}"`,
          `"${s.school.replace(/"/g, '""')}"`,
          `"${s.username.replace(/"/g, '""')}"`,
          `"${s.registration_date}"`,
          `"${s.account_status}"`,
          `"${s.last_login}"`,
          s.total_test_attempts,
          `"${s.average_score}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="students_backup_${timestamp}.csv"`,
        },
      });
    }

    // Default: JSON export
    const jsonContent = JSON.stringify(sanitizedStudents, null, 2);
    return new NextResponse(jsonContent, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="students_backup_${timestamp}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export student records' }, { status: 500 });
  }
}
