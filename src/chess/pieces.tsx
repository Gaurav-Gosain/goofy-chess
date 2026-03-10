import { Entity } from '@playcanvas/react';
import { Render, Script } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { Script as PcScript } from 'playcanvas';
import type { PieceColor, PieceType, Pos } from './engine';
import { CLASSIC_PIECE_COMPONENTS, ClassicKing } from './ClassicPieces';

export type PieceStyle = 'gopher' | 'classic';

// ---- Goofy idle animation script ----
class GopherIdle extends PcScript {
  static scriptName = 'gopherIdle';
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

// ---- Blink animation script (attached to eye entities) ----
class EyeBlink extends PcScript {
  static scriptName = 'eyeBlink';
  time = 0;
  nextBlink = 0;
  isBlinking = false;
  blinkTime = 0;
  isOneEye = false; // wink
  originalScaleY = 1;

  initialize() {
    this.time = Math.random() * 10;
    this.nextBlink = 1 + Math.random() * 4;
    this.originalScaleY = this.entity.getLocalScale().y;
  }

  update(dt: number) {
    this.time += dt;

    if (!this.isBlinking && this.time > this.nextBlink) {
      this.isBlinking = true;
      this.blinkTime = 0;
      // 30% chance of wink (one eye only)
      this.isOneEye = Math.random() < 0.3;
    }

    if (this.isBlinking) {
      this.blinkTime += dt;
      const dur = this.isOneEye ? 0.35 : 0.15;
      const t = this.blinkTime / dur;

      if (t >= 1) {
        this.isBlinking = false;
        this.nextBlink = this.time + 2 + Math.random() * 5;
        const s = this.entity.getLocalScale();
        this.entity.setLocalScale(s.x, this.originalScaleY, s.z);
      } else {
        // Squish the eye vertically
        const squish = 1 - Math.sin(t * Math.PI) * 0.85;
        const s = this.entity.getLocalScale();
        this.entity.setLocalScale(s.x, this.originalScaleY * squish, s.z);
      }
    }
  }
}

// Second eye with offset timing for winks
class EyeBlinkAlt extends PcScript {
  static scriptName = 'eyeBlinkAlt';
  time = 0;
  nextBlink = 0;
  isBlinking = false;
  blinkTime = 0;
  originalScaleY = 1;

  initialize() {
    this.time = Math.random() * 10;
    this.nextBlink = 1.5 + Math.random() * 4;
    this.originalScaleY = this.entity.getLocalScale().y;
  }

