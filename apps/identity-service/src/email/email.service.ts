import { Injectable, Logger } from '@nestjs/common';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly apiKey: string | undefined;
    private readonly fromEmail: string;
    private readonly fromName: string;
    private readonly enabled: boolean;
    private readonly isProduction: boolean;

    constructor() {
        this.apiKey = process.env.RESEND_API_KEY;
        this.fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
        this.fromName = process.env.EMAIL_FROM_NAME || 'ZKP Platform';
        this.isProduction = process.env.NODE_ENV === 'production';
        this.enabled = !!this.apiKey;
        
        // Warn if email is disabled in production
        if (this.isProduction && !this.enabled) {
            this.logger.error('CRITICAL: RESEND_API_KEY not set in production - emails will not be sent!');
        }
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.enabled) {
            if (this.isProduction) {
                this.logger.error(`[PRODUCTION] Email NOT sent to ${options.to}: ${options.subject} - RESEND_API_KEY not configured`);
                return false; // Return false in production to indicate email was not sent
            }
            this.logger.log(`[Dev Mode] Email to ${options.to}: ${options.subject}`);
            return true;
        }

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: `${this.fromName} <${this.fromEmail}>`,
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }

            this.logger.log(`Email sent to ${options.to}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send email: ${error.message}`);
            return false;
        }
    }


    async sendVerificationEmail(email: string, token: string): Promise<boolean> {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const verifyUrl = `${appUrl}/auth/verify-email?token=${token}`;

        return this.sendEmail({
            to: email,
            subject: 'Verify your email address',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to ZKP Platform!</h2>
                    <p>Please verify your email address by clicking the button below:</p>
                    <p style="margin: 30px 0;">
                        <a href="${verifyUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                            Verify Email
                        </a>
                    </p>
                    <p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
                    <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
                </div>
            `,
        });
    }

    async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

        return this.sendEmail({
            to: email,
            subject: 'Reset your password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password. Click the button below:</p>
                    <p style="margin: 30px 0;">
                        <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                            Reset Password
                        </a>
                    </p>
                    <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
                    <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                </div>
            `,
        });
    }
}
