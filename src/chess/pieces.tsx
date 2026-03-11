import React, { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Entity, Gltf } from '@playcanvas/react';
import { Render, Script } from '@playcanvas/react/components';
import { useMaterial, useModel } from '@playcanvas/react/hooks';
import { Script as PcScript } from 'playcanvas';
import type { Entity as PcEntity, StandardMaterial } from 'playcanvas';
import type { PieceColor, PieceType, Pos } from './engine';
import { CLASSIC_PIECE_COMPONENTS, ClassicKing } from './ClassicPieces';

export type PieceStyle = 'gopher' | 'classic';

// ---- Goofy idle animation script ----
class GopherIdle extends PcScript {
  static override scriptName = 'gopherIdle';
  time = 0;
  baseY = 0;
  baseRotY = 0;

  // Wiggle state
  nextWiggle = 0;
  wiggleTime = 0;
  isWiggling = false;
  wiggleDuration = 0;

  // Bounce state
  nextBounce = 0;
  isBouncing = false;
  bounceTime = 0;

  // Look around state
  nextLook = 0;
  isLooking = false;
  lookTime = 0;
  lookDir = 0;

  initialize() {
    this.time = Math.random() * 100;
    this.nextWiggle = 1 + Math.random() * 6;
    this.nextBounce = 3 + Math.random() * 12;
    this.nextLook = 2 + Math.random() * 5;
    this.baseY = this.entity.getLocalPosition().y;
    this.baseRotY = this.entity.getLocalEulerAngles().y;
  }

  update(dt: number) {
    this.time += dt;
    const pos = this.entity.getLocalPosition();

    // Gentle breathing
    const breathe = Math.sin(this.time * 1.8) * 0.008;

    // Random wiggle (wobble side to side)
    if (!this.isWiggling && this.time > this.nextWiggle) {
      this.isWiggling = true;
      this.wiggleTime = 0;
      this.wiggleDuration = 0.3 + Math.random() * 0.4;
    }
    let wiggleZ = 0;
    if (this.isWiggling) {
      this.wiggleTime += dt;
      const t = this.wiggleTime / this.wiggleDuration;
      if (t >= 1) {
        this.isWiggling = false;
        this.nextWiggle = this.time + 2 + Math.random() * 8;
      } else {
        wiggleZ = Math.sin(t * Math.PI * 6) * 6 * (1 - t);
      }
    }

    // Random bounce (happy hop)
    if (!this.isBouncing && this.time > this.nextBounce) {
      this.isBouncing = true;
      this.bounceTime = 0;
    }
    let bounceY = 0;
    if (this.isBouncing) {
      this.bounceTime += dt;
      const t = this.bounceTime / 0.5;
      if (t >= 1) {
        this.isBouncing = false;
        this.nextBounce = this.time + 4 + Math.random() * 15;
      } else {
        // Double bounce
        bounceY = Math.abs(Math.sin(t * Math.PI * 2)) * 0.12 * (1 - t * 0.5);
      }
    }

    // Random look around (turn head)
    if (!this.isLooking && this.time > this.nextLook) {
      this.isLooking = true;
      this.lookTime = 0;
      this.lookDir = Math.random() > 0.5 ? 1 : -1;
    }
    let lookY = 0;
    if (this.isLooking) {
      this.lookTime += dt;
      const dur = 1.5;
      const t = this.lookTime / dur;
      if (t >= 1) {
        this.isLooking = false;
        this.nextLook = this.time + 3 + Math.random() * 8;
      } else {
        lookY = Math.sin(t * Math.PI) * 15 * this.lookDir;
      }
    }

    this.entity.setLocalPosition(pos.x, this.baseY + breathe + bounceY, pos.z);
    this.entity.setLocalEulerAngles(0, this.baseRotY + lookY, wiggleZ);
  }
}

