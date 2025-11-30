import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PUBLIC_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.get<boolean>(PUBLIC_KEY, context.getHandler());
        if (isPublic) {
            return true;
        }

        const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
        if (!requiredRoles || requiredRoles.length === 0) {
            return true; // No roles required
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new ForbiddenException(`Access denied. Required role: ${requiredRoles.join(' or ')}`);
        }

        return true;
    }
}
