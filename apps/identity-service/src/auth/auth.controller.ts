import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
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

    @Post('refresh')
    async refresh(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshTokens(refreshToken);
    }

    @Post('logout')
    async logout(@Body('refreshToken') refreshToken: string) {
        return this.authService.logout(refreshToken);
    }

    // Email Verification
    @Get('verify-email')
    async verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Post('resend-verification')
    async resendVerification(@Body('email') email: string) {
        return this.authService.resendVerificationEmail(email);
    }

    // Password Reset
    @Post('forgot-password')
    async forgotPassword(@Body('email') email: string) {
        return this.authService.requestPasswordReset(email);
    }

    @Post('reset-password')
    async resetPassword(@Body() body: { token: string; password: string }) {
        return this.authService.resetPassword(body.token, body.password);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@Request() req) {
        return { user: req.user };
    }
}