// Color palettes
function useGopherMaterials(color: PieceColor) {
  const isWhite = color === 'white';

  const body = useMaterial({
    diffuse: isWhite ? [0.42, 0.84, 0.9] : [0.81, 0.4, 0.15],
    specular: [0.2, 0.2, 0.2],
  });
  const belly = useMaterial({
    diffuse: isWhite ? [0.85, 0.92, 0.94] : [0.95, 0.8, 0.6],
    specular: [0.15, 0.15, 0.15],
  });
  const eyeWhite = useMaterial({
    diffuse: [0.95, 0.95, 0.95],
    specular: [0.3, 0.3, 0.3],
  });
  const pupil = useMaterial({
    diffuse: [0.05, 0.05, 0.05],
    specular: [0.4, 0.4, 0.4],
  });
  const nose = useMaterial({
    diffuse: [0.2, 0.15, 0.1],
    specular: [0.1, 0.1, 0.1],
  });
  const tooth = useMaterial({
    diffuse: [0.97, 0.97, 0.92],
    specular: [0.2, 0.2, 0.2],
  });
  const accent = useMaterial({
    diffuse: isWhite ? [0.3, 0.65, 0.75] : [0.65, 0.3, 0.1],
    specular: [0.15, 0.15, 0.15],
  });
  const gold = useMaterial({
    diffuse: [0.9, 0.75, 0.2],
    specular: [0.5, 0.4, 0.1],
    metalness: 0.6,
  });
  return { body, belly, eyeWhite, pupil, nose, tooth, accent, gold };
}

// ---- GLB Gopher model with team color tinting ----

const GOPHER_GLB_URL = './assets/chess/gopher.glb';
const CROWN_GLB_URL = './assets/chess/crown.glb';

// Tint all meshes in a tree (used for simple models like crown)
function applyTintToTree(entity: PcEntity, mat: StandardMaterial) {
  if (entity.render) {
    for (const mi of entity.render.meshInstances) mi.material = mat;
  }
  for (const child of entity.children) applyTintToTree(child as PcEntity, mat);
}

type MeshInstance = import('playcanvas').MeshInstance;

const PROCESSED = new WeakSet<MeshInstance>();

interface EyeGroup { whites: MeshInstance[]; pupils: MeshInstance[] }
interface EyeParts { left: EyeGroup; right: EyeGroup }

function tintModel(
  entity: PcEntity, bodyMat: StandardMaterial, bellyMat: StandardMaterial,
  eyeWhiteMat: StandardMaterial,
  whites: MeshInstance[], blacks: MeshInstance[]
) {
  if (entity.render) {
    for (const mi of entity.render.meshInstances) {
      if (PROCESSED.has(mi)) continue;
      const orig = mi.material as StandardMaterial;
      if (!orig.diffuse) continue;
      const r = orig.diffuse.r, g = orig.diffuse.g, b = orig.diffuse.b;
      const brightness = r + g + b;
      PROCESSED.add(mi);
      if (brightness < 0.1) { blacks.push(mi); continue; }
      // Eyes/tooth: very bright AND all channels close to each other (near-white)
      // Threshold 2.5 avoids misclassifying tan belly (brightness ~2.0-2.1) as eyes
      if (brightness > 2.5 && Math.min(r, g, b) > 0.7) { mi.material = eyeWhiteMat; whites.push(mi); continue; }
      if (r > 0.5 && g > 0.3) mi.material = bellyMat;
      else mi.material = bodyMat;
    }
  }
  for (const child of entity.children) {
    tintModel(child as PcEntity, bodyMat, bellyMat, eyeWhiteMat, whites, blacks);
  }
}

// The gopher GLB has 3 white meshes (2 eyes + 1 tooth) and 3 black meshes (2 pupils + 1 nose).
// Pick the 2 highest-Y whites as eyes, pair each with nearest black as its pupil, split left/right.
function safeCenter(mi: MeshInstance): { x: number; y: number; z: number } | null {
  try { const c = mi.aabb.center; return { x: c.x, y: c.y, z: c.z }; }
  catch { return null; }
}

