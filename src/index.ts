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

    // Serve meme sound effects (wildcard-ish: serve any mp3 from sounds dir)
    "/assets/sounds/vine-boom.mp3": () => serveSound("vine-boom.mp3"),
    "/assets/sounds/air-horn.mp3": () => serveSound("air-horn.mp3"),
    "/assets/sounds/bonk.mp3": () => serveSound("bonk.mp3"),
    "/assets/sounds/sad-trombone.mp3": () => serveSound("sad-trombone.mp3"),
    "/assets/sounds/bruh.mp3": () => serveSound("bruh.mp3"),
    "/assets/sounds/oof.mp3": () => serveSound("oof.mp3"),
    "/assets/sounds/dramatic.mp3": () => serveSound("dramatic.mp3"),
    "/assets/sounds/victory.mp3": () => serveSound("victory.mp3"),
    "/assets/sounds/explosion.mp3": () => serveSound("explosion.mp3"),
    "/assets/sounds/gunshot.mp3": () => serveSound("gunshot.mp3"),
    "/assets/sounds/faaah.mp3": () => serveSound("faaah.mp3"),
    // New reaction sounds
    "/assets/sounds/sheesh.mp3": () => serveSound("sheesh.mp3"),
    "/assets/sounds/sus.mp3": () => serveSound("sus.mp3"),
    "/assets/sounds/wow.mp3": () => serveSound("wow.mp3"),
    "/assets/sounds/nani.mp3": () => serveSound("nani.mp3"),
    "/assets/sounds/rizz.mp3": () => serveSound("rizz.mp3"),
    "/assets/sounds/emotional-damage.mp3": () => serveSound("emotional-damage.mp3"),
    "/assets/sounds/john-cena.mp3": () => serveSound("john-cena.mp3"),
    "/assets/sounds/wilhelm.mp3": () => serveSound("wilhelm.mp3"),
    "/assets/sounds/metal-pipe.mp3": () => serveSound("metal-pipe.mp3"),
    "/assets/sounds/windows-error.mp3": () => serveSound("windows-error.mp3"),
    "/assets/sounds/taco-bell.mp3": () => serveSound("taco-bell.mp3"),
    "/assets/sounds/record-scratch.mp3": () => serveSound("record-scratch.mp3"),
    // Movement sounds
    "/assets/sounds/boing.mp3": () => serveSound("boing.mp3"),
    "/assets/sounds/whoosh.mp3": () => serveSound("whoosh.mp3"),
    "/assets/sounds/fart.mp3": () => serveSound("fart.mp3"),
    "/assets/sounds/pop.mp3": () => serveSound("pop.mp3"),
    "/assets/sounds/dun-dun-dun.mp3": () => serveSound("dun-dun-dun.mp3"),
    "/assets/sounds/tada.mp3": () => serveSound("tada.mp3"),
    "/assets/sounds/doge-bonk.mp3": () => serveSound("doge-bonk.mp3"),
    "/assets/sounds/yeet.mp3": () => serveSound("yeet.mp3"),
    // Desi sounds
    "/assets/sounds/modi-mitron.mp3": () => serveSound("modi-mitron.mp3"),
    "/assets/sounds/achhe-din.mp3": () => serveSound("achhe-din.mp3"),
    "/assets/sounds/bollywood-drama.mp3": () => serveSound("bollywood-drama.mp3"),
    "/assets/sounds/dhol.mp3": () => serveSound("dhol.mp3"),
    "/assets/sounds/jai-shree-ram.mp3": () => serveSound("jai-shree-ram.mp3"),
    "/assets/sounds/tv-serial-shock.mp3": () => serveSound("tv-serial-shock.mp3"),
    "/assets/sounds/kya-ho-raha-hai.mp3": () => serveSound("kya-ho-raha-hai.mp3"),
    "/assets/sounds/thalaiva.mp3": () => serveSound("thalaiva.mp3"),
    "/assets/sounds/bahut-hard.mp3": () => serveSound("bahut-hard.mp3"),
    "/assets/sounds/ipl-sixer.mp3": () => serveSound("ipl-sixer.mp3"),
    "/assets/sounds/auto-horn.mp3": () => serveSound("auto-horn.mp3"),
    "/assets/sounds/item-song.mp3": () => serveSound("item-song.mp3"),
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
