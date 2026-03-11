import { useEffect, useRef } from 'react';
import { Entity, Gltf } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial, useModel } from '@playcanvas/react/hooks';
import type { Entity as PcEntity, StandardMaterial } from 'playcanvas';
import type { Pos } from './engine';
import { BOARD_SURFACE_Y } from './pieces';

// ---- Types ----

export type Weapon3D = 'sword' | 'axe' | 'hammer' | 'fryingpan' | 'spear' | 'mace';
export type Blaster3D = 'blaster-a' | 'blaster-d' | 'blaster-e' | 'blaster-h' | 'blaster-k' | 'blaster-n';
export type WeaponCategory = 'melee' | 'ranged';

export interface WeaponDef {
  category: WeaponCategory;
  type: Weapon3D | Blaster3D;
  name: string;
  emoji: string;
}

// Melee weapons — used for close-range captures (< 3 squares)
const MELEE_DEFS: WeaponDef[] = [
  { category: 'melee', type: 'sword', name: 'SWORD', emoji: '⚔️' },
  { category: 'melee', type: 'sword', name: 'KATANA', emoji: '⚔️' },
  { category: 'melee', type: 'sword', name: 'LIGHTSABER', emoji: '⚔️' },
  { category: 'melee', type: 'axe', name: 'AXE', emoji: '🪓' },
  { category: 'melee', type: 'axe', name: 'BATTLE AXE', emoji: '🪓' },
  { category: 'melee', type: 'hammer', name: 'WAR HAMMER', emoji: '🔨' },
  { category: 'melee', type: 'hammer', name: 'BONK HAMMER', emoji: '🔨' },
  { category: 'melee', type: 'hammer', name: 'MJÖLNIR', emoji: '🔨' },
  { category: 'melee', type: 'fryingpan', name: 'FRYING PAN', emoji: '🍳' },
  { category: 'melee', type: 'fryingpan', name: 'CHEESE WHEEL', emoji: '🧀' },
  { category: 'melee', type: 'fryingpan', name: 'SHIELD BASH', emoji: '🛡️' },
  { category: 'melee', type: 'spear', name: 'SPEAR', emoji: '🔱' },
  { category: 'melee', type: 'spear', name: 'PLUNGER', emoji: '🪠' },
  { category: 'melee', type: 'spear', name: 'TRIDENT', emoji: '🔱' },
  { category: 'melee', type: 'mace', name: 'MACE', emoji: '⛏️' },
  { category: 'melee', type: 'mace', name: 'FISH SLAP', emoji: '🐟' },
  { category: 'melee', type: 'mace', name: 'RUBBER DUCK', emoji: '🦆' },
  { category: 'melee', type: 'mace', name: 'BOWLING BALL', emoji: '🎳' },
  { category: 'melee', type: 'hammer', name: 'GUITAR SMASH', emoji: '🎸' },
  { category: 'melee', type: 'sword', name: 'PIZZA CUTTER', emoji: '🍕' },
  { category: 'melee', type: 'mace', name: 'SHOE', emoji: '👟' },
  { category: 'melee', type: 'axe', name: 'BOOMERANG', emoji: '🪃' },
  { category: 'melee', type: 'hammer', name: 'BOXING GLOVE', emoji: '🥊' },
];

// Ranged weapons — used for long-range captures (>= 3 squares)
const RANGED_DEFS: WeaponDef[] = [
  { category: 'ranged', type: 'blaster-a', name: 'BLASTER', emoji: '🔫' },
  { category: 'ranged', type: 'blaster-d', name: 'RAY GUN', emoji: '🔫' },
  { category: 'ranged', type: 'blaster-e', name: 'PLASMA RIFLE', emoji: '💥' },
  { category: 'ranged', type: 'blaster-h', name: 'PEW PEW', emoji: '✨' },
  { category: 'ranged', type: 'blaster-k', name: 'SPACE BLASTER', emoji: '🚀' },
  { category: 'ranged', type: 'blaster-n', name: 'ZAP CANNON', emoji: '⚡' },
];

export const WEAPON_DEFS = [...MELEE_DEFS, ...RANGED_DEFS];

