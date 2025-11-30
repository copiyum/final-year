import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
    sub: string;
    email: string;
    role: 'founder' | 'investor';
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
        if (isPublic) {
            console.log('[JwtAuthGuard] Public route, skipping auth');
            return true;
        }

        const request = context.switchToHttp().getRequest();
        console.log('[JwtAuthGuard] Checking auth for:', request.method, request.url);
        console.log('[JwtAuthGuard] Authorization header:', request.headers.authorization ? 'present' : 'missing');
        
        const token = this.extractToken(request);

        if (!token) {
            console.log('[JwtAuthGuard] No token found in request');
            throw new UnauthorizedException('No token provided');
        }

        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                console.error('[JwtAuthGuard] CRITICAL: JWT_SECRET environment variable is not set');
                throw new UnauthorizedException('Server configuration error');
            }
            const payload = jwt.verify(token, secret) as JwtPayload;
            console.log('[JwtAuthGuard] Token verified for user:', payload.email, 'role:', payload.role);

            // Attach user info to request
            request.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role
            };

            return true;
        } catch (error) {
            console.log('[JwtAuthGuard] Token verification failed:', error.message);
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private extractToken(request: any): string | null {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }
}