  update(dt: number) {
    this.time += dt;

    if (!this.isBlinking && this.time > this.nextBlink) {
      this.isBlinking = true;
      this.blinkTime = 0;
    }

    if (this.isBlinking) {
      this.blinkTime += dt;
      const t = this.blinkTime / 0.15;

      if (t >= 1) {
        this.isBlinking = false;
        // Sometimes do a slow wink
        this.nextBlink = this.time + 2 + Math.random() * 6;
        const s = this.entity.getLocalScale();
        this.entity.setLocalScale(s.x, this.originalScaleY, s.z);
      } else {
        const squish = 1 - Math.sin(t * Math.PI) * 0.85;
        const s = this.entity.getLocalScale();
        this.entity.setLocalScale(s.x, this.originalScaleY * squish, s.z);
      }
    }
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

// Base gopher shape shared by all pieces
function GopherBase({ color, scale = 1 }: { color: PieceColor; scale?: number }) {
  const m = useGopherMaterials(color);
  const s = scale;

  return (
    <Entity scale={[s, s, s]}>
      {/* Body */}
      <Entity position={[0, 0.35, 0]} scale={[0.55, 0.7, 0.45]}>
        <Render type="sphere" material={m.body} />
      </Entity>
      {/* Belly */}
      <Entity position={[0, 0.3, 0.15]} scale={[0.35, 0.45, 0.2]}>
        <Render type="sphere" material={m.belly} />
      </Entity>
      {/* Head */}
      <Entity position={[0, 0.85, 0.05]} scale={[0.45, 0.4, 0.4]}>
        <Render type="sphere" material={m.body} />
      </Entity>
      {/* Left eye - with blink */}
      <Entity position={[-0.14, 0.92, 0.25]} scale={[0.14, 0.14, 0.08]}>
        <Render type="sphere" material={m.eyeWhite} />
        <Script script={EyeBlink} />
      </Entity>
      <Entity position={[-0.14, 0.92, 0.3]} scale={[0.07, 0.07, 0.04]}>
        <Render type="sphere" material={m.pupil} />
        <Script script={EyeBlink} />
      </Entity>
      {/* Right eye - with alt blink (sometimes winks independently) */}
      <Entity position={[0.14, 0.92, 0.25]} scale={[0.14, 0.14, 0.08]}>
        <Render type="sphere" material={m.eyeWhite} />
        <Script script={EyeBlinkAlt} />
      </Entity>
      <Entity position={[0.14, 0.92, 0.3]} scale={[0.07, 0.07, 0.04]}>
        <Render type="sphere" material={m.pupil} />
        <Script script={EyeBlinkAlt} />
      </Entity>
      {/* Nose */}
      <Entity position={[0, 0.82, 0.32]} scale={[0.08, 0.06, 0.06]}>
        <Render type="sphere" material={m.nose} />
      </Entity>
      {/* Teeth */}
      <Entity position={[-0.03, 0.73, 0.3]} scale={[0.04, 0.06, 0.02]}>
        <Render type="box" material={m.tooth} />
      </Entity>
      <Entity position={[0.03, 0.73, 0.3]} scale={[0.04, 0.06, 0.02]}>
        <Render type="box" material={m.tooth} />
      </Entity>
      {/* Left ear */}
      <Entity position={[-0.22, 1.1, 0]} scale={[0.1, 0.12, 0.08]}>
        <Render type="sphere" material={m.body} />
      </Entity>
      {/* Right ear */}
      <Entity position={[0.22, 1.1, 0]} scale={[0.1, 0.12, 0.08]}>
        <Render type="sphere" material={m.body} />
      </Entity>
      {/* Feet */}
      <Entity position={[-0.15, 0.0, 0.1]} scale={[0.14, 0.06, 0.2]}>
        <Render type="sphere" material={m.body} />
      </Entity>
      <Entity position={[0.15, 0.0, 0.1]} scale={[0.14, 0.06, 0.2]}>
        <Render type="sphere" material={m.body} />
      </Entity>
    </Entity>
  );
}

// ---- Individual piece types ----

function PawnGopher({ color }: { color: PieceColor }) {
  return <GopherBase color={color} scale={0.7} />;
}

function RookGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={0.8} />
      <Entity position={[0, 1.05, 0]} scale={[0.3, 0.2, 0.3]}>
        <Render type="cylinder" material={m.accent} />
      </Entity>
      <Entity position={[-0.12, 1.2, -0.12]} scale={[0.08, 0.08, 0.08]}>
        <Render type="box" material={m.accent} />
      </Entity>
      <Entity position={[0.12, 1.2, -0.12]} scale={[0.08, 0.08, 0.08]}>
        <Render type="box" material={m.accent} />
      </Entity>
      <Entity position={[-0.12, 1.2, 0.12]} scale={[0.08, 0.08, 0.08]}>
        <Render type="box" material={m.accent} />
      </Entity>
      <Entity position={[0.12, 1.2, 0.12]} scale={[0.08, 0.08, 0.08]}>
        <Render type="box" material={m.accent} />
      </Entity>
    </Entity>
  );
}

function KnightGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={0.8} />
      <Entity position={[-0.18, 1.15, 0]} rotation={[0, 0, 15]} scale={[0.08, 0.2, 0.08]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      <Entity position={[0.18, 1.15, 0]} rotation={[0, 0, -15]} scale={[0.08, 0.2, 0.08]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      <Entity position={[0, 0.35, 0.28]} scale={[0.2, 0.25, 0.03]}>
        <Render type="box" material={m.accent} />
      </Entity>
    </Entity>
  );
}

function BishopGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={0.8} />
      <Entity position={[0, 1.15, 0]} scale={[0.15, 0.25, 0.15]}>
        <Render type="cone" material={m.accent} />
      </Entity>
      <Entity position={[0, 1.02, 0]} scale={[0.2, 0.04, 0.2]}>
        <Render type="cylinder" material={m.gold} />
      </Entity>
    </Entity>
  );
}

function QueenGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={0.9} />
      <Entity position={[0, 1.1, 0]} scale={[0.22, 0.22, 0.22]}>
        <Render type="torus" material={m.gold} />
      </Entity>
      <Entity position={[0, 1.25, 0.15]} scale={[0.04, 0.1, 0.04]}>
        <Render type="cone" material={m.gold} />
      </Entity>
      <Entity position={[0, 1.25, -0.15]} scale={[0.04, 0.1, 0.04]}>
        <Render type="cone" material={m.gold} />
      </Entity>
      <Entity position={[0.15, 1.25, 0]} scale={[0.04, 0.1, 0.04]}>
        <Render type="cone" material={m.gold} />
      </Entity>
      <Entity position={[-0.15, 1.25, 0]} scale={[0.04, 0.1, 0.04]}>
        <Render type="cone" material={m.gold} />
      </Entity>
    </Entity>
  );
}

