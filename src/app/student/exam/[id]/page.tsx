'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Shield,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Eraser,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Maximize2,
  Minimize2,
  WifiOff,
  Wifi,
} from 'lucide-react';

interface QuestionOption {
  id: string;
  option_letter: string;
  option_text: string;
  image_url?: string;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  question_type: 'mcq_single' | 'mcq_multiple' | 'numerical' | 'true_false' | 'short_answer';
  marks: number;
  negative_marks: number;
  image_url?: string;
  options: QuestionOption[];
}

interface StudentAnswerState {
  selected_options?: string | string[];
  numerical_response?: number | null;
  text_response?: string;
  is_visited: boolean;
  is_answered: boolean;
  is_marked_for_review: boolean;
}

export default function StudentExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: testId } = use(params);
  const router = useRouter();

  // Test & Attempt State
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerState>>({});

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);

  // Submission State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Anti-Cheat State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const blurStartTime = useRef<number | null>(null);

  // 1. Initialize Test & Attempt
  useEffect(() => {
    async function initExam() {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/tests/${testId}/start`, { method: 'POST' });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to start exam.');

        setTest(data.test);
        setQuestions(data.questions);
        setAttempt(data.attempt);

        // Calculate timer
        const totalDurationSec = (data.test.duration_minutes || 60) * 60;
        const startedTime = new Date(data.attempt.started_at).getTime();
        const elapsedSec = Math.floor((Date.now() - startedTime) / 1000);
        const remaining = Math.max(0, totalDurationSec - elapsedSec);

        setSecondsRemaining(remaining);
        setTimerActive(true);

        // Initialize answer states from saved responses
        const initialAnswers: Record<string, StudentAnswerState> = {};
        for (const q of data.questions) {
          const saved = (data.savedResponses || []).find((r: any) => r.question_id === q.id);
          initialAnswers[q.id] = {
            selected_options: saved?.selected_options || '',
            numerical_response: saved?.numerical_response ?? null,
            text_response: saved?.text_response || '',
            is_visited: saved ? Boolean(saved.is_visited) : q.question_number === 1,
            is_answered: saved ? Boolean(saved.is_answered) : false,
            is_marked_for_review: saved ? Boolean(saved.is_marked_for_review) : false,
          };
        }
        setAnswers(initialAnswers);
      } catch (err: any) {
        setError(err.message || 'Error loading exam.');
      } finally {
        setLoading(false);
      }
    }

    initExam();
  }, [testId]);

  // 2. Timer Countdown & Auto-Submit
  useEffect(() => {
    if (!timerActive || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, secondsRemaining]);

  // 3. Online/Offline Network Monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sendIntegrityEvent('connection_restored');
    };
    const handleOffline = () => {
      setIsOnline(false);
      sendIntegrityEvent('connection_lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [attempt?.id]);

  // 4. Anti-Cheat Integrity Monitoring (Tab Switch, Focus Loss, Fullscreen, Clipboard)
  useEffect(() => {
    if (!attempt?.id) return;

    // A. Tab Visibility Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurStartTime.current = Date.now();
        sendIntegrityEvent('tab_hidden');
      } else {
        const awayDuration = blurStartTime.current ? Math.round((Date.now() - blurStartTime.current) / 1000) : 0;
        sendIntegrityEvent('tab_visible', awayDuration);
        blurStartTime.current = null;
      }
    };

    // B. Window Blur / Focus Detection
    const handleWindowBlur = () => {
      if (!blurStartTime.current) blurStartTime.current = Date.now();
      sendIntegrityEvent('window_blur');
    };
    const handleWindowFocus = () => {
      const awayDuration = blurStartTime.current ? Math.round((Date.now() - blurStartTime.current) / 1000) : 0;
      sendIntegrityEvent('window_focus', awayDuration);
      blurStartTime.current = null;
    };

    // C. Fullscreen Exit Detection
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      sendIntegrityEvent(isFull ? 'fullscreen_enter' : 'fullscreen_exit');
    };

    // D. Clipboard Restriction
    const handleCopy = (e: ClipboardEvent) => {
      sendIntegrityEvent('copy');
    };
    const handlePaste = (e: ClipboardEvent) => {
      sendIntegrityEvent('paste');
    };
    const handleCut = (e: ClipboardEvent) => {
      sendIntegrityEvent('cut');
    };

    // E. Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      if (test?.anti_cheat_settings?.context_menu_disabled) {
        e.preventDefault();
        sendIntegrityEvent('context_menu_attempt');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [attempt?.id, test]);

  const sendIntegrityEvent = (eventType: string, duration = 0, metadata: any = {}) => {
    if (!attempt?.id) return;
    fetch(`/api/student/attempts/${attempt.id}/integrity-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        duration_seconds: duration,
        metadata: { ...metadata, question_index: currentIndex + 1 },
      }),
    }).catch(() => {});
  };

  // Helper: Format timer MM:SS
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const currentAns = currentQ ? answers[currentQ.id] || { is_visited: true, is_answered: false, is_marked_for_review: false } : null;

  // Question Response Updaters
  const handleSelectOption = (letter: string) => {
    if (!currentQ) return;
    const isMultiple = currentQ.question_type === 'mcq_multiple';

    let nextSelection: any;
    if (isMultiple) {
      const existing = Array.isArray(currentAns?.selected_options) ? [...currentAns.selected_options] : [];
      if (existing.includes(letter)) {
        nextSelection = existing.filter((l) => l !== letter);
      } else {
        nextSelection = [...existing, letter];
      }
    } else {
      nextSelection = letter;
    }

    const hasSelection = Array.isArray(nextSelection) ? nextSelection.length > 0 : Boolean(nextSelection);

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        selected_options: nextSelection,
        is_visited: true,
        is_answered: hasSelection,
      },
    }));
  };

  const handleNumericalInput = (val: string) => {
    if (!currentQ) return;
    const num = val === '' ? null : parseFloat(val);
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        numerical_response: num,
        is_visited: true,
        is_answered: val !== '',
      },
    }));
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        selected_options: '',
        numerical_response: null,
        text_response: '',
        is_answered: false,
      },
    }));
    // Save cleared state to backend
    saveResponseToBackend(currentQ.id, {
      selected_options: null,
      numerical_response: null,
      text_response: '',
      is_answered: false,
    });
  };

  const handleSaveAndNext = () => {
    if (!currentQ) return;
    saveResponseToBackend(currentQ.id, answers[currentQ.id]);
    goToQuestion(currentIndex + 1);
  };

  const handleMarkForReviewAndNext = () => {
    if (!currentQ) return;
    const updated = {
      ...answers[currentQ.id],
      is_marked_for_review: true,
    };
    setAnswers((prev) => ({ ...prev, [currentQ.id]: updated }));
    saveResponseToBackend(currentQ.id, updated);
    goToQuestion(currentIndex + 1);
  };

  const goToQuestion = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    const targetQ = questions[idx];
    setAnswers((prev) => ({
      ...prev,
      [targetQ.id]: {
        ...prev[targetQ.id],
        is_visited: true,
      },
    }));
    setCurrentIndex(idx);
  };

  // Background Auto-Save
  const saveResponseToBackend = (qId: string, data: any) => {
    if (!attempt?.id) return;
    fetch(`/api/student/attempts/${attempt.id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: qId, ...data }),
    }).catch((err) => console.warn('Background auto-save failed, progress cached locally:', err));
  };

  // Submission Workflow
  const handleAutoSubmit = () => {
    submitExam(true);
  };

  const handleManualSubmit = () => {
    submitExam(false);
  };

  const submitExam = async (isAuto = false) => {
    if (!attempt?.id) return;
    setSubmitting(true);
    setTimerActive(false);

    try {
      const totalDurationSec = (test?.duration_minutes || 60) * 60;
      const timeSpent = Math.max(1, totalDurationSec - secondsRemaining);

      const res = await fetch(`/api/student/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          time_spent_seconds: timeSpent,
          is_auto_submitted: isAuto,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      router.push(data.redirect);
    } catch (err: any) {
      alert(err.message || 'Error submitting test. Please try again.');
      setSubmitting(false);
      setTimerActive(true);
    }
  };

  // Palette Status Logic
  const getQuestionPaletteStatus = (qId: string) => {
    const a = answers[qId];
    if (!a || !a.is_visited) return 'not_visited'; // Gray
    if (a.is_marked_for_review && a.is_answered) return 'answered_and_marked'; // Purple + Green Dot
    if (a.is_marked_for_review) return 'marked_for_review'; // Purple
    if (a.is_answered) return 'answered'; // Green
    return 'not_answered'; // Red / Rose
  };

  // Count Statistics for Submission Modal
  const stats = {
    answered: Object.values(answers).filter((a) => a.is_answered && !a.is_marked_for_review).length,
    answeredAndMarked: Object.values(answers).filter((a) => a.is_answered && a.is_marked_for_review).length,
    markedForReview: Object.values(answers).filter((a) => !a.is_answered && a.is_marked_for_review).length,
    notAnswered: Object.values(answers).filter((a) => a.is_visited && !a.is_answered && !a.is_marked_for_review).length,
    notVisited: questions.length - Object.values(answers).filter((a) => a.is_visited).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-bold">Initializing Examination Session...</p>
        <p className="text-xs text-slate-400 mt-1">Configuring anti-cheat monitors & question paper</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center shadow-lg border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unable to Start Exam</h2>
          <p className="text-xs text-slate-600 mb-6">{error || 'Test not found or currently unavailable.'}</p>
          <button
            onClick={() => router.push('/student/dashboard')}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
          >
            Back to Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* 1. TOP JEE EXAMINATION HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">{test.title}</span>
              <span className="text-[10px] bg-blue-900/80 text-blue-300 font-bold px-2 py-0.5 rounded border border-blue-700 hidden sm:inline-block">
                JEE Standard UI
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Subject: <span className="text-slate-200 font-medium">{test.subject}</span> &bull; Total Marks: {test.total_marks}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Network Offline Indicator */}
            {!isOnline && (
              <div className="bg-red-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline (Cached)</span>
              </div>
            )}

            {/* Live Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm shadow-inner transition-colors ${
                secondsRemaining < 300
                  ? 'bg-red-950/80 border-red-600 text-red-300 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-emerald-400'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>

            {/* Submit Test Button */}
            <button
              onClick={() => setShowConfirmModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Submit Test
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN EXAM BODY (Split: Left Question Panel, Right Navigation Palette) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT: QUESTION PANEL (Takes 3 columns on desktop) */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Question Sub-Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                Q{currentQ?.question_number}
              </span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                +{currentQ?.marks} Marks
              </span>
              {currentQ?.negative_marks > 0 && (
                <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                  -{currentQ?.negative_marks} Neg
                </span>
              )}
            </div>
          </div>

          {/* Question Content Area */}
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
            <div className="text-slate-900 font-medium text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {currentQ?.question_text}
            </div>

            {/* Question Image if present */}
            {currentQ?.image_url && (
              <div className="my-4 max-w-md mx-auto rounded-xl overflow-hidden border border-slate-200">
                <img src={currentQ.image_url} alt="Question Diagram" className="w-full object-contain" />
              </div>
            )}

            {/* Answer Options: MCQs (Single or Multiple) */}
            {(currentQ?.question_type === 'mcq_single' || currentQ?.question_type === 'mcq_multiple' || currentQ?.question_type === 'true_false') && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  {currentQ?.question_type === 'mcq_multiple' ? 'Select all correct options:' : 'Choose the correct option:'}
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQ?.options?.map((opt) => {
                    const isSelected = Array.isArray(currentAns?.selected_options)
                      ? currentAns.selected_options.includes(opt.option_letter)
                      : currentAns?.selected_options === opt.option_letter;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.option_letter)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-semibold shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-600'
                          }`}
                        >
                          {opt.option_letter}
                        </div>
                        <span className="text-xs sm:text-sm">{opt.option_text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Numerical Answer Input Box */}
            {currentQ?.question_type === 'numerical' && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 max-w-md space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-700">Enter Numerical Value</label>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  placeholder="e.g. 25.5"
                  value={currentAns?.numerical_response ?? ''}
                  onChange={(e) => handleNumericalInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500">
                  Enter integer or decimal value. Numerical answers are evaluated with preset tolerance.
                </p>
              </div>
            )}
          </div>

          {/* Action Control Buttons (Previous, Clear, Mark for Review, Save & Next) */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={handleClearResponse}
                disabled={!currentAns?.is_answered}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-bold disabled:opacity-30 cursor-pointer transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                Clear Response
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkForReviewAndNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold cursor-pointer transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Mark for Review & Next
              </button>
              <button
                onClick={handleSaveAndNext}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <span>Save & Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: JEE QUESTION NAVIGATION PALETTE (Takes 1 column on desktop) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Question Palette</h3>

            {/* Questions Number Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const status = getQuestionPaletteStatus(q.id);
                const isCurrent = idx === currentIndex;

                let colorClasses = 'bg-slate-100 text-slate-600 border-slate-200'; // not visited
                if (status === 'answered') {
                  colorClasses = 'bg-emerald-600 text-white border-emerald-600'; // Answered
                } else if (status === 'not_answered') {
                  colorClasses = 'bg-rose-500 text-white border-rose-500'; // Not answered
                } else if (status === 'marked_for_review') {
                  colorClasses = 'bg-purple-600 text-white border-purple-600'; // Marked for review
                } else if (status === 'answered_and_marked') {
                  colorClasses = 'bg-purple-600 text-white border-purple-600 relative'; // Answered & Marked
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center border transition-all cursor-pointer ${colorClasses} ${
                      isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : 'hover:opacity-90'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {status === 'answered_and_marked' && (
                      <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-300 ring-1 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Official Legend */}
          <div className="space-y-2 pt-4 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
            <p className="font-bold text-xs uppercase text-slate-400 mb-2">Palette Legend</p>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">
                ✓
              </div>
              <span>Answered ({stats.answered})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">
                ✗
              </div>
              <span>Not Answered ({stats.notAnswered})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center">
                ★
              </div>
              <span>Marked for Review ({stats.markedForReview})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-600 relative text-white font-bold text-[9px] flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 absolute -bottom-0.5 -right-0.5" />★
              </div>
              <span>Answered &amp; Marked ({stats.answeredAndMarked})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-100 border border-slate-300" />
              <span>Not Visited ({stats.notVisited})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUBMISSION CONFIRMATION MODAL (Section 13) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">Confirm Test Submission</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to finalize and submit your examination? You cannot change your answers after submission.
            </p>

            {/* Question Breakdown Summary */}
            <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Answered</span>
                <span className="text-base font-extrabold text-emerald-600">{stats.answered + stats.answeredAndMarked}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Unanswered</span>
                <span className="text-base font-extrabold text-rose-600">{stats.notAnswered + stats.notVisited}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Marked for Review</span>
                <span className="text-base font-extrabold text-purple-600">{stats.markedForReview + stats.answeredAndMarked}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={submitting}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
