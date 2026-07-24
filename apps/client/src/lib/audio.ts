type SoundName = 'shuffle' | 'deal' | 'play' | 'win' | 'gameover';

const frequencies: Record<SoundName, number[]> = {
  shuffle: [220, 330, 440],
  deal: [523, 659],
  play: [440],
  win: [523, 659, 784],
  gameover: [392, 330, 262],
};

class AudioManager {
  private enabled = true;
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  play(name: SoundName) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const freqs = frequencies[name];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15 + i * 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + 0.2 + i * 0.05);
      });
    } catch {
      // Audio not available
    }
  }
}

export const audioManager = new AudioManager();
