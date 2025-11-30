import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes
const protectedRoutes = ['/dashboard'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Get token from cookies or check if it exists
    const token = request.cookies.get('token')?.value;
    
    // Check if the route is protected
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
    
    // If accessing protected route without token, redirect to login
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }
    
    // If accessing auth routes with token, redirect to dashboard
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/dashboard/startup', request.url));
    }
    
    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    ],
};
