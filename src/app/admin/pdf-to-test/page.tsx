'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileUp,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Copy,
  Eye,
  Settings,
  Shield,
  Loader2,
  Save,
  Send,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ExtractedQuestion, ParsedExamData } from '@/lib/pdf-parser';

export default function PdfToTestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [examData, setExamData] = useState<ParsedExamData | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'settings'>('editor');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Settings state
  const [antiCheat, setAntiCheat] = useState({
    fullscreen_required: false,
    tab_monitoring: true,
    clipboard_monitoring: true,
    context_menu_disabled: true,
    keyboard_monitoring: true,
    idle_monitoring: true,
  });

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);

    const formData = new FormData();
    formData.append('pdf_file', file);

    try {
      const res = await fetch('/api/admin/tests/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract questions.');

      setExamData(data.examData);
    } catch (err: any) {
      setError(err.message || 'An error occurred during extraction.');
    } finally {
      setExtracting(false);
    }
  };

  // Recalculate total marks
  const calculateTotalMarks = (questions: ExtractedQuestion[]) => {
    return questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  };

  // Question editing helpers
  const updateQuestion = (index: number, updates: Partial<ExtractedQuestion>) => {
    if (!examData) return;
    const updated = [...examData.questions];
    updated[index] = { ...updated[index], ...updates };
    setExamData({
      ...examData,
      questions: updated,
      total_marks: calculateTotalMarks(updated),
    });
  };

  const removeQuestion = (index: number) => {
    if (!examData) return;
    const updated = examData.questions.filter((_, i) => i !== index);
    // Renumber questions
    updated.forEach((q, i) => (q.question_number = i + 1));
    setExamData({
      ...examData,
      questions: updated,
      total_marks: calculateTotalMarks(updated),
    });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!examData) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= examData.questions.length) return;

    const updated = [...examData.questions];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;

    updated.forEach((q, i) => (q.question_number = i + 1));
    setExamData({ ...examData, questions: updated });
  };

  const duplicateQuestion = (index: number) => {
    if (!examData) return;
    const qToCopy = examData.questions[index];
    const copy: ExtractedQuestion = {
      ...JSON.parse(JSON.stringify(qToCopy)),
      question_number: examData.questions.length + 1,
    };
    const updated = [...examData.questions, copy];
    setExamData({
      ...examData,
      questions: updated,
      total_marks: calculateTotalMarks(updated),
    });
  };

  const addNewQuestion = () => {
    if (!examData) return;
    const newQ: ExtractedQuestion = {
      question_number: examData.questions.length + 1,
      question_text: 'New Question Statement',
      question_type: 'mcq_single',
      marks: 4,
      negative_marks: 1,
      options: [
        { option_letter: 'A', option_text: 'Option A', is_correct: true },
        { option_letter: 'B', option_text: 'Option B', is_correct: false },
        { option_letter: 'C', option_text: 'Option C', is_correct: false },
        { option_letter: 'D', option_text: 'Option D', is_correct: false },
      ],
      ai_confidence: 1.0,
      requires_verification: false,
    };
    const updated = [...examData.questions, newQ];
    setExamData({
      ...examData,
      questions: updated,
      total_marks: calculateTotalMarks(updated),
    });
  };

  // Option editing helpers
  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
    if (!examData) return;
    const q = examData.questions[qIdx];
    const newOpts = [...q.options];
    newOpts[optIdx] = { ...newOpts[optIdx], option_text: text };
    updateQuestion(qIdx, { options: newOpts });
  };

  const setCorrectOption = (qIdx: number, optIdx: number) => {
    if (!examData) return;
    const q = examData.questions[qIdx];
    let newOpts = [...q.options];

    if (q.question_type === 'mcq_multiple') {
      newOpts[optIdx] = { ...newOpts[optIdx], is_correct: !newOpts[optIdx].is_correct };
    } else {
      newOpts = newOpts.map((opt, i) => ({ ...opt, is_correct: i === optIdx }));
    }
    updateQuestion(qIdx, { options: newOpts, requires_verification: false });
  };

  const addOption = (qIdx: number) => {
    if (!examData) return;
    const q = examData.questions[qIdx];
    const nextLetter = String.fromCharCode(65 + q.options.length);
    const newOpts = [...q.options, { option_letter: nextLetter, option_text: `Option ${nextLetter}`, is_correct: false }];
    updateQuestion(qIdx, { options: newOpts });
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    if (!examData) return;
    const q = examData.questions[qIdx];
    if (q.options.length <= 2) return;
    const newOpts = q.options.filter((_, i) => i !== optIdx);
    // Re-letter
    newOpts.forEach((opt, i) => (opt.option_letter = String.fromCharCode(65 + i)));
    updateQuestion(qIdx, { options: newOpts });
  };

  // Save or Publish Test
  const handleSaveTest = async (status: 'draft' | 'published') => {
    if (!examData) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...examData,
          status,
          anti_cheat_settings: antiCheat,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save examination.');

      setSuccessMessage(data.message);
      setTimeout(() => {
        router.push('/admin/tests');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error saving test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">PDF to Interactive Test</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Convert question paper PDFs into interactive digital exams with AI parsing and teacher review.
          </p>
        </div>
        {examData && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveTest('draft')}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Save Draft
            </button>
            <button
              onClick={() => handleSaveTest('published')}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {saving ? 'Publishing...' : 'Publish Exam'}
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* STEP 1: PDF UPLOAD ZONE (If no examData yet) */}
      {!examData && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center shadow-sm hover:border-indigo-500 transition-all">
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FileUp className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-1">Upload Question Paper PDF</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            Supports standard digitally-typed PDFs and scanned papers. The AI extractor identifies questions, options, marks, diagrams, and numerical problems.
          </p>

          {file ? (
            <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-600" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-[11px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-xs font-semibold text-red-500 hover:text-red-700"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              Choose Question Paper PDF
            </button>
          )}

          {file && (
            <div>
              <button
                type="button"
                onClick={handleUploadAndExtract}
                disabled={extracting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Questions & Diagrams...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Extraction & Review
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: QUESTION REVIEW & EDITOR INTERFACE */}
      {examData && (
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Question Editor ({examData.questions.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Exam & Anti-Cheat Settings
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                JEE Student Preview
              </button>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                Total Marks: {examData.total_marks}
              </span>
            </div>
          </div>

          {/* TAB 1: QUESTION EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              {/* Paper Meta Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Exam Title</label>
                  <input
                    type="text"
                    value={examData.title}
                    onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Subject</label>
                  <input
                    type="text"
                    value={examData.subject}
                    onChange={(e) => setExamData({ ...examData, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Chapter</label>
                  <input
                    type="text"
                    value={examData.chapter || ''}
                    onChange={(e) => setExamData({ ...examData, chapter: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={examData.duration_minutes}
                    onChange={(e) => setExamData({ ...examData, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {examData.questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${
                      q.requires_verification ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Question Header & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {q.question_number}
                        </span>
                        <select
                          value={q.question_type}
                          onChange={(e) => updateQuestion(qIdx, { question_type: e.target.value as any })}
                          className="text-xs font-semibold py-1 px-2.5 bg-slate-100 border border-slate-300 rounded-lg"
                        >
                          <option value="mcq_single">Single Correct MCQ</option>
                          <option value="mcq_multiple">Multiple Correct MCQ</option>
                          <option value="numerical">Numerical Value</option>
                          <option value="true_false">True / False</option>
                          <option value="short_answer">Short Answer / Descriptive</option>
                        </select>
                        {q.requires_verification && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Verify Answer
                          </span>
                        )}
                      </div>

                      {/* Marks inputs & Actions */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <label className="text-slate-500 font-bold">Marks:</label>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) => updateQuestion(qIdx, { marks: Number(e.target.value) })}
                            className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-slate-500 font-bold">Neg:</label>
                          <input
                            type="number"
                            value={q.negative_marks}
                            onChange={(e) => updateQuestion(qIdx, { negative_marks: Number(e.target.value) })}
                            className="w-12 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-red-600"
                          />
                        </div>
                        <button
                          title="Move Up"
                          onClick={() => moveQuestion(qIdx, 'up')}
                          disabled={qIdx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                        >
                          <MoveUp className="w-4 h-4" />
                        </button>
                        <button
                          title="Move Down"
                          onClick={() => moveQuestion(qIdx, 'down')}
                          disabled={qIdx === examData.questions.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                        >
                          <MoveDown className="w-4 h-4" />
                        </button>
                        <button
                          title="Duplicate"
                          onClick={() => duplicateQuestion(qIdx)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => removeQuestion(qIdx)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Statement Field */}
                    <div className="py-3">
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Question Statement (Preserves equations & notation)
                      </label>
                      <textarea
                        rows={3}
                        value={q.question_text}
                        onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* MCQs and Options Editor */}
                    {(q.question_type === 'mcq_single' || q.question_type === 'mcq_multiple' || q.question_type === 'true_false') && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase text-slate-400">
                            Answer Options (Click letter to toggle correct answer)
                          </label>
                          {q.question_type !== 'true_false' && (
                            <button
                              type="button"
                              onClick={() => addOption(qIdx)}
                              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add Option
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                opt.is_correct
                                  ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setCorrectOption(qIdx, optIdx)}
                                className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-colors ${
                                  opt.is_correct
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {opt.option_letter}
                              </button>
                              <input
                                type="text"
                                value={opt.option_text}
                                onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                className="flex-1 px-2 py-1 bg-transparent text-xs font-medium focus:outline-none"
                              />
                              {q.options.length > 2 && q.question_type !== 'true_false' && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(qIdx, optIdx)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Numerical Inputs */}
                    {q.question_type === 'numerical' && (
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>
                          <label className="block font-bold text-slate-600 mb-1">Target Answer</label>
                          <input
                            type="number"
                            step="any"
                            value={q.numerical_answer ?? ''}
                            onChange={(e) => updateQuestion(qIdx, { numerical_answer: parseFloat(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600 mb-1">Acceptable Tolerance (±)</label>
                          <input
                            type="number"
                            step="any"
                            value={q.numerical_tolerance ?? 0}
                            onChange={(e) => updateQuestion(qIdx, { numerical_tolerance: parseFloat(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600 mb-1">Tolerance Type</label>
                          <select
                            value={q.numerical_tolerance_type || 'exact'}
                            onChange={(e) => updateQuestion(qIdx, { numerical_tolerance_type: e.target.value as any })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                          >
                            <option value="exact">Exact Match</option>
                            <option value="absolute">Absolute Tolerance</option>
                            <option value="range">Range Range</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Solution / Explanation */}
                    <div className="pt-3">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                        Answer Explanation / Solution Reference
                      </label>
                      <input
                        type="text"
                        placeholder="Detailed solution or marking key for student review..."
                        value={q.explanation || ''}
                        onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Question Button */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={addNewQuestion}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-600 text-indigo-600 text-xs font-bold hover:bg-indigo-50/50 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Question
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EXAM & ANTI-CHEAT SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Examination Configuration</h2>
                <p className="text-xs text-slate-500">Configure delivery rules, evaluation modes, and integrity deterrence.</p>
              </div>

              {/* Exam Mode Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-700">Exam Mode Selection</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setExamData({ ...examData, exam_mode: 'teacher_reviewed' })}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      examData.exam_mode === 'teacher_reviewed'
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-bold text-xs text-slate-900">Mode A: Teacher-Reviewed Exam</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ideal for 50-mark tests. Submissions go to Pending Reviews. AI provides provisional marks, but teacher moderates and publishes final scorecards.
                    </p>
                  </div>

                  <div
                    onClick={() => setExamData({ ...examData, exam_mode: 'instant_quick_test' })}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      examData.exam_mode === 'instant_quick_test'
                        ? 'border-purple-600 bg-purple-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-bold text-xs text-slate-900">Mode B: Instant AI Quick Test</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ideal for 10-mark chapter practice tests. System scores immediately upon student submission and displays the breakdown right away.
                    </p>
                  </div>
                </div>
              </div>

              {/* Anti-Cheat Deterrents */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold uppercase text-slate-700">Exam Integrity Monitor Deterrents</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiCheat.tab_monitoring}
                      onChange={(e) => setAntiCheat({ ...antiCheat, tab_monitoring: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Tab & Focus Switch Logging</p>
                      <p className="text-[11px] text-slate-500">Records timestamp whenever tab loses visibility</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiCheat.fullscreen_required}
                      onChange={(e) => setAntiCheat({ ...antiCheat, fullscreen_required: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Fullscreen Requirement</p>
                      <p className="text-[11px] text-slate-500">Requests fullscreen & records any exit events</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiCheat.clipboard_monitoring}
                      onChange={(e) => setAntiCheat({ ...antiCheat, clipboard_monitoring: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Clipboard Monitoring</p>
                      <p className="text-[11px] text-slate-500">Detects and logs copy, cut, and paste attempts</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiCheat.context_menu_disabled}
                      onChange={(e) => setAntiCheat({ ...antiCheat, context_menu_disabled: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Context Menu Deterrent</p>
                      <p className="text-[11px] text-slate-500">Suppresses right-click context menu during exam</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: JEE STUDENT PREVIEW */}
          {activeTab === 'preview' && (
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white">{examData.title}</h2>
                  <p className="text-xs text-slate-400">Student Examination Preview &bull; {examData.duration_minutes} Mins</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-lg text-emerald-400">
                    Timer: {examData.duration_minutes}:00
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {examData.questions.map((q, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-5 rounded-xl border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-indigo-400">Question {q.question_number}</span>
                      <span className="text-[11px] text-slate-400">[{q.marks} Marks]</span>
                    </div>
                    <p className="text-sm text-slate-100 mb-4">{q.question_text}</p>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg border ${
                              opt.is_correct
                                ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                                : 'bg-slate-900 border-slate-700 text-slate-300'
                            }`}
                          >
                            <span className="font-bold mr-2 text-indigo-400">({opt.option_letter})</span>
                            <span>{opt.option_text}</span>
                            {opt.is_correct && (
                              <span className="ml-2 text-[10px] text-emerald-400 font-bold">[Correct Key]</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.question_type === 'numerical' && (
                      <div className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-300">
                        Numerical Input Box &bull; Target Value: {q.numerical_answer} (±{q.numerical_tolerance})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
