import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

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
    constructor(
        @Inject('DATABASE_POOL') private pool: Pool,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDTO) {
        const { email, password, role } = dto;

        // Check if user exists
        const existingUser = await this.pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            throw new ConflictException('User already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Insert user
        const result = await this.pool.query(
            `INSERT INTO users (email, password_hash, role) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, role, created_at`,
            [email, passwordHash, role]
        );

        const user = result.rows[0];

        // Generate JWT
        const token = this.generateToken(user);

        // TODO: Issue ZK credential via Credential Issuer
        // TODO: Hash user.created event to Ledger

        return {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.created_at
            },
            accessToken: token,
        };
    }

    async login(dto: LoginDTO) {
        const { email, password } = dto;

        // Find user
        const result = await this.pool.query(
            'SELECT id, email, password_hash, role FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const user = result.rows[0];

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate JWT
        const token = this.generateToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            accessToken: token,
        };
    }

    async validateUser(userId: string) {
        const result = await this.pool.query(
            'SELECT id, email, role FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    private generateToken(user: any): string {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return this.jwtService.sign(payload);
    }
}
