// src/services/soundService.js

class SoundService {
  constructor() {
    this.sounds = {};
    this.enabled = true;
  }

  loadSound(name, url) {
    const audio = new Audio(url);
    this.sounds[name] = audio;
  }

  play(name) {
    if (!this.enabled) return;
    const sound = this.sounds[name];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export const soundService = new SoundService();