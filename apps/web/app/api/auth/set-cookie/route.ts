import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();
        
        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }
        
        const response = NextResponse.json({ success: true });
        
        // Set HTTP-only cookie for middleware
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });
        
        return response;
    } catch (error) {
        return NextResponse.json({ error: 'Failed to set cookie' }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    
    // Clear the cookie
    response.cookies.delete('token');
    
    return response;
}