function buildEyeParts(whites: MeshInstance[], blacks: MeshInstance[]): EyeParts | null {
  const result: EyeParts = {
    left: { whites: [], pupils: [] },
    right: { whites: [], pupils: [] },
  };
  if (whites.length < 2) return null;

  // Filter to meshes with valid bounding boxes
  const validWhites = whites.filter(m => safeCenter(m) !== null);
  const validBlacks = blacks.filter(m => safeCenter(m) !== null);
  if (validWhites.length < 2) return null;

  // Sort whites by Y descending — top 2 are the eyes, rest are teeth etc.
  const sortedWhites = [...validWhites].sort((a, b) => safeCenter(b)!.y - safeCenter(a)!.y);
  const eyeWhites = sortedWhites.slice(0, 2);

  // For each eye white, find the nearest black mesh as its pupil
  const usedBlacks = new Set<MeshInstance>();
  const eyePupils: MeshInstance[] = [];
  for (const eye of eyeWhites) {
    const ec = safeCenter(eye)!;
    let bestDist = Infinity;
    let bestBlack: MeshInstance | null = null;
    for (const b of validBlacks) {
      if (usedBlacks.has(b)) continue;
      const bc = safeCenter(b)!;
      const dist = Math.sqrt((ec.x - bc.x) ** 2 + (ec.y - bc.y) ** 2 + (ec.z - bc.z) ** 2);
      if (dist < bestDist) { bestDist = dist; bestBlack = b; }
    }
    if (bestBlack) { usedBlacks.add(bestBlack); eyePupils.push(bestBlack); }
  }

  // Split into left/right by X position
  const avgX = eyeWhites.reduce((s, m) => s + safeCenter(m)!.x, 0) / eyeWhites.length;
  for (let i = 0; i < eyeWhites.length; i++) {
    const w = eyeWhites[i]!;
    const p = eyePupils[i];
    const side = safeCenter(w)!.x < avgX ? result.left : result.right;
    side.whites.push(w);
    if (p) side.pupils.push(p);
  }
  return result;
}

// Expected mesh count in the gopher GLB (15 meshes total)
const GOPHER_MESH_COUNT = 15;

