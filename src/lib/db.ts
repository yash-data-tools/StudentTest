import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

const hasPostgres = Boolean(
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('your-project') &&
  !process.env.DATABASE_URL.includes('localhost:5432/postgres')
);

export function getPgPool(): Pool | null {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    return pool;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
    return null;
  }
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

export interface LocalDB {
  users: any[];
  system_settings: any[];
  tests: any[];
  questions: any[];
  question_options: any[];
  test_attempts: any[];
  student_responses: any[];
  integrity_events: any[];
  activity_logs: any[];
  teacher_reviews: any[];
  question_bank: any[];
  pdf_uploads: any[];
}

function getInitialDB(): LocalDB {
  return {
    users: [],
    system_settings: [{ key: 'registration_mode', value: 'open' }],
    tests: [],
    questions: [],
    question_options: [],
    test_attempts: [],
    student_responses: [],
    integrity_events: [],
    activity_logs: [],
    teacher_reviews: [],
    question_bank: [],
    pdf_uploads: [],
  };
}

export function readLocalDB(): LocalDB {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    const initial = getInitialDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

export function writeLocalDB(data: LocalDB): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  const p = getPgPool();
  if (p && hasPostgres) {
    try {
      const res = await p.query(text, params);
      return { rows: res.rows as T[], rowCount: res.rowCount || 0 };
    } catch (error) {
      console.warn('PostgreSQL query error, falling back to local store:', error);
    }
  }

  return executeLocalQuery<T>(text, params);
}

