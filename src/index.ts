import { serve } from "bun";
import index from "./index.html";
import { resolve } from "path";

const STOCKFISH_DIR = resolve(import.meta.dir, "../node_modules/stockfish/bin");
const CHESS_ASSETS_DIR = resolve(import.meta.dir, "chess/assets");

const WEAPON_ASSETS_DIR = resolve(import.meta.dir, "chess/assets/weapons");
const SOUND_ASSETS_DIR = resolve(import.meta.dir, "chess/assets/sounds");

function serveGlb(filename: string) {
  const file = Bun.file(resolve(CHESS_ASSETS_DIR, filename));
  return new Response(file, {
    headers: { "Content-Type": "model/gltf-binary" },
  });
}

function serveWeaponGlb(filename: string) {
  const file = Bun.file(resolve(WEAPON_ASSETS_DIR, filename));
  return new Response(file, {
    headers: { "Content-Type": "model/gltf-binary" },
  });
}

function serveSound(filename: string) {
  const file = Bun.file(resolve(SOUND_ASSETS_DIR, filename));
  return new Response(file, {
    headers: { "Content-Type": "audio/mpeg" },
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
    "/assets/chess/gopher.glb": () => serveGlb("gopher.glb"),
    "/assets/chess/crown.glb": () => serveGlb("crown.glb"),

    // Serve weapon GLB models
    "/assets/weapons/sword.glb": () => serveWeaponGlb("sword.glb"),
    "/assets/weapons/spear.glb": () => serveWeaponGlb("spear.glb"),
    "/assets/weapons/shield.glb": () => serveWeaponGlb("shield.glb"),
    "/assets/weapons/blaster-a.glb": () => serveWeaponGlb("blaster-a.glb"),
    "/assets/weapons/blaster-d.glb": () => serveWeaponGlb("blaster-d.glb"),
    "/assets/weapons/blaster-e.glb": () => serveWeaponGlb("blaster-e.glb"),
    "/assets/weapons/blaster-h.glb": () => serveWeaponGlb("blaster-h.glb"),
    "/assets/weapons/blaster-k.glb": () => serveWeaponGlb("blaster-k.glb"),
    "/assets/weapons/blaster-n.glb": () => serveWeaponGlb("blaster-n.glb"),

    // Sound routes handled dynamically in fetch below
  },

  // Fallback: serve sound files dynamically, or index.html for SPA routing
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/assets/sounds/") && url.pathname.endsWith(".mp3")) {
      const filename = url.pathname.slice("/assets/sounds/".length);
      return serveSound(filename);
    }
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
