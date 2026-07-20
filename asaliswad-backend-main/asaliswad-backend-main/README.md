# Asali Swad — Backend

Backend service for **Asali Swad**, an Indian e-commerce platform. Built as a modular monolith with a strong focus on secure, production-grade authentication for both storefront users and the admin panel.

## Tech Stack

- **Runtime:** [Bun](https://bun.com)
- **Framework:** Express 5
- **Language:** TypeScript
- **Database:** MongoDB (Mongoose)
- **Validation:** Zod v4
- **Auth:** JWT (access + refresh tokens), Argon2 (password hashing), SHA-256 (refresh token hashing)
- **Email:** Brevo (`@getbrevo/brevo`) for transactional/OTP email
- **Deployment:** Render (Node runtime + Bun commands)

## Architecture

The project follows a **modular monolith** pattern with module-first file organization:

```
src/
  modules/
    auth/
      models/
        refreshToken.model.ts
      v1/
        auth.controller.ts
        auth.routes.ts
      auth.repository.ts
      auth.service.ts
    admin-auth/
      ...
```

- `admin-auth` is kept as a fully separate module from user-facing `auth`, with its own JWT secrets and middleware — admin and user sessions never share trust boundaries.
- Zod schemas act as the single source of truth for enums — `.options` feeds directly into Mongoose `enum` arrays, avoiding drift between validation and schema.
- Naming conventions: singular model filenames (e.g. `user.model.ts`), PascalCase for enums, camelCase for instances.

## Auth System

- **Password hashing:** Argon2
- **Refresh token hashing:** SHA-256 (chosen for performance)
- **Four distinct JWT secrets** — separate signing secrets for user access, user refresh, admin access, and admin refresh tokens
- **Refresh token rotation** with reuse detection
- **Cookie strategy:** refresh tokens are set as `HttpOnly` secure cookies; access tokens are returned only in the JSON response body (never persisted to a cookie)
- **OTP flow:** `sendOtp`, `resendOtp`, `verifyOtp`, `changeOtpEmail`
  - Attempt ceiling: 5
  - Max resends: 3
  - Max email changes: 3
  - Each limit tracked as an independent lifetime counter per session
- **OTP session states:** includes a `locked` status once limits are exhausted, backed by an `OtpSessionLog` audit trail
- A `cleanupOtpSessions` cron job purges expired/stale OTP sessions

### Status code conventions

| Code | Meaning |
|------|---------|
| 401 | Authentication failure |
| 403 | Banned |
| 404 | Not found |
| 409 | Conflict |
| 410 | Expired |
| 429 | Rate limit / attempt limit exceeded |

## Getting Started

### Prerequisites

- [Bun](https://bun.com) (developed on v1.3.13)
- A MongoDB instance
- Brevo account/API key for transactional email

### Installation

```bash
bun install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values (database connection string, JWT secrets, Brevo API key, etc.).

```bash
cp .env.example .env
```

### Running the project

**Development:**
```bash
bun run dev
```

**Production:**
```bash
bun start
```

## Deployment

A `Dockerfile` is included in the repo for local/alternative containerized use.

**Build the image:**
```bash
docker build -t asaliswad-backend .
```

**Run the container:**
```bash 
docker run -p 5000:5000 --env-file .env asaliswad-backend
```

## License

Proprietary — all rights reserved.
