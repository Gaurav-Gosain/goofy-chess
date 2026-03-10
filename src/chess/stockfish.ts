// Stockfish Web Worker wrapper using UCI protocol
// Uses the lite-single variant (no SharedArrayBuffer needed, ~7MB)

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private resolveMove: ((uci: string) => void) | null = null;
  private skillLevel: number;

  constructor(skillLevel = 10) {
    this.skillLevel = skillLevel;
  }

  async init(): Promise<void> {
    if (this.worker) return;

    return new Promise<void>((resolve, reject) => {
      this.worker = new Worker('/stockfish/stockfish.js');

      this.worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';

        if (line === 'uciok') {
          this.send(`setoption name Skill Level value ${this.skillLevel}`);
          this.send('isready');
        }

        if (line === 'readyok') {
          this.ready = true;
          resolve();
        }

        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          const move = parts[1];
          if (this.resolveMove && move) {
            this.resolveMove(move);
            this.resolveMove = null;
          }
        }
      };

      this.worker.onerror = (err) => {
        console.error('Stockfish worker error:', err);
        reject(err);
      };

      this.send('uci');
    });
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  setSkillLevel(level: number) {
    this.skillLevel = level;
    if (this.ready) {
      this.send(`setoption name Skill Level value ${level}`);
    }
  }

  async getBestMove(fen: string, moveTimeMs = 1000, depth = 0): Promise<string> {
    if (!this.ready || !this.worker) {
      throw new Error('Stockfish not initialized');
    }

    return new Promise((resolve) => {
      this.resolveMove = resolve;
      this.send('ucinewgame');
      this.send(`position fen ${fen}`);
      if (depth > 0) {
        this.send(`go depth ${depth}`);
      } else {
        this.send(`go movetime ${moveTimeMs}`);
      }
    });
  }

  destroy() {
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}
