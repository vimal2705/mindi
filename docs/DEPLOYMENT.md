# Deployment Guide

## Overview

| Service | Platform | Purpose |
|---------|----------|---------|
| Frontend | Vercel | React SPA + PWA |
| Backend | Railway or Render | Express + Socket.IO |
| Database | Supabase | PostgreSQL |

---

## 1. Supabase (PostgreSQL)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string**
3. Copy the **URI** connection string (pooler recommended for serverless)
4. Set as `DATABASE_URL` on your backend

```bash
# Push schema to Supabase
DATABASE_URL="postgresql://..." npm run db:push
```

---

## 2. Railway / Render (Backend)

### Environment Variables

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=<generate-64-char-random-string>
CLIENT_URL=https://your-app.vercel.app
ADMIN_SECRET=<admin-key>
```

### Railway

1. Connect GitHub repo
2. Set root directory or use Dockerfile (`Dockerfile.server`)
3. Build command: `npm run build -w @mindi-coat/shared && npm run db:generate -w @mindi-coat/server && npm run build -w @mindi-coat/server`
4. Start command: `node apps/server/dist/index.js`

### Render

1. New **Web Service**
2. Environment: Docker or Node
3. Same build/start commands as Railway
4. Enable **WebSocket** support (required for Socket.IO)

---

## 3. Vercel (Frontend)

### Environment Variables

```
VITE_API_URL=https://your-backend.railway.app
VITE_SOCKET_URL=https://your-backend.railway.app
```

### Deploy

1. Import repo to Vercel
2. Set **Root Directory** to `apps/client`
3. Build command: `cd ../.. && npm run build -w @mindi-coat/shared && npm run build -w @mindi-coat/client`
4. Output directory: `dist`

Or deploy from monorepo root with `vercel.json`:

```json
{
  "buildCommand": "npm run build -w @mindi-coat/client",
  "outputDirectory": "apps/client/dist",
  "framework": "vite"
}
```

---

## 4. Docker (Self-hosted)

```bash
docker compose up --build
```

Services:
- PostgreSQL on port 5432
- Server on port 3001
- Client (nginx) on port 5173

---

## 5. Post-Deploy Checklist

- [ ] `DATABASE_URL` connected and schema pushed
- [ ] `JWT_SECRET` is unique and secure
- [ ] `CLIENT_URL` matches Vercel domain (CORS)
- [ ] WebSockets enabled on backend host
- [ ] Health check: `GET /health`
- [ ] Test guest login + room creation
- [ ] PWA manifest loads correctly

---

## 6. CI/CD (Optional)

Example GitHub Actions workflow:

```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
```
