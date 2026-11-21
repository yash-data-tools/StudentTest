'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Brain,
  Clock,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Send,
  Save,
  RotateCcw,
} from 'lucide-react';
import { GeneratedQuestion } from '@/lib/ai-services';

export default function AiQuickTestGeneratorPage() {
  const router = useRouter();

  // Generator form state
  const [subject, setSubject] = useState('Chemistry');
  const [chapter, setChapter] = useState('Atomic Structure');
  const [topic, setTopic] = useState('Bohr Model, Quantum Numbers & Electronic Configuration');
  const [classGrade, setClassGrade] = useState('Class 11');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [totalMarks, setTotalMarks] = useState(10);
  const [duration, setDuration] = useState(15);
  const [negativeMarking, setNegativeMarking] = useState(true);

  // Workflow state
  const [generating, setGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/ai/generate-quick-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          chapter,
          topic,
          class_grade: classGrade,
          difficulty,
          total_marks: totalMarks,
          duration_minutes: duration,
          negative_marking: negativeMarking,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate test.');

      setGeneratedTest(data.examData);
    } catch (err: any) {
      setError(err.message || 'Error occurred during AI test generation.');
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (idx: number, updates: Partial<GeneratedQuestion>) => {
    if (!generatedTest) return;
    const updated = [...generatedTest.questions];
    updated[idx] = { ...updated[idx], ...updates };
    setGeneratedTest({ ...generatedTest, questions: updated });
  };

  const removeQuestion = (idx: number) => {
    if (!generatedTest) return;
    const updated = generatedTest.questions.filter((_: any, i: number) => i !== idx);
    setGeneratedTest({ ...generatedTest, questions: updated });
  };

  const handlePublishTest = async (status: 'published' | 'draft') => {
    if (!generatedTest) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTest.title,
          subject: generatedTest.subject,
          chapter: generatedTest.chapter,
          topic,
          class_grade: classGrade,
          total_marks: generatedTest.total_marks,
          duration_minutes: generatedTest.duration_minutes,
          exam_mode: 'instant_quick_test',
          status,
          negative_marking_enabled: negativeMarking,
          questions: generatedTest.questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish test.');

      setSuccessMsg(data.message);
      setTimeout(() => {
        router.push('/admin/tests');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error publishing test.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          AI Quick Test Generator (10 Marks)
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Instant 10-Mark Topic Test
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pick a chapter or topic and let AI synthesize a balanced 10-mark examination with automatic instant scorecards for students.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* GENERATOR CONTROLS FORM */}
      {!generatedTest && (
        <form onSubmit={handleGenerate} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold uppercase text-slate-700 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
                <option value="Computer Science">Computer Science</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-700 mb-1.5">Class / Standard</label>
              <select
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 11">Class 11 (JEE / NEET)</option>
                <option value="Class 12">Class 12 (JEE / NEET)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-700 mb-1.5">Chapter Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Atomic Structure, Kinematics, Thermodynamics"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-700 mb-1.5">Specific Topic (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Bohr Model, Quantum Numbers"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-700 mb-1.5">Difficulty Level</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="easy">Easy (Foundational)</option>
                <option value="medium">Medium (Standard Level)</option>
                <option value="hard">Hard (Advanced / Challenging)</option>
                <option value="mixed">Mixed (Recommended)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-700 mb-1.5">Total Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="rounded text-purple-600"
              />
              <span>Enable Negative Marking (-1 for incorrect MCQ)</span>
            </label>

            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating 10-Mark Test with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Synthesize 10-Mark Test
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* GENERATED TEST REVIEW & PUBLISH VIEW */}
      {generatedTest && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-purple-50/70 border border-purple-200 rounded-2xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700">Generated AI Quick Test</span>
              <h2 className="text-xl font-extrabold text-purple-950 mt-0.5">{generatedTest.title}</h2>
              <p className="text-xs text-purple-800">
                Total Marks: {generatedTest.total_marks} &bull; Duration: {generatedTest.duration_minutes} Mins &bull; Instant Evaluation Mode
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGeneratedTest(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => handlePublishTest('published')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {saving ? 'Publishing...' : 'Publish Test Immediately'}
              </button>
            </div>
          </div>

          {/* Question List Review */}
          <div className="space-y-4">
            {generatedTest.questions.map((q: GeneratedQuestion, idx: number) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      {q.question_type === 'numerical' ? 'Numerical Answer' : 'Single Correct MCQ'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-emerald-600">+{q.marks} Marks</span>
                    {q.negative_marks > 0 && <span className="font-bold text-red-600">-{q.negative_marks} Neg</span>}
                    <button
                      onClick={() => removeQuestion(idx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={q.question_text}
                  onChange={(e) => updateQuestion(idx, { question_text: e.target.value })}
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none"
                />

                {/* Options if MCQ */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                          opt.is_correct
                            ? 'bg-emerald-50 border-emerald-400 font-semibold text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-bold">({opt.option_letter})</span>
                        <input
                          type="text"
                          value={opt.option_text}
                          onChange={(e) => {
                            const newOpts = [...q.options];
                            newOpts[oIdx].option_text = e.target.value;
                            updateQuestion(idx, { options: newOpts });
                          }}
                          className="flex-1 bg-transparent focus:outline-none text-xs"
                        />
                        {opt.is_correct && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">Key</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Numerical Input Target */}
                {q.question_type === 'numerical' && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono">
                    Target Answer: <span className="font-bold text-slate-900">{q.numerical_answer}</span> (Tolerance: ±{q.numerical_tolerance})
                  </div>
                )}

                {/* Explanation */}
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs text-slate-600">
                  <p className="font-bold text-[10px] uppercase text-slate-400">Explanation / Solution:</p>
                  <p className="mt-0.5">{q.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