function KingGopher({ color }: { color: PieceColor }) {
  const m = useGopherMaterials(color);
  return (
    <Entity>
      <GopherBase color={color} scale={0.95} />
      <Entity position={[0, 1.12, 0]} scale={[0.25, 0.06, 0.25]}>
        <Render type="cylinder" material={m.gold} />
      </Entity>
      <Entity position={[0, 1.35, 0]} scale={[0.04, 0.2, 0.04]}>
        <Render type="box" material={m.gold} />
      </Entity>
      <Entity position={[0, 1.38, 0]} scale={[0.15, 0.04, 0.04]}>
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

export function ChessPiece({ type, color, row, col, isSelected, onClick, pieceStyle = 'gopher' }: ChessPieceProps & { pieceStyle?: PieceStyle }) {
  const PieceComponent = getComponents(pieceStyle)[type];
  const isClassic = pieceStyle === 'classic';

  const x = col - 3.5;
  const z = row - 3.5;
  const y = BOARD_SURFACE_Y + (isSelected ? 0.08 : 0);

  // Facing rotation on INNER entity so GopherIdle script on outer entity doesn't override it
  const facingY = color === 'white' ? 180 : 0;

  return (
    <Entity
      name={`${color}-${type}`}
      position={[x, y, z]}
      onClick={onClick}
    >
      {!isClassic && <Script script={GopherIdle} />}
      {/* Inner facing wrapper - isolated from idle animation rotation */}
      <Entity rotation={[0, facingY, 0]}>
        <PieceComponent color={color} />
      </Entity>
    </Entity>
  );
}

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
export function GhostPiece({ type, color, row, col, phase, knockbackAngle = 0, pieceStyle = 'gopher' }: {
  type: PieceType; color: PieceColor; row: number; col: number; phase: number;
  knockbackAngle?: number; pieceStyle?: PieceStyle;
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
    // After hit: fly away in knockback direction with arc
    const t = Math.min((phase - hitPhase) / 0.26, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Launch in knockback direction
    const dist = eased * 3;
    posX += Math.sin(knockbackAngle) * dist;
    posZ += Math.cos(knockbackAngle) * dist;

    // Arc upward then fall below board
    posY += Math.sin(eased * Math.PI) * 1.8 - eased * 1.2;

    // Wild tumbling
    rotX = eased * 420;
    rotZ = eased * 240;

    // Shrink near end
    scale = Math.max(0, 1 - eased * 0.9);
  } else {
    // Before hit: scared shaking (gets more intense closer to impact)
    const fear = smoothstepLocal(0.25, 0.42, phase);
    const shake = fear * 5;
    posX += Math.sin(phase * 90) * 0.015 * shake;
    posZ += Math.cos(phase * 70) * 0.015 * shake;
  }

  if (scale <= 0.01) return null;

  const facingY = color === 'white' ? 180 : 0;

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

// Cutscene attacker: stands behind victim, then walks onto the square after the kill
export function CutsceneAttacker({ type, color, capturePos, attackAngle, phase, pieceStyle = 'gopher' }: {
  type: PieceType; color: PieceColor;
  capturePos: Pos;
  attackAngle: number;
  phase: number;
  pieceStyle?: PieceStyle;
}) {
  const PieceComponent = getComponents(pieceStyle)[type];
  const cx = capturePos[1] - 3.5;
  const cz = capturePos[0] - 3.5;

  // Before hit: stand behind the capture point facing victim
  // After hit: walk forward onto the capture square
  const walkT = smoothstepLocal(0.50, 0.66, phase);

  // Starts 0.8 units behind the capture point, walks to center
  const behindDist = 0.8 * (1 - walkT);
  const offsetX = -Math.sin(attackAngle) * behindDist;
  const offsetZ = -Math.cos(attackAngle) * behindDist;

  // Walking waddle during walk phase
  const isWalking = phase > 0.50 && phase < 0.66;
  const wobble = isWalking ? Math.sin(phase * 50) * 6 * (1 - walkT) : 0;

  // Small hop at impact
  const hopT = phase > 0.42 && phase < 0.50 ? (phase - 0.42) / 0.08 : 0;
  const hop = hopT > 0 ? Math.sin(hopT * Math.PI) * 0.12 : 0;

  // Face toward the victim
  const facingY = attackAngle * (180 / Math.PI);

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
