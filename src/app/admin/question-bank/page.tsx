'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  Tag,
  Copy,
  X,
  Sparkles,
} from 'lucide-react';

interface QuestionBankItem {
  id: string;
  subject: string;
  chapter: string;
  topic?: string;
  difficulty: string;
  question_type: string;
  question_text: string;
  options?: any[];
  numerical_answer?: number;
  marks: number;
  negative_marks: number;
  explanation?: string;
  source?: string;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');

  // Add question modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: 'Physics',
    chapter: '',
    topic: '',
    difficulty: 'medium',
    question_type: 'mcq_single',
    question_text: '',
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    correctOpt: 'A',
    numerical_answer: '',
    marks: 4,
    negative_marks: 1,
    explanation: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/question-bank?search=${encodeURIComponent(search)}&subject=${subjectFilter}&difficulty=${diffFilter}`
      );
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('Failed to load question bank', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [search, subjectFilter, diffFilter]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const options =
        formData.question_type === 'mcq_single'
          ? [
              { option_letter: 'A', option_text: formData.optA, is_correct: formData.correctOpt === 'A' },
              { option_letter: 'B', option_text: formData.optB, is_correct: formData.correctOpt === 'B' },
              { option_letter: 'C', option_text: formData.optC, is_correct: formData.correctOpt === 'C' },
              { option_letter: 'D', option_text: formData.optD, is_correct: formData.correctOpt === 'D' },
            ]
          : [];

      const res = await fetch('/api/admin/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          chapter: formData.chapter,
          topic: formData.topic,
          difficulty: formData.difficulty,
          question_type: formData.question_type,
          question_text: formData.question_text,
          options,
          numerical_answer: formData.numerical_answer ? parseFloat(formData.numerical_answer) : null,
          marks: formData.marks,
          negative_marks: formData.negative_marks,
          explanation: formData.explanation,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchQuestions();
      }
    } catch (err) {
      alert('Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Question Bank</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Central repository of reusable exam questions organized by subject, chapter, and difficulty.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Question to Bank
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions by keyword or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Biology">Biology</option>
          </select>

          <select
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Loading question bank...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Questions Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or add new items.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                    {q.subject}
                  </span>
                  {q.chapter && (
                    <span className="text-[11px] text-slate-500 font-semibold">{q.chapter}</span>
                  )}
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase">
                    {q.question_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span>+{q.marks}M</span>
                  {q.source && <span className="text-slate-400 text-[11px] font-normal">&bull; {q.source}</span>}
                </div>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                {q.question_text}
              </p>

              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {q.options.map((opt: any, oIdx: number) => (
                    <div
                      key={oIdx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        opt.is_correct
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">({opt.option_letter})</span>
                        <span>{opt.option_text}</span>
                      </div>
                      {opt.is_correct && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">Key</span>}
                    </div>
                  ))}
                </div>
              )}

              {q.question_type === 'numerical' && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono">
                  Numerical Target Answer: <span className="font-bold text-emerald-700">{q.numerical_answer}</span>
                </div>
              )}

              {q.explanation && (
                <p className="text-xs text-slate-500 pt-1">
                  <strong>Solution: </strong> {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Question to Bank</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddQuestion} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-600 mb-1">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-600 mb-1">Chapter</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Modern Physics"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Question Type</label>
                <select
                  value={formData.question_type}
                  onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="mcq_single">Single Correct MCQ</option>
                  <option value="numerical">Numerical Value</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Question Statement</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter full problem statement..."
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {formData.question_type === 'mcq_single' && (
                <div className="space-y-2">
                  <label className="block font-bold uppercase text-slate-600">Options & Correct Key</label>
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map((letter) => (
                      <div key={letter} className="flex items-center gap-2">
                        <span className="w-6 font-bold text-center">({letter})</span>
                        <input
                          type="text"
                          required
                          placeholder={`Option ${letter} text`}
                          value={(formData as any)[`opt${letter}`]}
                          onChange={(e) => setFormData({ ...formData, [`opt${letter}`]: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                        />
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={formData.correctOpt === letter}
                            onChange={() => setFormData({ ...formData, correctOpt: letter })}
                          />
                          Key
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.question_type === 'numerical' && (
                <div>
                  <label className="block font-bold uppercase text-slate-600 mb-1">Target Numerical Answer</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 15.4"
                    value={formData.numerical_answer}
                    onChange={(e) => setFormData({ ...formData, numerical_answer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Explanation / Solution</label>
                <input
                  type="text"
                  placeholder="Step-by-step solution..."
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
