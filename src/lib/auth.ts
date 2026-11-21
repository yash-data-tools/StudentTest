import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'smart-tuition-exam-portal-jwt-secret-key-32chars-min-length'
);

export const TOKEN_COOKIE_NAME = 'smart_exam_auth_token';

export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'student';
  real_name: string;
  school?: string;
  status: string;
  must_change_password?: boolean;
}

// 1. Password Security
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// 2. JWT Generation & Verification
export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
    real_name: user.real_name,
    school: user.school || '',
    status: user.status,
    must_change_password: user.must_change_password || false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

// 3. Cookie Management (for Server Actions / Route Handlers)
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

// 4. Rate Limiting Protection (In-Memory tracking for brute force prevention)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const record = loginAttempts.get(key);
  const now = Date.now();

  if (!record) {
    return { allowed: true };
  }

  if (now - record.lastAttempt > LOCKOUT_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remaining = Math.ceil((LOCKOUT_MS - (now - record.lastAttempt)) / 1000);
    return { allowed: false, retryAfterSeconds: remaining };
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string) {
  const record = loginAttempts.get(key) || { count: 0, lastAttempt: Date.now() };
  record.count += 1;
  record.lastAttempt = Date.now();
  loginAttempts.set(key, record);
}

export function resetRateLimit(key: string) {
  loginAttempts.delete(key);
}

// 5. Activity Logging Helper
export async function logActivity(userId: string | null, eventType: string, metadata: Record<string, any> = {}) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, event_type, ip_address, user_agent, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [userId, eventType, '127.0.0.1', 'web', JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// 6. Initial Admin Seeding
export async function ensureAdminExists() {
  try {
    const adminUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345';

    // Check if any admin exists in the database
    const res = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (res.rowCount === 0) {
      const hashed = await hashPassword(defaultPassword);
      await query(
        `INSERT INTO users (username, password_hash, role, real_name, school, status, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminUsername, hashed, 'admin', 'Head Tutor / Administrator', 'Main Tuition Academy', 'active', false]
      );
      console.log(`[Admin Seeding] Created default admin account: ${adminUsername}`);
    }
  } catch (err) {
    console.warn('[Admin Seeding Warning]: Could not seed initial admin account:', err);
  }
}
