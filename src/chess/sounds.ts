// Meme sound manager — preloads and plays meme sounds during cutscenes & moves
// Supports normal mode and "desi" mode with Indian meme sounds

export type MemeMode = 'normal' | 'desi';

type SoundId =
  // Original
  | 'vine-boom' | 'air-horn' | 'bonk' | 'sad-trombone'
  | 'bruh' | 'oof' | 'dramatic' | 'victory'
  | 'explosion' | 'gunshot' | 'faaah'
  // Reactions
  | 'sheesh' | 'sus' | 'wow' | 'nani' | 'rizz' | 'emotional-damage'
  | 'john-cena' | 'wilhelm' | 'metal-pipe' | 'windows-error'
  | 'taco-bell' | 'record-scratch'
  // Movement/cartoon
  | 'boing' | 'whoosh' | 'fart' | 'pop' | 'dun-dun-dun' | 'tada'
  | 'doge-bonk' | 'yeet'
  // Modern memes (batch 2)
  | 'amogus' | 'baka' | 'bing-chilling' | 'curb' | 'gigachad'
  | 'gta-wasted' | 'hello-darkness' | 'law-and-order'
  | 'mario-death' | 'mgs-alert' | 'mission-impossible'
  | 'oh-no' | 'run' | 'skill-issue' | 'to-be-continued'
  // Desi
  | 'modi-mitron' | 'achhe-din' | 'bollywood-drama' | 'dhol'
  | 'jai-shree-ram' | 'tv-serial-shock' | 'kya-ho-raha-hai'
  | 'thalaiva' | 'bahut-hard' | 'ipl-sixer' | 'auto-horn' | 'item-song'
  // Desi batch 2
  | 'arijit-sad' | 'bollywood-slap' | 'chai' | 'ganpati'
  | 'hera-pheri' | 'jethalal' | 'rickshaw' | 'tunak'
  | 'pawri' | 'rasode' | 'binod' | 'shaadi';

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
  // Modern memes (batch 2)
  'amogus': 'assets/sounds/amogus.mp3',
  'baka': 'assets/sounds/baka.mp3',
  'bing-chilling': 'assets/sounds/bing-chilling.mp3',
  'curb': 'assets/sounds/curb.mp3',
  'gigachad': 'assets/sounds/gigachad.mp3',
  'gta-wasted': 'assets/sounds/gta-wasted.mp3',
  'hello-darkness': 'assets/sounds/hello-darkness.mp3',
  'law-and-order': 'assets/sounds/law-and-order.mp3',
  'mario-death': 'assets/sounds/mario-death.mp3',
  'mgs-alert': 'assets/sounds/mgs-alert.mp3',
  'mission-impossible': 'assets/sounds/mission-impossible.mp3',
  'oh-no': 'assets/sounds/oh-no.mp3',
  'run': 'assets/sounds/run.mp3',
  'skill-issue': 'assets/sounds/skill-issue.mp3',
  'to-be-continued': 'assets/sounds/to-be-continued.mp3',
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
  // Desi batch 2
  'arijit-sad': 'assets/sounds/arijit-sad.mp3',
  'bollywood-slap': 'assets/sounds/bollywood-slap.mp3',
  'chai': 'assets/sounds/chai.mp3',
  'ganpati': 'assets/sounds/ganpati.mp3',
  'hera-pheri': 'assets/sounds/hera-pheri.mp3',
  'jethalal': 'assets/sounds/jethalal.mp3',
  'rickshaw': 'assets/sounds/rickshaw.mp3',
  'tunak': 'assets/sounds/tunak.mp3',
  'pawri': 'assets/sounds/pawri.mp3',
  'rasode': 'assets/sounds/rasode.mp3',
  'binod': 'assets/sounds/binod.mp3',
  'shaadi': 'assets/sounds/shaadi.mp3',
};

// ---- Sound pools by category and mode ----

const POOLS = {
  normal: {
    move: ['boing', 'whoosh', 'pop', 'fart', 'taco-bell', 'sus', 'rizz', 'wow', 'amogus', 'baka', 'sheesh', 'run', 'bing-chilling'] as SoundId[],
    showdown: ['dramatic', 'dun-dun-dun', 'record-scratch', 'nani', 'mgs-alert', 'mission-impossible', 'law-and-order', 'to-be-continued'] as SoundId[],
    meleeImpact: ['vine-boom', 'bonk', 'doge-bonk', 'metal-pipe', 'explosion', 'gta-wasted'] as SoundId[],
    rangedImpact: ['vine-boom', 'explosion', 'metal-pipe', 'emotional-damage', 'gta-wasted'] as SoundId[],
    blasterFire: ['gunshot'] as SoundId[],
    victim: ['oof', 'bruh', 'sad-trombone', 'faaah', 'wilhelm', 'windows-error', 'nani', 'mario-death', 'oh-no', 'hello-darkness', 'baka', 'skill-issue', 'run'] as SoundId[],
    hype: ['air-horn', 'victory', 'john-cena', 'sheesh', 'tada', 'yeet', 'gigachad', 'bing-chilling'] as SoundId[],
    check: ['dun-dun-dun', 'nani', 'dramatic', 'vine-boom', 'mgs-alert', 'curb', 'law-and-order'] as SoundId[],
  },
  desi: {
    move: ['dhol', 'auto-horn', 'boing', 'pop', 'item-song', 'thalaiva', 'tunak', 'rickshaw', 'chai', 'shaadi'] as SoundId[],
    showdown: ['bollywood-drama', 'tv-serial-shock', 'modi-mitron', 'dun-dun-dun', 'ganpati', 'mission-impossible', 'rasode'] as SoundId[],
    meleeImpact: ['dhol', 'vine-boom', 'metal-pipe', 'ipl-sixer', 'bahut-hard', 'bollywood-slap'] as SoundId[],
    rangedImpact: ['ipl-sixer', 'explosion', 'bollywood-drama', 'tv-serial-shock', 'bollywood-slap'] as SoundId[],
    blasterFire: ['gunshot'] as SoundId[],
    victim: ['kya-ho-raha-hai', 'faaah', 'achhe-din', 'oof', 'wilhelm', 'tv-serial-shock', 'jethalal', 'hera-pheri', 'arijit-sad', 'binod'] as SoundId[],
    hype: ['jai-shree-ram', 'ipl-sixer', 'modi-mitron', 'thalaiva', 'bahut-hard', 'dhol', 'ganpati', 'tunak', 'pawri'] as SoundId[],
    check: ['tv-serial-shock', 'bollywood-drama', 'modi-mitron', 'dhol', 'jethalal', 'rasode'] as SoundId[],
  },
};

