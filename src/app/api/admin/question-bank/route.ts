import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    const subject = searchParams.get('subject') || 'all';
    const difficulty = searchParams.get('difficulty') || 'all';

    // 1. Fetch from question_bank
    let qbRes = await query(`SELECT * FROM question_bank ORDER BY created_at DESC`);
    let qbQuestions = qbRes.rows;

    // 2. Fetch from existing test questions
    let testQRes = await query(`
      SELECT q.id, q.subject, q.chapter, q.topic, q.difficulty, q.question_type,
             q.question_text, q.marks, q.negative_marks, q.numerical_answer, q.explanation,
             COALESCE(t.title, 'Manual Addition') AS source,
             COALESCE(t.subject, 'Science') AS test_subject,
             COALESCE(t.chapter, 'General') AS test_chapter
      FROM questions q
      LEFT JOIN tests t ON t.id = q.test_id
      ORDER BY q.created_at DESC
      LIMIT 100
    `);

    // Fetch options for test questions
    const testQIds = testQRes.rows.map((q: any) => q.id);
    let optionsMap: Record<string, any[]> = {};
    if (testQIds.length > 0) {
      const optsRes = await query(
        `SELECT question_id, option_letter, option_text, is_correct
         FROM question_options
         WHERE question_id = ANY($1::uuid[])
         ORDER BY order_index ASC`,
        [testQIds]
      );
      for (const opt of optsRes.rows) {
        if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
        optionsMap[opt.question_id].push(opt);
      }
    }

    const formattedTestQuestions = testQRes.rows.map((q: any) => ({
      id: q.id,
      subject: q.subject || q.test_subject || 'Science',
      chapter: q.chapter || q.test_chapter || 'General',
      topic: q.topic || '',
      difficulty: q.difficulty || 'medium',
      question_type: q.question_type,
      question_text: q.question_text,
      options: optionsMap[q.id] || [],
      marks: Number(q.marks) || 1,
      negative_marks: Number(q.negative_marks) || 0,
      numerical_answer: q.numerical_answer,
      explanation: q.explanation,
      source: q.source,
    }));

    const allQuestions = [...qbQuestions, ...formattedTestQuestions];

    let filtered = allQuestions;

    if (subject !== 'all') {
      filtered = filtered.filter(
        (q) => (q.subject || '').toLowerCase() === subject.toLowerCase()
      );
    }

    if (difficulty !== 'all') {
      filtered = filtered.filter((q) => q.difficulty === difficulty);
    }

    if (search.trim()) {
      filtered = filtered.filter(
        (q) =>
          (q.question_text || '').toLowerCase().includes(search) ||
          (q.subject || '').toLowerCase().includes(search) ||
          ((q.chapter || '').toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ success: true, questions: filtered });
  } catch (error: any) {
    console.error('Question bank API error:', error);
    return NextResponse.json({ error: 'Failed to fetch question bank' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const {
      subject,
      chapter,
      topic,
      difficulty,
      question_type,
      question_text,
      options,
      numerical_answer,
      marks,
      negative_marks,
      explanation,
    } = body;

    if (!question_text || !subject) {
      return NextResponse.json(
        { error: 'Question text and subject are required' },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO question_bank (
        subject, chapter, topic, difficulty, question_type, question_text,
        options, correct_answer, explanation, marks, negative_marks, source, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Question Bank Entry', NOW())
      RETURNING *`,
      [
        subject.trim(),
        chapter?.trim() || '',
        topic?.trim() || '',
        difficulty || 'medium',
        question_type || 'mcq_single',
        question_text.trim(),
        options ? JSON.stringify(options) : JSON.stringify([]),
        JSON.stringify(numerical_answer !== undefined ? numerical_answer : options || {}),
        explanation?.trim() || '',
        Number(marks) || 4,
        Number(negative_marks) || 1,
      ]
    );

    return NextResponse.json({ success: true, question: res.rows[0] });
  } catch (error: any) {
    console.error('Add question error:', error);
    return NextResponse.json({ error: 'Failed to add question to bank' }, { status: 500 });
  }
}