function GopherGlb({ color, scale = 1 }: { color: PieceColor; scale?: number }) {
  const { asset } = useModel(GOPHER_GLB_URL);
  const entityRef = useRef<PcEntity | null>(null);
  const eyePartsRef = useRef<EyeParts | null>(null);
  const isWhite = color === 'white';
  const glbScale = 0.20 * scale;

  const bodyMat = useMaterial({
    diffuse: isWhite ? [0.42, 0.84, 0.9] : [0.81, 0.4, 0.15],
    specular: [0.2, 0.2, 0.2],
  });
  const bellyMat = useMaterial({
    diffuse: isWhite ? [0.75, 0.93, 0.96] : [0.88, 0.50, 0.22],
    specular: [0.15, 0.15, 0.15],
  });
  const blinkMat = useMaterial({
    diffuse: isWhite ? [0.42, 0.84, 0.9] : [0.81, 0.4, 0.15],
    specular: [0.1, 0.1, 0.1],
  });
  const eyeWhiteMat = useMaterial({
    diffuse: [0.95, 0.95, 0.95],
    specular: [0.3, 0.3, 0.3],
  });

  // Shared tint state across layout + deferred effects
  const tintStateRef = useRef({ whites: [] as MeshInstance[], blacks: [] as MeshInstance[], done: false });

  // Synchronous tint attempt — blocks paint so first frame shows correct colors if meshes are ready
  useLayoutEffect(() => {
    if (!entityRef.current || !bodyMat || !bellyMat || !eyeWhiteMat) return;
    const ts = tintStateRef.current;
    ts.whites = []; ts.blacks = []; ts.done = false;
    tintModel(entityRef.current, bodyMat, bellyMat, eyeWhiteMat, ts.whites, ts.blacks);
    if (ts.whites.length >= 2) eyePartsRef.current = buildEyeParts(ts.whites, ts.blacks);
    ts.done = countMeshInstances(entityRef.current) >= GOPHER_MESH_COUNT;
  }, [asset, bodyMat, bellyMat, eyeWhiteMat]);

  // Deferred retry for meshes not yet loaded during layout pass
  useEffect(() => {
    const ts = tintStateRef.current;
    if (ts.done || !entityRef.current || !bodyMat || !bellyMat || !eyeWhiteMat) return;
    const entity = entityRef.current;
    let active = true;
    let rafId = 0;

    const retry = () => {
      if (!active) return;
      const w: MeshInstance[] = [], b: MeshInstance[] = [];
      tintModel(entity, bodyMat, bellyMat, eyeWhiteMat, w, b);
      if (w.length > 0) ts.whites.push(...w);
      if (b.length > 0) ts.blacks.push(...b);
      if (ts.whites.length >= 2) eyePartsRef.current = buildEyeParts(ts.whites, ts.blacks);
      if (countMeshInstances(entity) < GOPHER_MESH_COUNT) {
        rafId = requestAnimationFrame(retry);
      } else {
        ts.done = true;
      }
    };
    rafId = requestAnimationFrame(retry);
    return () => { active = false; cancelAnimationFrame(rafId); };
  }, [asset, bodyMat, bellyMat, eyeWhiteMat]);

  // Goofy blink animation
  useEffect(() => {
    if (!blinkMat || !eyeWhiteMat) return;
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const closeEye = (group: EyeGroup) => {
      for (const mi of group.whites) mi.material = blinkMat;
      for (const mi of group.pupils) { mi.visible = false; mi.castShadow = false; }
    };
    const openEye = (group: EyeGroup) => {
      for (const mi of group.whites) mi.material = eyeWhiteMat;
      for (const mi of group.pupils) { mi.visible = true; mi.castShadow = true; }
    };

    const startBlink = () => {
      if (!active) return;
      const parts = eyePartsRef.current;
      if (!parts || (parts.left.whites.length === 0 && parts.right.whites.length === 0)) {
        timers.push(setTimeout(startBlink, 500));
        return;
      }

      const roll = Math.random();
      let blinkDuration: number;
      if (roll < 0.5) {
        closeEye(parts.left); closeEye(parts.right);
        blinkDuration = 100 + Math.random() * 60;
      } else if (roll < 0.7) {
        closeEye(parts.left);
        blinkDuration = 200 + Math.random() * 150;
      } else if (roll < 0.9) {
        closeEye(parts.right);
        blinkDuration = 200 + Math.random() * 150;
      } else {
        closeEye(parts.left); closeEye(parts.right);
        blinkDuration = 400 + Math.random() * 200;
      }

      timers.push(setTimeout(() => {
        if (!active) return;
        openEye(parts.left); openEye(parts.right);
        timers.push(setTimeout(startBlink, 1500 + Math.random() * 4500));
      }, blinkDuration));
    };

    timers.push(setTimeout(startBlink, 2000 + Math.random() * 3000));
    return () => { active = false; timers.forEach(clearTimeout); };
  }, [blinkMat, eyeWhiteMat]);

  if (!asset) return null;

  return (
    <Entity
      position={[0, 0.38, 0]}
      scale={[glbScale, glbScale, glbScale]}
      rotation={[0, 0, 7]}
      ref={entityRef as any}
    >
      <Gltf asset={asset} key={`gopher-${asset.id}-${color}`} />
    </Entity>
  );
}

function countMeshInstances(entity: PcEntity): number {
  let count = entity.render ? entity.render.meshInstances.length : 0;
  for (const child of entity.children) count += countMeshInstances(child as PcEntity);
  return count;
}

function CrownGlb({ scale = 1, yOffset = 0, color }: { scale?: number; yOffset?: number; color?: string }) {
  const { asset } = useModel(CROWN_GLB_URL);
  const entityRef = useRef<PcEntity | null>(null);
  const goldMat = useMaterial({
    diffuse: color === 'accent' ? [0.3, 0.65, 0.75] : [0.9, 0.75, 0.2],
    specular: [0.5, 0.4, 0.1],
    metalness: 0.6,
  });

  useEffect(() => {
    if (!entityRef.current || !goldMat) return;
    const entity = entityRef.current;
    let active = true;
    const apply = () => {
      if (!active) return;
      applyTintToTree(entity, goldMat);
      // Retry once for late-loading meshes
      setTimeout(() => { if (active) applyTintToTree(entity, goldMat); }, 100);
    };
    requestAnimationFrame(apply);
    return () => { active = false; };
  }, [asset, goldMat]);

  if (!asset) return null;

  const s = 0.15 * scale;
  return (
    <Entity position={[0, yOffset, 0]} scale={[s, s, s]} ref={entityRef as any}>
      <Gltf asset={asset} key={`crown-${asset.id}`} />
    </Entity>
  );
}

