import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readLocalDB, writeLocalDB } from '@/lib/db';

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

    const db = readLocalDB();

    // Combine dedicated question_bank + questions from existing tests
    const allQuestions: any[] = [];

    // From question_bank
    db.question_bank.forEach(q => allQuestions.push(q));

    // From created tests
    db.questions.forEach(q => {
      const parentTest = db.tests.find(t => t.id === q.test_id);
      const qOptions = db.question_options.filter(o => o.question_id === q.id);
      allQuestions.push({
        id: q.id,
        subject: q.subject || parentTest?.subject || 'Science',
        chapter: q.chapter || parentTest?.chapter || 'General',
        topic: q.topic || parentTest?.topic || '',
        difficulty: q.difficulty || 'medium',
        question_type: q.question_type,
        question_text: q.question_text,
        options: qOptions,
        marks: q.marks,
        negative_marks: q.negative_marks,
        numerical_answer: q.numerical_answer,
        explanation: q.explanation,
        source: parentTest ? parentTest.title : 'Manual Addition',
      });
    });

    let filtered = allQuestions;

    if (subject !== 'all') {
      filtered = filtered.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    }

    if (difficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }

    if (search.trim()) {
      filtered = filtered.filter(
        q =>
          q.question_text.toLowerCase().includes(search) ||
          q.subject.toLowerCase().includes(search) ||
          (q.chapter && q.chapter.toLowerCase().includes(search))
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
    const { subject, chapter, topic, difficulty, question_type, question_text, options, numerical_answer, marks, negative_marks, explanation } = body;

    if (!question_text || !subject) {
      return NextResponse.json({ error: 'Question text and subject are required' }, { status: 400 });
    }

    const db = readLocalDB();
    const newEntry = {
      id: crypto.randomUUID(),
      subject: subject.trim(),
      chapter: chapter?.trim() || '',
      topic: topic?.trim() || '',
      difficulty: difficulty || 'medium',
      question_type: question_type || 'mcq_single',
      question_text: question_text.trim(),
      options: options || [],
      numerical_answer: numerical_answer !== undefined ? Number(numerical_answer) : null,
      marks: Number(marks) || 4,
      negative_marks: Number(negative_marks) || 1,
      explanation: explanation?.trim() || '',
      source: 'Question Bank Entry',
      created_at: new Date().toISOString(),
    };

    db.question_bank.push(newEntry);
    writeLocalDB(db);

    return NextResponse.json({ success: true, question: newEntry });
  } catch (error: any) {
    console.error('Add question error:', error);
    return NextResponse.json({ error: 'Failed to add question to bank' }, { status: 500 });
  }
}
