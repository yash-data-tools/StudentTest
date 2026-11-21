'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Settings,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  FileText,
  Save,
  Send,
} from 'lucide-react';
import { QuestionType } from '@/lib/pdf-parser';

interface OptionItem {
  option_letter: string;
  option_text: string;
  is_correct: boolean;
}

interface QuestionItem {
  id: string;
  question_number: number;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  negative_marks: number;
  options: OptionItem[];
  numerical_answer: string;
  numerical_tolerance: string;
  numerical_unit: string;
  assertion_text: string;
  reason_text: string;
  matching_pairs: { left: string; right: string }[];
  explanation: string;
  rubric: string[];
  allow_handwritten: boolean;
  allow_typed: boolean;
  image_url?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function CreateTestPage() {
  const router = useRouter();

  // Test Settings
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [classGrade, setClassGrade] = useState('Class 11 & 12 / JEE');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState(
    '1. All questions are compulsory.\n2. For numerical questions, enter values with appropriate precision.\n3. For derivations and long answers, you may type your response and/or attach clear handwritten notebook photos.'
  );
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(50);
  const [examMode, setExamMode] = useState<'teacher_reviewed' | 'instant_quick_test'>('teacher_reviewed');
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(1);

  // Questions List
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: crypto.randomUUID(),
      question_number: 1,
      question_text: 'Derive the expression for the centripetal acceleration of a body moving in a circular path of radius r with uniform speed v.',
      question_type: 'derivation',
      marks: 5,
      negative_marks: 0,
      options: [],
      numerical_answer: '',
      numerical_tolerance: '0.01',
      numerical_unit: 'm/s²',
      assertion_text: '',
      reason_text: '',
      matching_pairs: [],
      explanation: 'Using circular geometry and vector velocity difference: a_c = v² / r directed towards the center.',
      rubric: [
        'Diagram showing velocity vectors and displacement arc (1 Mark)',
        'Vector triangle similarity ratio expression (1.5 Marks)',
        'Limit calculation as Δt -> 0 (1.5 Marks)',
        'Final formula a_c = v²/r with direction statement (1 Mark)',
      ],
      allow_handwritten: true,
      allow_typed: true,
      image_url: '',
      difficulty: 'medium',
    },
    {
      id: crypto.randomUUID(),
      question_number: 2,
      question_text: 'A block of mass 2 kg is pulled across a frictionless surface by a horizontal force of 10 N. Calculate the acceleration of the block.',
      question_type: 'numerical',
      marks: 3,
      negative_marks: 0,
      options: [],
      numerical_answer: '5',
      numerical_tolerance: '0.01',
      numerical_unit: 'm/s²',
      assertion_text: '',
      reason_text: '',
      matching_pairs: [],
      explanation: 'F = ma => a = F/m = 10 N / 2 kg = 5 m/s².',
      rubric: ['Formula F = ma (1 Mark)', 'Substitution and unit (2 Marks)'],
      allow_handwritten: true,
      allow_typed: true,
      image_url: '',
      difficulty: 'easy',
    },
    {
      id: crypto.randomUUID(),
      question_number: 3,
      question_text: 'Which of the following physical quantities has the SI unit Newton-second (N·s)?',
      question_type: 'mcq_single',
      marks: 2,
      negative_marks: 0.5,
      options: [
        { option_letter: 'A', option_text: 'Work done', is_correct: false },
        { option_letter: 'B', option_text: 'Linear momentum / Impulse', is_correct: true },
        { option_letter: 'C', option_text: 'Angular velocity', is_correct: false },
        { option_letter: 'D', option_text: 'Power', is_correct: false },
      ],
      numerical_answer: '',
      numerical_tolerance: '0',
      numerical_unit: '',
      assertion_text: '',
      reason_text: '',
      matching_pairs: [],
      explanation: 'Impulse = Force × Time, giving units of N·s, which is dimensionally equivalent to linear momentum (kg·m/s).',
      rubric: [],
      allow_handwritten: false,
      allow_typed: false,
      image_url: '',
      difficulty: 'easy',
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate live question sum
  const calculatedSum = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const marksMismatch = calculatedSum !== Number(totalMarks);

  // Add Question
  const handleAddQuestion = (type: QuestionType = 'short_answer') => {
    let defaultMarks = 2;
    if (type === 'derivation' || type === 'long_answer') defaultMarks = 5;
    else if (type === 'diagram') defaultMarks = 4;
    else if (type === 'numerical') defaultMarks = 3;
    else if (type === 'mcq_single' || type === 'mcq_multiple' || type === 'true_false') defaultMarks = 1;

    let defaultOptions: OptionItem[] = [];
    if (type === 'mcq_single' || type === 'mcq_multiple') {
      defaultOptions = [
        { option_letter: 'A', option_text: '', is_correct: true },
        { option_letter: 'B', option_text: '', is_correct: false },
        { option_letter: 'C', option_text: '', is_correct: false },
        { option_letter: 'D', option_text: '', is_correct: false },
      ];
    } else if (type === 'true_false') {
      defaultOptions = [
        { option_letter: 'A', option_text: 'True', is_correct: true },
        { option_letter: 'B', option_text: 'False', is_correct: false },
      ];
    }

    const newQ: QuestionItem = {
      id: crypto.randomUUID(),
      question_number: questions.length + 1,
      question_text: '',
      question_type: type,
      marks: defaultMarks,
      negative_marks: type === 'mcq_single' && negativeMarkingEnabled ? defaultMarks * 0.25 : 0,
      options: defaultOptions,
      numerical_answer: '',
      numerical_tolerance: '0.01',
      numerical_unit: '',
      assertion_text: '',
      reason_text: '',
      matching_pairs:
        type === 'match_following'
          ? [
              { left: 'Column A Item 1', right: 'Column B Match 1' },
              { left: 'Column A Item 2', right: 'Column B Match 2' },
            ]
          : [],
      explanation: '',
      rubric: type === 'derivation' || type === 'long_answer' ? ['Step 1 Concept (1 Mark)', 'Calculation (2 Marks)'] : [],
      allow_handwritten: ['short_answer', 'long_answer', 'derivation', 'diagram'].includes(type),
      allow_typed: true,
      image_url: '',
      difficulty: 'medium',
    };

    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, question_number: i + 1 }));
    setQuestions(updated);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx];
    const clone: QuestionItem = {
      ...target,
      id: crypto.randomUUID(),
      question_number: questions.length + 1,
      options: target.options.map((o) => ({ ...o })),
    };
    const updated = [...questions.slice(0, idx + 1), clone, ...questions.slice(idx + 1)].map((q, i) => ({
      ...q,
      question_number: i + 1,
    }));
    setQuestions(updated);
  };

  const updateQuestionField = (idx: number, field: keyof QuestionItem, val: any) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Change question type handler
  const handleTypeChange = (idx: number, newType: QuestionType) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[idx];
      q.question_type = newType;

      if (newType === 'mcq_single' || newType === 'mcq_multiple') {
        if (!q.options || q.options.length < 2) {
          q.options = [
            { option_letter: 'A', option_text: '', is_correct: true },
            { option_letter: 'B', option_text: '', is_correct: false },
            { option_letter: 'C', option_text: '', is_correct: false },
            { option_letter: 'D', option_text: '', is_correct: false },
          ];
        }
      } else if (newType === 'true_false') {
        q.options = [
          { option_letter: 'A', option_text: 'True', is_correct: true },
          { option_letter: 'B', option_text: 'False', is_correct: false },
        ];
      } else {
        q.options = [];
      }

      q.allow_handwritten = ['short_answer', 'long_answer', 'derivation', 'diagram'].includes(newType);
      return copy;
    });
  };

  // Publish / Save Draft
  const handleSaveTest = async (status: 'published' | 'draft') => {
    setError(null);
    if (!title.trim()) {
      setError('Please provide an Examination Title.');
      return;
    }
    if (questions.length === 0) {
      setError('Please add at least one question to the exam.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          chapter: chapter.trim(),
          topic: topic.trim(),
          class_grade: classGrade.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          total_marks: totalMarks,
          duration_minutes: durationMinutes,
          exam_mode: examMode,
          status,
          start_date: startDate || null,
          end_date: endDate || null,
          max_attempts: maxAttempts,
          negative_marking_enabled: negativeMarkingEnabled,
          questions: questions.map((q, i) => ({
            question_number: i + 1,
            question_text: q.question_text.trim(),
            question_type: q.question_type,
            marks: Number(q.marks) || 1,
            negative_marks: Number(q.negative_marks) || 0,
            options: q.options,
            numerical_answer: q.numerical_answer ? parseFloat(q.numerical_answer) : null,
            numerical_tolerance: q.numerical_tolerance ? parseFloat(q.numerical_tolerance) : 0.01,
            numerical_unit: q.numerical_unit || null,
            assertion_text: q.assertion_text || null,
            reason_text: q.reason_text || null,
            matching_pairs: q.matching_pairs || null,
            explanation: q.explanation || null,
            rubric: q.rubric || null,
            allow_handwritten: q.allow_handwritten,
            allow_typed: q.allow_typed,
            image_url: q.image_url || null,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save test');

      router.push('/admin/tests');
    } catch (err: any) {
      setError(err.message || 'Error saving test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <Link
            href="/admin/tests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Test Management
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            Create Exam & Question Paper
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build customized question papers supporting MCQs, numericals, short answers, derivations, and multi-page handwritten solutions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSaveTest('draft')}
            disabled={saving}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSaveTest('published')}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {saving ? 'Publishing...' : 'Publish Test Now'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Marks Summary Pill */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        marksMismatch ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-2">
          {marksMismatch ? (
            <AlertCircle className="w-5 h-5 text-amber-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          )}
          <div>
            <span className="font-extrabold text-sm">
              Question Marks Sum: {calculatedSum} Marks / Configured Total: {totalMarks} Marks
            </span>
            <p className="text-[11px] opacity-80">
              {marksMismatch
                ? `Difference of ${Math.abs(calculatedSum - Number(totalMarks))} marks. You can adjust the question marks or test total.`
                : 'Perfect match! Total marks aligned.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTotalMarks(calculatedSum)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 whitespace-nowrap shadow-sm"
        >
          Sync Total to {calculatedSum}M
        </button>
      </div>

      {/* Section 1: Examination Metadata */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-600" />
          1. Examination Parameters & Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Test Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Physics Unit 3: Work, Energy & Rotational Motion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
              <option value="Science">Science</option>
              <option value="Computer Science">Computer Science</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Class / Target</label>
            <input
              type="text"
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Chapter</label>
            <input
              type="text"
              placeholder="e.g. Laws of Motion"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Topic</label>
            <input
              type="text"
              placeholder="e.g. Circular Dynamics & Friction"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Exam Duration (Minutes)</label>
            <input
              type="number"
              min={5}
              max={300}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Configured Total Marks</label>
            <input
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) => setTotalMarks(parseInt(e.target.value, 10) || calculatedSum)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-indigo-700"
            />
          </div>
        </div>

        {/* Mode & Scheduling */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Examination Mode</label>
            <select
              value={examMode}
              onChange={(e) => setExamMode(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            >
              <option value="teacher_reviewed">Teacher-Reviewed Exam (Long Answers & Handwritings)</option>
              <option value="instant_quick_test">Instant AI Quick Test (Immediate Auto-Scorecard)</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {examMode === 'teacher_reviewed'
                ? 'Results held until teacher inspects written photos & awards final marks.'
                : 'Scorecard released automatically upon student submission.'}
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Start Window (Optional)</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
            <p className="text-[10px] text-slate-500 mt-1">Students cannot start before this timestamp.</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Closing Window (Optional)</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
            <p className="text-[10px] text-slate-500 mt-1">Exam stops automatically after this deadline.</p>
          </div>
        </div>

        <div className="pt-2">
          <label className="block font-bold text-slate-700 mb-1 text-xs">Exam Instructions for Students</label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Section 2: Question Builder */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              2. Exam Questions ({questions.length} Items &bull; {calculatedSum} Marks)
            </h2>
            <p className="text-xs text-slate-500">
              Configure each question, select its type, and specify answer formats or rubrics.
            </p>
          </div>

          {/* Quick Add Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Add Question:</span>
            <button
              type="button"
              onClick={() => handleAddQuestion('mcq_single')}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors"
            >
              + MCQ
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('numerical')}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
            >
              + Numerical
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('short_answer')}
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-colors"
            >
              + Short Answer
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('derivation')}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors"
            >
              + Derivation
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('long_answer')}
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-colors"
            >
              + Long Answer
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('diagram')}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
            >
              + Diagram
            </button>
          </div>
        </div>

        {/* Question Cards */}
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 p-5 sm:p-6 shadow-sm space-y-4 transition-all"
          >
            {/* Header: Number, Type, Marks, Delete */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center">
                  Q{idx + 1}
                </span>

                <div className="flex items-center gap-2">
                  <select
                    value={q.question_type}
                    onChange={(e) => handleTypeChange(idx, e.target.value as QuestionType)}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-extrabold"
                  >
                    <option value="mcq_single">Single-Correct MCQ</option>
                    <option value="mcq_multiple">Multiple-Correct MCQ</option>
                    <option value="numerical">Numerical Answer</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short-Answer Question</option>
                    <option value="long_answer">Long-Answer Question (Handwritten Photo Support)</option>
                    <option value="derivation">Derivation / Proof (Handwritten Photo Support)</option>
                    <option value="diagram">Diagram-based Question</option>
                    <option value="assertion_reason">Assertion-Reason</option>
                    <option value="match_following">Match-the-Following</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <label className="font-bold text-slate-600">Marks:</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={q.marks}
                    onChange={(e) => updateQuestionField(idx, 'marks', parseFloat(e.target.value) || 1)}
                    className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-center text-slate-900"
                  />
                </div>

                {q.question_type === 'mcq_single' && (
                  <div className="flex items-center gap-1">
                    <label className="font-bold text-slate-600">Neg:</label>
                    <input
                      type="number"
                      min={0}
                      step={0.25}
                      value={q.negative_marks}
                      onChange={(e) => updateQuestionField(idx, 'negative_marks', parseFloat(e.target.value) || 0)}
                      className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-center text-red-600"
                    />
                  </div>
                )}

                <button
                  type="button"
                  title="Duplicate Question"
                  onClick={() => handleDuplicateQuestion(idx)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Delete Question"
                  onClick={() => handleRemoveQuestion(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Question Statement *</label>
              <textarea
                rows={3}
                required
                placeholder="Type the full question statement here. You may include formulas, symbols, or variables..."
                value={q.question_text}
                onChange={(e) => updateQuestionField(idx, 'question_text', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Optional Diagram / Image URL */}
            <div className="flex items-center gap-2 text-xs">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Optional Diagram / Image URL (e.g. https://... or /diagrams/circ1.png)"
                value={q.image_url || ''}
                onChange={(e) => updateQuestionField(idx, 'image_url', e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
              />
            </div>

            {/* Dynamic Section According to Type */}

            {/* 1. MCQ Options (Single or Multiple) */}
            {(q.question_type === 'mcq_single' || q.question_type === 'mcq_multiple' || q.question_type === 'true_false') && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Answer Options & Correct Key:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-2 p-2 rounded-xl border ${
                        opt.is_correct ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const updatedOpts = q.options.map((o, i) => {
                            if (q.question_type === 'mcq_single' || q.question_type === 'true_false') {
                              return { ...o, is_correct: i === optIdx };
                            }
                            return i === optIdx ? { ...o, is_correct: !o.is_correct } : o;
                          });
                          updateQuestionField(idx, 'options', updatedOpts);
                        }}
                        className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-colors cursor-pointer ${
                          opt.is_correct ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
                        }`}
                      >
                        {opt.is_correct ? <Check className="w-3.5 h-3.5" /> : opt.option_letter}
                      </button>
                      <input
                        type="text"
                        placeholder={`Option ${opt.option_letter} text`}
                        value={opt.option_text}
                        onChange={(e) => {
                          const updatedOpts = [...q.options];
                          updatedOpts[optIdx].option_text = e.target.value;
                          updateQuestionField(idx, 'options', updatedOpts);
                        }}
                        className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Numerical Details */}
            {q.question_type === 'numerical' && (
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-emerald-900 mb-1">Target Numerical Value *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 9.8"
                    value={q.numerical_answer}
                    onChange={(e) => updateQuestionField(idx, 'numerical_answer', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 mb-1">Acceptable Tolerance (±)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 0.05"
                    value={q.numerical_tolerance}
                    onChange={(e) => updateQuestionField(idx, 'numerical_tolerance', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 mb-1">Unit of Measurement (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. m/s², Joules, kg"
                    value={q.numerical_unit}
                    onChange={(e) => updateQuestionField(idx, 'numerical_unit', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            )}

            {/* 3. Derivation / Long Answer Settings */}
            {(q.question_type === 'derivation' || q.question_type === 'long_answer' || q.question_type === 'diagram' || q.question_type === 'short_answer') && (
              <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                    📝 Written Answer & Notebook Photo Submission
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={q.allow_handwritten}
                        onChange={(e) => updateQuestionField(idx, 'allow_handwritten', e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      Enable Camera Photo Upload
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={q.allow_typed}
                        onChange={(e) => updateQuestionField(idx, 'allow_typed', e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      Enable Typed Text Box
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Marking Rubric / Key Steps for Teacher Review
                  </label>
                  <input
                    type="text"
                    placeholder="Add key marking criteria separated by semicolons (e.g. Formula (1M); Substitution (2M); Unit (1M))"
                    value={q.rubric ? q.rubric.join('; ') : ''}
                    onChange={(e) =>
                      updateQuestionField(
                        idx,
                        'rubric',
                        e.target.value.split(';').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {/* Explanation / Solution */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Model Solution / Explanation (Shown to students after results release)
              </label>
              <input
                type="text"
                placeholder="Brief explanation, key formula, or final answer rationale..."
                value={q.explanation}
                onChange={(e) => updateQuestionField(idx, 'explanation', e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
              />
            </div>
          </div>
        ))}

        {/* Bottom Add Question Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => handleAddQuestion('short_answer')}
            className="px-6 py-3 bg-white border-2 border-dashed border-indigo-300 hover:border-indigo-600 text-indigo-700 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Add Another Question
          </button>
        </div>
      </div>
    </div>
  );
}
