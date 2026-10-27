import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Dashboard routes that require an authenticated session.
const PROTECTED = ['/owner', '/manager', '/handyman', '/tenant'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only act on protected dashboard paths.
  const isProtected = PROTECTED.some(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  );
  if (!isProtected) return NextResponse.next();

  // The signIn() helper sets 'rh_session=1' on successful login.
  // The signOut() helper clears it.  Absence means unauthenticated.
  const hasSession = request.cookies.has('rh_session');
  if (hasSession) return NextResponse.next();

  // Redirect to login, preserving the intended destination so we can
  // send the user back after they sign in.
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match dashboard routes only; skip static assets and Next internals
     * so CSS/JS/images are never blocked by the auth check.
     */
    '/owner/:path*',
    '/manager/:path*',
    '/handyman/:path*',
    '/tenant/:path*',
  ],
};
