import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EmailService } from '../email/email.service';

interface RegisterDTO {
    email: string;
    password: string;
    role: 'founder' | 'investor';
}

interface LoginDTO {
    email: string;
    password: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly ledgerServiceUrl: string;
    private readonly credentialIssuerUrl: string;
    private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
    private readonly verificationTokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
    private readonly resetTokenExpiry = 1 * 60 * 60 * 1000; // 1 hour

    constructor(
        @Inject('DATABASE_POOL') private pool: Pool,
        private jwtService: JwtService,
        private httpService: HttpService,
        private emailService: EmailService,
    ) {
        this.ledgerServiceUrl = process.env.LEDGER_SERVICE_URL || 'http://localhost:3000';
        this.credentialIssuerUrl = process.env.CREDENTIAL_ISSUER_URL || 'http://localhost:3006';
    }

    private generateSignature(type: string, payload: any, signer: string): string {
        const signingKey = process.env.SIGNING_SECRET;
        if (!signingKey) {
            throw new Error('SIGNING_SECRET environment variable is required');
        }
        const message = JSON.stringify({ type, payload, signer, timestamp: Date.now() });
        return crypto.createHmac('sha256', signingKey).update(message).digest('hex');
    }

    private async hashEventToLedger(type: string, payload: any, signer: string): Promise<string | null> {
        try {
            const signature = this.generateSignature(type, payload, signer);
            const response = await firstValueFrom(
                this.httpService.post(`${this.ledgerServiceUrl}/events`, { type, payload, signer, signature })
            );
            this.logger.log(`Event ${type} hashed to ledger: ${response.data.id}`);
            return response.data.id;
        } catch (error: any) {
            this.logger.warn(`Failed to hash event to ledger: ${error.message}`);
            return null;
        }
    }