function executeLocalQuery<T = any>(sql: string, params: any[] = []): { rows: T[]; rowCount: number } {
  const db = readLocalDB();
  const cleanSql = sql.trim().toLowerCase();

  // 1. SELECT queries
  if (cleanSql.startsWith('select')) {
    if (cleanSql.includes('from users')) {
      let filtered = [...db.users];
      if (cleanSql.includes('where username = $1')) {
        filtered = filtered.filter(u => u.username === params[0]);
      } else if (cleanSql.includes('where id = $1')) {
        filtered = filtered.filter(u => u.id === params[0]);
      } else if (cleanSql.includes('where role = $1')) {
        filtered = filtered.filter(u => u.role === params[0]);
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }

    if (cleanSql.includes('from system_settings')) {
      let filtered = [...db.system_settings];
      if (cleanSql.includes('where key = $1')) {
        filtered = filtered.filter(s => s.key === params[0]);
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }

    if (cleanSql.includes('from tests')) {
      let filtered = [...db.tests];
      if (cleanSql.includes('where id = $1')) {
        filtered = filtered.filter(t => t.id === params[0]);
      } else if (cleanSql.includes('where status = $1')) {
        filtered = filtered.filter(t => t.status === params[0]);
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }

    if (cleanSql.includes('from activity_logs')) {
      const sorted = [...db.activity_logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { rows: sorted as unknown as T[], rowCount: sorted.length };
    }

    if (cleanSql.includes('from test_attempts')) {
      let filtered = [...db.test_attempts];
      if (cleanSql.includes('where id = $1')) {
        filtered = filtered.filter(a => a.id === params[0]);
      } else if (cleanSql.includes('where student_id = $1')) {
        filtered = filtered.filter(a => a.student_id === params[0]);
      } else if (cleanSql.includes('where test_id = $1')) {
        filtered = filtered.filter(a => a.test_id === params[0]);
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }
  }

  // 2. INSERT INTO users
  if (cleanSql.startsWith('insert into users')) {
    const newUser = {
      id: crypto.randomUUID(),
      username: params[0],
      password_hash: params[1],
      role: params[2],
      real_name: params[3],
      school: params[4] || '',
      status: params[5] || 'active',
      must_change_password: params[6] ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: null,
    };
    db.users.push(newUser);
    writeLocalDB(db);
    return { rows: [newUser] as unknown as T[], rowCount: 1 };
  }

  // 3. INSERT INTO activity_logs
  if (cleanSql.startsWith('insert into activity_logs')) {
    const newLog = {
      id: crypto.randomUUID(),
      user_id: params[0],
      event_type: params[1],
      ip_address: params[2] || '127.0.0.1',
      user_agent: params[3] || 'browser',
      metadata: typeof params[4] === 'string' ? JSON.parse(params[4]) : (params[4] || {}),
      timestamp: new Date().toISOString(),
    };
    db.activity_logs.push(newLog);
    writeLocalDB(db);
    return { rows: [newLog] as unknown as T[], rowCount: 1 };
  }

  // 4. UPDATE users
  if (cleanSql.startsWith('update users')) {
    if (cleanSql.includes('set last_login_at = now() where id = $1')) {
      const user = db.users.find(u => u.id === params[0]);
      if (user) {
        user.last_login_at = new Date().toISOString();
        writeLocalDB(db);
        return { rows: [user] as unknown as T[], rowCount: 1 };
      }
    }
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// High-Level Data Access Methods
// ---------------------------------------------------------------------------

export async function getStudentsList(searchTerm = '', statusFilter = 'all') {
  const db = readLocalDB();
  let students = db.users.filter(u => u.role === 'student');

  if (statusFilter !== 'all') {
    students = students.filter(s => s.status === statusFilter);
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    students = students.filter(
      s =>
        s.real_name.toLowerCase().includes(term) ||
        s.username.toLowerCase().includes(term) ||
        (s.school && s.school.toLowerCase().includes(term))
    );
  }

  return students.map(s => {
    const attempts = db.test_attempts.filter(a => a.student_id === s.id);
    const completedAttempts = attempts.filter(a => a.status === 'published' || a.status === 'evaluated');
    const avgScore =
      completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0) / completedAttempts.length)
        : null;

    return {
      id: s.id,
      username: s.username,
      real_name: s.real_name,
      school: s.school,
      status: s.status,
      must_change_password: s.must_change_password || false,
      created_at: s.created_at,
      last_login_at: s.last_login_at,
      total_attempts: attempts.length,
      average_score: avgScore,
    };
  });
}

export async function updateStudentDetails(
  id: string,
  data: { real_name?: string; school?: string; status?: string; must_change_password?: boolean }
) {
  const db = readLocalDB();
  const user = db.users.find(u => u.id === id && u.role === 'student');
  if (!user) return null;

  if (data.real_name !== undefined) user.real_name = data.real_name.trim();
  if (data.school !== undefined) user.school = data.school.trim();
  if (data.status !== undefined) user.status = data.status;
  if (data.must_change_password !== undefined) user.must_change_password = data.must_change_password;
  user.updated_at = new Date().toISOString();

  writeLocalDB(db);
  return user;
}

export async function updateStudentPassword(id: string, passwordHash: string, forceChange = false) {
  const db = readLocalDB();
  const user = db.users.find(u => u.id === id && u.role === 'student');
  if (!user) return null;

  user.password_hash = passwordHash;
  user.must_change_password = forceChange;
  user.updated_at = new Date().toISOString();

  writeLocalDB(db);
  return user;
}

export async function getActivityLogsList(options: {
  userId?: string;
  eventType?: string;
  searchTerm?: string;
  limit?: number;
} = {}) {
  const db = readLocalDB();
  let logs = [...db.activity_logs];

  if (options.userId) {
    logs = logs.filter(l => l.user_id === options.userId);
  }

  if (options.eventType && options.eventType !== 'all') {
    logs = logs.filter(l => l.event_type === options.eventType);
  }

  const enriched = logs.map(l => {
    const user = db.users.find(u => u.id === l.user_id);
    return {
      id: l.id,
      user_id: l.user_id,
      student_name: user?.real_name || 'System / Anonymous',
      username: user?.username || 'system',
      school: user?.school || '-',
      role: user?.role || 'system',
      event_type: l.event_type,
      metadata: l.metadata || {},
      timestamp: l.timestamp,
    };
  });

  if (options.searchTerm?.trim()) {
    const term = options.searchTerm.toLowerCase();
    return enriched
      .filter(
        l =>
          l.student_name.toLowerCase().includes(term) ||
          l.username.toLowerCase().includes(term) ||
          l.event_type.toLowerCase().includes(term)
      )
      .slice(0, options.limit || 100);
  }

  return enriched
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, options.limit || 100);
}

export async function getDashboardMetrics() {
  const db = readLocalDB();
  const students = db.users.filter(u => u.role === 'student');
  const activeStudents = students.filter(s => s.status === 'active');
  const pendingApproval = students.filter(s => s.status === 'pending_approval');
  const publishedTests = db.tests.filter(t => t.status === 'published' || t.status === 'active');
  const pendingReviews = db.test_attempts.filter(a => a.status === 'pending_review' || a.status === 'submitted');
  const totalAttempts = db.test_attempts.length;

  return {
    totalStudents: students.length,
    activeStudents: activeStudents.length,
    pendingApprovalStudents: pendingApproval.length,
    publishedTests: publishedTests.length,
    pendingReviews: pendingReviews.length,
    totalAttempts,
  };
}

// ---------------------------------------------------------------------------
// Examination & Attempt Operations (Phase 4, 5, 6, 7)
// ---------------------------------------------------------------------------

export async function getAvailableTestsForStudent(studentId: string) {
  const db = readLocalDB();
  // Return tests that are published or active
  const tests = db.tests.filter(t => t.status === 'published' || t.status === 'active');

  return tests.map(t => {
    const questions = db.questions.filter(q => q.test_id === t.id);
    const studentAttempts = db.test_attempts.filter(a => a.test_id === t.id && a.student_id === studentId);
    const latestAttempt = studentAttempts.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];

    return {
      id: t.id,
      title: t.title,
      subject: t.subject,
      chapter: t.chapter,
      topic: t.topic,
      class_grade: t.class_grade,
      description: t.description,
      instructions: t.instructions,
      total_marks: t.total_marks,
      duration_minutes: t.duration_minutes,
      exam_mode: t.exam_mode,
      question_count: questions.length,
      negative_marking_enabled: t.negative_marking_enabled,
      anti_cheat_settings: t.anti_cheat_settings,
      student_attempt_status: latestAttempt ? latestAttempt.status : 'not_started',
      latest_attempt_id: latestAttempt ? latestAttempt.id : null,
      latest_score: latestAttempt && (latestAttempt.status === 'published' || latestAttempt.status === 'evaluated') ? latestAttempt.final_score : null,
      latest_percentage: latestAttempt && (latestAttempt.status === 'published' || latestAttempt.status === 'evaluated') ? latestAttempt.percentage : null,
    };
  });
}

/**
 * Loads test questions for the live examination.
 * STRICT SECURITY: Never returns is_correct, explanation, or numerical_answer to student!
 */
export async function getExamQuestionsForStudent(testId: string) {
  const db = readLocalDB();
  const test = db.tests.find(t => t.id === testId);
  if (!test) return null;

  const rawQuestions = db.questions
    .filter(q => q.test_id === testId)
    .sort((a, b) => a.order_index - b.order_index);

  const sanitizedQuestions = rawQuestions.map((q, idx) => {
    const rawOptions = db.question_options
      .filter(o => o.question_id === q.id)
      .sort((a, b) => a.order_index - b.order_index);

    // Sanitize options: remove is_correct
    const options = rawOptions.map(o => ({
      id: o.id,
      option_letter: o.option_letter,
      option_text: o.option_text,
      image_url: o.image_url,
    }));

    return {
      id: q.id,
      question_number: idx + 1,
      question_text: q.question_text,
      question_type: q.question_type,
      marks: q.marks,
      negative_marks: q.negative_marks,
      image_url: q.image_url,
      options,
    };
  });

  return {
    test: {
      id: test.id,
      title: test.title,
      subject: test.subject,
      chapter: test.chapter,
      instructions: test.instructions,
      total_marks: test.total_marks,
      duration_minutes: test.duration_minutes,
      exam_mode: test.exam_mode,
      negative_marking_enabled: test.negative_marking_enabled,
      anti_cheat_settings: test.anti_cheat_settings,
    },
    questions: sanitizedQuestions,
  };
}

export async function startOrCreateExamAttempt(studentId: string, testId: string) {
  const db = readLocalDB();
  const test = db.tests.find(t => t.id === testId);
  if (!test) return null;

  // Check if an attempt is currently in progress
  let attempt = db.test_attempts.find(
    a => a.test_id === testId && a.student_id === studentId && a.status === 'in_progress'
  );

  if (!attempt) {
    const attemptId = crypto.randomUUID();
    const prevCount = db.test_attempts.filter(a => a.test_id === testId && a.student_id === studentId).length;

    attempt = {
      id: attemptId,
      test_id: testId,
      student_id: studentId,
      attempt_number: prevCount + 1,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      submitted_at: null,
      time_spent_seconds: 0,
      total_marks_possible: test.total_marks,
      provisional_academic_score: 0,
      teacher_adjusted_score: null,
      integrity_deduction: 0,
      final_score: 0,
      percentage: 0,
      is_auto_submitted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.test_attempts.push(attempt);
    writeLocalDB(db);
  }

  // Fetch any existing saved responses for this attempt
  const existingResponses = db.student_responses.filter(r => r.attempt_id === attempt.id);

  return {
    attempt,
    responses: existingResponses,
  };
}

export async function saveSingleStudentResponse(
  attemptId: string,
  questionId: string,
  data: {
    selected_options?: any;
    numerical_response?: number | null;
    text_response?: string;
    is_visited?: boolean;
    is_marked_for_review?: boolean;
    is_answered?: boolean;
  }
) {
  const db = readLocalDB();
  let resp = db.student_responses.find(r => r.attempt_id === attemptId && r.question_id === questionId);

  if (!resp) {
    resp = {
      id: crypto.randomUUID(),
      attempt_id: attemptId,
      question_id: questionId,
      selected_options: data.selected_options ?? null,
      numerical_response: data.numerical_response ?? null,
      text_response: data.text_response ?? '',
      is_visited: data.is_visited ?? true,
      is_marked_for_review: data.is_marked_for_review ?? false,
      is_answered: data.is_answered ?? false,
      marks_awarded: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.student_responses.push(resp);
  } else {
    if (data.selected_options !== undefined) resp.selected_options = data.selected_options;
    if (data.numerical_response !== undefined) resp.numerical_response = data.numerical_response;
    if (data.text_response !== undefined) resp.text_response = data.text_response;
    if (data.is_visited !== undefined) resp.is_visited = data.is_visited;
    if (data.is_marked_for_review !== undefined) resp.is_marked_for_review = data.is_marked_for_review;
    if (data.is_answered !== undefined) resp.is_answered = data.is_answered;
    resp.updated_at = new Date().toISOString();
  }

  writeLocalDB(db);
  return resp;
}

export async function logIntegrityEvent(
  attemptId: string,
  studentId: string,
  testId: string,
  eventType: string,
  durationSeconds = 0,
  metadata: Record<string, any> = {}
) {
  const db = readLocalDB();
  const event = {
    id: crypto.randomUUID(),
    attempt_id: attemptId,
    student_id: studentId,
    test_id: testId,
    event_type: eventType,
    duration_seconds: durationSeconds,
    metadata,
    timestamp: new Date().toISOString(),
  };
  db.integrity_events.push(event);
  writeLocalDB(db);
  return event;
}
