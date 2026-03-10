// Meme sound manager — preloads and plays meme sounds during cutscenes & moves
// Supports normal mode and "desi" mode with Indian meme sounds

export type MemeMode = 'normal' | 'desi';

type SoundId =
  // Original
  | 'vine-boom' | 'air-horn' | 'bonk' | 'sad-trombone'
  | 'bruh' | 'oof' | 'dramatic' | 'victory'
  | 'explosion' | 'gunshot' | 'faaah'
  // New reactions
  | 'sheesh' | 'sus' | 'wow' | 'nani' | 'rizz' | 'emotional-damage'
  | 'john-cena' | 'wilhelm' | 'metal-pipe' | 'windows-error'
  | 'taco-bell' | 'record-scratch'
  // Movement/cartoon
  | 'boing' | 'whoosh' | 'fart' | 'pop' | 'dun-dun-dun' | 'tada'
  | 'doge-bonk' | 'yeet'
  // Desi
  | 'modi-mitron' | 'achhe-din' | 'bollywood-drama' | 'dhol'
  | 'jai-shree-ram' | 'tv-serial-shock' | 'kya-ho-raha-hai'
  | 'thalaiva' | 'bahut-hard' | 'ipl-sixer' | 'auto-horn' | 'item-song';

const SOUND_URLS: Record<SoundId, string> = {
  // Original
  'vine-boom': 'assets/sounds/vine-boom.mp3',
  'air-horn': 'assets/sounds/air-horn.mp3',
  'bonk': 'assets/sounds/bonk.mp3',
  'sad-trombone': 'assets/sounds/sad-trombone.mp3',
  'bruh': 'assets/sounds/bruh.mp3',
  'oof': 'assets/sounds/oof.mp3',
  'dramatic': 'assets/sounds/dramatic.mp3',
  'victory': 'assets/sounds/victory.mp3',
  'explosion': 'assets/sounds/explosion.mp3',
  'gunshot': 'assets/sounds/gunshot.mp3',
  'faaah': 'assets/sounds/faaah.mp3',
  // Reactions
  'sheesh': 'assets/sounds/sheesh.mp3',
  'sus': 'assets/sounds/sus.mp3',
  'wow': 'assets/sounds/wow.mp3',
  'nani': 'assets/sounds/nani.mp3',
  'rizz': 'assets/sounds/rizz.mp3',
  'emotional-damage': 'assets/sounds/emotional-damage.mp3',
  'john-cena': 'assets/sounds/john-cena.mp3',
  'wilhelm': 'assets/sounds/wilhelm.mp3',
  'metal-pipe': 'assets/sounds/metal-pipe.mp3',
  'windows-error': 'assets/sounds/windows-error.mp3',
  'taco-bell': 'assets/sounds/taco-bell.mp3',
  'record-scratch': 'assets/sounds/record-scratch.mp3',
  // Movement
  'boing': 'assets/sounds/boing.mp3',
  'whoosh': 'assets/sounds/whoosh.mp3',
  'fart': 'assets/sounds/fart.mp3',
  'pop': 'assets/sounds/pop.mp3',
  'dun-dun-dun': 'assets/sounds/dun-dun-dun.mp3',
  'tada': 'assets/sounds/tada.mp3',
  'doge-bonk': 'assets/sounds/doge-bonk.mp3',
  'yeet': 'assets/sounds/yeet.mp3',
  // Desi
  'modi-mitron': 'assets/sounds/modi-mitron.mp3',
  'achhe-din': 'assets/sounds/achhe-din.mp3',
  'bollywood-drama': 'assets/sounds/bollywood-drama.mp3',
  'dhol': 'assets/sounds/dhol.mp3',
  'jai-shree-ram': 'assets/sounds/jai-shree-ram.mp3',
  'tv-serial-shock': 'assets/sounds/tv-serial-shock.mp3',
  'kya-ho-raha-hai': 'assets/sounds/kya-ho-raha-hai.mp3',
  'thalaiva': 'assets/sounds/thalaiva.mp3',
  'bahut-hard': 'assets/sounds/bahut-hard.mp3',
  'ipl-sixer': 'assets/sounds/ipl-sixer.mp3',
  'auto-horn': 'assets/sounds/auto-horn.mp3',
  'item-song': 'assets/sounds/item-song.mp3',
};

// ---- Sound pools by category and mode ----