/** Pick a weapon based on capture distance */
export function pickWeapon(from: Pos, to: Pos): WeaponDef {
  const dr = Math.abs(to[0] - from[0]);
  const dc = Math.abs(to[1] - from[1]);
  const dist = Math.max(dr, dc); // Chebyshev distance
  const pool = dist >= 3 ? RANGED_DEFS : MELEE_DEFS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// ---- GLB weapon model component ----

const WEAPON_GLB_URLS: Partial<Record<Weapon3D | Blaster3D, string>> = {
  sword: './assets/weapons/sword.glb',
  spear: './assets/weapons/spear.glb',
  'blaster-a': './assets/weapons/blaster-a.glb',
  'blaster-d': './assets/weapons/blaster-d.glb',
  'blaster-e': './assets/weapons/blaster-e.glb',
  'blaster-h': './assets/weapons/blaster-h.glb',
  'blaster-k': './assets/weapons/blaster-k.glb',
  'blaster-n': './assets/weapons/blaster-n.glb',
};

// GLB scale overrides (models have varying sizes)
const WEAPON_GLB_SCALES: Partial<Record<Weapon3D | Blaster3D, number>> = {
  sword: 1.8,
  spear: 1.8,
  'blaster-a': 2.0,
  'blaster-d': 2.0,
  'blaster-e': 2.0,
  'blaster-h': 2.0,
  'blaster-k': 2.0,
  'blaster-n': 2.0,
};

// Kenney blaster GLB models have barrel along +Z.
// facingYaw on parent points +Z toward target, so no offset needed.
const WEAPON_ROTATION_OFFSET: Partial<Record<Weapon3D | Blaster3D, [number, number, number]>> = {};

function GlbWeaponModel({ type }: { type: Weapon3D | Blaster3D }) {
  const url = WEAPON_GLB_URLS[type];
  const { asset } = useModel(url ?? '');
  const s = WEAPON_GLB_SCALES[type] ?? 2.0;
  const rot = WEAPON_ROTATION_OFFSET[type] ?? [0, 0, 0];

  if (!asset || !url) return null;

  return (
    <Entity scale={[s, s, s]} rotation={rot}>
      <Gltf asset={asset} />
    </Entity>
  );
}

// ---- Procedural weapon models (fallback for types without GLBs) ----
// All models are built along Y axis: handle at bottom, business end at top.
// Scale ~0.6 total height to match gopher proportions.

function SwordModel() {
  const blade = useMaterial({ diffuse: [0.88, 0.88, 0.92], metalness: 0.8, specular: [0.9, 0.9, 0.9] });
  const hilt = useMaterial({ diffuse: [0.35, 0.2, 0.08] });
  const guard = useMaterial({ diffuse: [0.9, 0.75, 0.2], metalness: 0.6 });
  const pommel = useMaterial({ diffuse: [0.85, 0.7, 0.15], metalness: 0.5 });
  return (
    <Entity>
      {/* Blade */}
      <Entity position={[0, 0.32, 0]} scale={[0.045, 0.38, 0.012]}>
        <Render type="box" material={blade} />
      </Entity>
      {/* Blade tip */}
      <Entity position={[0, 0.53, 0]} scale={[0.045, 0.06, 0.012]} rotation={[0, 0, 0]}>
        <Render type="cone" material={blade} />
      </Entity>
      {/* Fuller (groove down blade center) */}
      <Entity position={[0, 0.32, 0.008]} scale={[0.015, 0.3, 0.003]}>
        <Render type="box" material={guard} />
      </Entity>
      {/* Cross guard */}
      <Entity position={[0, 0.1, 0]} scale={[0.18, 0.025, 0.03]}>
        <Render type="box" material={guard} />
      </Entity>
      {/* Grip */}
      <Entity position={[0, -0.02, 0]} scale={[0.025, 0.12, 0.025]}>
        <Render type="cylinder" material={hilt} />
      </Entity>
      {/* Pommel */}
      <Entity position={[0, -0.1, 0]} scale={[0.035, 0.035, 0.035]}>
        <Render type="sphere" material={pommel} />
      </Entity>
    </Entity>
  );
}

function AxeModel() {
  const blade = useMaterial({ diffuse: [0.7, 0.7, 0.75], metalness: 0.7, specular: [0.5, 0.5, 0.5] });
  const handle = useMaterial({ diffuse: [0.45, 0.28, 0.12] });
  const binding = useMaterial({ diffuse: [0.3, 0.2, 0.1] });
  return (
    <Entity>
      {/* Axe head — curved blade */}
      <Entity position={[0.08, 0.38, 0]} scale={[0.14, 0.16, 0.02]} rotation={[0, 0, -5]}>
        <Render type="box" material={blade} />
      </Entity>
      {/* Blade edge bevel */}
      <Entity position={[0.16, 0.38, 0]} scale={[0.03, 0.14, 0.015]} rotation={[0, 0, -10]}>
        <Render type="box" material={blade} />
      </Entity>
      {/* Binding where head meets handle */}
      <Entity position={[0, 0.34, 0]} scale={[0.04, 0.04, 0.035]}>
        <Render type="cylinder" material={binding} />
      </Entity>
      {/* Handle */}
      <Entity position={[0, 0.08, 0]} scale={[0.025, 0.42, 0.025]}>
        <Render type="cylinder" material={handle} />
      </Entity>
      {/* Handle end cap */}
      <Entity position={[0, -0.12, 0]} scale={[0.032, 0.02, 0.032]}>
        <Render type="cylinder" material={binding} />
      </Entity>
    </Entity>
  );
}

function HammerModel() {
  const head = useMaterial({ diffuse: [0.55, 0.55, 0.6], metalness: 0.6, specular: [0.4, 0.4, 0.4] });
  const handle = useMaterial({ diffuse: [0.45, 0.28, 0.12] });
  const band = useMaterial({ diffuse: [0.4, 0.35, 0.3], metalness: 0.3 });
  return (
    <Entity>
      {/* Hammer head — main block */}
      <Entity position={[0, 0.4, 0]} scale={[0.2, 0.1, 0.1]}>
        <Render type="box" material={head} />
      </Entity>
      {/* Flat striking face */}
      <Entity position={[0.11, 0.4, 0]} scale={[0.02, 0.11, 0.11]}>
        <Render type="box" material={band} />
      </Entity>
      {/* Metal band */}
      <Entity position={[0, 0.34, 0]} scale={[0.035, 0.03, 0.035]}>
        <Render type="cylinder" material={band} />
      </Entity>
      {/* Handle */}
      <Entity position={[0, 0.08, 0]} scale={[0.028, 0.4, 0.028]}>
        <Render type="cylinder" material={handle} />
      </Entity>
      {/* Grip wrap */}
      <Entity position={[0, -0.05, 0]} scale={[0.032, 0.08, 0.032]}>
        <Render type="cylinder" material={band} />
      </Entity>
    </Entity>
  );
}

function FryingPanModel() {
  const pan = useMaterial({ diffuse: [0.22, 0.22, 0.25], metalness: 0.5, specular: [0.3, 0.3, 0.3] });
  const inside = useMaterial({ diffuse: [0.3, 0.3, 0.32], metalness: 0.3 });
  const handle = useMaterial({ diffuse: [0.4, 0.25, 0.1] });
  return (
    <Entity>
      {/* Pan body */}
      <Entity position={[0, 0.38, 0]} scale={[0.24, 0.03, 0.24]}>
        <Render type="cylinder" material={pan} />
      </Entity>
      {/* Pan rim */}
      <Entity position={[0, 0.4, 0]} scale={[0.26, 0.015, 0.26]}>
        <Render type="cylinder" material={inside} />
      </Entity>
      {/* Inner surface */}
      <Entity position={[0, 0.395, 0]} scale={[0.2, 0.005, 0.2]}>
        <Render type="cylinder" material={inside} />
      </Entity>
      {/* Handle */}
      <Entity position={[0, 0.12, 0]} scale={[0.025, 0.3, 0.025]}>
        <Render type="cylinder" material={handle} />
      </Entity>
      {/* Handle rivet */}
      <Entity position={[0, 0.28, 0]} scale={[0.035, 0.015, 0.035]}>
        <Render type="cylinder" material={pan} />
      </Entity>
    </Entity>
  );
}

function SpearModel() {
  const tip = useMaterial({ diffuse: [0.82, 0.82, 0.86], metalness: 0.7, specular: [0.6, 0.6, 0.6] });
  const shaft = useMaterial({ diffuse: [0.45, 0.3, 0.14] });
  const binding = useMaterial({ diffuse: [0.3, 0.2, 0.1] });
  return (
    <Entity>
      {/* Spear head — leaf shape */}
      <Entity position={[0, 0.52, 0]} scale={[0.04, 0.12, 0.015]}>
        <Render type="cone" material={tip} />
      </Entity>
      {/* Spear head base */}
      <Entity position={[0, 0.45, 0]} scale={[0.035, 0.04, 0.012]}>
        <Render type="box" material={tip} />
      </Entity>
      {/* Socket binding */}
      <Entity position={[0, 0.42, 0]} scale={[0.03, 0.02, 0.03]}>
        <Render type="cylinder" material={binding} />
      </Entity>
      {/* Shaft */}
      <Entity position={[0, 0.1, 0]} scale={[0.018, 0.55, 0.018]}>
        <Render type="cylinder" material={shaft} />
      </Entity>
      {/* Butt cap */}
      <Entity position={[0, -0.15, 0]} scale={[0.022, 0.015, 0.022]}>
        <Render type="cylinder" material={binding} />
      </Entity>
    </Entity>
  );
}

function MaceModel() {
  const head = useMaterial({ diffuse: [0.6, 0.6, 0.65], metalness: 0.6, specular: [0.4, 0.4, 0.4] });
  const flange = useMaterial({ diffuse: [0.7, 0.7, 0.75], metalness: 0.7 });
  const shaft = useMaterial({ diffuse: [0.45, 0.28, 0.12] });
  const grip = useMaterial({ diffuse: [0.3, 0.2, 0.1] });
  return (
    <Entity>
      {/* Mace head — sphere */}
      <Entity position={[0, 0.42, 0]} scale={[0.12, 0.12, 0.12]}>
        <Render type="sphere" material={head} />
      </Entity>
      {/* Flanges (4 directions) */}
      <Entity position={[0.08, 0.44, 0]} scale={[0.04, 0.06, 0.015]} rotation={[0, 0, -20]}>
        <Render type="box" material={flange} />
      </Entity>
      <Entity position={[-0.08, 0.44, 0]} scale={[0.04, 0.06, 0.015]} rotation={[0, 0, 20]}>
        <Render type="box" material={flange} />
      </Entity>
      <Entity position={[0, 0.44, 0.08]} scale={[0.015, 0.06, 0.04]} rotation={[20, 0, 0]}>
        <Render type="box" material={flange} />
      </Entity>
      <Entity position={[0, 0.44, -0.08]} scale={[0.015, 0.06, 0.04]} rotation={[-20, 0, 0]}>
        <Render type="box" material={flange} />
      </Entity>
      {/* Neck */}
      <Entity position={[0, 0.32, 0]} scale={[0.025, 0.04, 0.025]}>
        <Render type="cylinder" material={head} />
      </Entity>
      {/* Handle */}
      <Entity position={[0, 0.08, 0]} scale={[0.022, 0.35, 0.022]}>
        <Render type="cylinder" material={shaft} />
      </Entity>
      {/* Grip wrap */}
      <Entity position={[0, -0.03, 0]} scale={[0.028, 0.08, 0.028]}>
        <Render type="cylinder" material={grip} />
      </Entity>
    </Entity>
  );
}

const PROCEDURAL_MODELS: Record<Weapon3D, React.FC> = {
  sword: SwordModel,
  axe: AxeModel,
  hammer: HammerModel,
  fryingpan: FryingPanModel,
  spear: SpearModel,
  mace: MaceModel,
};

/** Render the right weapon model — GLB if available, procedural fallback */
function WeaponModel({ type }: { type: Weapon3D | Blaster3D }) {
  if (type in WEAPON_GLB_URLS) {
    return <GlbWeaponModel type={type} />;
  }
  const Procedural = PROCEDURAL_MODELS[type as Weapon3D];
  return Procedural ? <Procedural /> : null;
}

// ---- Projectile for ranged attacks ----

// Exported so camera can track the projectile position
export const RANGED_PROJECTILE_PHASE_START = 0.28;
export const RANGED_PROJECTILE_PHASE_END = 0.44;
export const RANGED_FIRE_PHASE = 0.28; // when blaster fires
export const RANGED_WALK_START = 0.55;
export const RANGED_WALK_END = 0.88;

export function getProjectilePos(
  fromPos: Pos, capturePos: Pos, phase: number
): [number, number, number] | null {
  const flyT = smoothstep(RANGED_PROJECTILE_PHASE_START, RANGED_PROJECTILE_PHASE_END, phase);
  if (flyT <= 0 || flyT >= 1) return null;
  const fx = fromPos[1] - 3.5;
  const fz = fromPos[0] - 3.5;
  const cx = capturePos[1] - 3.5;
  const cz = capturePos[0] - 3.5;
  const y = BOARD_SURFACE_Y + 0.5;
  return [
    fx + (cx - fx) * flyT,
    y + Math.sin(flyT * Math.PI) * 0.4,
    fz + (cz - fz) * flyT,
  ];
}

function Projectile({ fromPos, capturePos, phase, attackerColor }: {
  fromPos: Pos;
  capturePos: Pos;
  phase: number;
  attackerColor: string;
}) {
  const isWhite = attackerColor === 'white';
  const core = useMaterial({
    diffuse: isWhite ? [0.3, 0.9, 1.0] : [1.0, 0.5, 0.1],
    emissive: isWhite ? [0.2, 0.7, 1.0] : [1.0, 0.3, 0.0],
  });
  const glow = useMaterial({
    diffuse: isWhite ? [0.5, 0.95, 1.0] : [1.0, 0.7, 0.2],
    emissive: isWhite ? [0.3, 0.8, 1.0] : [1.0, 0.4, 0.1],
    opacity: 0.4,
  });
  const trail = useMaterial({
    diffuse: isWhite ? [0.4, 0.85, 0.95] : [1.0, 0.6, 0.15],
    emissive: isWhite ? [0.15, 0.5, 0.7] : [0.8, 0.2, 0.0],
    opacity: 0.25,
  });

  const pos = getProjectilePos(fromPos, capturePos, phase);
  if (!pos) return null;

  const flyT = smoothstep(RANGED_PROJECTILE_PHASE_START, RANGED_PROJECTILE_PHASE_END, phase);
  const spin = flyT * 1080;

  // Stretch in direction of travel for speed feel
  const stretchZ = 1 + flyT * 2;

  // Face direction of travel
  const fx = fromPos[1] - 3.5;
  const fz = fromPos[0] - 3.5;
  const cx = capturePos[1] - 3.5;
  const cz = capturePos[0] - 3.5;
  const travelYaw = Math.atan2(cx - fx, cz - fz) * (180 / Math.PI);

  return (
    <Entity position={pos} rotation={[0, travelYaw, 0]}>
      {/* Core */}
      <Entity scale={[0.1, 0.1, 0.1 * stretchZ]} rotation={[0, spin, 0]}>
        <Render type="sphere" material={core} />
      </Entity>
      {/* Glow */}
      <Entity scale={[0.18, 0.18, 0.18 * stretchZ]}>
        <Render type="sphere" material={glow} />
      </Entity>
      {/* Trail */}
      <Entity position={[0, 0, -0.15 * stretchZ]} scale={[0.1, 0.1, 0.25 * stretchZ]}>
        <Render type="sphere" material={trail} />
      </Entity>
    </Entity>
  );
}

// ---- Cutscene weapon components ----

interface CutsceneWeaponProps {
  weaponDef: WeaponDef;
  capturePos: Pos;
  fromPos: Pos;
  attackAngle: number;
  phase: number;
  attackerColor: string;
}

export function CutsceneWeapon({ weaponDef, capturePos, fromPos, attackAngle, phase, attackerColor }: CutsceneWeaponProps) {
  if (weaponDef.category === 'ranged') {
    return (
      <RangedCutsceneWeapon
        weaponDef={weaponDef}
        capturePos={capturePos}
        fromPos={fromPos}
        attackAngle={attackAngle}
        phase={phase}
        attackerColor={attackerColor}
      />
    );
  }
  return (
    <MeleeCutsceneWeapon
      weaponType={weaponDef.type as Weapon3D}
      capturePos={capturePos}
      attackAngle={attackAngle}
      phase={phase}
    />
  );
}

// ---- Melee animation ----
// The weapon tracks the attacker gopher's position exactly (same math as CutsceneAttacker
// in pieces.tsx: behind capture pos by 0.8, walks forward after kill phase 0.50-0.66).
// The weapon is held at the gopher's "right hand" (side offset) at shoulder height,
// then animated per weapon type.

type MeleeAnimStyle = 'overhead' | 'slash' | 'thrust';

/** Map weapon type to its natural animation style */
const WEAPON_ANIM: Record<Weapon3D, MeleeAnimStyle> = {
  sword: 'slash',
  axe: 'overhead',
  hammer: 'overhead',
  fryingpan: 'overhead',
  spear: 'thrust',
  mace: 'overhead',
};

/** Get the attacker gopher's world position (mirrors CutsceneAttacker melee logic) */
function getAttackerPos(capturePos: Pos, attackAngle: number, phase: number) {
  const cx = capturePos[1] - 3.5;
  const cz = capturePos[0] - 3.5;
  const walkT = smoothstep(0.50, 0.66, phase);
  const behindDist = 0.8 * (1 - walkT);
  const hopT = phase > 0.42 && phase < 0.50 ? (phase - 0.42) / 0.08 : 0;
  const hop = hopT > 0 ? Math.sin(hopT * Math.PI) * 0.12 : 0;
  return {
    x: cx + -Math.sin(attackAngle) * behindDist,
    y: BOARD_SURFACE_Y + hop,
    z: cz + -Math.cos(attackAngle) * behindDist,
  };
}

function MeleeCutsceneWeapon({ weaponType, capturePos, attackAngle, phase }: {
  weaponType: Weapon3D;
  capturePos: Pos;
  attackAngle: number;
  phase: number;
}) {
  const appear = smoothstep(0.30, 0.36, phase);
  const fadeT = smoothstep(0.70, 0.82, phase);
  if (appear <= 0.01 || fadeT >= 0.99) return null;

  // Track attacker gopher position exactly
  const gopher = getAttackerPos(capturePos, attackAngle, phase);

  // Weapon held to the right side of the gopher, at shoulder height
  const sideAngle = attackAngle + Math.PI * 0.5;
  const sideOff = 0.2; // how far right of gopher center
  const holdX = gopher.x + Math.sin(sideAngle) * sideOff;
  const holdZ = gopher.z + Math.cos(sideAngle) * sideOff;
  const holdY = gopher.y + 0.45; // shoulder height

  const facingYaw = attackAngle * (180 / Math.PI);
  const scale = appear * (1 - fadeT);
  const style = WEAPON_ANIM[weaponType];

  // Animation phases:
  // 0.30-0.36: weapon appears, held ready
  // 0.36-0.42: wind up
  // 0.42-0.48: strike (weapon impacts at ~0.44, matching GhostPiece hitPhase)
  // 0.48-0.70: hold/carry weapon while walking forward
  const windUp = smoothstep(0.36, 0.42, phase);
  const strike = smoothstep(0.42, 0.46, phase);
  const hold = phase > 0.48;

  let pitchAngle = 0;
  let rollAngle = 0;
  let extraYaw = 0;
  let yAdj = 0;
  let fwdAdj = 0;
  let sideAdj = 0;

  switch (style) {
    case 'overhead': {
      // Raise weapon behind head, then slam down
      const raisePitch = windUp * -80; // tip back behind head
      const strikePitch = strike * 150; // swing forward and down
      pitchAngle = raisePitch + strikePitch;
      yAdj = windUp * 0.2 - strike * 0.15; // raise then drop
      fwdAdj = strike * 0.15; // lunge forward on strike
      if (hold) {
        // Rest weapon on shoulder
        pitchAngle = 70 - smoothstep(0.48, 0.55, phase) * 40;
        yAdj = -0.05;
      }
      break;
    }
    case 'slash': {
      // Wind up to the right, slash across to the left
      const windRoll = windUp * 70; // tilt right
      const slashRoll = strike * -140; // sweep left
      rollAngle = windRoll + slashRoll;
      pitchAngle = 15 + windUp * 10 - strike * 10; // slight angle
      sideAdj = windUp * 0.1 - strike * 0.15; // pull right, sweep left
      fwdAdj = strike * 0.1;
      if (hold) {
        // Casual hold at side
        rollAngle = -70 + smoothstep(0.48, 0.55, phase) * 50;
        pitchAngle = 10;
        sideAdj = -0.05;
      }
      break;
    }
    case 'thrust': {
      // Pull back, then thrust forward (weapon held horizontally)
      pitchAngle = 90; // weapon horizontal
      const pullBack = windUp * -0.25;
      const thrustFwd = strike * 0.55;
      fwdAdj = pullBack + thrustFwd;
      yAdj = -0.1; // lower to gut level
      if (hold) {
        // Weapon at rest, lowered
        pitchAngle = 60 - smoothstep(0.48, 0.55, phase) * 30;
        fwdAdj = 0.05;
      }
      break;
    }
  }

  // Convert forward/side adjustments to world space
  const fwdX = Math.sin(attackAngle) * fwdAdj;
  const fwdZ = Math.cos(attackAngle) * fwdAdj;
  const sdX = Math.sin(sideAngle) * sideAdj;
  const sdZ = Math.cos(sideAngle) * sideAdj;

  return (
    <Entity
      position={[holdX + fwdX + sdX, holdY + yAdj, holdZ + fwdZ + sdZ]}
      rotation={[pitchAngle, facingYaw, rollAngle]}
      scale={[scale, scale, scale]}
    >
      <WeaponModel type={weaponType} />
    </Entity>
  );
}

// ---- Ranged animation (attacker shoots from fromPos, projectile flies to victim) ----

function RangedCutsceneWeapon({ weaponDef, capturePos, fromPos, attackAngle, phase, attackerColor }: {
  weaponDef: WeaponDef;
  capturePos: Pos;
  fromPos: Pos;
  attackAngle: number;
  phase: number;
  attackerColor: string;
}) {
  const cx = capturePos[1] - 3.5;
  const cz = capturePos[0] - 3.5;
  const fx = fromPos[1] - 3.5;
  const fz = fromPos[0] - 3.5;

  // Blaster appears at attacker's fromPos
  const appear = smoothstep(0.10, 0.16, phase);
  const fadeT = smoothstep(0.75, 0.88, phase);

  // Recoil on fire
  const recoilT = smoothstep(0.28, 0.31, phase);
  const recoilRecover = smoothstep(0.31, 0.38, phase);

  // Attacker walks from fromPos to capturePos after hit
  const walkT = smoothstep(RANGED_WALK_START, RANGED_WALK_END, phase);
  const posX = fx + (cx - fx) * walkT;
  const posZ = fz + (cz - fz) * walkT;

  // Blaster held in front of attacker, offset to the right
  const sideAngle = attackAngle + Math.PI * 0.5;
  const holdOffsetX = Math.sin(attackAngle) * 0.65 + Math.sin(sideAngle) * 0.15;
  const holdOffsetZ = Math.cos(attackAngle) * 0.65 + Math.cos(sideAngle) * 0.15;
  const holdY = BOARD_SURFACE_Y + 0.45;

  // Blaster faces from attacker toward victim
  // attackAngle = atan2(dx, dz) in world space, GLB models point along +Z by default
  // GLB barrel is along -Z in PlayCanvas, so add 180° to face toward victim
  const facingYaw = attackAngle * (180 / Math.PI) + 180;

  // Recoil kick backwards
  const recoil = (recoilT - recoilRecover * recoilT) * 0.2;
  const recoilX = -Math.sin(attackAngle) * recoil;
  const recoilZ = -Math.cos(attackAngle) * recoil;

  // After fire, blaster tilts down casually
  const restPitch = smoothstep(0.35, 0.50, phase) * 25;

  const scale = appear * (1 - fadeT);

  return (
    <>
      {/* Blaster model at attacker position */}
      {appear > 0.01 && fadeT < 0.99 && (
        <Entity
          position={[posX + holdOffsetX + recoilX, holdY, posZ + holdOffsetZ + recoilZ]}
          rotation={[-restPitch, facingYaw, 0]}
          scale={[scale, scale, scale]}
        >
          <WeaponModel type={weaponDef.type as Blaster3D} />
        </Entity>
      )}
      {/* Muzzle flash */}
      {phase > 0.27 && phase < 0.32 && (
        <MuzzleFlash
          x={posX + Math.sin(attackAngle) * 0.9}
          y={holdY + 0.1}
          z={posZ + Math.cos(attackAngle) * 0.9}
          phase={phase}
          attackerColor={attackerColor}
        />
      )}
      {/* Projectile */}
      <Projectile fromPos={fromPos} capturePos={capturePos} phase={phase} attackerColor={attackerColor} />
    </>
  );
}

function MuzzleFlash({ x, y, z, phase, attackerColor }: {
  x: number; y: number; z: number; phase: number; attackerColor: string;
}) {
  const isWhite = attackerColor === 'white';
  const flash = useMaterial({
    diffuse: [1, 1, 0.9],
    emissive: isWhite ? [0.3, 0.8, 1.0] : [1.0, 0.5, 0.0],
    opacity: 0.7,
  });
  const t = (phase - 0.27) / 0.05;
  const s = Math.sin(t * Math.PI) * 0.2;
  if (s <= 0.01) return null;
  return (
    <Entity position={[x, y, z]} scale={[s, s, s]}>
      <Render type="sphere" material={flash} />
    </Entity>
  );
}
