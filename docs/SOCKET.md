# Socket.IO Event Documentation

Connect with authentication:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: jwtToken },
});
```

All client events use callback pattern: `(response: { success, data?, error? }) => void`

---

## Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | `{ name, settings?, password? }` | Host creates a room |
| `join-room` | `{ code, password?, asSpectator? }` | Join as player or spectator |
| `leave-room` | — | Leave current room |
| `start-game` | — | Host starts game (4 players ready) |
| `player-ready` | `{ ready: boolean }` | Toggle ready state |
| `play-card` | `{ cardId: uuid }` | Play a card on your turn |
| `chat-message` | `{ message: string }` | Send room chat |
| `emoji` | `{ emoji: string }` | Send emoji reaction |
| `typing` | `{ isTyping: boolean }` | Typing indicator |
| `reconnect` | `{ sessionToken: uuid }` | Rejoin after disconnect |
| `spectator-join` | `{ code, password? }` | Join as spectator |
| `find-match` | — | Public matchmaking |
| `admin-stats` | — | Admin: server stats |
| `admin-rooms` | — | Admin: list rooms |
| `ping` | — | Latency check |

---

## Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room-updated` | `RoomStateDTO` | Room lobby state changed |
| `game-state` | `GameStateDTO` | Full personalized game state |
| `shuffle` | `{ roomId, dealerSeatIndex }` | Cards being shuffled |
| `deal-cards` | `{ gameState, animated? }` | Cards dealt (private hand) |
| `play-card` | `{ play, gameState }` | Card played on table |
| `turn-change` | `{ seatIndex, expiresAt }` | Turn timer started |
| `trick-winner` | `{ winnerId, winnerSeatIndex, trick, gameState }` | Trick resolved |
| `round-end` | `{ roundScore, gameState }` | Round scoring summary |
| `game-end` | `{ winnerTeam, matchScore, history }` | Match finished |
| `score-update` | `{ matchScore }` | Running score updated |
| `chat-message` | `ChatMessageDTO` | New chat message |
| `emoji` | `{ userId, emoji }` | Emoji reaction |
| `typing` | `{ userId, isTyping }` | Typing indicator |
| `player-connected` | `{ playerId, isConnected }` | Connection status |
| `match-found` | `RoomStateDTO` | Matchmaking success |
| `error` | `{ code, message }` | Error notification |

---

## Types

All DTOs are defined in `@mindi-coat/shared`:

- `RoomStateDTO` — room lobby + game metadata
- `GameStateDTO` — personalized view with `myHand`, `validCards`, `canPlay`
- `RoundScoreDTO` — tricks, mindi, coat, points per round
- `MatchScoreDTO` — cumulative team scores

---

## Reconnect Flow

1. On join/create, server returns session token (stored in socket data)
2. Client persists session token in localStorage
3. On reconnect, client emits `reconnect` with session token
4. Server restores player seat and returns full game state

---

## Security

- JWT required on connection
- All card plays validated server-side
- Rate limiting on HTTP endpoints
- Input validation via Zod schemas
- Room password bcrypt hashed