// Base gopher: use GLB model
function GopherBase({ color, scale = 1 }: { color: PieceColor; scale?: number }) {
  return <GopherGlb color={color} scale={scale} />;
}

// ---- Individual piece types ----

function PawnGopher({ color }: { color: PieceColor }) {
  return <GopherBase color={color} scale={0.85} />;
}

function RookGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={0.95} />
      {/* Castle tower base on head */}
      <Entity position={[0, 0.70, 0]} scale={[0.22, 0.12, 0.22]}>
        <Render type="cylinder" material={m.accent} />
      </Entity>
      {/* Merlons (battlements) — 4 corners, chunky */}
      <Entity position={[-0.11, 0.82, -0.11]} scale={[0.08, 0.10, 0.08]}>
        <Render type="box" material={m.accent} />
      </Entity>
      <Entity position={[0.11, 0.82, -0.11]} scale={[0.08, 0.10, 0.08]}>
        <Render type="box" material={m.accent} />
      </Entity>
      <Entity position={[-0.11, 0.82, 0.11]} scale={[0.08, 0.10, 0.08]}>
        <Render type="box" material={m.accent} />
      </Entity>
      <Entity position={[0.11, 0.82, 0.11]} scale={[0.08, 0.10, 0.08]}>
        <Render type="box" material={m.accent} />
      </Entity>
    </Entity>
  );
}

function KnightGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={0.95} />
      {/* Horse mane — spikes pointing outward, placed just outside the head surface.
          Head center ~(0, 0.50, 0), radius ~0.20. Each spike offset outward by ~0.03 */}
      <Entity position={[0, 0.72, -0.04]} rotation={[-10, 0, 0]} scale={[0.02, 0.06, 0.02]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      <Entity position={[0, 0.70, -0.10]} rotation={[-30, 0, 0]} scale={[0.02, 0.06, 0.02]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      <Entity position={[0, 0.65, -0.16]} rotation={[-50, 0, 0]} scale={[0.02, 0.055, 0.02]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      <Entity position={[0, 0.58, -0.20]} rotation={[-65, 0, 0]} scale={[0.018, 0.05, 0.018]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      <Entity position={[0, 0.50, -0.22]} rotation={[-80, 0, 0]} scale={[0.016, 0.04, 0.016]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      <Entity position={[0, 0.42, -0.21]} rotation={[-90, 0, 0]} scale={[0.014, 0.03, 0.014]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      {/* Shield on right hand */}
      <Entity position={[0.27, 0.30, 0.04]} rotation={[0, 0, 8]}>
        <Entity scale={[0.018, 0.16, 0.12]}>
          <Render type="cylinder" material={m.accent} />
        </Entity>
        <Entity position={[0.012, 0, 0]} scale={[0.022, 0.022, 0.022]}>
          <Render type="sphere" material={m.gold} />
        </Entity>
      </Entity>
    </Entity>
  );
}

function BishopGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={0.95} />
      {/* Tall mitre hat */}
      <Entity position={[0, 0.84, 0]} scale={[0.15, 0.30, 0.15]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      {/* Gold band at base of mitre */}
      <Entity position={[0, 0.70, 0]} scale={[0.17, 0.04, 0.17]}>
        <Render type="cylinder" material={m.gold} />
      </Entity>
      {/* Cross on front of mitre */}
      <Entity position={[0, 0.84, 0.09]} scale={[0.025, 0.15, 0.006]}>
        <Render type="box" material={m.gold} />
      </Entity>
      <Entity position={[0, 0.82, 0.09]} scale={[0.09, 0.025, 0.006]}>
        <Render type="box" material={m.gold} />
      </Entity>
    </Entity>
  );
}

function QueenGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={1.05} />
      {/* Tiara crown */}
      <CrownGlb scale={1.0} yOffset={0.72} />
      {/* Gem orb on top */}
      <Entity position={[0, 0.88, 0]} scale={[0.05, 0.05, 0.05]}>
        <Render type="sphere" material={m.gold} />
      </Entity>
    </Entity>
  );
}

function KingGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={1.1} />
      {/* Large crown */}
      <CrownGlb scale={1.4} yOffset={0.76} />
      {/* Cross on top of crown — vertical beam */}
      <Entity position={[0, 0.98, 0]} scale={[0.03, 0.16, 0.03]}>
        <Render type="box" material={m.gold} />
      </Entity>
      {/* Cross — horizontal beam */}
      <Entity position={[0, 1.02, 0]} scale={[0.10, 0.03, 0.03]}>
        <Render type="box" material={m.gold} />
      </Entity>
    </Entity>
  );
}

