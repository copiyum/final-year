import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

interface RegisterDTO {
    email: string;
    password: string;
    role: 'founder' | 'investor';
}

interface LoginDTO {
    email: string;
    password: string;
}

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() dto: RegisterDTO) {
        return this.authService.register(dto);
    }

    @Post('login')
    async login(@Body() dto: LoginDTO) {
        return this.authService.login(dto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@Request() req) {
        return {
            user: req.user
        };
    }
}
