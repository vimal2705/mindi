import {
  Team,
  Suit,
  getWinningPlay,
  TRICK_POINTS,
  MINDI_POINTS,
  COAT_POINTS,
  DOUBLE_COAT_MULTIPLIER,
  CARDS_PER_PLAYER,
  type RoundScoreDTO,
  type MatchScoreDTO,
  type TargetScore,
} from '@mindi-coat/shared';
import { Card, Deck } from './CardManager.js';
import { ShuffleManager } from './ShuffleManager.js';
import { GamePlayer } from './Player.js';

export interface TrickState {
  plays: Array<{ playerId: string; card: Card; seatIndex: number }>;
  leadSuit: Suit | null;
  winnerId: string | null;
  winnerSeatIndex: number | null;
}

export class RoundEngine {
  roundNumber: number;
  dealerSeatIndex: number;
  currentTurnSeatIndex: number;
  currentTrick: TrickState = { plays: [], leadSuit: null, winnerId: null, winnerSeatIndex: null };
  completedTricks: TrickState[] = [];
  teamATricks = 0;
  teamBTricks = 0;
  teamAMindi = 0;
  teamBMindi = 0;
  previousCoatTeam: Team | null = null;

  constructor(roundNumber: number, dealerSeatIndex: number) {
    this.roundNumber = roundNumber;
    this.dealerSeatIndex = dealerSeatIndex;
    this.currentTurnSeatIndex = (dealerSeatIndex + 1) % 4;
  }

  deal(players: GamePlayer[]): void {
    const deck = Deck.createStandard();
    ShuffleManager.secureShuffle(deck);
    for (const player of players) {
      player.receiveCards(deck.deal(CARDS_PER_PLAYER));
    }
  }

  getLeadPlayerSeat(): number {
    if (this.completedTricks.length === 0) {
      return (this.dealerSeatIndex + 1) % 4;
    }
    const lastTrick = this.completedTricks[this.completedTricks.length - 1];
    return lastTrick.winnerSeatIndex ?? this.currentTurnSeatIndex;
  }

  canPlayerPlay(player: GamePlayer, cardId: string): { valid: boolean; reason?: string } {
    if (player.seatIndex !== this.currentTurnSeatIndex) {
      return { valid: false, reason: 'NOT_YOUR_TURN' };
    }
    if (!player.hasCard(cardId)) {
      return { valid: false, reason: 'CARD_NOT_IN_HAND' };
    }
    const validCards = player.getValidPlays(this.currentTrick.leadSuit);
    if (!validCards.some((c) => c.id === cardId)) {
      return { valid: false, reason: 'MUST_FOLLOW_SUIT' };
    }
    return { valid: true };
  }

  playCardWithPlayers(player: GamePlayer, cardId: string, players: GamePlayer[]): Card | null {
    const validation = this.canPlayerPlay(player, cardId);
    if (!validation.valid) return null;

    const card = player.playCard(cardId);
    if (!card) return null;

    if (this.currentTrick.plays.length === 0) {
      this.currentTrick.leadSuit = card.suit;
    }

    this.currentTrick.plays.push({
      playerId: player.id,
      card,
      seatIndex: player.seatIndex,
    });

    if (card.isMindi) {
      if (player.team === Team.A) this.teamAMindi++;
      else this.teamBMindi++;
      player.mindiCount++;
    }

    if (this.currentTrick.plays.length === 4) {
      this.resolveTrick(new Map(players.map((p) => [p.id, p])));
    } else {
      this.currentTurnSeatIndex = (this.currentTurnSeatIndex + 1) % 4;
    }

    return card;
  }

  private resolveTrick(playerMap: Map<string, GamePlayer>): void {
    const leadSuit = this.currentTrick.leadSuit!;
    const dtoPlays = this.currentTrick.plays.map((p) => ({
      playerId: p.playerId,
      seatIndex: p.seatIndex,
      card: p.card.toDTO(),
    }));
    const winner = getWinningPlay(dtoPlays, leadSuit);
    this.currentTrick.winnerId = winner.playerId;
    this.currentTrick.winnerSeatIndex = winner.seatIndex;

    const winnerPlayer = playerMap.get(winner.playerId);
    if (winnerPlayer) {
      winnerPlayer.trickCount++;
      if (winnerPlayer.team === Team.A) this.teamATricks++;
      else this.teamBTricks++;
    }

    this.completedTricks.push({ ...this.currentTrick });
    this.currentTrick = { plays: [], leadSuit: null, winnerId: null, winnerSeatIndex: null };
    this.currentTurnSeatIndex = winner.seatIndex;
  }

  isRoundComplete(): boolean {
    return this.completedTricks.length === CARDS_PER_PLAYER;
  }

  calculateRoundScore(): RoundScoreDTO {
    let teamAPoints = this.teamATricks * TRICK_POINTS + this.teamAMindi * MINDI_POINTS;
    let teamBPoints = this.teamBTricks * TRICK_POINTS + this.teamBMindi * MINDI_POINTS;

    let coatTeam: Team | null = null;
    let doubleCoat = false;

    if (this.teamATricks === CARDS_PER_PLAYER) {
      coatTeam = Team.A;
      teamAPoints += COAT_POINTS;
      if (this.previousCoatTeam === Team.A) {
        doubleCoat = true;
        teamAPoints += COAT_POINTS * (DOUBLE_COAT_MULTIPLIER - 1);
      }
    } else if (this.teamBTricks === CARDS_PER_PLAYER) {
      coatTeam = Team.B;
      teamBPoints += COAT_POINTS;
      if (this.previousCoatTeam === Team.B) {
        doubleCoat = true;
        teamBPoints += COAT_POINTS * (DOUBLE_COAT_MULTIPLIER - 1);
      }
    }

    return {
      roundNumber: this.roundNumber,
      teamATricks: this.teamATricks,
      teamBTricks: this.teamBTricks,
      teamAMindi: this.teamAMindi,
      teamBMindi: this.teamBMindi,
      teamAPoints,
      teamBPoints,
      coatTeam,
      doubleCoat,
      dealerSeatIndex: this.dealerSeatIndex,
    };
  }

  trickToDTO(trick: TrickState) {
    return {
      plays: trick.plays.map((p) => ({
        playerId: p.playerId,
        seatIndex: p.seatIndex,
        card: p.card.toDTO(),
      })),
      leadSuit: trick.leadSuit,
      winnerId: trick.winnerId,
      winnerSeatIndex: trick.winnerSeatIndex,
    };
  }
}

export class ScoreManager {
  matchScore: MatchScoreDTO;
  roundHistory: RoundScoreDTO[] = [];

  constructor(targetScore: TargetScore) {
    this.matchScore = {
      teamA: 0,
      teamB: 0,
      roundsPlayed: 0,
      targetScore,
    };
  }

  applyRoundScore(roundScore: RoundScoreDTO): void {
    this.matchScore.teamA += roundScore.teamAPoints;
    this.matchScore.teamB += roundScore.teamBPoints;
    this.matchScore.roundsPlayed++;
    this.roundHistory.push(roundScore);
  }

  getWinnerTeam(maxRounds: number): Team | null {
    if (this.matchScore.teamA >= this.matchScore.targetScore) return Team.A;
    if (this.matchScore.teamB >= this.matchScore.targetScore) return Team.B;
    if (this.matchScore.roundsPlayed >= maxRounds) {
      if (this.matchScore.teamA > this.matchScore.teamB) return Team.A;
      if (this.matchScore.teamB > this.matchScore.teamA) return Team.B;
    }
    return null;
  }
}