// No-repeat tracker — remembers last N per category to avoid repetition
const recentPlayed: Record<string, SoundId[]> = {};

function pickFromPool(pool: SoundId[], category: string): SoundId {
  if (pool.length <= 1) return pool[0]!;
  const recent = recentPlayed[category] ?? [];
  // Filter out up to half the pool size from recent history
  const historyLen = Math.min(4, Math.floor(pool.length / 2));
  const recentSet = recent.slice(0, historyLen);
  const filtered = pool.filter(s => !recentSet.includes(s));
  const arr = filtered.length > 0 ? filtered : pool;
  const pick = arr[Math.floor(Math.random() * arr.length)]!;
  recentPlayed[category] = [pick, ...recent.slice(0, 5)];
  return pick;
}

// Global cooldown to prevent audio overlap in fast games (AI vs AI)
const MIN_MOVE_SOUND_INTERVAL = 600; // ms between move sounds
const MIN_CATEGORY_INTERVAL = 300; // ms between any category sound

class MemeAudio {
  private cache: Map<SoundId, HTMLAudioElement[]> = new Map();
  private loaded = false;
  private unlocked = false;
  private lastMoveTime = 0;
  private lastCategoryTime: Record<string, number> = {};
  mode: MemeMode = 'normal';
  /** Global volume multiplier 0-1 */
  volume = 0.3;
  /** Muted state */
  muted = false;

  preload() {
    if (this.loaded) return;
    this.loaded = true;
    for (const [id, url] of Object.entries(SOUND_URLS)) {
      const instances = [new Audio(url), new Audio(url)];
      instances.forEach(a => { a.preload = 'auto'; });
      this.cache.set(id as SoundId, instances);
    }
    if (!this.unlocked) {
      const unlock = () => {
        this.unlocked = true;
        const keySounds: SoundId[] = ['pop', 'whoosh', 'boing'];
        for (const id of keySounds) {
          const inst = this.cache.get(id);
          if (inst) {
            const a = inst[0]!;
            a.volume = 0;
            a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
          }
        }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('click', unlock);
      document.addEventListener('touchstart', unlock);
      document.addEventListener('keydown', unlock);
    }
  }

  private get pools() { return POOLS[this.mode]; }

  play(id: SoundId, relativeVolume = 0.5) {
    if (this.muted) return;
    const instances = this.cache.get(id);
    if (!instances) return;
    const audio = instances.find(a => a.paused || a.ended) ?? instances[0]!;
    audio.currentTime = 0;
    audio.volume = Math.min(1, relativeVolume * this.volume);
    audio.play().catch(() => {});
    return audio;
  }

  /** Check category cooldown */
  private canPlayCategory(cat: string, minInterval: number): boolean {
    const now = Date.now();
    const last = this.lastCategoryTime[cat] ?? 0;
    if (now - last < minInterval) return false;
    this.lastCategoryTime[cat] = now;
    return true;
  }

  /** Stop all sounds (for cutscene skip, new game, etc.) */
  stopAll() {
    for (const instances of this.cache.values()) {
      for (const a of instances) {
        if (!a.paused) { a.pause(); a.currentTime = 0; }
      }
    }
  }

  /** Random sound when a piece moves — cooldown prevents overlap, no aggressive cut */
  playMove() {
    const now = Date.now();
    if (now - this.lastMoveTime < MIN_MOVE_SOUND_INTERVAL) return;
    this.lastMoveTime = now;
    this.play(pickFromPool(this.pools.move, 'move'), 0.4);
  }

  playShowdown() {
    if (!this.canPlayCategory('showdown', MIN_CATEGORY_INTERVAL)) return;
    this.play(pickFromPool(this.pools.showdown, 'showdown'), 0.6);
  }

  playImpact(isRanged: boolean) {
    if (!this.canPlayCategory('impact', MIN_CATEGORY_INTERVAL)) return;
    const pool = isRanged ? this.pools.rangedImpact : this.pools.meleeImpact;
    this.play(pickFromPool(pool, 'impact'), 0.7);
  }

  playBlasterFire() {
    if (!this.canPlayCategory('blaster', MIN_CATEGORY_INTERVAL)) return;
    this.play(pickFromPool(this.pools.blasterFire, 'blaster'), 0.5);
  }

  playVictimReaction() {
    if (!this.canPlayCategory('victim', MIN_CATEGORY_INTERVAL)) return;
    this.play(pickFromPool(this.pools.victim, 'victim'), 0.55);
  }

  playHype() {
    if (!this.canPlayCategory('hype', MIN_CATEGORY_INTERVAL)) return;
    this.play(pickFromPool(this.pools.hype, 'hype'), 0.5);
  }

  playCheck() {
    if (!this.canPlayCategory('check', 500)) return;
    this.play(pickFromPool(this.pools.check, 'check'), 0.55);
  }
}

export const memeAudio = new MemeAudio();
