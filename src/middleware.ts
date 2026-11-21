import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'smart-tuition-exam-portal-jwt-secret-key-32chars-min-length'
);

const TOKEN_COOKIE_NAME = 'smart_exam_auth_token';

interface TokenPayload {
  id: string;
  username: string;
  role: 'admin' | 'student';
  real_name: string;
  status: string;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  let session: TokenPayload | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload as unknown as TokenPayload;
    } catch {
      session = null;
    }
  }

  // 1. Admin Login Page
  if (pathname === '/admin/login') {
    if (session?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 2. Student Login & Register Pages
  if (pathname === '/login' || pathname === '/register') {
    if (session) {
      if (session.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. Admin Protected Routes
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (session.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
    }
    return NextResponse.next();
  }

  // 4. Student Protected Routes
  if (pathname.startsWith('/student')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (session.role !== 'student') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/student/:path*',
    '/login',
    '/register',
  ],
};
