import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import type { Pos } from './engine';
import { BOARD_SURFACE_Y } from './pieces';

export type Weapon3D = 'sword' | 'axe' | 'hammer' | 'fryingpan' | 'spear' | 'mace';

export interface WeaponDef {
  type: Weapon3D;
  name: string;
  emoji: string;
}

export const WEAPON_DEFS: WeaponDef[] = [
  { type: 'sword', name: 'SWORD', emoji: '⚔️' },
  { type: 'sword', name: 'KATANA', emoji: '⚔️' },
  { type: 'sword', name: 'LIGHTSABER', emoji: '⚔️' },
  { type: 'axe', name: 'AXE', emoji: '🪓' },
  { type: 'axe', name: 'BATTLE AXE', emoji: '🪓' },
  { type: 'hammer', name: 'WAR HAMMER', emoji: '🔨' },
  { type: 'hammer', name: 'BONK HAMMER', emoji: '🔨' },
  { type: 'hammer', name: 'MJÖLNIR', emoji: '🔨' },
  { type: 'fryingpan', name: 'FRYING PAN', emoji: '🍳' },
  { type: 'fryingpan', name: 'CHEESE WHEEL', emoji: '🧀' },
  { type: 'fryingpan', name: 'SHIELD BASH', emoji: '🛡️' },
  { type: 'spear', name: 'SPEAR', emoji: '🔱' },
  { type: 'spear', name: 'BAZOOKA', emoji: '🚀' },
  { type: 'spear', name: 'PLUNGER', emoji: '🪠' },
  { type: 'spear', name: 'TRIDENT', emoji: '🔱' },
  { type: 'mace', name: 'MACE', emoji: '⛏️' },
  { type: 'mace', name: 'FISH SLAP', emoji: '🐟' },
  { type: 'mace', name: 'RUBBER DUCK', emoji: '🦆' },
  { type: 'mace', name: 'BOWLING BALL', emoji: '🎳' },
  { type: 'hammer', name: 'GUITAR SMASH', emoji: '🎸' },
  { type: 'sword', name: 'PIZZA CUTTER', emoji: '🍕' },
  { type: 'mace', name: 'SHOE', emoji: '👟' },
  { type: 'axe', name: 'BOOMERANG', emoji: '🪃' },
  { type: 'hammer', name: 'BOXING GLOVE', emoji: '🥊' },
];

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// ---- Weapon 3D models from primitives ----

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
      {/* Spikes */}
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

const WEAPON_MODELS: Record<Weapon3D, React.FC> = {
  sword: SwordModel,
  axe: AxeModel,
  hammer: HammerModel,
  fryingpan: FryingPanModel,
  spear: SpearModel,
  mace: MaceModel,
};

interface CutsceneWeaponProps {
  weaponType: Weapon3D;
  capturePos: Pos;
  attackAngle: number; // radians, direction the attacker approached from
  phase: number;
}

export function CutsceneWeapon({ weaponType, capturePos, attackAngle, phase }: CutsceneWeaponProps) {
  const Model = WEAPON_MODELS[weaponType];

  const cx = capturePos[1] - 3.5;
  const cz = capturePos[0] - 3.5;

  // Weapon appears, raises, swings down
  const appear = smoothstep(0.30, 0.36, phase);
  const raiseT = smoothstep(0.34, 0.40, phase);
  const swingT = smoothstep(0.42, 0.48, phase);
  const fadeT = smoothstep(0.70, 0.82, phase);

  if (appear <= 0.01 || fadeT >= 0.99) return null;

  // Position: slightly behind and above the capture point
  const behindX = -Math.sin(attackAngle) * 0.4;
  const behindZ = -Math.cos(attackAngle) * 0.4;

  // Raise up then swing down
  const raiseHeight = 1.2 + raiseT * 0.6;
  const swingDrop = swingT * 0.8;
  const y = BOARD_SURFACE_Y + raiseHeight - swingDrop;

  // Swing rotation: weapon tips back then forward
  const tipBack = raiseT * -70; // lean back as it raises
  const swingForward = swingT * 140; // swing forward on strike
  const swingAngle = tipBack + swingForward;

  // Face toward the victim
  const facingYaw = attackAngle * (180 / Math.PI);

  const scale = appear * (1 - fadeT);

  return (
    <Entity
      position={[cx + behindX, y, cz + behindZ]}
      rotation={[swingAngle, facingYaw, 0]}
      scale={[scale, scale, scale]}
    >
      <Model />
    </Entity>
  );
}
