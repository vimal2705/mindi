import {
  GamePhase,
  PlayerRole,
  Team,
  type RoomSettingsDTO,
  type RoomStateDTO,
  type GameStateDTO,
  type TrickDTO,
  DEFAULT_ROOM_SETTINGS,
  MAX_PLAYERS,
} from '@mindi-coat/shared';
import { v4 as uuidv4 } from 'uuid';
import { GamePlayer, BOT_NAMES } from './Player.js';
import { RoundEngine, ScoreManager } from './RoundEngine.js';
import { BotAI } from './BotAI.js';

export interface GameRoomConfig {
  id: string;
  code: string;
  name: string;
  hostId: string;
  hostUserId: string;
  settings: RoomSettingsDTO;
  inviteBaseUrl: string;
}

export class GameEngine {
  readonly id: string;
  readonly code: string;
  name: string;
  hostId: string;
  settings: RoomSettingsDTO;
  phase: GamePhase = GamePhase.LOBBY;
  players: GamePlayer[] = [];
  spectators: GamePlayer[] = [];
  roundEngine: RoundEngine | null = null;
  scoreManager: ScoreManager;
  dealerSeatIndex = 0;
  roundNumber = 0;
  turnExpiresAt: Date | null = null;
  turnTimerHandle: ReturnType<typeof setTimeout> | null = null;
  dbGameId: string | null = null;
  onTurnTimeout?: (roomId: string) => void;
  private inviteBaseUrl: string;

  constructor(config: GameRoomConfig) {
    this.id = config.id;
    this.code = config.code;
    this.name = config.name;
    this.hostId = config.hostId;
    this.settings = { ...DEFAULT_ROOM_SETTINGS, ...config.settings };
    this.scoreManager = new ScoreManager(this.settings.targetScore);
    this.inviteBaseUrl = config.inviteBaseUrl;
  }

  addPlayer(entry: {
    id: string;
    userId: string;
    displayName: string;
    avatar?: string;
  }): GamePlayer | null {
    if (this.players.length >= MAX_PLAYERS) return null;
    const player = new GamePlayer({
      id: entry.id,
      userId: entry.userId,
      displayName: entry.displayName,
      seatIndex: this.players.length,
      avatar: entry.avatar,
    });
    this.players.push(player);
    return player;
  }

  addSpectator(entry: {
    id: string;
    userId: string;
    displayName: string;
    avatar?: string;
  }): GamePlayer {
    const spectator = new GamePlayer({
      id: entry.id,
      userId: entry.userId,
      displayName: entry.displayName,
      seatIndex: -1,
      avatar: entry.avatar,
      role: PlayerRole.SPECTATOR,
    });
    this.spectators.push(spectator);
    return spectator;
  }

  removePlayer(playerId: string): GamePlayer | null {
    const index = this.players.findIndex((p) => p.id === playerId);
    if (index === -1) return null;
    const [removed] = this.players.splice(index, 1);
    this.players.forEach((p, i) => {
      (p as { seatIndex: number }).seatIndex = i;
    });
    return removed;
  }

  getPlayer(playerId: string): GamePlayer | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  getPlayerByUserId(userId: string): GamePlayer | undefined {
    return this.players.find((p) => p.userId === userId);
  }

  allPlayersReady(): boolean {
    return this.players.length === MAX_PLAYERS && this.players.every((p) => p.isReady);
  }

  canStart(): boolean {
    return (
      this.phase === GamePhase.LOBBY &&
      this.players.length === MAX_PLAYERS &&
      (this.allPlayersReady() || this.players.every((p) => p.isReady || p.isBot))
    );
  }

  startGame(): void {
    if (this.players.length !== MAX_PLAYERS) {
      throw new Error('Need 4 players to start');
    }
    this.dealerSeatIndex = Math.floor(Math.random() * MAX_PLAYERS);
    this.roundNumber = 1;
    this.startRound();
  }

  startRound(): void {
    for (const player of this.players) {
      player.trickCount = 0;
      player.mindiCount = 0;
    }
    this.roundEngine = new RoundEngine(this.roundNumber, this.dealerSeatIndex);
    this.roundEngine.previousCoatTeam = this.getLastCoatTeam();
    this.phase = GamePhase.DEALING;
    this.roundEngine.deal(this.players);
    this.phase = GamePhase.PLAYING;
    this.roundEngine.currentTurnSeatIndex = (this.dealerSeatIndex + 1) % MAX_PLAYERS;
  }

  private getLastCoatTeam(): Team | null {
    const history = this.scoreManager.roundHistory;
    if (history.length === 0) return null;
    return history[history.length - 1].coatTeam;
  }

