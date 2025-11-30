# Authentication Implementation

## Overview
This document describes the authentication middleware implementation for protecting routes in the Next.js web application.

## Components

### 1. Middleware (`middleware.ts`)
- **Purpose**: Edge-level route protection using Next.js middleware
- **Features**:
  - Checks for JWT token in cookies
  - Redirects unauthenticated users to login page
  - Redirects authenticated users away from auth pages
  - Preserves redirect URL for post-login navigation

### 2. Auth Hook (`lib/hooks/useAuth.ts`)
- **Purpose**: Client-side authentication state management
- **Features**:
  - Validates JWT token from localStorage
  - Enforces role-based access (founder/investor)
  - Redirects based on user role
  - Provides logout functionality
  - Clears both localStorage and HTTP-only cookies

### 3. Cookie Management API (`app/api/auth/set-cookie/route.ts`)
- **Purpose**: Server-side cookie management
- **Features**:
  - Sets HTTP-only cookies for middleware
  - Deletes cookies on logout
  - Secure cookie configuration (httpOnly, sameSite, secure in production)

## Authentication Flow

### Login Flow
1. User submits credentials to Identity Service
2. Identity Service returns JWT token and user data
3. Frontend stores token in localStorage (for API calls)
4. Frontend calls `/api/auth/set-cookie` to set HTTP-only cookie (for middleware)
5. User is redirected to appropriate dashboard based on role

### Registration Flow
1. User submits registration data to Identity Service
2. Identity Service creates user and returns JWT token
3. Same cookie/localStorage flow as login
4. User is redirected to appropriate dashboard

### Protected Route Access
1. User navigates to protected route (e.g., `/dashboard/startup`)
2. Middleware checks for token cookie
3. If no cookie: redirect to `/login?redirect=/dashboard/startup`
4. If cookie exists: allow access
5. Client-side `useAuth` hook validates token and role
6. If invalid/wrong role: redirect appropriately

### Logout Flow
1. User clicks logout button
2. `useAuth.logout()` is called
3. localStorage is cleared
4. `/api/auth/set-cookie` DELETE endpoint is called to clear cookie
5. User is redirected to home page

## Security Features

1. **HTTP-Only Cookies**: Token stored in HTTP-only cookie prevents XSS attacks
2. **Dual Storage**: localStorage for API calls, cookies for middleware
3. **Role-Based Access**: Enforced at both middleware and component level
4. **Secure Cookies**: In production, cookies use `secure` flag (HTTPS only)
5. **SameSite Protection**: Cookies use `sameSite: 'lax'` to prevent CSRF

## Protected Routes

- `/dashboard/*` - All dashboard routes require authentication
- `/dashboard/startup` - Requires 'founder' role
- `/dashboard/investor` - Requires 'investor' role

## Testing

To test the authentication:

1. **Unauthenticated Access**:
   - Navigate to `/dashboard/startup` without logging in
   - Should redirect to `/login?redirect=/dashboard/startup`

2. **Login**:
   - Login with founder credentials
   - Should redirect to `/dashboard/startup`
   - Check browser cookies for `token` cookie

3. **Role Validation**:
   - Login as investor
   - Try to access `/dashboard/startup`
   - Should redirect to `/dashboard/investor`

4. **Logout**:
   - Click logout button
   - Should clear localStorage and cookies
   - Should redirect to home page
   - Accessing protected routes should redirect to login

## Implementation Status

✅ Middleware created and configured
✅ useAuth hook with role validation
✅ Cookie management API routes
✅ Login page updated with cookie setting
✅ Register page updated with cookie setting
✅ Logout functionality with cookie clearing
✅ TypeScript compilation successful
✅ Next.js build successful

## Notes

- Next.js 16 shows a deprecation warning about "middleware" in favor of "proxy", but the functionality works correctly
- The implementation uses a hybrid approach: cookies for middleware, localStorage for client-side API calls
- Token expiration is set to 24 hours in both localStorage and cookies
