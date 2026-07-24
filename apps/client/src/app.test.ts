import { describe, it, expect } from 'vitest';
import { TargetScore, TurnTimer, getTeamForSeat, Team } from '@mindi-coat/shared';

describe('client shared imports', () => {
  it('exposes game constants', () => {
    expect(TargetScore.HUNDRED).toBe(100);
    expect(TurnTimer.FORTY_FIVE).toBe(45);
  });

  it('maps seats to teams', () => {
    expect(getTeamForSeat(0)).toBe(Team.A);
    expect(getTeamForSeat(1)).toBe(Team.B);
  });
});
