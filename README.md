# Mindi Coat - Multiplayer Indian card game

> **Local dev** uses SQLite (`file:./dev.db`) so `npm run dev` works without Docker.  
> **Production** uses PostgreSQL — set `DATABASE_URL` to your Supabase connection string and change `provider` in `apps/server/prisma/schema.prisma` to `postgresql`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4, Zustand, Framer Motion |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (Guest login) |
| Deploy | Vercel (client), Railway/Render (server), Supabase (PostgreSQL) |

## Project Structure

```
/apps
  /client          # React frontend (Vite + PWA)
  /server          # Express + Socket.IO + Game Engine
/packages
  /shared          # Shared types, constants, socket event definitions
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)

### 1. Install dependencies

```bash
npm install
```

### 2. Initialize database

```bash
npm run db:generate
npm run db:push
npm run db:seed   # optional: example users & demo room
```

> **Optional:** For PostgreSQL locally, start Docker (`npm run docker:up`), set `DATABASE_URL` in `apps/server/.env`, and change the Prisma provider to `postgresql`.

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001
- **API Docs:** http://localhost:3001/api/docs

## Game Rules

- **4 players** — Team A (seats 0 & 2) vs Team B (seats 1 & 3), partners opposite
- **52 cards** — 13 per player, no jokers
- **Follow suit** — Must follow lead suit if possible
- **Mindi** — Tens (10) of each suit are Mindi cards (+2 bonus points)
- **Coat** — Winning all 13 tricks (+13 bonus); consecutive coat = Double Coat
- **Dealer** rotates each round

## Features

- Private & public rooms with password protection
- Public matchmaking queue
- Spectator mode
- Rejoin after disconnect with session tokens
- Auto-reconnect (Socket.IO + client reconnect flow)
- Invite links (`/join/:code`)
- Server-authoritative game logic (anti-cheat)
- Bot takeover on disconnect
- Room chat + quick emojis
- Turn timer with auto-play
- Animated dealing, card play, trick wins (Framer Motion)
- Sound effects (Web Audio API)
- Dark mode, responsive layout, PWA support
- Admin panel (active rooms, stats, kick, end room)

## Socket Events

See [docs/SOCKET.md](docs/SOCKET.md) for full typed event documentation.

## REST API

See [docs/API.md](docs/API.md) for endpoint documentation.

## Testing

```bash
npm test
```

Includes unit tests for shared rules, game engine, and integration tests.

## Docker (Full Stack)

```bash
docker compose up --build
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Vercel (Frontend)

Set environment variables:
- `VITE_API_URL` → your backend URL
- `VITE_SOCKET_URL` → your backend URL

### Railway / Render (Backend)

Set environment variables:
- `DATABASE_URL` → Supabase PostgreSQL connection string
- `JWT_SECRET` → strong random secret
- `CLIENT_URL` → Vercel frontend URL
- `ADMIN_SECRET` → admin panel key

### Supabase (Database)

1. Create a new project
2. Copy the connection string to `DATABASE_URL`
3. Run `npm run db:push` against production DB

## Architecture

```
Client (React) ──Socket.IO──► SocketGateway
                                  │
                            GameEngine ◄── RoomManager
                                  │
                     CardManager / ShuffleManager
                     ScoreManager / TimerManager
                     ReconnectManager / BotAI
                                  │
                              Prisma ──► PostgreSQL
```

All game logic runs **only on the server**. The client sends intents; the server validates cards, turns, suits, winners, and scores.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server concurrently |
| `npm run build` | Build all packages |
| `npm test` | Run all tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed example data |
| `npm run docker:up` | Start Docker services |

## License

MIT
