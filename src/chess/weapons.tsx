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
  sword: 3.5,
  spear: 3.5,
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

function SwordModel() {
  const blade = useMaterial({ diffuse: [0.88, 0.88, 0.92], metalness: 0.8, specular: [0.9, 0.9, 0.9] });
  const hilt = useMaterial({ diffuse: [0.45, 0.25, 0.1] });
  const guard = useMaterial({ diffuse: [0.9, 0.75, 0.2], metalness: 0.6 });
  return (
    <Entity>
      <Entity position={[0, 0.45, 0]} scale={[0.06, 0.55, 0.015]}>
        <Render type="box" material={blade} />
      </Entity>
      <Entity position={[0, 0.72, 0]} scale={[0.03, 0.06, 0.01]}>
        <Render type="cone" material={blade} />
      </Entity>
      <Entity position={[0, 0.12, 0]} scale={[0.22, 0.035, 0.04]}>
        <Render type="box" material={guard} />
      </Entity>
      <Entity position={[0, -0.05, 0]} scale={[0.03, 0.15, 0.03]}>
        <Render type="cylinder" material={hilt} />
      </Entity>
    </Entity>
  );
}

function AxeModel() {
  const blade = useMaterial({ diffuse: [0.75, 0.75, 0.78], metalness: 0.7 });
  const handle = useMaterial({ diffuse: [0.5, 0.3, 0.15] });
  return (
    <Entity>
      <Entity position={[0.1, 0.5, 0]} scale={[0.18, 0.22, 0.025]} rotation={[0, 0, -8]}>
        <Render type="box" material={blade} />
      </Entity>
      <Entity position={[0, 0.05, 0]} scale={[0.03, 0.6, 0.03]}>
        <Render type="cylinder" material={handle} />
      </Entity>
    </Entity>
  );
}

function HammerModel() {
  const head = useMaterial({ diffuse: [0.6, 0.6, 0.65], metalness: 0.6 });
  const handle = useMaterial({ diffuse: [0.5, 0.3, 0.15] });
  return (
    <Entity>
      <Entity position={[0, 0.55, 0]} scale={[0.28, 0.14, 0.14]}>
        <Render type="box" material={head} />
      </Entity>
      <Entity position={[0, 0.05, 0]} scale={[0.035, 0.5, 0.035]}>
        <Render type="cylinder" material={handle} />
      </Entity>
    </Entity>
  );
}

function FryingPanModel() {
  const pan = useMaterial({ diffuse: [0.25, 0.25, 0.28], metalness: 0.5 });
  const handle = useMaterial({ diffuse: [0.5, 0.3, 0.15] });
  return (
    <Entity>
      <Entity position={[0, 0.5, 0]} scale={[0.32, 0.04, 0.32]}>
        <Render type="cylinder" material={pan} />
      </Entity>
      <Entity position={[0, 0.05, 0]} scale={[0.03, 0.4, 0.03]}>
        <Render type="cylinder" material={handle} />
      </Entity>
    </Entity>
  );
}

function SpearModel() {
  const tip = useMaterial({ diffuse: [0.85, 0.85, 0.88], metalness: 0.7 });
  const shaft = useMaterial({ diffuse: [0.5, 0.32, 0.15] });
  return (
    <Entity>
      <Entity position={[0, 0.82, 0]} scale={[0.06, 0.18, 0.06]}>
        <Render type="cone" material={tip} />
      </Entity>
      <Entity position={[0, 0.15, 0]} scale={[0.025, 0.8, 0.025]}>
        <Render type="cylinder" material={shaft} />
      </Entity>
    </Entity>
  );
}

function MaceModel() {
  const head = useMaterial({ diffuse: [0.65, 0.65, 0.7], metalness: 0.6 });
  const spike = useMaterial({ diffuse: [0.8, 0.8, 0.83], metalness: 0.7 });
  const shaft = useMaterial({ diffuse: [0.5, 0.3, 0.15] });
  return (
    <Entity>
      <Entity position={[0, 0.55, 0]} scale={[0.16, 0.16, 0.16]}>
        <Render type="sphere" material={head} />
      </Entity>
      <Entity position={[0.1, 0.6, 0]} scale={[0.04, 0.04, 0.04]}>
        <Render type="cone" material={spike} />
      </Entity>
      <Entity position={[-0.1, 0.6, 0]} scale={[0.04, 0.04, 0.04]}>
        <Render type="cone" material={spike} />
      </Entity>
      <Entity position={[0, 0.65, 0.08]} scale={[0.04, 0.04, 0.04]}>
        <Render type="cone" material={spike} />
      </Entity>
      <Entity position={[0, 0.65, -0.08]} scale={[0.04, 0.04, 0.04]}>
        <Render type="cone" material={spike} />
      </Entity>
      <Entity position={[0, 0.05, 0]} scale={[0.03, 0.45, 0.03]}>
        <Render type="cylinder" material={shaft} />
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

// ---- Melee animation (existing swing) ----

function MeleeCutsceneWeapon({ weaponType, capturePos, attackAngle, phase }: {
  weaponType: Weapon3D;
  capturePos: Pos;
  attackAngle: number;
  phase: number;
}) {
  const cx = capturePos[1] - 3.5;
  const cz = capturePos[0] - 3.5;

  const appear = smoothstep(0.30, 0.36, phase);
  const raiseT = smoothstep(0.34, 0.40, phase);
  const swingT = smoothstep(0.42, 0.48, phase);
  const fadeT = smoothstep(0.70, 0.82, phase);

  if (appear <= 0.01 || fadeT >= 0.99) return null;

  // Follow attacker's walk-forward after the hit
  const walkT = smoothstep(0.50, 0.66, phase);
  const attackerBehind = 0.8 * (1 - walkT);
  const weaponBehind = attackerBehind + 0.1;
  const behindX = -Math.sin(attackAngle) * weaponBehind;
  const behindZ = -Math.cos(attackAngle) * weaponBehind;

  const raiseHeight = 0.7 + raiseT * 0.35;
  const swingDrop = swingT * 0.55;
  const y = BOARD_SURFACE_Y + raiseHeight - swingDrop;

  const tipBack = raiseT * -70;
  const swingForward = swingT * 140;
  const swingAngle = tipBack + swingForward;
  const facingYaw = attackAngle * (180 / Math.PI) + 180;

  const scale = appear * (1 - fadeT);

  return (
    <Entity
      position={[cx + behindX, y, cz + behindZ]}
      rotation={[swingAngle, facingYaw, 0]}
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
  const holdOffsetX = Math.sin(attackAngle) * 0.45 + Math.sin(sideAngle) * 0.15;
  const holdOffsetZ = Math.cos(attackAngle) * 0.45 + Math.cos(sideAngle) * 0.15;
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
          x={posX + Math.sin(attackAngle) * 0.7}
          y={holdY + 0.1}
          z={posZ + Math.cos(attackAngle) * 0.7}
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
