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

function GlbWeaponModel({ type }: { type: Weapon3D | Blaster3D }) {
  const url = WEAPON_GLB_URLS[type];
  const { asset } = useModel(url ?? '');
  const s = WEAPON_GLB_SCALES[type] ?? 2.0;

  if (!asset || !url) return null;

  return (
    <Entity scale={[s, s, s]}>
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

function Projectile({ from, to, phase, attackerColor }: {
  from: [number, number, number];
  to: [number, number, number];
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

  // Projectile flies from attacker to victim between phase 0.38-0.44
  const flyT = smoothstep(0.38, 0.44, phase);
  if (flyT <= 0 || flyT >= 1) return null;

  const x = from[0] + (to[0] - from[0]) * flyT;
  const y = from[1] + (to[1] - from[1]) * flyT + Math.sin(flyT * Math.PI) * 0.3;
  const z = from[2] + (to[2] - from[2]) * flyT;

  // Spin the projectile
  const spin = flyT * 720;

  return (
    <Entity position={[x, y, z]} rotation={[0, spin, 0]}>
      <Entity scale={[0.08, 0.08, 0.08]}>
        <Render type="sphere" material={core} />
      </Entity>
      <Entity scale={[0.15, 0.15, 0.15]}>
        <Render type="sphere" material={glow} />
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
  const facingYaw = attackAngle * (180 / Math.PI);

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

// ---- Ranged animation (aim + fire projectile) ----

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

  // Blaster appears and aims
  const appear = smoothstep(0.28, 0.34, phase);
  const aimT = smoothstep(0.30, 0.37, phase);
  const recoilT = smoothstep(0.43, 0.46, phase);
  const recoilRecover = smoothstep(0.46, 0.52, phase);
  const fadeT = smoothstep(0.70, 0.82, phase);

  // Follow attacker walk-forward
  const walkT = smoothstep(0.50, 0.66, phase);
  const attackerBehind = 0.8 * (1 - walkT);

  // Blaster held at hip height, in front of attacker
  const holdDist = attackerBehind - 0.15; // slightly in front of attacker
  const holdX = -Math.sin(attackAngle) * holdDist;
  const holdZ = -Math.cos(attackAngle) * holdDist;
  const holdY = BOARD_SURFACE_Y + 0.45;

  // Aim: tilt toward victim
  const aimPitch = aimT * -8; // slight downward aim
  const facingYaw = attackAngle * (180 / Math.PI);

  // Recoil kick on fire
  const recoil = (recoilT - recoilRecover * recoilT) * 0.15;
  const recoilX = -Math.sin(attackAngle) * recoil;
  const recoilZ = -Math.cos(attackAngle) * recoil;

  const scale = appear * (1 - fadeT);

  // Projectile positions: from attacker to victim
  const projFrom: [number, number, number] = [
    cx + holdX, holdY + 0.15, cz + holdZ,
  ];
  const projTo: [number, number, number] = [
    cx, BOARD_SURFACE_Y + 0.4, cz,
  ];

  return (
    <>
      {/* Blaster model */}
      {appear > 0.01 && fadeT < 0.99 && (
        <Entity
          position={[cx + holdX + recoilX, holdY, cz + holdZ + recoilZ]}
          rotation={[aimPitch, facingYaw + 90, 0]}
          scale={[scale, scale, scale]}
        >
          <WeaponModel type={weaponDef.type as Blaster3D} />
        </Entity>
      )}
      {/* Projectile */}
      <Projectile from={projFrom} to={projTo} phase={phase} attackerColor={attackerColor} />
    </>
  );
}
