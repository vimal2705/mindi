# REST API Documentation

Base URL: `http://localhost:3001` (development)

## Authentication

All authenticated endpoints require header:

```
Authorization: Bearer <jwt_token>
```

Admin endpoints require:

```
x-admin-key: <ADMIN_SECRET>
```

---

## Auth

### POST /api/auth/guest

Create a guest session.

**Body:**
```json
{
  "displayName": "Player One"  // optional, 2-24 chars
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "username": "guest_abc123",
    "displayName": "Player One",
    "avatar": "🎴",
    "isGuest": true
  }
}
```

### GET /api/auth/me

Get current user profile.

**Response:**
```json
{
  "user": { ... }
}
```

---

## Admin

### GET /api/admin/stats

Server statistics.

**Response:**
```json
{
  "stats": {
    "activeRooms": 3,
    "activePlayers": 8,
    "activeGames": 1,
    "uptime": 3600
  }
}
```

### GET /api/admin/rooms

List all active in-memory rooms.

### POST /api/admin/rooms/:roomId/kick

Kick a player from a room.

**Body:** `{ "playerId": "uuid" }`

### POST /api/admin/rooms/:roomId/end

Force close a room.

### GET /api/admin/history

Last 50 match history records from database.

---

## Health

### GET /health

```json
{ "status": "ok", "timestamp": "2026-07-24T..." }
```

### GET /api/docs

Returns machine-readable API overview.
