import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch attempts
    const attemptsRes = await query(
      `SELECT final_score, percentage FROM test_attempts WHERE status IN ('published', 'evaluated')`
    );
    const attempts = attemptsRes.rows;

    // Fetch counts
    const countsRes = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE role = 'student') AS total_students,
        (SELECT COUNT(*)::int FROM tests) AS total_tests,
        (SELECT COUNT(*)::int FROM integrity_events) AS total_integrity_events,
        (SELECT COUNT(*)::int FROM integrity_events WHERE event_type LIKE '%tab%' OR event_type LIKE '%window%') AS tab_switch_events,
        (SELECT COUNT(*)::int FROM integrity_events WHERE event_type = 'fullscreen_exit') AS fullscreen_exit_events,
        (SELECT COUNT(*)::int FROM integrity_events WHERE event_type IN ('copy', 'paste', 'cut')) AS clipboard_events
    `);
    const counts = countsRes.rows[0] || {};

    const totalAttempts = attempts.length;
    const scores = attempts.map((a: any) => Number(a.final_score) || 0);
    const percentages = attempts.map((a: any) => Number(a.percentage) || 0);

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const averagePercentage =
      percentages.length > 0
        ? Math.round(percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length)
        : 0;

    let medianPercentage = 0;
    if (percentages.length > 0) {
      const sorted = [...percentages].sort((a: number, b: number) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianPercentage =
        sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }

    const distribution = {
      excellent: percentages.filter((p: number) => p >= 85).length,
      good: percentages.filter((p: number) => p >= 70 && p < 85).length,
      average: percentages.filter((p: number) => p >= 50 && p < 70).length,
      needsImprovement: percentages.filter((p: number) => p < 50).length,
    };

    // Question stats
    const questionStatsRes = await query(`
      SELECT q.id, q.test_id, q.question_number, q.question_text,
             COUNT(r.id) FILTER (WHERE r.is_answered = true)::int AS total_answers,
             COUNT(r.id) FILTER (WHERE r.is_correct = true)::int AS correct_answers
      FROM questions q
      LEFT JOIN student_responses r ON r.question_id = q.id
      GROUP BY q.id
      ORDER BY q.created_at DESC
      LIMIT 15
    `);

    const questionStats = questionStatsRes.rows.map((q: any) => {
      const totalAnswers = Number(q.total_answers) || 0;
      const correctAnswers = Number(q.correct_answers) || 0;
      const acc = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : null;

      return {
        id: q.id,
        test_id: q.test_id,
        question_number: q.question_number,
        question_text:
          q.question_text.length > 80 ? q.question_text.slice(0, 80) + '...' : q.question_text,
        total_answers: totalAnswers,
        correct_answers: correctAnswers,
        accuracy_percentage: acc,
        difficulty_assessment:
          acc === null ? 'Untested' : acc > 75 ? 'Easy' : acc > 40 ? 'Moderate' : 'Challenging',
      };
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalAttempts,
        totalStudents: Number(counts.total_students) || 0,
        totalTests: Number(counts.total_tests) || 0,
        averagePercentage,
        medianPercentage,
        highestScore,
        lowestScore,
        distribution,
      },
      questionStats,
      integrityOverview: {
        totalIntegrityEvents: Number(counts.total_integrity_events) || 0,
        tabSwitchEvents: Number(counts.tab_switch_events) || 0,
        fullscreenExitEvents: Number(counts.fullscreen_exit_events) || 0,
        clipboardEvents: Number(counts.clipboard_events) || 0,
      },
    });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