const POOLS = {
  normal: {
    // Sounds when a piece moves (random pick)
    move: ['boing', 'whoosh', 'pop', 'fart', 'taco-bell', 'sus', 'rizz', 'wow'] as SoundId[],
    // Dramatic stinger at cutscene start
    showdown: ['dramatic', 'dun-dun-dun', 'record-scratch', 'nani'] as SoundId[],
    // Impact on hit
    meleeImpact: ['vine-boom', 'bonk', 'doge-bonk', 'metal-pipe', 'explosion'] as SoundId[],
    rangedImpact: ['vine-boom', 'explosion', 'metal-pipe', 'emotional-damage'] as SoundId[],
    // Ranged fire
    blasterFire: ['gunshot'] as SoundId[],
    // Victim reaction
    victim: ['oof', 'bruh', 'sad-trombone', 'faaah', 'wilhelm', 'windows-error', 'nani'] as SoundId[],
    // Hype after kill
    hype: ['air-horn', 'victory', 'john-cena', 'sheesh', 'tada', 'yeet'] as SoundId[],
    // Check sound
    check: ['dun-dun-dun', 'nani', 'dramatic', 'vine-boom'] as SoundId[],
  },
  desi: {
    move: ['dhol', 'auto-horn', 'boing', 'pop', 'item-song', 'thalaiva'] as SoundId[],
    showdown: ['bollywood-drama', 'tv-serial-shock', 'modi-mitron', 'dun-dun-dun'] as SoundId[],
    meleeImpact: ['dhol', 'vine-boom', 'metal-pipe', 'ipl-sixer', 'bahut-hard'] as SoundId[],
    rangedImpact: ['ipl-sixer', 'explosion', 'bollywood-drama', 'tv-serial-shock'] as SoundId[],
    blasterFire: ['gunshot'] as SoundId[],
    victim: ['kya-ho-raha-hai', 'faaah', 'achhe-din', 'oof', 'wilhelm', 'tv-serial-shock'] as SoundId[],
    hype: ['jai-shree-ram', 'ipl-sixer', 'modi-mitron', 'thalaiva', 'bahut-hard', 'dhol'] as SoundId[],
    check: ['tv-serial-shock', 'bollywood-drama', 'modi-mitron', 'dhol'] as SoundId[],
  },
};

// No-repeat tracker: prevents same sound from playing twice in a row per category
const lastPlayed: Record<string, SoundId | null> = {};

function pickFromPool(pool: SoundId[], category: string): SoundId {
  if (pool.length <= 1) return pool[0]!;
  const last = lastPlayed[category];
  const filtered = last ? pool.filter(s => s !== last) : pool;
  const pick = (filtered.length > 0 ? filtered : pool)[Math.floor(Math.random() * (filtered.length > 0 ? filtered : pool).length)]!;
  lastPlayed[category] = pick;
  return pick;
}

class MemeAudio {
  private cache: Map<SoundId, HTMLAudioElement[]> = new Map();
  private loaded = false;
  private unlocked = false;
  mode: MemeMode = 'normal';

  preload() {
    if (this.loaded) return;
    this.loaded = true;
    for (const [id, url] of Object.entries(SOUND_URLS)) {
      const instances = [new Audio(url), new Audio(url), new Audio(url)];
      instances.forEach(a => { a.preload = 'auto'; a.volume = 0.5; });
      this.cache.set(id as SoundId, instances);
    }
    if (!this.unlocked) {
      const unlock = () => {
        this.unlocked = true;
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

  private get pools() { return POOLS[this.mode]; }

  play(id: SoundId, volume = 0.5) {
    const instances = this.cache.get(id);
    if (!instances) return;
    const audio = instances.find(a => a.paused || a.ended) ?? instances[0]!;
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  }

  /** Random sound when a piece moves */
  playMove() {
    this.play(pickFromPool(this.pools.move, 'move'), 0.3);
  }

  /** Dramatic stinger at cutscene showdown */
  playShowdown() {
    this.play(pickFromPool(this.pools.showdown, 'showdown'), 0.5);
  }

  /** Impact sound at hit */
  playImpact(isRanged: boolean) {
    const pool = isRanged ? this.pools.rangedImpact : this.pools.meleeImpact;
    this.play(pickFromPool(pool, 'impact'), 0.6);
  }

  /** Blaster fire */
  playBlasterFire() {
    this.play(pickFromPool(this.pools.blasterFire, 'blaster'), 0.4);
  }

  /** Victim reaction */
  playVictimReaction() {
    this.play(pickFromPool(this.pools.victim, 'victim'), 0.45);
  }

  /** Hype sound on kill */
  playHype() {
    this.play(pickFromPool(this.pools.hype, 'hype'), 0.35);
  }

  /** Check warning */
  playCheck() {
    this.play(pickFromPool(this.pools.check, 'check'), 0.45);
  }
}

export const memeAudio = new MemeAudio();