    private async issueZkCredential(userId: string, role: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.credentialIssuerUrl}/credentials/issue`, {
                    holders: [userId],
                    claims: { role, issuedAt: new Date().toISOString() },
                })
            );
            this.logger.log(`ZK credential issued for user ${userId}`);
            return response.data;
        } catch (error: any) {
            this.logger.warn(`Failed to issue ZK credential: ${error.message}`);
            return null;
        }
    }

    private generateSecureToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private generateRefreshToken(user: any): string {
        const payload = { sub: user.id, type: 'refresh' };
        return this.jwtService.sign(payload, { expiresIn: '7d' });
    }

    private generateToken(user: any): string {
        const payload = { sub: user.id, email: user.email, role: user.role };
        return this.jwtService.sign(payload);
    }

    async register(dto: RegisterDTO) {
        const { email, password, role } = dto;

        const existingUser = await this.pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            throw new ConflictException('User already exists');
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const verificationToken = this.generateSecureToken();
        const verificationExpires = new Date(Date.now() + this.verificationTokenExpiry);

        // Use transaction to ensure atomic user creation with refresh token
        const client = await this.pool.connect();
        let user: any;
        let accessToken: string;
        let refreshToken: string;
        
        try {
            await client.query('BEGIN');
            
            const result = await client.query(
                `INSERT INTO users (email, password_hash, role, email_verified, verification_token, verification_expires)
                 VALUES ($1, $2, $3, false, $4, $5)
                 RETURNING id, email, role, email_verified, created_at`,
                [email, passwordHash, role, verificationToken, verificationExpires]
            );

            user = result.rows[0];
            accessToken = this.generateToken(user);
            refreshToken = this.generateRefreshToken(user);

            // Store refresh token within transaction
            await client.query(
                `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
                [user.id, refreshToken, new Date(Date.now() + this.refreshTokenExpiry)]
            );
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        // Non-critical async operations - failures are logged but don't affect registration
        // Send verification email (async, non-blocking)
        this.sendVerificationEmail(user.email, verificationToken);

        // Issue ZK credential (async, non-blocking with retry queue)
        this.scheduleCredentialIssuance(user.id, user.role);

        // Hash to ledger (async, non-blocking)
        this.hashEventToLedger('user.created', { user_id: user.id, role: user.role }, user.id);

        return {
            user: { id: user.id, email: user.email, role: user.role, emailVerified: user.email_verified, createdAt: user.created_at },
            accessToken,
            refreshToken,
        };
    }
    
    /**
     * Schedule credential issuance with retry logic
     * Stores pending credential request in DB for retry if initial attempt fails
     */
    private async scheduleCredentialIssuance(userId: string, role: string): Promise<void> {
        try {
            const credential = await this.issueZkCredential(userId, role);
            if (credential) {
                await this.pool.query(
                    `INSERT INTO user_credentials (user_id, credential_hash, credential_type, issued_at)
                     VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id, credential_type) DO UPDATE SET credential_hash = $2`,
                    [userId, credential.root || credential.issuance_id, 'identity']
                );
            } else {
                // Store pending credential request for later retry
                await this.pool.query(
                    `INSERT INTO pending_credentials (user_id, credential_type, role, created_at, retry_count)
                     VALUES ($1, 'identity', $2, NOW(), 0)
                     ON CONFLICT (user_id, credential_type) DO NOTHING`,
                    [userId, role]
                ).catch(err => this.logger.debug(`Pending credentials table may not exist: ${err.message}`));
            }
        } catch (err: any) {
            this.logger.warn(`Failed to issue credential for user ${userId}: ${err.message}`);
        }
    }


    async login(dto: LoginDTO) {
        const { email, password } = dto;

        const result = await this.pool.query(
            'SELECT id, email, password_hash, role, email_verified FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = this.generateToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // Store refresh token
        await this.pool.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
            [user.id, refreshToken, new Date(Date.now() + this.refreshTokenExpiry)]
        );

        return {
            user: { id: user.id, email: user.email, role: user.role, emailVerified: user.email_verified },
            accessToken,
            refreshToken,
        };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

            // Check if token exists and is not revoked
            const tokenResult = await this.pool.query(
                `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
                [refreshToken]
            );

            if (tokenResult.rows.length === 0) {
                throw new UnauthorizedException('Invalid or expired refresh token');
            }

            const user = await this.validateUser(payload.sub);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Revoke old refresh token
            await this.pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1`, [refreshToken]);

            // Generate new tokens
            const newAccessToken = this.generateToken(user);
            const newRefreshToken = this.generateRefreshToken(user);

            await this.pool.query(
                `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
                [user.id, newRefreshToken, new Date(Date.now() + this.refreshTokenExpiry)]
            );

            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(refreshToken: string) {
        await this.pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1`, [refreshToken]);
        return { message: 'Logged out successfully' };
    }


    // Email Verification
    async sendVerificationEmail(email: string, token: string) {
        const sent = await this.emailService.sendVerificationEmail(email, token);
        if (!sent) {
            this.logger.warn(`Failed to send verification email to ${email}`);
        }
    }

    async verifyEmail(token: string) {
        const result = await this.pool.query(
            `SELECT id, email FROM users WHERE verification_token = $1 AND verification_expires > NOW() AND email_verified = false`,
            [token]
        );

        if (result.rows.length === 0) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        const user = result.rows[0];

        await this.pool.query(
            `UPDATE users SET email_verified = true, verification_token = NULL, verification_expires = NULL WHERE id = $1`,
            [user.id]
        );

        this.hashEventToLedger('user.email_verified', { user_id: user.id }, user.id);

        return { message: 'Email verified successfully', email: user.email };
    }

    async resendVerificationEmail(email: string) {
        const result = await this.pool.query(
            `SELECT id, email, email_verified FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('User not found');
        }

        const user = result.rows[0];

        if (user.email_verified) {
            throw new BadRequestException('Email already verified');
        }

        const verificationToken = this.generateSecureToken();
        const verificationExpires = new Date(Date.now() + this.verificationTokenExpiry);

        await this.pool.query(
            `UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3`,
            [verificationToken, verificationExpires, user.id]
        );

        this.sendVerificationEmail(user.email, verificationToken);

        return { message: 'Verification email sent' };
    }


    // Password Reset
    async requestPasswordReset(email: string) {
        const result = await this.pool.query(`SELECT id, email FROM users WHERE email = $1`, [email]);

        if (result.rows.length === 0) {
            // Don't reveal if user exists
            return { message: 'If the email exists, a reset link has been sent' };
        }

        const user = result.rows[0];
        const resetToken = this.generateSecureToken();
        const resetExpires = new Date(Date.now() + this.resetTokenExpiry);

        await this.pool.query(
            `UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3`,
            [resetToken, resetExpires, user.id]
        );

        // Send reset email
        const sent = await this.emailService.sendPasswordResetEmail(user.email, resetToken);
        if (!sent) {
            this.logger.warn(`Failed to send password reset email to ${email}`);
        }

        return { message: 'If the email exists, a reset link has been sent' };
    }

    async resetPassword(token: string, newPassword: string) {
        const result = await this.pool.query(
            `SELECT id, email FROM users WHERE reset_token = $1 AND reset_expires > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        const user = result.rows[0];
        const passwordHash = await bcrypt.hash(newPassword, 12);

        await this.pool.query(
            `UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2`,
            [passwordHash, user.id]
        );

        // Revoke all refresh tokens for security
        await this.pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1`, [user.id]);

        this.hashEventToLedger('user.password_reset', { user_id: user.id }, user.id);

        return { message: 'Password reset successfully' };
    }

    async validateUser(userId: string) {
        const result = await this.pool.query('SELECT id, email, role, email_verified FROM users WHERE id = $1', [userId]);
        return result.rows.length === 0 ? null : result.rows[0];
    }
}
