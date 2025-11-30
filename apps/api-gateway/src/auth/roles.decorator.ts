import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('founder' | 'investor')[]) => SetMetadata(ROLES_KEY, roles);

export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
