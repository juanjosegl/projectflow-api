# ProjectFlow API

[![CI](https://github.com/juanjosegl/projectflow-api/actions/workflows/ci.yml/badge.svg)](https://github.com/juanjosegl/projectflow-api/actions/workflows/ci.yml)

REST API for **ProjectFlow**, a team task manager with kanban boards, roles, invitations, comments and notifications.
Frontend: [projectflow-web](https://github.com/juanjosegl/projectflow-web).

## Stack

- **NestJS 11** (TypeScript), modular architecture: auth, users, teams, projects, tasks, comments, notifications, dashboard, upload, email
- **PostgreSQL + Prisma 6** (schema and migrations in `prisma/`)
- **Auth**: JWT access token (15 min) + refresh token in an `httpOnly` cookie, rotated on every refresh and revoked on logout; Google OAuth 2.0
- **Validation** with `class-validator` DTOs (whitelisted, unknown fields rejected)
- **Swagger / OpenAPI** docs at `/api/docs`
- **Resend** for invitation and welcome emails (optional in development)

## Domain and permissions

```
User ─┬─ TeamMember (ADMIN | MANAGER | DEVELOPER) ─ Team ─ Project ─ Task ─ Comment
      └─ Notification (task assigned, status changed, new comment, team invitation)
```

| Action | Admin | Manager | Developer |
| --- | :-: | :-: | :-: |
| View team, projects, tasks; create and move tasks; comment | ✓ | ✓ | ✓ |
| Invite members, create and edit projects | ✓ | ✓ | |
| Change roles, remove members, delete projects | ✓ | | |
| Delete a task | ✓ | ✓ | only their own |

Every resource is checked against team membership on the server. A team always keeps at least one admin,
and tasks can only be assigned to members of the project's team.

## Run locally

```bash
cp .env.example .env          # set DATABASE_URL and the two JWT secrets
npm install
npx prisma migrate deploy
npm run db:seed               # demo team, 2 projects, 13 tasks
npm run dev                   # http://localhost:3001/api/v1 · docs at /api/docs
```

Demo accounts (password `Password123!`): `alice@projectflow.dev` (admin), `bob@projectflow.dev` (manager), `carlos@projectflow.dev` (developer).

The demo accounts are shared by every visitor, so the API rebuilds the demo team each time it boots
(on by default on Render, where the free instance sleeps after ~15 idle minutes; set `DEMO_RESET_ON_BOOT=true|false` to override).
Other users' data is never touched.

### Smoke test

With the API running against a local seeded database:

```bash
npm run test:smoke
```

CI runs it on every push against a real Postgres. It checks the main flows end to end: access control between teams, refresh-token rotation and revocation,
task assignment rules, notifications, invitations and the last-admin rule.

## Main endpoints

All routes are prefixed with `/api/v1`; responses are wrapped as `{ success, data, timestamp }`.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Create account / sign in |
| POST | `/auth/refresh`, `/auth/logout` | Rotate or revoke the refresh cookie |
| GET | `/auth/google` | Google sign-in |
| GET/POST | `/teams` | My teams / create team |
| POST | `/teams/:id/invite` | Invite by email |
| POST | `/teams/invitations/:token/accept` · `/decline` | Answer an invitation |
| DELETE | `/teams/:id/leave` | Leave a team |
| GET/POST | `/teams/:id/projects` | Projects of a team |
| GET/POST | `/projects/:id/tasks` | Board tasks |
| PATCH | `/tasks/:id` | Move, reassign, reschedule, edit |
| GET/POST | `/tasks/:id/comments` | Comments |
| GET | `/dashboard/me`, `/dashboard/teams/:id` | Stats |
| GET | `/notifications` | My notifications |
| GET | `/health` | Liveness and database check |

The full, interactive reference is in Swagger at `/api/docs`.
