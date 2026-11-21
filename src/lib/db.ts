import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.NETLIFY) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.VERCEL);

const hasPostgres = Boolean(
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('your-project')
);

export function getPgPool(): Pool | null {
  if (pool) return pool;
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('your-project')) return null;

  try {
    const isLocal =
      process.env.DATABASE_URL.includes('localhost') ||
      process.env.DATABASE_URL.includes('127.0.0.1');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Unexpected Error]:', err);
    });

    return pool;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Local Development Storage (Strictly offline dev fallback only)
// ---------------------------------------------------------------------------
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
  answer_attachments: any[];
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
    answer_attachments: [],
    integrity_events: [],
    activity_logs: [],
    teacher_reviews: [],
    question_bank: [],
    pdf_uploads: [],
  };
}

export function readLocalDB(): LocalDB {
  // In production or when PostgreSQL is configured, never access the filesystem
  if (isProduction || hasPostgres) {
    return getInitialDB();
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.answer_attachments) parsed.answer_attachments = [];
    return parsed;
  } catch (err) {
    console.warn('[LocalDB] Could not read local file, returning memory initial state:', err);
    return getInitialDB();
  }
}

export function writeLocalDB(data: LocalDB): void {
  // In production or when PostgreSQL is configured, never write to the filesystem
  if (isProduction || hasPostgres) {
    return;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[LocalDB] Could not write to local file in this environment:', err);
  }
}

