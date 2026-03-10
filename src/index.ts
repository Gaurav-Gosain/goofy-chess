import { serve } from "bun";
import index from "./index.html";
import { resolve } from "path";

const STOCKFISH_DIR = resolve(import.meta.dir, "../node_modules/stockfish/bin");
const CHESS_ASSETS_DIR = resolve(import.meta.dir, "chess/assets");

function serveGlb(filename: string) {
  const file = Bun.file(resolve(CHESS_ASSETS_DIR, filename));
  return new Response(file, {
    headers: { "Content-Type": "model/gltf-binary" },
  });
}

const server = serve({
  routes: {
    "/": index,

    // Serve stockfish files
    "/stockfish/stockfish.js": async () => {
      const file = Bun.file(resolve(STOCKFISH_DIR, "stockfish-18-lite-single.js"));
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" },
      });
    },
    "/stockfish/stockfish.wasm": async () => {
      const file = Bun.file(resolve(STOCKFISH_DIR, "stockfish-18-lite-single.wasm"));
      return new Response(file, {
        headers: { "Content-Type": "application/wasm" },
      });
    },

    // Serve chess piece GLB models
    "/assets/chess/King.glb": () => serveGlb("King.glb"),
    "/assets/chess/Queen.glb": () => serveGlb("Queen.glb"),
    "/assets/chess/Bishop.glb": () => serveGlb("Bishop.glb"),
    "/assets/chess/Knight.glb": () => serveGlb("Knight.glb"),
    "/assets/chess/Rook.glb": () => serveGlb("Rook.glb"),
    "/assets/chess/Pawn.glb": () => serveGlb("Pawn.glb"),
  },

  // Fallback: serve index.html for SPA routing
  fetch(req) {
    return new Response(Bun.file(resolve(import.meta.dir, "index.html")), {
      headers: { "Content-Type": "text/html" },
    });
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
