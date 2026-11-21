import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// PostgreSQL Pool instance (singleton)
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

// Local File Store for Instant Zero-Config Execution & Offline Resilience
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

interface LocalDB {
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

/**
 * Executes a query with automatic fallback to local store if PostgreSQL is unreachable or unconfigured
 */
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

  // If Postgres is not set or failed, execute via the resilient local query engine
  return executeLocalQuery<T>(text, params);
}

/**
 * Lightweight SQL-like emulator for key operations (CRUD on users, tests, questions, attempts, logs)
 */
function executeLocalQuery<T = any>(sql: string, params: any[] = []): { rows: T[]; rowCount: number } {
  const db = readLocalDB();
  const cleanSql = sql.trim().toLowerCase();

  // 1. SELECT queries
  if (cleanSql.startsWith('select')) {
    // SELECT * FROM users WHERE username = $1
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
      }
      return { rows: filtered as unknown as T[], rowCount: filtered.length };
    }

    if (cleanSql.includes('from activity_logs')) {
      const sorted = [...db.activity_logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { rows: sorted as unknown as T[], rowCount: sorted.length };
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
