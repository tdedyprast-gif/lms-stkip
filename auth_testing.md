# Auth Testing - OBE LMS (Golang + JWT Bearer)

Backend: Golang (Gin + GORM + PostgreSQL) running internally on :9000.
A FastAPI reverse-proxy (`/app/backend/server.py`) on :8001 forwards `/api/*` to the Go service.
External base URL routes `/api` -> 8001 -> 9000.

## Auth Mechanism
- Custom email/password auth. Passwords hashed with bcrypt.
- JWT (HS256) access token returned in login/register response body as `{ "token": "...", "user": {...} }`.
- Token sent by frontend via header: `Authorization: Bearer <token>` (stored in localStorage key `obe_token`).
- `GET /api/auth/me` returns the current user.

## Endpoints
- POST /api/auth/register  {name,email,password,role,nim?,nidn?}
- POST /api/auth/login     {email,password}
- GET  /api/auth/me        (Bearer)
- Role-guarded routes use RequireRole middleware (admin/dosen/mahasiswa).

## Credentials (see /app/memory/test_credentials.md)
- Admin: admin@stkippacitan.ac.id / admin123
- Dosen: dosen@stkippacitan.ac.id / dosen123
- Mahasiswa: ahmad@student.stkippacitan.ac.id / mahasiswa123 (and others)
- At-risk student for early warning: fajar@student.stkippacitan.ac.id / mahasiswa123

## Quick curl
```
curl -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@stkippacitan.ac.id","password":"admin123"}'
TOKEN=... ; curl http://localhost:8001/api/auth/me -H "Authorization: Bearer $TOKEN"
```
