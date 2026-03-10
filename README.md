# Goofy Chess

A fully 3D chess game where gopher pieces battle it out on a PlayCanvas-powered board, complete with anime-style kill cams, dramatic cutscenes, and a Stockfish AI opponent that will humble you.

**This entire project was vibecoded for fun.** No chess grandmasters were consulted. No design documents were harmed. Just vibes, Claude, and an unreasonable number of `useEffect` hooks.

## Features

- **3D Chess** — Full chess engine with legal move validation, castling, en passant, promotion, the works
- **Anime Kill Cams** — Capture a piece and watch a cinematic cutscene with dramatic camera angles, speed lines, impact frames, and trash talk dialogue
- **Stockfish Integration** — Play against Stockfish 18 (WASM) with configurable skill level and search depth. It will not go easy on you.
- **Stockfish vs Stockfish** — Watch two AIs fight while you eat popcorn
- **Checkmate Animation** — Special cinematic when the king falls, complete with confetti and a victory screen
- **Two Piece Styles** — Gopher-themed pieces (colored cylinders with personality) or classic 3D Staunton models (GLB)
- **PGN Replay** — Paste or upload a PGN file and watch famous games play out in 3D
- **Orbital Camera** — Orbit, zoom, and pan around the board like a chess spectator with too much free time

## Tech Stack

- **[Bun](https://bun.sh)** — Runtime, bundler, dev server, everything
- **[React 19](https://react.dev)** — Because even chess needs a virtual DOM
- **[PlayCanvas](https://playcanvas.com) + [@playcanvas/react](https://github.com/playcanvas/react)** — 3D rendering engine
- **[Stockfish 18](https://stockfishchess.org)** — Chess AI (WASM build)
- **TypeScript** — For the mass amounts of type safety this vibecoded project definitely needs

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server with HMR
bun dev

# Build for production
bun run build
```

Then open [http://localhost:3000](http://localhost:3000) and prepare to lose to Stockfish.

## How to Play

1. Click a piece to select it (green dots show valid moves)
2. Click a green dot to move (or a red dot to capture)
3. Watch the kill cam cutscene when you capture a piece
4. Lose to Stockfish
5. Switch to Stockfish vs Stockfish mode
6. Pretend you meant to do that

## Controls

- **Left click + drag** — Orbit camera
- **Scroll wheel** — Zoom in/out
- **Left panel** — Game mode, AI settings, piece style, PGN replay
- **New Game** — Bottom center button (you'll need it)

## Credits

- Chess piece 3D models from [ernest-rudnicki/chess-3d](https://github.com/ernest-rudnicki/chess-3d) (MIT License)
- Stockfish chess engine (GPL)
- Vibecoded with [Claude Code](https://claude.com/claude-code) by someone who just wanted to see gophers fight

## License

MIT — Do whatever you want with it. It's vibecoded chess. Go wild.