// ---- Main piece renderer ----

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  row: number;
  col: number;
  isSelected: boolean;
  onClick: () => void;
  // Animation props — when set, piece animates itself instead of unmounting
  animFrom?: Pos;
  animTo?: Pos;
  animProgress?: number;
  animIsKnight?: boolean;
  hidden?: boolean; // Keep mounted but invisible (e.g. captured victim during animation)
  lookAt?: [number, number]; // [row, col] — piece rotates to face this square (e.g. during cutscene)
}

const PIECE_COMPONENTS: Record<PieceType, React.FC<{ color: PieceColor }>> = {
  pawn: PawnGopher,
  rook: RookGopher,
  knight: KnightGopher,
  bishop: BishopGopher,
  queen: QueenGopher,
  king: KingGopher,
};

// Board top surface is at y = -0.45
export const BOARD_SURFACE_Y = -0.45;

export { PIECE_COMPONENTS };

function getComponents(style: PieceStyle) {
  return style === 'classic' ? CLASSIC_PIECE_COMPONENTS : PIECE_COMPONENTS;
}

export const ChessPiece = React.memo(function ChessPiece({ type, color, row, col, isSelected, onClick, pieceStyle = 'gopher', animFrom, animTo, animProgress, animIsKnight, hidden, lookAt }: ChessPieceProps & { pieceStyle?: PieceStyle }) {
  const PieceComponent = getComponents(pieceStyle)[type];
  const isClassic = pieceStyle === 'classic';

  const isAnimating = animFrom && animTo && animProgress !== undefined;

  let x: number, y: number, z: number;
  let wobble = 0;
  let facingY = color === 'white' ? 180 : 0;

  if (isAnimating) {
    const fromX = animFrom[1] - 3.5;
    const fromZ = animFrom[0] - 3.5;
    const toX = animTo[1] - 3.5;
    const toZ = animTo[0] - 3.5;

    const t = animProgress < 0.5
      ? 2 * animProgress * animProgress
      : 1 - Math.pow(-2 * animProgress + 2, 2) / 2;

    x = fromX + (toX - fromX) * t;
    z = fromZ + (toZ - fromZ) * t;

    const arcHeight = animIsKnight
      ? Math.sin(t * Math.PI) * 1.5
      : Math.sin(t * Math.PI) * 0.15;
    y = BOARD_SURFACE_Y + arcHeight;

    wobble = Math.sin(animProgress * Math.PI * 6) * 8 * (1 - Math.abs(2 * animProgress - 1));

    const dx = toX - fromX;
    const dz = toZ - fromZ;
    facingY = Math.atan2(dx, dz) * (180 / Math.PI);
  } else {
    x = col - 3.5;
    z = row - 3.5;
    y = BOARD_SURFACE_Y + (isSelected ? 0.08 : 0);
  }

  // During cutscene: rotate to face the action
  if (lookAt && !isAnimating) {
    const targetX = lookAt[1] - 3.5;
    const targetZ = lookAt[0] - 3.5;
    const dx = targetX - x;
    const dz = targetZ - z;
    facingY = Math.atan2(dx, dz) * (180 / Math.PI);
  }

  const scale: [number, number, number] = hidden ? [0, 0, 0] : [1, 1, 1];

  return (
    <Entity
      name={`${color}-${type}`}
      position={[x, y, z]}
      scale={scale}
      rotation={[0, 0, wobble]}
      onClick={hidden ? undefined : onClick}
    >
      {!isClassic && !isAnimating && !lookAt && <Script script={GopherIdle} />}
      <Entity rotation={[0, facingY, 0]}>
        <PieceComponent color={color} />
      </Entity>
    </Entity>
  );
});

