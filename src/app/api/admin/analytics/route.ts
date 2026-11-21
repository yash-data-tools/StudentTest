import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readLocalDB } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = readLocalDB();
    const attempts = db.test_attempts.filter(a => a.status === 'published' || a.status === 'evaluated');
    const tests = db.tests;
    const students = db.users.filter(u => u.role === 'student');

    const totalAttempts = attempts.length;
    const scores = attempts.map(a => Number(a.final_score) || 0);
    const percentages = attempts.map(a => Number(a.percentage) || 0);

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const averagePercentage = percentages.length > 0
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
      : 0;

    // Median score calculation
    let medianPercentage = 0;
    if (percentages.length > 0) {
      const sorted = [...percentages].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianPercentage = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }

    // Score distribution brackets
    const distribution = {
      excellent: percentages.filter(p => p >= 85).length, // 85-100%
      good: percentages.filter(p => p >= 70 && p < 85).length, // 70-84%
      average: percentages.filter(p => p >= 50 && p < 70).length, // 50-69%
      needsImprovement: percentages.filter(p => p < 50).length, // <50%
    };

    // Question-level accuracy breakdown
    const responses = db.student_responses;
    const questionStats = db.questions.map(q => {
      const qResps = responses.filter(r => r.question_id === q.id && r.is_answered);
      const correctResps = qResps.filter(r => r.is_correct);
      const acc = qResps.length > 0 ? Math.round((correctResps.length / qResps.length) * 100) : null;

      return {
        id: q.id,
        test_id: q.test_id,
        question_number: q.question_number,
        question_text: q.question_text.length > 80 ? q.question_text.slice(0, 80) + '...' : q.question_text,
        total_answers: qResps.length,
        correct_answers: correctResps.length,
        accuracy_percentage: acc,
        difficulty_assessment: acc === null ? 'Untested' : acc > 75 ? 'Easy' : acc > 40 ? 'Moderate' : 'Challenging',
      };
    });

    // Total Integrity Events overview
    const totalIntegrityEvents = db.integrity_events.length;
    const tabSwitchEvents = db.integrity_events.filter(e => e.event_type.includes('tab') || e.event_type.includes('window')).length;
    const fullscreenExitEvents = db.integrity_events.filter(e => e.event_type === 'fullscreen_exit').length;
    const clipboardEvents = db.integrity_events.filter(e => ['copy', 'paste', 'cut'].includes(e.event_type)).length;

    return NextResponse.json({
      success: true,
      metrics: {
        totalAttempts,
        totalStudents: students.length,
        totalTests: tests.length,
        averagePercentage,
        medianPercentage,
        highestScore,
        lowestScore,
        distribution,
      },
      questionStats: questionStats.slice(0, 15),
      integrityOverview: {
        totalIntegrityEvents,
        tabSwitchEvents,
        fullscreenExitEvents,
        clipboardEvents,
      },
    });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
