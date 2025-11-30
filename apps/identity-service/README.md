# Identity Service

Authentication and user management service for the startup-investor platform.

## Features

- ✅ User registration with role selection (founder/investor)
- ✅ JWT-based authentication (24h expiration)
- ✅ Bcrypt password hashing (cost factor 12)
- ✅ Protected routes with JWT guard
- ✅ Database integration via existing DatabaseModule

## API Endpoints

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "role": "founder" // or "investor"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "founder",
    "createdAt": "2025-11-28T..."
  },
  "accessToken": "jwt.token.here"
}
```

### POST /auth/login
Login existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "founder"
  },
  "accessToken": "jwt.token.here"
}
```

### GET /auth/me
Get current user profile (requires JWT).

**Headers:**
```
Authorization: Bearer <jwt.token.here>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "founder"
  }
}
```

## Environment Variables

- `JWT_SECRET` - Secret key for JWT signing (default: development-secret-change-in-production)
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Service port (default: 3007)

## Database Schema

### users
- `id` - UUID primary key
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `role` - User role (founder/investor)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### user_credentials
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `credential_hash` - ZK credential hash
- `credential_type` - Type of credential
- `issued_at` - Timestamp
- `revoked_at` - Timestamp (nullable)

## Running

```bash
cd apps/identity-service
PORT=3007 bun run src/main.ts
```

## TODO

- [ ] Integrate with Credential Issuer for ZK credentials
- [ ] Hash user actions to Ledger Service
- [ ] Add refresh token support
- [ ] Add email verification
- [ ] Add password reset flow
- [ ] Write unit tests
