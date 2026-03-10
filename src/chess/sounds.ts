// Meme sound manager — preloads and plays meme sounds during cutscenes

type SoundId =
  | 'vine-boom' | 'air-horn' | 'bonk' | 'sad-trombone'
  | 'bruh' | 'oof' | 'dramatic' | 'victory'
  | 'explosion' | 'gunshot' | 'faaah';

const SOUND_URLS: Record<SoundId, string> = {
  'vine-boom': '/assets/sounds/vine-boom.mp3',
  'air-horn': '/assets/sounds/air-horn.mp3',
  'bonk': '/assets/sounds/bonk.mp3',
  'sad-trombone': '/assets/sounds/sad-trombone.mp3',
  'bruh': '/assets/sounds/bruh.mp3',
  'oof': '/assets/sounds/oof.mp3',
  'dramatic': '/assets/sounds/dramatic.mp3',
  'victory': '/assets/sounds/victory.mp3',
  'explosion': '/assets/sounds/explosion.mp3',
  'gunshot': '/assets/sounds/gunshot.mp3',
  'faaah': '/assets/sounds/faaah.mp3',
};

// Impact sounds — played on hit
const MELEE_IMPACT_SOUNDS: SoundId[] = ['vine-boom', 'bonk', 'explosion'];
const RANGED_IMPACT_SOUNDS: SoundId[] = ['vine-boom', 'explosion'];

// Reaction sounds — played after kill
const HYPE_SOUNDS: SoundId[] = ['air-horn', 'victory'];
const VICTIM_SOUNDS: SoundId[] = ['oof', 'bruh', 'sad-trombone', 'faaah'];

class MemeAudio {
  private cache: Map<SoundId, HTMLAudioElement[]> = new Map();
  private loaded = false;
  private unlocked = false;

  preload() {
    if (this.loaded) return;
    this.loaded = true;
    for (const [id, url] of Object.entries(SOUND_URLS)) {
      // Create 3 instances for overlapping playback
      const instances = [new Audio(url), new Audio(url), new Audio(url)];
      instances.forEach(a => { a.preload = 'auto'; a.volume = 0.5; });
      this.cache.set(id as SoundId, instances);
    }
    // Unlock audio on first user interaction (browser autoplay policy)
    if (!this.unlocked) {
      const unlock = () => {
        this.unlocked = true;
        // Play a silent buffer on each instance to unlock
        for (const instances of this.cache.values()) {
          for (const a of instances) {
            a.volume = 0;
            a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = 0.5; }).catch(() => {});
          }
        }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('click', unlock, { once: false });
      document.addEventListener('touchstart', unlock, { once: false });
      document.addEventListener('keydown', unlock, { once: false });
    }
  }

  play(id: SoundId, volume = 0.5) {
    const instances = this.cache.get(id);
    if (!instances) { console.warn('[MemeAudio] no cache for', id); return; }
    // Find an instance that's not playing
    const audio = instances.find(a => a.paused || a.ended) ?? instances[0]!;
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(err => console.warn('[MemeAudio] play failed:', id, err.message));
  }

  /** Pick random impact sound based on weapon category */
  playImpact(isRanged: boolean) {
    const pool = isRanged ? RANGED_IMPACT_SOUNDS : MELEE_IMPACT_SOUNDS;
    this.play(pool[Math.floor(Math.random() * pool.length)]!, 0.6);
  }

  /** Play the gunshot/blaster sound for ranged fire */
  playBlasterFire() {
    this.play('gunshot', 0.4);
  }

  /** Random reaction sound for the victim */
  playVictimReaction() {
    this.play(VICTIM_SOUNDS[Math.floor(Math.random() * VICTIM_SOUNDS.length)]!, 0.45);
  }

  /** Random hype sound for epic kills */
  playHype() {
    this.play(HYPE_SOUNDS[Math.floor(Math.random() * HYPE_SOUNDS.length)]!, 0.35);
  }

  playDramatic() {
    this.play('dramatic', 0.5);
  }
}

export const memeAudio = new MemeAudio();