// ---- Animating piece (moving from one square to another) ----

interface AnimatingPieceProps {
  type: PieceType;
  color: PieceColor;
  from: Pos;
  to: Pos;
  progress: number; // 0 to 1
  isKnight: boolean;
}

// Ghost piece rendered during cutscene - victim gets hit and launched away
export function GhostPiece({ type, color, row, col, phase, knockbackAngle = 0, attackAngle = 0, pieceStyle = 'gopher' }: {
  type: PieceType; color: PieceColor; row: number; col: number; phase: number;
  knockbackAngle?: number; attackAngle?: number; pieceStyle?: PieceStyle;
}) {
  const PieceComponent = getComponents(pieceStyle)[type];
  const x = col - 3.5;
  const z = row - 3.5;

  const hitPhase = 0.44; // when the weapon strikes
  const launched = phase > hitPhase;

  let posX = x, posY = BOARD_SURFACE_Y, posZ = z;
  let scale = 1;
  let rotX = 0, rotZ = 0;

  if (launched) {
    const t = Math.min((phase - hitPhase) / 0.26, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const dist = eased * 3;
    posX += Math.sin(knockbackAngle) * dist;
    posZ += Math.cos(knockbackAngle) * dist;

    posY += Math.sin(eased * Math.PI) * 1.8 - eased * 1.2;

    rotX = eased * 420;
    rotZ = eased * 240;

    scale = Math.max(0, 1 - eased * 0.9);
  } else {
    const fear = smoothstepLocal(0.25, 0.42, phase);
    const shake = fear * 5;
    posX += Math.sin(phase * 90) * 0.015 * shake;
    posZ += Math.cos(phase * 70) * 0.015 * shake;
  }

  if (scale <= 0.01) return null;

  // Face the attacker before being hit, then tumble wildly after
  const facingY = launched ? color === 'white' ? 180 : 0 : attackAngle * (180 / Math.PI) + 180;

  return (
    <Entity position={[posX, posY, posZ]} scale={[scale, scale, scale]} rotation={[rotX, 0, rotZ]}>
      <Entity rotation={[0, facingY, 0]}>
        <PieceComponent color={color} />
      </Entity>
    </Entity>
  );
}

function smoothstepLocal(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Cutscene attacker: stands behind victim (melee) or at fromPos (ranged), then walks onto capture square
export function CutsceneAttacker({ type, color, capturePos, fromPos, attackAngle, phase, isRanged = false, pieceStyle = 'gopher' }: {
  type: PieceType; color: PieceColor;
  capturePos: Pos;
  fromPos?: Pos;
  attackAngle: number;
  phase: number;
  isRanged?: boolean;
  pieceStyle?: PieceStyle;
}) {
  const PieceComponent = getComponents(pieceStyle)[type];
  const cx = capturePos[1] - 3.5;
  const cz = capturePos[0] - 3.5;

  const facingY = attackAngle * (180 / Math.PI);

  if (isRanged && fromPos) {
    // Ranged: attacker stands at fromPos, walks to capturePos after the kill
    const fx = fromPos[1] - 3.5;
    const fz = fromPos[0] - 3.5;

    const walkT = smoothstepLocal(0.55, 0.88, phase);
    const posX = fx + (cx - fx) * walkT;
    const posZ = fz + (cz - fz) * walkT;

    // Walking waddle during walk phase
    const isWalking = phase > 0.55 && phase < 0.88;
    const wobble = isWalking ? Math.sin(phase * 40) * 6 * (1 - walkT) : 0;

    // Small victory hop when projectile hits
    const hopT = phase > 0.44 && phase < 0.52 ? (phase - 0.44) / 0.08 : 0;
    const hop = hopT > 0 ? Math.sin(hopT * Math.PI) * 0.1 : 0;

    return (
      <Entity
        position={[posX, BOARD_SURFACE_Y + hop, posZ]}
        rotation={[0, 0, wobble]}
      >
        <Entity rotation={[0, facingY, 0]}>
          <PieceComponent color={color} />
        </Entity>
      </Entity>
    );
  }

  // Melee: stands behind capture point, walks onto square after kill
  const walkT = smoothstepLocal(0.50, 0.66, phase);
  const behindDist = 0.8 * (1 - walkT);
  const offsetX = -Math.sin(attackAngle) * behindDist;
  const offsetZ = -Math.cos(attackAngle) * behindDist;

  const isWalking = phase > 0.50 && phase < 0.66;
  const wobble = isWalking ? Math.sin(phase * 50) * 6 * (1 - walkT) : 0;

  const hopT = phase > 0.42 && phase < 0.50 ? (phase - 0.42) / 0.08 : 0;
  const hop = hopT > 0 ? Math.sin(hopT * Math.PI) * 0.12 : 0;

  return (
    <Entity
      position={[cx + offsetX, BOARD_SURFACE_Y + hop, cz + offsetZ]}
      rotation={[0, 0, wobble]}
    >
      <Entity rotation={[0, facingY, 0]}>
        <PieceComponent color={color} />
      </Entity>
    </Entity>
  );
}

// Fallen king during checkmate animation — tips over and slides
export function FallenKing({ color, row, col, phase, pieceStyle = 'gopher' }: {
  color: PieceColor; row: number; col: number; phase: number; pieceStyle?: PieceStyle;
}) {
  const cx = col - 3.5;
  const cz = row - 3.5;

  // Tip over: rotation from 0→90° on X between phase 0.15-0.40
  const tipT = smoothstepLocal(0.15, 0.40, phase);
  const rotX = tipT * 90;

  // Slight slide in a direction as it falls
  const slideT = smoothstepLocal(0.2, 0.45, phase);
  const slideZ = slideT * 0.3;
  const slideY = -slideT * 0.25; // drops down a bit

  const KingComponent = pieceStyle === 'classic' ? ClassicKing : KingGopher;

  return (
    <Entity
      position={[cx, BOARD_SURFACE_Y + slideY, cz + slideZ]}
      rotation={[rotX, 0, 0]}
    >
      <Entity rotation={[0, color === 'white' ? 180 : 0, 0]}>
        <KingComponent color={color} />
      </Entity>
    </Entity>
  );
}

export function AnimatingPiece({ type, color, from, to, progress, isKnight, pieceStyle = 'gopher' }: AnimatingPieceProps & { pieceStyle?: PieceStyle }) {
  const PieceComponent = getComponents(pieceStyle)[type];

  const fromX = from[1] - 3.5;
  const fromZ = from[0] - 3.5;
  const toX = to[1] - 3.5;
  const toZ = to[0] - 3.5;

  // Ease in-out
  const t = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  // Lerp position
  const x = fromX + (toX - fromX) * t;
  const z = fromZ + (toZ - fromZ) * t;

  // Height arc: knights jump high, others do a small hop
  let arcHeight: number;
  if (isKnight) {
    // Big dramatic arc for knight
    arcHeight = Math.sin(t * Math.PI) * 1.5;
  } else {
    // Small waddle hop
    arcHeight = Math.sin(t * Math.PI) * 0.15;
  }

  const y = BOARD_SURFACE_Y + arcHeight;

  // Walking wobble: tilt side to side during movement
  const wobble = Math.sin(progress * Math.PI * 6) * 8 * (1 - Math.abs(2 * progress - 1));

  // Face direction of movement
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const moveAngle = Math.atan2(dx, dz) * (180 / Math.PI);

  return (
    <Entity
      name={`${color}-${type}-moving`}
      position={[x, y, z]}
      rotation={[0, 0, wobble]}
    >
      <Entity rotation={[0, moveAngle, 0]}>
        <PieceComponent color={color} />
      </Entity>
    </Entity>
  );
}