// ---------------------------------------------------------------------------
// Primary Database Query Executor
// ---------------------------------------------------------------------------
export async function query<T = any>(
  text: string,
  params: any[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const p = getPgPool();
  if (p && hasPostgres) {
    try {
      const res = await p.query(text, params);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
    } catch (error: any) {
      console.error('[PostgreSQL Query Error]:', error?.message || error, '\nSQL:', text);
      // In production, throw the real error - NEVER fall back to local file
      throw error;
    }
  }

  // Only offline local development mode without PostgreSQL may use the local JSON mock
  if (!isProduction && !hasPostgres) {
    return executeLocalQuery<T>(text, params);
  }

  throw new Error(
    'Database connection is not configured or unavailable. Please verify DATABASE_URL is set.'
  );
}

function executeLocalQuery<T = any>(
  sql: string,
  params: any[] = []
): { rows: T[]; rowCount: number } {
  const db = readLocalDB();
  const cleanSql = sql.trim().toLowerCase();

  if (cleanSql.startsWith('select')) {
    if (cleanSql.includes('from users')) {
      let filtered = [...db.users];
      if (cleanSql.includes('where username = $1')) {
        filtered = filtered.filter((u) => u.username === params[0]);
      } else if (cleanSql.includes('where id = $1')) {
        filtered = filtered.filter((u) => u.id === params[0]);
      } else if (cleanSql.includes('where role = $1')) {
        filtered = filtered.filter((u) => u.role === params[0]);
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }

    if (cleanSql.includes('from system_settings')) {
      let filtered = [...db.system_settings];
      if (cleanSql.includes('where key = $1')) {
        filtered = filtered.filter((s) => s.key === params[0]);
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }

    if (cleanSql.includes('from tests')) {
      let filtered = [...db.tests];
      if (cleanSql.includes('where id = $1')) {
        filtered = filtered.filter((t) => t.id === params[0]);
      } else if (cleanSql.includes('where status = $1')) {
        filtered = filtered.filter((t) => t.status === params[0]);
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }

    if (cleanSql.includes('from activity_logs')) {
      const sorted = [...db.activity_logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return { rows: sorted as unknown as T[], rowCount: sorted.length };
    }

    if (cleanSql.includes('from test_attempts')) {
      let filtered = [...db.test_attempts];
      if (cleanSql.includes('where id = $1')) {
        filtered = filtered.filter((a) => a.id === params[0]);
      } else if (cleanSql.includes('where student_id = $1')) {
        filtered = filtered.filter((a) => a.student_id === params[0]);
      } else if (cleanSql.includes('where test_id = $1')) {
        filtered = filtered.filter((a) => a.test_id === params[0]);
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }
  }

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

  if (cleanSql.startsWith('insert into activity_logs')) {
    const newLog = {
      id: crypto.randomUUID(),
      user_id: params[0],
      event_type: params[1],
      ip_address: params[2] || '127.0.0.1',
      user_agent: params[3] || 'browser',
      metadata: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4] || {},
      timestamp: new Date().toISOString(),
    };
    db.activity_logs.push(newLog);
    writeLocalDB(db);
    return { rows: [newLog] as unknown as T[], rowCount: 1 };
  }

  if (cleanSql.startsWith('update users')) {
    if (cleanSql.includes('set last_login_at = now() where id = $1')) {
      const user = db.users.find((u) => u.id === params[0]);
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
// High-Level Data Access Methods (PostgreSQL first with graceful local fallback)
// ---------------------------------------------------------------------------

export async function getStudentsList(searchTerm = '', statusFilter = 'all') {
  if (hasPostgres) {
    let sql = `
      SELECT u.id, u.username, u.real_name, u.school, u.status, u.must_change_password,
             u.created_at, u.last_login_at,
             COUNT(a.id) AS total_attempts,
             ROUND(AVG(a.percentage) FILTER (WHERE a.status IN ('published', 'evaluated'))) AS average_score
      FROM users u
      LEFT JOIN test_attempts a ON a.student_id = u.id
      WHERE u.role = 'student'
    `;
    const params: any[] = [];

    if (statusFilter !== 'all') {
      params.push(statusFilter);
      sql += ` AND u.status = $${params.length}`;
    }

    if (searchTerm.trim()) {
      params.push(`%${searchTerm.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(u.real_name) LIKE $${params.length} OR LOWER(u.username) LIKE $${params.length} OR LOWER(COALESCE(u.school, '')) LIKE $${params.length})`;
    }

    sql += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    const res = await query(sql, params);
    return res.rows.map((r: any) => ({
      ...r,
      total_attempts: Number(r.total_attempts) || 0,
      average_score: r.average_score !== null ? Number(r.average_score) : null,
    }));
  }

  // Local fallback
  const db = readLocalDB();
  let students = db.users.filter((u) => u.role === 'student');

  if (statusFilter !== 'all') {
    students = students.filter((s) => s.status === statusFilter);
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    students = students.filter(
      (s) =>
        s.real_name.toLowerCase().includes(term) ||
        s.username.toLowerCase().includes(term) ||
        (s.school && s.school.toLowerCase().includes(term))
    );
  }

  return students.map((s) => {
    const attempts = db.test_attempts.filter((a) => a.student_id === s.id);
    const completedAttempts = attempts.filter(
      (a) => a.status === 'published' || a.status === 'evaluated'
    );
    const avgScore =
      completedAttempts.length > 0
        ? Math.round(
            completedAttempts.reduce(
              (acc, curr) => acc + (Number(curr.percentage) || 0),
              0
            ) / completedAttempts.length
          )
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
  if (hasPostgres) {
    const res = await query(
      `UPDATE users
       SET real_name = COALESCE($1, real_name),
           school = COALESCE($2, school),
           status = COALESCE($3, status),
           must_change_password = COALESCE($4, must_change_password),
           updated_at = NOW()
       WHERE id = $5 AND role = 'student'
       RETURNING id, username, real_name, school, status, must_change_password, created_at, updated_at`,
      [
        data.real_name ? data.real_name.trim() : null,
        data.school !== undefined ? data.school.trim() : null,
        data.status || null,
        data.must_change_password !== undefined ? data.must_change_password : null,
        id,
      ]
    );
    return res.rows[0] || null;
  }

  const db = readLocalDB();
  const user = db.users.find((u) => u.id === id && u.role === 'student');
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
  if (hasPostgres) {
    const res = await query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = $2,
           updated_at = NOW()
       WHERE id = $3 AND role = 'student'
       RETURNING id, username, real_name, status`,
      [passwordHash, forceChange, id]
    );
    return res.rows[0] || null;
  }

  const db = readLocalDB();
  const user = db.users.find((u) => u.id === id && u.role === 'student');
  if (!user) return null;

  user.password_hash = passwordHash;
  user.must_change_password = forceChange;
  user.updated_at = new Date().toISOString();

  writeLocalDB(db);
  return user;
}

export async function deleteStudent(id: string) {
  if (hasPostgres) {
    const res = await query(
      `DELETE FROM users WHERE id = $1 AND role = 'student' RETURNING id, username`,
      [id]
    );
    return res.rows[0] || null;
  }

  const db = readLocalDB();
  const index = db.users.findIndex((u) => u.id === id && u.role === 'student');
  if (index === -1) return null;

  const deleted = db.users.splice(index, 1)[0];
  writeLocalDB(db);
  return deleted;
}

export async function getActivityLogsList(
  options: {
    userId?: string;
    eventType?: string;
    searchTerm?: string;
    limit?: number;
  } = {}
) {
  if (hasPostgres) {
    let sql = `
      SELECT l.id, l.user_id, l.event_type, l.ip_address, l.user_agent, l.metadata, l.timestamp,
             COALESCE(u.real_name, 'System / Anonymous') AS student_name,
             COALESCE(u.username, 'system') AS username,
             COALESCE(u.school, '-') AS school,
             COALESCE(u.role, 'system') AS role
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options.userId) {
      params.push(options.userId);
      sql += ` AND l.user_id = $${params.length}`;
    }

    if (options.eventType && options.eventType !== 'all') {
      params.push(options.eventType);
      sql += ` AND l.event_type = $${params.length}`;
    }

    if (options.searchTerm?.trim()) {
      params.push(`%${options.searchTerm.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(COALESCE(u.real_name, '')) LIKE $${params.length} OR LOWER(COALESCE(u.username, '')) LIKE $${params.length} OR LOWER(l.event_type) LIKE $${params.length})`;
    }

    params.push(options.limit || 100);
    sql += ` ORDER BY l.timestamp DESC LIMIT $${params.length}`;

    const res = await query(sql, params);
    return res.rows;
  }

  const db = readLocalDB();
  let logs = [...db.activity_logs];

  if (options.userId) {
    logs = logs.filter((l) => l.user_id === options.userId);
  }

  if (options.eventType && options.eventType !== 'all') {
    logs = logs.filter((l) => l.event_type === options.eventType);
  }

  const enriched = logs.map((l) => {
    const user = db.users.find((u) => u.id === l.user_id);
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
        (l) =>
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
  if (hasPostgres) {
    const res = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'active')::int AS active_students,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'pending_approval')::int AS pending_approval_students,
        (SELECT COUNT(*) FROM tests WHERE status IN ('published', 'active'))::int AS published_tests,
        (SELECT COUNT(*) FROM test_attempts WHERE status IN ('pending_review', 'submitted'))::int AS pending_reviews,
        (SELECT COUNT(*) FROM test_attempts)::int AS total_attempts
    `);

    const row = res.rows[0] || {};
    return {
      totalStudents: row.total_students || 0,
      activeStudents: row.active_students || 0,
      pendingApprovalStudents: row.pending_approval_students || 0,
      publishedTests: row.published_tests || 0,
      pendingReviews: row.pending_reviews || 0,
      totalAttempts: row.total_attempts || 0,
    };
  }

  const db = readLocalDB();
  const students = db.users.filter((u) => u.role === 'student');
  const activeStudents = students.filter((s) => s.status === 'active');
  const pendingApproval = students.filter((s) => s.status === 'pending_approval');
  const publishedTests = db.tests.filter((t) => t.status === 'published' || t.status === 'active');
  const pendingReviews = db.test_attempts.filter(
    (a) => a.status === 'pending_review' || a.status === 'submitted'
  );
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
// Examination & Attempt Operations
// ---------------------------------------------------------------------------

export async function getAvailableTestsForStudent(studentId: string) {
  if (hasPostgres) {
    const res = await query(
      `SELECT t.id, t.title, t.subject, t.chapter, t.topic, t.class_grade,
              t.description, t.instructions, t.total_marks, t.duration_minutes,
              t.exam_mode, t.negative_marking_enabled, t.anti_cheat_settings,
              t.status, t.start_date, t.end_date,
              (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id)::int AS question_count,
              a.id AS latest_attempt_id,
              COALESCE(a.status, 'not_started') AS student_attempt_status,
              CASE WHEN a.status IN ('published', 'evaluated') THEN a.final_score ELSE NULL END AS latest_score,
              CASE WHEN a.status IN ('published', 'evaluated') THEN a.percentage ELSE NULL END AS latest_percentage
       FROM tests t
       LEFT JOIN LATERAL (
         SELECT id, status, final_score, percentage
         FROM test_attempts
         WHERE test_id = t.id AND student_id = $1
         ORDER BY started_at DESC
         LIMIT 1
       ) a ON true
       WHERE t.status IN ('published', 'active', 'closed')
       ORDER BY t.created_at DESC`,
      [studentId]
    );

    return res.rows.map((t: any) => ({
      ...t,
      total_marks: Number(t.total_marks),
      duration_minutes: Number(t.duration_minutes),
      question_count: Number(t.question_count) || 0,
      latest_score: t.latest_score !== null ? Number(t.latest_score) : null,
      latest_percentage: t.latest_percentage !== null ? Number(t.latest_percentage) : null,
    }));
  }

  const db = readLocalDB();
  const tests = db.tests.filter(
    (t) => t.status === 'published' || t.status === 'active' || t.status === 'closed'
  );

  return tests.map((t) => {
    const questions = db.questions.filter((q) => q.test_id === t.id);
    const studentAttempts = db.test_attempts.filter(
      (a) => a.test_id === t.id && a.student_id === studentId
    );
    const latestAttempt = studentAttempts.sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )[0];

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
      status: t.status,
      start_date: t.start_date || null,
      end_date: t.end_date || null,
      student_attempt_status: latestAttempt ? latestAttempt.status : 'not_started',
      latest_attempt_id: latestAttempt ? latestAttempt.id : null,
      latest_score:
        latestAttempt &&
        (latestAttempt.status === 'published' || latestAttempt.status === 'evaluated')
          ? latestAttempt.final_score
          : null,
      latest_percentage:
        latestAttempt &&
        (latestAttempt.status === 'published' || latestAttempt.status === 'evaluated')
          ? latestAttempt.percentage
          : null,
    };
  });
}

/**
 * Loads test questions for the live examination.
 * STRICT SECURITY: Never returns is_correct, explanation, or numerical_answer to student!
 */
export async function getExamQuestionsForStudent(testId: string) {
  if (hasPostgres) {
    const testRes = await query('SELECT * FROM tests WHERE id = $1', [testId]);
    if (testRes.rowCount === 0) return null;
    const test = testRes.rows[0];

    const questionsRes = await query(
      `SELECT id, question_number, question_text, question_type, marks, negative_marks,
              image_url, numerical_unit, assertion_text, reason_text, matching_pairs,
              rubric, allow_handwritten, allow_typed, order_index
       FROM questions
       WHERE test_id = $1
       ORDER BY order_index ASC`,
      [testId]
    );

    const questionIds = questionsRes.rows.map((q: any) => q.id);
    let optionsMap: Record<string, any[]> = {};

    if (questionIds.length > 0) {
      const optionsRes = await query(
        `SELECT id, question_id, option_letter, option_text, image_url, order_index
         FROM question_options
         WHERE question_id = ANY($1::uuid[])
         ORDER BY order_index ASC`,
        [questionIds]
      );

      for (const opt of optionsRes.rows) {
        if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
        optionsMap[opt.question_id].push({
          id: opt.id,
          option_letter: opt.option_letter,
          option_text: opt.option_text,
          image_url: opt.image_url,
        });
      }
    }

    const sanitizedQuestions = questionsRes.rows.map((q: any, idx: number) => ({
      id: q.id,
      question_number: idx + 1,
      question_text: q.question_text,
      question_type: q.question_type,
      marks: Number(q.marks),
      negative_marks: Number(q.negative_marks),
      image_url: q.image_url,
      numerical_unit: q.numerical_unit || null,
      assertion_text: q.assertion_text || null,
      reason_text: q.reason_text || null,
      matching_pairs: q.matching_pairs || null,
      rubric: q.rubric || null,
      allow_handwritten: q.allow_handwritten !== false,
      allow_typed: q.allow_typed !== false,
      options: optionsMap[q.id] || [],
    }));

    return {
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        chapter: test.chapter,
        instructions: test.instructions,
        total_marks: Number(test.total_marks),
        duration_minutes: Number(test.duration_minutes),
        exam_mode: test.exam_mode,
        negative_marking_enabled: test.negative_marking_enabled,
        anti_cheat_settings: test.anti_cheat_settings,
        status: test.status,
        start_date: test.start_date || null,
        end_date: test.end_date || null,
      },
      questions: sanitizedQuestions,
    };
  }

  const db = readLocalDB();
  const test = db.tests.find((t) => t.id === testId);
  if (!test) return null;

  const rawQuestions = db.questions
    .filter((q) => q.test_id === testId)
    .sort((a, b) => a.order_index - b.order_index);

  const sanitizedQuestions = rawQuestions.map((q, idx) => {
    const rawOptions = db.question_options
      .filter((o) => o.question_id === q.id)
      .sort((a, b) => a.order_index - b.order_index);

    const options = rawOptions.map((o) => ({
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
      numerical_unit: q.numerical_unit || null,
      assertion_text: q.assertion_text || null,
      reason_text: q.reason_text || null,
      matching_pairs: q.matching_pairs || null,
      rubric: q.rubric || null,
      allow_handwritten: q.allow_handwritten !== false,
      allow_typed: q.allow_typed !== false,
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
      status: test.status,
      start_date: test.start_date || null,
      end_date: test.end_date || null,
    },
    questions: sanitizedQuestions,
  };
}

export async function startOrCreateExamAttempt(studentId: string, testId: string) {
  if (hasPostgres) {
    const testRes = await query('SELECT * FROM tests WHERE id = $1', [testId]);
    if (testRes.rowCount === 0) return null;
    const test = testRes.rows[0];

    // Find active in_progress attempt
    const existingAttempt = await query(
      `SELECT * FROM test_attempts
       WHERE test_id = $1 AND student_id = $2 AND status = 'in_progress'
       LIMIT 1`,
      [testId, studentId]
    );

    let attempt: any;
    if (existingAttempt.rowCount > 0) {
      attempt = existingAttempt.rows[0];
    } else {
      const countRes = await query(
        `SELECT COUNT(*)::int AS count FROM test_attempts WHERE test_id = $1 AND student_id = $2`,
        [testId, studentId]
      );
      const attemptNum = (countRes.rows[0]?.count || 0) + 1;

      const newAttemptRes = await query(
        `INSERT INTO test_attempts (
          test_id, student_id, attempt_number, status, started_at,
          time_spent_seconds, total_marks_possible, provisional_academic_score,
          final_score, percentage, is_auto_submitted, created_at, updated_at
        ) VALUES ($1, $2, $3, 'in_progress', NOW(), 0, $4, 0, 0, 0, false, NOW(), NOW())
        RETURNING *`,
        [testId, studentId, attemptNum, Number(test.total_marks)]
      );
      attempt = newAttemptRes.rows[0];
    }

    const responsesRes = await query(
      `SELECT * FROM student_responses WHERE attempt_id = $1`,
      [attempt.id]
    );

    const attachmentsRes = await query(
      `SELECT * FROM answer_attachments WHERE attempt_id = $1 ORDER BY page_order ASC`,
      [attempt.id]
    );

    return {
      attempt,
      responses: responsesRes.rows,
      attachments: attachmentsRes.rows,
    };
  }

  const db = readLocalDB();
  const test = db.tests.find((t) => t.id === testId);
  if (!test) return null;

  let attempt = db.test_attempts.find(
    (a) => a.test_id === testId && a.student_id === studentId && a.status === 'in_progress'
  );

  if (!attempt) {
    const attemptId = crypto.randomUUID();
    const prevCount = db.test_attempts.filter(
      (a) => a.test_id === testId && a.student_id === studentId
    ).length;

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

  const existingResponses = db.student_responses.filter((r) => r.attempt_id === attempt.id);
  const existingAttachments = (db.answer_attachments || [])
    .filter((a) => a.attempt_id === attempt.id)
    .sort((a, b) => (a.page_order || 0) - (b.page_order || 0));

  return {
    attempt,
    responses: existingResponses,
    attachments: existingAttachments,
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
  if (hasPostgres) {
    const res = await query(
      `INSERT INTO student_responses (
        attempt_id, question_id, selected_options, numerical_response,
        text_response, is_visited, is_marked_for_review, is_answered,
        marks_awarded, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW(), NOW())
      ON CONFLICT (attempt_id, question_id) DO UPDATE SET
        selected_options = COALESCE(EXCLUDED.selected_options, student_responses.selected_options),
        numerical_response = COALESCE(EXCLUDED.numerical_response, student_responses.numerical_response),
        text_response = COALESCE(EXCLUDED.text_response, student_responses.text_response),
        is_visited = COALESCE(EXCLUDED.is_visited, student_responses.is_visited),
        is_marked_for_review = COALESCE(EXCLUDED.is_marked_for_review, student_responses.is_marked_for_review),
        is_answered = COALESCE(EXCLUDED.is_answered, student_responses.is_answered),
        updated_at = NOW()
      RETURNING *`,
      [
        attemptId,
        questionId,
        data.selected_options !== undefined ? JSON.stringify(data.selected_options) : null,
        data.numerical_response !== undefined ? data.numerical_response : null,
        data.text_response !== undefined ? data.text_response : '',
        data.is_visited ?? true,
        data.is_marked_for_review ?? false,
        data.is_answered ?? false,
      ]
    );
    return res.rows[0];
  }

  const db = readLocalDB();
  let resp = db.student_responses.find(
    (r) => r.attempt_id === attemptId && r.question_id === questionId
  );

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
  if (hasPostgres) {
    const res = await query(
      `INSERT INTO integrity_events (
        attempt_id, student_id, test_id, event_type, duration_seconds, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [attemptId, studentId, testId, eventType, durationSeconds, JSON.stringify(metadata)]
    );
    return res.rows[0];
  }

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

// ---------------------------------------------------------------------------
// Answer Attachments & Handwritten Pages Storage Operations
// ---------------------------------------------------------------------------

export async function saveAnswerAttachment(data: {
  attempt_id: string;
  student_id: string;
  test_id: string;
  question_id: string;
  file_url: string;
  storage_path?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  page_order?: number;
}) {
  if (hasPostgres) {
    let nextOrder = data.page_order;
    if (!nextOrder) {
      const countRes = await query(
        `SELECT COUNT(*)::int AS count FROM answer_attachments WHERE attempt_id = $1 AND question_id = $2`,
        [data.attempt_id, data.question_id]
      );
      nextOrder = (countRes.rows[0]?.count || 0) + 1;
    }

    const res = await query(
      `INSERT INTO answer_attachments (
        attempt_id, student_id, test_id, question_id, file_url, storage_path,
        file_name, file_size, mime_type, page_order, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        data.attempt_id,
        data.student_id,
        data.test_id,
        data.question_id,
        data.file_url,
        data.storage_path || '',
        data.file_name,
        data.file_size,
        data.mime_type,
        nextOrder,
      ]
    );
    return res.rows[0];
  }

  const db = readLocalDB();
  if (!db.answer_attachments) db.answer_attachments = [];

  const existingPages = db.answer_attachments.filter(
    (a) => a.attempt_id === data.attempt_id && a.question_id === data.question_id
  );
  const nextOrder = data.page_order || existingPages.length + 1;

  const attachment = {
    id: crypto.randomUUID(),
    attempt_id: data.attempt_id,
    student_id: data.student_id,
    test_id: data.test_id,
    question_id: data.question_id,
    file_url: data.file_url,
    storage_path: data.storage_path || '',
    file_name: data.file_name,
    file_size: data.file_size,
    mime_type: data.mime_type,
    page_order: nextOrder,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.answer_attachments.push(attachment);
  writeLocalDB(db);
  return attachment;
}

export async function getAnswerAttachments(attemptId: string, questionId?: string) {
  if (hasPostgres) {
    if (questionId) {
      const res = await query(
        `SELECT * FROM answer_attachments WHERE attempt_id = $1 AND question_id = $2 ORDER BY page_order ASC`,
        [attemptId, questionId]
      );
      return res.rows;
    }
    const res = await query(
      `SELECT * FROM answer_attachments WHERE attempt_id = $1 ORDER BY page_order ASC`,
      [attemptId]
    );
    return res.rows;
  }

  const db = readLocalDB();
  if (!db.answer_attachments) return [];
  let list = db.answer_attachments.filter((a) => a.attempt_id === attemptId);
  if (questionId) {
    list = list.filter((a) => a.question_id === questionId);
  }
  return list.sort((a, b) => (a.page_order || 0) - (b.page_order || 0));
}

export async function deleteAnswerAttachment(attachmentId: string, studentId: string) {
  if (hasPostgres) {
    const res = await query(
      `DELETE FROM answer_attachments WHERE id = $1 AND student_id = $2 RETURNING attempt_id, question_id`,
      [attachmentId, studentId]
    );
    if (res.rowCount === 0) return false;

    // Re-sequence remaining pages for this question
    const { attempt_id, question_id } = res.rows[0];
    const remainingRes = await query(
      `SELECT id FROM answer_attachments WHERE attempt_id = $1 AND question_id = $2 ORDER BY page_order ASC`,
      [attempt_id, question_id]
    );
    for (let i = 0; i < remainingRes.rows.length; i++) {
      await query(`UPDATE answer_attachments SET page_order = $1 WHERE id = $2`, [
        i + 1,
        remainingRes.rows[i].id,
      ]);
    }
    return true;
  }

  const db = readLocalDB();
  if (!db.answer_attachments) return false;
  const idx = db.answer_attachments.findIndex(
    (a) => a.id === attachmentId && a.student_id === studentId
  );
  if (idx === -1) return false;

  const [removed] = db.answer_attachments.splice(idx, 1);
  const remaining = db.answer_attachments
    .filter((a) => a.attempt_id === removed.attempt_id && a.question_id === removed.question_id)
    .sort((a, b) => (a.page_order || 0) - (b.page_order || 0));

  remaining.forEach((att, index) => {
    att.page_order = index + 1;
  });

  writeLocalDB(db);
  return true;
}

export async function reorderAnswerAttachments(
  attemptId: string,
  questionId: string,
  orderedIds: string[]
) {
  if (hasPostgres) {
    for (let index = 0; index < orderedIds.length; index++) {
      await query(
        `UPDATE answer_attachments
         SET page_order = $1, updated_at = NOW()
         WHERE id = $2 AND attempt_id = $3 AND question_id = $4`,
        [index + 1, orderedIds[index], attemptId, questionId]
      );
    }
    return getAnswerAttachments(attemptId, questionId);
  }

  const db = readLocalDB();
  if (!db.answer_attachments) return [];

  orderedIds.forEach((id, index) => {
    const att = db.answer_attachments.find(
      (a) => a.id === id && a.attempt_id === attemptId && a.question_id === questionId
    );
    if (att) {
      att.page_order = index + 1;
      att.updated_at = new Date().toISOString();
    }
  });

  writeLocalDB(db);
  return getAnswerAttachments(attemptId, questionId);
}

// ---------------------------------------------------------------------------
// Student Scorecard / Result Details (Phase 5 / 6)
// ---------------------------------------------------------------------------
export async function getStudentExamResultData(attemptId: string, studentId: string) {
  if (hasPostgres) {
    const attemptRes = await query(
      `SELECT * FROM test_attempts WHERE id = $1 AND student_id = $2`,
      [attemptId, studentId]
    );
    if (attemptRes.rowCount === 0) return null;
    const attempt = attemptRes.rows[0];

    const testRes = await query('SELECT * FROM tests WHERE id = $1', [attempt.test_id]);
    const test = testRes.rows[0] || null;

    const questionsRes = await query(
      `SELECT * FROM questions WHERE test_id = $1 ORDER BY order_index ASC`,
      [attempt.test_id]
    );
    const questions = questionsRes.rows;

    const questionIds = questions.map((q: any) => q.id);
    let options: any[] = [];
    if (questionIds.length > 0) {
      const optionsRes = await query(
        `SELECT * FROM question_options WHERE question_id = ANY($1::uuid[]) ORDER BY order_index ASC`,
        [questionIds]
      );
      options = optionsRes.rows;
    }

    const responsesRes = await query(
      `SELECT * FROM student_responses WHERE attempt_id = $1`,
      [attempt.id]
    );

    const attachmentsRes = await query(
      `SELECT * FROM answer_attachments WHERE attempt_id = $1 ORDER BY page_order ASC`,
      [attempt.id]
    );

    return {
      attempt,
      test,
      questions,
      options,
      responses: responsesRes.rows,
      attachments: attachmentsRes.rows,
    };
  }

  const db = readLocalDB();
  const attempt = db.test_attempts.find(
    (a) => a.id === attemptId && a.student_id === studentId
  );
  if (!attempt) return null;

  const test = db.tests.find((t) => t.id === attempt.test_id);
  const questions = db.questions
    .filter((q) => q.test_id === attempt.test_id)
    .sort((a, b) => a.order_index - b.order_index);
  const options = db.question_options.filter((o) =>
    questions.some((q) => q.id === o.question_id)
  );
  const responses = db.student_responses.filter((r) => r.attempt_id === attempt.id);
  const attachments = (db.answer_attachments || []).filter(
    (a) => a.attempt_id === attempt.id
  );

  return {
    attempt,
    test,
    questions,
    options,
    responses,
    attachments,
  };
}