  playCard(playerId: string, cardId: string): { success: boolean; reason?: string } {
    if (!this.roundEngine || this.phase !== GamePhase.PLAYING) {
      return { success: false, reason: 'GAME_NOT_ACTIVE' };
    }
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, reason: 'PLAYER_NOT_FOUND' };

    const card = this.roundEngine.playCardWithPlayers(player, cardId, this.players);
    if (!card) {
      const validation = this.roundEngine.canPlayerPlay(player, cardId);
      return { success: false, reason: validation.reason };
    }

    if (this.roundEngine.isRoundComplete()) {
      this.endRound();
    }
    return { success: true };
  }

  endRound(): void {
    if (!this.roundEngine) return;
    const roundScore = this.roundEngine.calculateRoundScore();
    this.scoreManager.applyRoundScore(roundScore);
    this.phase = GamePhase.ROUND_END;

    const winner = this.scoreManager.getWinnerTeam(this.settings.maxRounds);
    if (winner) {
      this.phase = GamePhase.GAME_END;
    }
  }

  startNextRound(): void {
    if (this.phase !== GamePhase.ROUND_END && this.phase !== GamePhase.GAME_END) return;
    const winner = this.scoreManager.getWinnerTeam(this.settings.maxRounds);
    if (winner) {
      this.phase = GamePhase.GAME_END;
      return;
    }
    this.dealerSeatIndex = (this.dealerSeatIndex + 1) % MAX_PLAYERS;
    this.roundNumber++;
    this.startRound();
  }

  enableBotForPlayer(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player || !this.settings.botsEnabled) return;
    player.isBot = true;
    player.isConnected = false;
    player.displayName = `${player.displayName} (Bot)`;
  }

  restorePlayerFromBot(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) return;
    player.isBot = false;
    player.isConnected = true;
    player.displayName = player.displayName.replace(' (Bot)', '');
  }

  getBotMove(playerId: string): string | null {
    const player = this.getPlayer(playerId);
    if (!player || !this.roundEngine) return null;
    const leadSuit = this.roundEngine.currentTrick.leadSuit;
    const valid = player.getValidPlays(leadSuit);
    if (valid.length === 0) return null;
    return BotAI.chooseCard(valid, leadSuit, this.roundEngine.currentTrick.plays.length);
  }

  toRoomStateDTO(): RoomStateDTO {
    const trick: TrickDTO = this.roundEngine
      ? this.roundEngine.trickToDTO(this.roundEngine.currentTrick)
      : { plays: [], leadSuit: null, winnerId: null, winnerSeatIndex: null };

    const completedTricks: TrickDTO[] = this.roundEngine
      ? this.roundEngine.completedTricks.map((t) => this.roundEngine!.trickToDTO(t))
      : [];

    return {
      id: this.id,
      code: this.code,
      name: this.name,
      hostId: this.hostId,
      settings: {
        ...this.settings,
        password: undefined,
      },
      phase: this.phase,
      players: this.players.map((p) => p.toDTO()),
      spectators: this.spectators.map((s) => s.toDTO()),
      currentTurnSeatIndex: this.roundEngine?.currentTurnSeatIndex ?? null,
      currentTrick: trick,
      completedTricks,
      dealerSeatIndex: this.dealerSeatIndex,
      roundNumber: this.roundNumber,
      matchScore: { ...this.scoreManager.matchScore },
      roundHistory: [...this.scoreManager.roundHistory],
      inviteLink: `${this.inviteBaseUrl}/join/${this.code}`,
      hasPassword: Boolean(this.settings.password),
    };
  }

  toGameStateDTO(userId: string): GameStateDTO {
    const player = this.getPlayerByUserId(userId);
    const room = this.toRoomStateDTO();
    const myHand = player ? player.getHand().map((c) => c.toDTO()) : [];
    const leadSuit = this.roundEngine?.currentTrick.leadSuit ?? null;
    const validCards = player
      ? player.getValidPlays(leadSuit).map((c) => c.id)
      : [];
    const canPlay =
      Boolean(player) &&
      this.phase === GamePhase.PLAYING &&
      player!.seatIndex === this.roundEngine?.currentTurnSeatIndex &&
      !player!.isBot;

    return {
      room,
      myPlayerId: player?.id ?? null,
      myHand,
      canPlay,
      validCards,
    };
  }

  static generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  static createBotPlayer(seatIndex: number, roomId: string): GamePlayer {
    return new GamePlayer({
      id: uuidv4(),
      userId: `bot-${roomId}-${seatIndex}`,
      displayName: BOT_NAMES[seatIndex],
      seatIndex,
      isBot: true,
    });
  }
}
