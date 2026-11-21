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
  Camera,
  Image as ImageIcon,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Eye,
  X,
  Upload,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { QuestionType } from '@/lib/pdf-parser';

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
  question_type: QuestionType;
  marks: number;
  negative_marks: number;
  image_url?: string;
  options: QuestionOption[];
  numerical_unit?: string;
  assertion_text?: string;
  reason_text?: string;
  matching_pairs?: { left: string; right: string }[];
  rubric?: string[];
  allow_handwritten?: boolean;
  allow_typed?: boolean;
}

interface StudentAnswerState {
  selected_options?: string | string[];
  numerical_response?: number | null;
  text_response?: string;
  matching_response?: Record<string, string>;
  is_visited: boolean;
  is_answered: boolean;
  is_marked_for_review: boolean;
}

interface AnswerAttachment {
  id: string;
  attempt_id: string;
  question_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  page_order: number;
  created_at: string;
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
  const [attachments, setAttachments] = useState<Record<string, AnswerAttachment[]>>({});

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);

  // Submission State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Anti-Cheat State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const blurStartTime = useRef<number | null>(null);

  // Camera & Gallery Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Enlarged Image Preview Modal
  const [previewAttachment, setPreviewAttachment] = useState<AnswerAttachment | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Live Desktop Camera Modal State
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);

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

        // Organize attachments by question
        const initialAtts: Record<string, AnswerAttachment[]> = {};
        for (const att of data.savedAttachments || []) {
          if (!initialAtts[att.question_id]) initialAtts[att.question_id] = [];
          initialAtts[att.question_id].push(att);
        }
        setAttachments(initialAtts);

        // Initialize answer states from saved responses
        const initialAnswers: Record<string, StudentAnswerState> = {};
        for (const q of data.questions) {
          const saved = (data.savedResponses || []).find((r: any) => r.question_id === q.id);
          const hasAtt = (initialAtts[q.id] || []).length > 0;
          const hasText = Boolean(saved?.text_response && saved.text_response.trim().length > 0);
          const hasOption = Boolean(saved?.selected_options);
          const hasNum = saved?.numerical_response !== null && saved?.numerical_response !== undefined;

          initialAnswers[q.id] = {
            selected_options: saved?.selected_options || '',
            numerical_response: saved?.numerical_response ?? null,
            text_response: saved?.text_response || '',
            matching_response: saved?.matching_response || {},
            is_visited: saved ? Boolean(saved.is_visited) : q.question_number === 1,
            is_answered: hasAtt || hasText || hasOption || hasNum || Boolean(saved?.is_answered),
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

  // Format Time Remaining (HH:MM:SS)
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 3. Anti-Cheat Event Listeners (Tab Focus Loss, Fullscreen, Context Menu)
  useEffect(() => {
    if (!attempt?.id) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurStartTime.current = Date.now();
        logIntegrity('tab_blurred', { message: 'Student switched away from examination tab' });
      } else {
        const durationSec = blurStartTime.current ? Math.round((Date.now() - blurStartTime.current) / 1000) : 0;
        blurStartTime.current = null;
        logIntegrity('tab_returned', { duration_seconds: durationSec, message: 'Student returned to examination tab' });
      }
    };

    const handleFullscreenChange = () => {
      const isNowFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isNowFull);
      if (!isNowFull && test?.anti_cheat_settings?.fullscreen_required) {
        logIntegrity('fullscreen_exited', { message: 'Student exited mandatory full-screen mode' });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (test?.anti_cheat_settings?.context_menu_disabled !== false) {
        e.preventDefault();
        logIntegrity('context_menu_blocked', { message: 'Right-click context menu was intercepted' });
      }
    };

    const handleCopy = () => {
      logIntegrity('clipboard_copy_attempted', { message: 'Student attempted to copy examination text' });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, [attempt?.id, test]);

  const logIntegrity = (eventType: string, meta: any = {}) => {
    if (!attempt?.id) return;
    fetch(`/api/student/attempts/${attempt.id}/integrity-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        metadata: meta,
      }),
    }).catch((err) => console.warn('Integrity log failed:', err));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.warn(err));
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
    }
  };

  // Current Question
  const currentQ = questions[currentIndex];
  const currentAns = currentQ ? answers[currentQ.id] : undefined;
  const currentAttachments = currentQ ? attachments[currentQ.id] || [] : [];

  // Question Response Handlers
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

  const handleTextInput = (val: string) => {
    if (!currentQ) return;
    const hasText = val.trim().length > 0;
    const hasAttachments = (attachments[currentQ.id] || []).length > 0;

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        text_response: val,
        is_visited: true,
        is_answered: hasText || hasAttachments,
      },
    }));
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    const hasAttachments = (attachments[currentQ.id] || []).length > 0;

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        selected_options: '',
        numerical_response: null,
        text_response: '',
        is_answered: hasAttachments,
      },
    }));

    saveResponseToBackend(currentQ.id, {
      selected_options: null,
      numerical_response: null,
      text_response: '',
      is_answered: hasAttachments,
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
    }).catch((err) => console.warn('Background auto-save failed:', err));
  };

  // ---------------------------------------------------------------------------
  // Camera & Gallery Upload Workflows (Phase 7 Critical)
  // ---------------------------------------------------------------------------

  const triggerCamera = () => {
    setUploadError(null);
    // On mobile devices, native input with capture="environment" opens rear camera immediately
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      // On desktop, try web camera viewfinder modal or file picker
      startWebcamStream();
    }
  };

  const triggerGallery = () => {
    setUploadError(null);
    galleryInputRef.current?.click();
  };

  // Handle file uploads (from camera or gallery)
  const uploadFiles = async (files: FileList | File[]) => {
    if (!currentQ || !attempt?.id || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    const qId = currentQ.id;
    const existingList = attachments[qId] || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pageOrder = existingList.length + i + 1;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('question_id', qId);
      formData.append('page_order', String(pageOrder));

      try {
        const res = await fetch(`/api/student/attempts/${attempt.id}/attachments`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload image');

        setAttachments((prev) => {
          const currentList = prev[qId] || [];
          return {
            ...prev,
            [qId]: [...currentList, data.attachment],
          };
        });

        // Mark question as answered
        setAnswers((prev) => ({
          ...prev,
          [qId]: {
            ...prev[qId],
            is_answered: true,
            is_visited: true,
          },
        }));

        saveResponseToBackend(qId, { is_answered: true, is_visited: true });
      } catch (err: any) {
        setUploadError(err.message || 'Image upload failed. Please retry.');
      }
    }

    setUploading(false);
  };

  // Delete attached page
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!currentQ || !attempt?.id) return;
    const qId = currentQ.id;

    try {
      const res = await fetch(`/api/student/attempts/${attempt.id}/attachments?attachment_id=${attachmentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete attachment');

      setAttachments((prev) => {
        const filtered = (prev[qId] || []).filter((a) => a.id !== attachmentId).map((a, i) => ({
          ...a,
          page_order: i + 1,
        }));
        return { ...prev, [qId]: filtered };
      });

      // Update is_answered if no text and no pages remain
      const remainingPages = (attachments[qId] || []).filter((a) => a.id !== attachmentId);
      const hasText = Boolean(answers[qId]?.text_response?.trim());
      const isStillAnswered = remainingPages.length > 0 || hasText;

      setAnswers((prev) => ({
        ...prev,
        [qId]: {
          ...prev[qId],
          is_answered: isStillAnswered,
        },
      }));

      saveResponseToBackend(qId, { is_answered: isStillAnswered });
    } catch (err: any) {
      alert(err.message || 'Error deleting image');
    }
  };

  // Reorder attached pages (Move Left / Move Right)
  const handleMovePage = async (idx: number, direction: 'left' | 'right') => {
    if (!currentQ || !attempt?.id) return;
    const qId = currentQ.id;
    const list = [...(attachments[qId] || [])];
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    // Swap
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const orderedIds = list.map((a) => a.id);
    const updatedList = list.map((a, i) => ({ ...a, page_order: i + 1 }));
    setAttachments((prev) => ({ ...prev, [qId]: updatedList }));

    try {
      await fetch(`/api/student/attempts/${attempt.id}/attachments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: qId, ordered_ids: orderedIds }),
      });
    } catch {
      console.warn('Failed to persist page order');
    }
  };

  // Desktop Webcam Viewfinder Stream
  const startWebcamStream = async () => {
    setWebcamError(null);
    setShowWebcamModal(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setWebcamError('Webcam access not allowed or unavailable. Please use "Upload from Gallery/Computer".');
    }
  };

  const captureWebcamSnapshot = () => {
    if (!videoRef.current || !currentQ) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `notebook_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        uploadFiles([file]);
      }
      closeWebcam();
    }, 'image/jpeg', 0.95);
  };

  const closeWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setShowWebcamModal(false);
  };

  // 4. Submission Workflow
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

      if (data.mode === 'teacher_reviewed') {
        router.push(`/student/submitted?attempt_id=${attempt.id}`);
      } else {
        router.push(`/student/results/${attempt.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Submission failed. Please check internet connection.');
      setSubmitting(false);
      setTimerActive(true);
    }
  };

  // Palette status helper
  const getQuestionPaletteStatus = (qId: string) => {
    const ans = answers[qId];
    if (!ans || !ans.is_visited) return 'not_visited';
    if (ans.is_answered && ans.is_marked_for_review) return 'answered_and_marked';
    if (ans.is_marked_for_review) return 'marked_for_review';
    if (ans.is_answered) return 'answered';
    return 'not_answered';
  };

  const stats = {
    answered: Object.values(answers).filter((a) => a.is_answered && !a.is_marked_for_review).length,
    answeredAndMarked: Object.values(answers).filter((a) => a.is_answered && a.is_marked_for_review).length,
    markedForReview: Object.values(answers).filter((a) => !a.is_answered && a.is_marked_for_review).length,
    notAnswered: Object.values(answers).filter((a) => a.is_visited && !a.is_answered && !a.is_marked_for_review).length,
    notVisited: questions.length - Object.values(answers).filter((a) => a.is_visited).length,
    totalAttachments: Object.values(attachments).reduce((sum, list) => sum + list.length, 0),
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
      {/* Hidden File Inputs for Native Camera & Gallery */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* 1. TOP JEE EXAMINATION HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">{test.title}</span>
              <span className="text-[10px] bg-indigo-900/80 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-700 hidden sm:inline-block">
                JEE Standard Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Subject: <span className="text-slate-200 font-medium">{test.subject}</span> &bull; Total Marks: {test.total_marks}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm font-black border transition-colors ${
                secondsRemaining <= 300
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-slate-800 text-emerald-400 border-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700 transition-colors hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Test
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN EXAMINATION WORKSPACE */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT & CENTER: ACTIVE QUESTION WORKSPACE (Takes 3 columns on desktop) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
          {/* Question Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                Q{currentQ?.question_number}
              </span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Question {currentIndex + 1} of {questions.length} &bull; {currentQ?.question_type.replace('_', ' ')}
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
            <div className="text-slate-900 font-semibold text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {currentQ?.question_text}
            </div>

            {/* Question Diagram / Image if present */}
            {currentQ?.image_url && (
              <div className="my-4 max-w-lg mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 p-2">
                <img src={currentQ.image_url} alt="Question Diagram" className="w-full max-h-72 object-contain mx-auto" />
              </div>
            )}

            {/* 1. MCQs (Single or Multiple) & True/False */}
            {(currentQ?.question_type === 'mcq_single' ||
              currentQ?.question_type === 'mcq_multiple' ||
              currentQ?.question_type === 'true_false') && (
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
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
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

            {/* 2. Numerical Input */}
            {currentQ?.question_type === 'numerical' && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 max-w-md space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-700">Enter Numerical Value</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder="e.g. 25.5"
                    value={currentAns?.numerical_response ?? ''}
                    onChange={(e) => handleNumericalInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {currentQ.numerical_unit && (
                    <span className="px-3 py-3 bg-slate-200 rounded-xl font-mono font-bold text-slate-700 text-xs">
                      {currentQ.numerical_unit}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Enter integer or decimal value. Your numerical answer is evaluated with preset tolerance.
                </p>
              </div>
            )}

            {/* 3. Written Answers: Short Answer, Long Answer, Derivation, Diagram */}
            {(currentQ?.question_type === 'short_answer' ||
              currentQ?.question_type === 'long_answer' ||
              currentQ?.question_type === 'derivation' ||
              currentQ?.question_type === 'diagram') && (
              <div className="space-y-6 pt-2">
                {/* A. Typed Text Box (Combined support) */}
                {currentQ.allow_typed !== false && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Type your answer / steps (Optional if submitting handwritten photos below):
                    </label>
                    <textarea
                      rows={currentQ.question_type === 'long_answer' || currentQ.question_type === 'derivation' ? 6 : 4}
                      placeholder="Type your explanation, formula steps, or answer text here..."
                      value={currentAns?.text_response || ''}
                      onChange={(e) => handleTextInput(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* B. VISIBLE HANDWRITTEN ANSWER CAMERA & GALLERY SECTION (Phase 7 Critical) */}
                {currentQ.allow_handwritten !== false && (
                  <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 rounded-2xl border-2 border-indigo-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-indigo-600" />
                          📝 Submit Handwritten Answer / Notebook Pages
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Write your solution in your notebook, take a photo or upload from your gallery. Multi-page solutions are fully supported!
                        </p>
                      </div>

                      {/* TWO PROMINENT ACTION BUTTONS */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={triggerCamera}
                          disabled={uploading}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4" />
                          [ 📷 Take Photo ]
                        </button>

                        <button
                          type="button"
                          onClick={triggerGallery}
                          disabled={uploading}
                          className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                          [ 🖼 Upload from Gallery ]
                        </button>
                      </div>
                    </div>

                    {uploading && (
                      <div className="p-3 bg-indigo-100 text-indigo-900 rounded-xl flex items-center gap-2 text-xs font-bold animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-700" />
                        Uploading handwritten answer page...
                      </div>
                    )}

                    {uploadError && (
                      <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold">
                        <AlertCircle className="w-4 h-4" />
                        {uploadError}
                      </div>
                    )}

                    {/* Attached Pages List */}
                    {currentAttachments.length === 0 ? (
                      <div className="py-6 text-center border-2 border-dashed border-indigo-200 rounded-xl bg-white/60">
                        <p className="text-xs font-semibold text-slate-500">No handwritten pages attached yet.</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Click &quot;Take Photo&quot; to capture your notebook page or &quot;Upload from Gallery&quot;.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>Attached Pages ({currentAttachments.length} Pages):</span>
                          <span className="text-[11px] text-indigo-600">Teacher will review pages in order:</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {currentAttachments.map((att, attIdx) => (
                            <div
                              key={att.id}
                              className="relative bg-white rounded-xl border-2 border-indigo-200 hover:border-indigo-400 p-2 shadow-sm flex flex-col justify-between group transition-all"
                            >
                              {/* Page Order Badge */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black">
                                  Page {att.page_order || attIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  title="Delete Page"
                                  onClick={() => handleDeleteAttachment(att.id)}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Thumbnail preview */}
                              <div
                                onClick={() => {
                                  setPreviewAttachment(att);
                                  setZoomLevel(1);
                                }}
                                className="h-28 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer border border-slate-200 relative group/thumb"
                              >
                                <img
                                  src={att.file_url}
                                  alt={`Notebook Page ${att.page_order}`}
                                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="w-5 h-5" />
                                </div>
                              </div>

                              {/* Reorder Buttons (Move Left / Move Right) */}
                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px]">
                                <button
                                  type="button"
                                  disabled={attIdx === 0}
                                  onClick={() => handleMovePage(attIdx, 'left')}
                                  className="p-1 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                                  title="Move Page Earlier"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-bold text-slate-400">Order</span>
                                <button
                                  type="button"
                                  disabled={attIdx === currentAttachments.length - 1}
                                  onClick={() => handleMovePage(attIdx, 'right')}
                                  className="p-1 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                                  title="Move Page Later"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <span>Save & Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: JEE QUESTION NAVIGATION PALETTE */}
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
                      isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105' : 'hover:opacity-90'
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
            {stats.totalAttachments > 0 && (
              <div className="pt-2 border-t border-slate-100 text-indigo-700 font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>{stats.totalAttachments} Handwritten Photos Attached</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. SUBMISSION CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">Confirm Test Submission</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to finalize and submit your examination? Your typed answers and {stats.totalAttachments} handwritten photo pages will be submitted to the tutor.
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Handwritten Pages Attached</span>
                <span className="text-base font-extrabold text-indigo-600">{stats.totalAttachments} Pages Ready</span>
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

      {/* 4. ENLARGED IMAGE VIEWER MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3">
            <span className="font-bold text-sm">
              Page {previewAttachment.page_order} Preview &bull; {previewAttachment.file_name}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                title="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto max-h-[80vh] flex items-center justify-center p-2">
            <img
              src={previewAttachment.file_url}
              alt="Enlarged Notebook Page"
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-transform"
            />
          </div>
        </div>
      )}

      {/* 5. DESKTOP WEBCAM CAPTURE MODAL */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                Capture Notebook Page
              </h3>
              <button onClick={closeWebcam} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {webcamError ? (
              <div className="p-4 bg-amber-50 text-amber-900 rounded-xl text-xs space-y-2">
                <p className="font-bold">{webcamError}</p>
                <button
                  onClick={() => {
                    closeWebcam();
                    triggerGallery();
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                >
                  Upload from Gallery Instead
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-200">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-white/50 m-4 rounded-xl pointer-events-none" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Hold your notebook flat and ensure good lighting.</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeWebcam}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={captureWebcamSnapshot}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Page
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
