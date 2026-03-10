import { useState, useCallback, useEffect, useRef } from 'react';
import { Application, Entity } from '@playcanvas/react';
import { Camera, Light, Render } from '@playcanvas/react/components';
import { OrbitControls } from '@playcanvas/react/scripts';
import { useMaterial } from '@playcanvas/react/hooks';
import { FILLMODE_FILL_WINDOW, RESOLUTION_AUTO } from 'playcanvas';

import {
  createInitialState, getValidMoves, makeMove, stateToFen, parseUciMove,
  type GameState, type Pos, type PieceColor, type PieceType,
} from './chess/engine';
import { ChessBoard } from './chess/Board';
import { ChessPiece, AnimatingPiece, GhostPiece, CutsceneAttacker, FallenKing, BOARD_SURFACE_Y, type PieceStyle } from './chess/pieces';
import { CutsceneWeapon, WEAPON_DEFS, pickWeapon, getProjectilePos, type Weapon3D, type Blaster3D, type WeaponCategory } from './chess/weapons';
import { GameUI } from './chess/GameUI';
import { CutsceneOverlay } from './chess/CutsceneOverlay';
import { CheckmateOverlay } from './chess/CheckmateOverlay';
import { StockfishEngine } from './chess/stockfish';
import { createReplayState, type ParsedMove } from './chess/pgn';
import { memeAudio } from './chess/sounds';

import './index.css';

export type GameMode = 'pvp' | 'pvai' | 'aivai';

interface MoveAnimation {
  pieceType: PieceType;
  pieceColor: PieceColor;
  from: Pos;
  to: Pos;
  isCapture: boolean;
  isKnight: boolean;
  progress: number;
  newState: GameState;
  capturedType?: PieceType;
  capturedColor?: PieceColor;
}

interface Cutscene {
  attackerType: PieceType;
  attackerColor: PieceColor;
  victimType: PieceType;
  victimColor: PieceColor;
  capturePos: Pos;
  fromPos: Pos;
  attackAngle: number; // radians
  weaponCategory: WeaponCategory;
  weaponType: Weapon3D | Blaster3D;
  weaponName: string;
  weaponEmoji: string;
  phase: number; // 0-1
  newState: GameState;
}

interface CheckmateAnim {
  winner: PieceColor;
  loserKingPos: Pos;
  phase: number; // 0-1 over 6 seconds
}

interface CameraReturn {
  fromPos: [number, number, number];
  fromRot: [number, number, number];
  progress: number;
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Default camera
const DEFAULT_CAM_POS: [number, number, number] = [0, 4.34, 7.57];
const DEFAULT_CAM_ROT: [number, number, number] = [-30, 0, 0];

// Find king position on board
function findKingPos(state: GameState, color: PieceColor): Pos {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.type === 'king' && p.color === color) return [r, c];
    }
  }
  return [4, 4]; // fallback
}

function Scene() {
  // Responsive FOV — wider for narrow/portrait viewports
  const [responsiveFov, setResponsiveFov] = useState(() => {
    const aspect = window.innerWidth / window.innerHeight;
    return aspect < 1.2 ? Math.min(100, 75 / aspect * 0.85) : 75;
  });

  useEffect(() => {
    const handleResize = () => {
      // Update FOV for aspect ratio
      const aspect = window.innerWidth / window.innerHeight;
      setResponsiveFov(aspect < 1.2 ? Math.min(100, 75 / aspect * 0.85) : 75);
      // Force canvas resize
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [selectedSquare, setSelectedSquare] = useState<Pos | null>(null);
  const [validMoves, setValidMoves] = useState<Pos[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [aiSpeed, setAiSpeed] = useState(500);
  const [skillLevel, setSkillLevel] = useState(10);
  const [searchDepth, setSearchDepth] = useState(0);
  const [cinematicCaptures, setCinematicCaptures] = useState(true);
  const [pieceStyle, setPieceStyle] = useState<PieceStyle>('gopher');

  // Preload meme sounds on mount
  useEffect(() => { memeAudio.preload(); }, []);

  // PGN Replay state
  const [replayMoves, setReplayMoves] = useState<ParsedMove[] | null>(null);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1500);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation states
  const [animation, setAnimation] = useState<MoveAnimation | null>(null);
  const [cutscene, setCutscene] = useState<Cutscene | null>(null);
  const [checkmateAnim, setCheckmateAnim] = useState<CheckmateAnim | null>(null);
  const [cameraReturn, setCameraReturn] = useState<CameraReturn | null>(null);
  const animFrameRef = useRef<number>(0);
  const cutsceneFrameRef = useRef<number>(0);
  const checkmateFrameRef = useRef<number>(0);
  const returnFrameRef = useRef<number>(0);

  // Camera override for cutscenes + return
  const [camPos, setCamPos] = useState<[number, number, number]>(DEFAULT_CAM_POS);
  const [camRot, setCamRot] = useState<[number, number, number]>(DEFAULT_CAM_ROT);
  const [camOverride, setCamOverride] = useState(false);

  // Refs to track latest camera pos for smooth return
  const lastCamPosRef = useRef<[number, number, number]>(DEFAULT_CAM_POS);
  const lastCamRotRef = useRef<[number, number, number]>(DEFAULT_CAM_ROT);

  // Track pending checkmate (fires after cutscene ends)
  const pendingCheckmateRef = useRef<{ winner: PieceColor; state: GameState } | null>(null);

  // Generation counter to discard stale AI moves after New Game
  const gameGenRef = useRef(0);

  const engineWhiteRef = useRef<StockfishEngine | null>(null);
  const engineBlackRef = useRef<StockfishEngine | null>(null);

  // Initialize Stockfish
  useEffect(() => {
    if (gameMode === 'pvp') return;
    const initEngines = async () => {
      try {
        if (!engineBlackRef.current) {
          engineBlackRef.current = new StockfishEngine(skillLevel);
          await engineBlackRef.current.init();
        }
        if (gameMode === 'aivai' && !engineWhiteRef.current) {
          engineWhiteRef.current = new StockfishEngine(skillLevel);
          await engineWhiteRef.current.init();
        }
        setAiReady(true);
      } catch (err) {
        console.error('Failed to init Stockfish:', err);
      }
    };
    initEngines();
  }, [gameMode, skillLevel]);

  // Move animation loop
  useEffect(() => {
    if (!animation) return;
    const speed = animation.isKnight ? 1.2 : 2.0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setAnimation(prev => {
        if (!prev) return null;
        const newProgress = prev.progress + dt * speed;
        if (newProgress >= 1) {
          if (prev.isCapture && cinematicCaptures && prev.capturedType) {
            startCutscene(prev);
          } else {
            setGameState(prev.newState);
            // Check for non-capture checkmate
            if (prev.newState.status === 'checkmate') {
              triggerCheckmate(prev.newState);
            }
          }
          return null;
        }
        return { ...prev, progress: newProgress };
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animation !== null, cinematicCaptures]);

  // Cutscene animation loop
  useEffect(() => {
    if (!cutscene) return;
    let lastTime = performance.now();
    const CUTSCENE_DURATION = 7; // seconds

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setCutscene(prev => {
        if (!prev) return null;
        const newPhase = prev.phase + dt / CUTSCENE_DURATION;
        if (newPhase >= 1) {
          endCutscene();
          return null;
        }

        updateCutsceneCamera(prev, newPhase);
        return { ...prev, phase: newPhase };
      });

      cutsceneFrameRef.current = requestAnimationFrame(animate);
    };

    cutsceneFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(cutsceneFrameRef.current);
  }, [cutscene !== null]);

  // Checkmate animation loop
  useEffect(() => {
    if (!checkmateAnim) return;
    let lastTime = performance.now();
    const CHECKMATE_DURATION = 6; // seconds

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setCheckmateAnim(prev => {
        if (!prev) return null;
        const newPhase = prev.phase + dt / CHECKMATE_DURATION;
        if (newPhase >= 1) {
          endCheckmate();
          return null;
        }

        updateCheckmateCamera(prev.loserKingPos, prev.winner, newPhase);
        return { ...prev, phase: newPhase };
      });

      checkmateFrameRef.current = requestAnimationFrame(animate);
    };

    checkmateFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(checkmateFrameRef.current);
  }, [checkmateAnim !== null]);

  // Camera return animation loop (smooth lerp back to default)
  useEffect(() => {
    if (!cameraReturn) return;
    let lastTime = performance.now();
    const RETURN_DURATION = 1.0;

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setCameraReturn(prev => {
        if (!prev) return null;
        const newProgress = prev.progress + dt / RETURN_DURATION;
        if (newProgress >= 1) {
          setCamPos(DEFAULT_CAM_POS);
          setCamRot(DEFAULT_CAM_ROT);
          setCamOverride(false);
          return null;
        }

        // Smooth ease-out cubic
        const t = 1 - Math.pow(1 - newProgress, 3);
        setCamPos([
          prev.fromPos[0] + (DEFAULT_CAM_POS[0] - prev.fromPos[0]) * t,
          prev.fromPos[1] + (DEFAULT_CAM_POS[1] - prev.fromPos[1]) * t,
          prev.fromPos[2] + (DEFAULT_CAM_POS[2] - prev.fromPos[2]) * t,
        ]);
        setCamRot([
          prev.fromRot[0] + (DEFAULT_CAM_ROT[0] - prev.fromRot[0]) * t,
          prev.fromRot[1] + (DEFAULT_CAM_ROT[1] - prev.fromRot[1]) * t,
          prev.fromRot[2] + (DEFAULT_CAM_ROT[2] - prev.fromRot[2]) * t,
        ]);
        return { ...prev, progress: newProgress };
      });

      returnFrameRef.current = requestAnimationFrame(animate);
    };

    returnFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(returnFrameRef.current);
  }, [cameraReturn !== null]);

  // Trigger checkmate animation
  const triggerCheckmate = useCallback((state: GameState) => {
    const winner = state.turn === 'white' ? 'black' : 'white'; // turn is the LOSING side
    const loserColor = state.turn; // the side that's in checkmate
    const loserKingPos = findKingPos(state, loserColor);

    setCheckmateAnim({ winner, loserKingPos, phase: 0 });
    setCamOverride(true);
    updateCheckmateCamera(loserKingPos, winner, 0);
  }, []);

  const startCutscene = useCallback((anim: MoveAnimation) => {
    // Apply game state immediately so the board looks correct during cutscene
    setGameState(anim.newState);

    // If this move caused checkmate, queue it for after cutscene
    if (anim.newState.status === 'checkmate') {
      const winner = anim.newState.turn === 'white' ? 'black' : 'white';
      pendingCheckmateRef.current = { winner, state: anim.newState };
    }

    // Compute attack direction
    const dx = (anim.to[1] - anim.from[1]);
    const dz = (anim.to[0] - anim.from[0]);
    const attackAngle = Math.atan2(dx, dz);

    // Pick weapon based on capture distance
    const weapon = pickWeapon(anim.from, anim.to);

    const cs: Cutscene = {
      attackerType: anim.pieceType,
      attackerColor: anim.pieceColor,
      victimType: anim.capturedType!,
      victimColor: anim.capturedColor!,
      capturePos: anim.to,
      fromPos: anim.from,
      attackAngle,
      weaponCategory: weapon.category,
      weaponType: weapon.type,
      weaponName: weapon.name,
      weaponEmoji: weapon.emoji,
      phase: 0,
      newState: anim.newState,
    };
    setCutscene(cs);
    setCamOverride(true);
    updateCutsceneCamera(cs, 0);
  }, []);

  const updateCutsceneCamera = useCallback((cs: Cutscene, phase: number) => {
    const isRanged = cs.weaponCategory === 'ranged';
    if (isRanged) {
      updateRangedCamera(cs, phase);
    } else {
      updateMeleeCamera(cs.capturePos, cs.attackerColor, phase);
    }
  }, []);

  // Melee camera (existing close-quarters choreography)
  const updateMeleeCamera = useCallback((pos: Pos, attackerColor: PieceColor, phase: number) => {
    const cx = pos[1] - 3.5;
    const cz = pos[0] - 3.5;
    const targetY = BOARD_SURFACE_Y + 0.5;

    const baseAngle = attackerColor === 'white' ? Math.PI * 0.8 : Math.PI * 0.2;
    const victimAngle = baseAngle + Math.PI;
    const sideAngle = (baseAngle + victimAngle) / 2 + Math.PI * 0.5;

    let camX: number, camY: number, camZ: number;
    let roll = 0;

    if (phase < 0.08) {
      const t = phase / 0.08;
      const eased = t * t;
      const dist = 5 - eased * 3.5;
      const height = 3 - eased * 2.4;
      camX = cx + Math.sin(sideAngle) * dist;
      camZ = cz + Math.cos(sideAngle) * dist;
      camY = BOARD_SURFACE_Y + height;
    } else if (phase < 0.30) {
      const t = (phase - 0.08) / 0.22;
      const angle = sideAngle + t * 0.15;
      const dist = 1.5 + t * 0.3;
      const height = 0.6 + t * 0.2;
      camX = cx + Math.sin(angle) * dist;
      camZ = cz + Math.cos(angle) * dist;
      camY = BOARD_SURFACE_Y + height;
    } else if (phase < 0.42) {
      const t = (phase - 0.30) / 0.12;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const angle = sideAngle + 0.15 + eased * 0.15;
      const dist = 1.8 + eased * 1.7;
      const height = 0.8 + eased * 1.2;
      camX = cx + Math.sin(angle) * dist;
      camZ = cz + Math.cos(angle) * dist;
      camY = BOARD_SURFACE_Y + height;
    } else if (phase < 0.55) {
      const t = (phase - 0.42) / 0.13;
      const angle = sideAngle + 0.30 + t * 0.1;
      const dist = 3.5;
      const height = 2.0;
      camX = cx + Math.sin(angle) * dist;
      camZ = cz + Math.cos(angle) * dist;
      camY = BOARD_SURFACE_Y + height;
      if (phase > 0.43) {
        const shakeT = (phase - 0.43) / 0.10;
        const shake = Math.max(0, 1 - shakeT) * 0.08;
        camX += Math.sin(phase * 200) * shake;
        camZ += Math.cos(phase * 170) * shake;
        roll = Math.max(0, 1 - shakeT) * 4;
      }
    } else if (phase < 0.78) {
      const t = (phase - 0.55) / 0.23;
      const angle = sideAngle + 0.40 + t * 0.4;
      const dist = 3.5 + t * 0.5;
      const height = 2.0 + t * 0.5;
      camX = cx + Math.sin(angle) * dist;
      camZ = cz + Math.cos(angle) * dist;
      camY = BOARD_SURFACE_Y + height;
    } else {
      const t = (phase - 0.78) / 0.22;
      const eased = t * t;
      const angle = sideAngle + 0.80;
      const dist = 4.0 + eased * 2.0;
      const height = 2.5 + eased * 2.0;
      camX = cx + Math.sin(angle) * dist;
      camZ = cz + Math.cos(angle) * dist;
      camY = BOARD_SURFACE_Y + height;
    }

    const lookX = cx - camX;
    const lookZ = cz - camZ;
    const lookY = targetY - camY;
    const pitch = Math.atan2(lookY, Math.sqrt(lookX * lookX + lookZ * lookZ)) * (180 / Math.PI);
    const yaw = Math.atan2(lookX, lookZ) * (180 / Math.PI);

    const newPos: [number, number, number] = [camX, camY, camZ];
    const newRot: [number, number, number] = [pitch, yaw, roll];
    setCamPos(newPos);
    setCamRot(newRot);
    lastCamPosRef.current = newPos;
    lastCamRotRef.current = newRot;
  }, []);

  // Ranged camera: close-up on attacker, follow projectile, impact at victim, walk
  const updateRangedCamera = useCallback((cs: Cutscene, phase: number) => {
    const fx = cs.fromPos[1] - 3.5;
    const fz = cs.fromPos[0] - 3.5;
    const cx = cs.capturePos[1] - 3.5;
    const cz = cs.capturePos[0] - 3.5;
    const angle = cs.attackAngle;

    // Perpendicular side angle for viewing
    const sideAngle = angle + Math.PI * 0.5;

    let camX: number, camY: number, camZ: number;
    let lookAtX: number, lookAtY: number, lookAtZ: number;
    let roll = 0;

    if (phase < 0.08) {
      // Zoom in on attacker at fromPos
      const t = phase / 0.08;
      const eased = t * t;
      const dist = 5 - eased * 3.5;
      const height = 3 - eased * 2.2;
      camX = fx + Math.sin(sideAngle) * dist;
      camZ = fz + Math.cos(sideAngle) * dist;
      camY = BOARD_SURFACE_Y + height;
      lookAtX = fx; lookAtY = BOARD_SURFACE_Y + 0.5; lookAtZ = fz;
    } else if (phase < 0.22) {
      // Close-up on attacker face / VS screen
      const t = (phase - 0.08) / 0.14;
      const a = sideAngle + t * 0.1;
      const dist = 1.5 + t * 0.2;
      const height = 0.6 + t * 0.15;
      camX = fx + Math.sin(a) * dist;
      camZ = fz + Math.cos(a) * dist;
      camY = BOARD_SURFACE_Y + height;
      lookAtX = fx; lookAtY = BOARD_SURFACE_Y + 0.5; lookAtZ = fz;
    } else if (phase < 0.28) {
      // Pull back slightly to show attacker aiming
      const t = (phase - 0.22) / 0.06;
      const eased = t * t;
      const dist = 1.7 + eased * 0.8;
      const height = 0.75 + eased * 0.3;
      camX = fx + Math.sin(sideAngle + 0.1) * dist;
      camZ = fz + Math.cos(sideAngle + 0.1) * dist;
      camY = BOARD_SURFACE_Y + height;
      // Start looking toward victim direction
      const lookT = eased * 0.3;
      lookAtX = fx + (cx - fx) * lookT;
      lookAtY = BOARD_SURFACE_Y + 0.5;
      lookAtZ = fz + (cz - fz) * lookT;
    } else if (phase < 0.44) {
      // FOLLOW THE PROJECTILE — camera tracks alongside it
      const flyT = Math.min(1, (phase - 0.28) / 0.16);
      const projPos = getProjectilePos(cs.fromPos, cs.capturePos, phase);

      // Camera position: alongside projectile, slightly behind and above
      const projX = fx + (cx - fx) * flyT;
      const projZ = fz + (cz - fz) * flyT;
      const dist = 2.0 - flyT * 0.5; // get closer as it arrives
      const height = 1.0 + Math.sin(flyT * Math.PI) * 0.5;

      camX = projX + Math.sin(sideAngle) * dist;
      camZ = projZ + Math.cos(sideAngle) * dist;
      camY = BOARD_SURFACE_Y + height;

      // Look at projectile or slightly ahead of it
      if (projPos) {
        lookAtX = projPos[0] + Math.sin(angle) * 0.3;
        lookAtY = projPos[1];
        lookAtZ = projPos[2] + Math.cos(angle) * 0.3;
      } else {
        lookAtX = cx; lookAtY = BOARD_SURFACE_Y + 0.4; lookAtZ = cz;
      }
    } else if (phase < 0.55) {
      // Impact! Camera at victim with shake
      const t = (phase - 0.44) / 0.11;
      const dist = 2.0 + t * 0.5;
      const height = 1.2;
      camX = cx + Math.sin(sideAngle) * dist;
      camZ = cz + Math.cos(sideAngle) * dist;
      camY = BOARD_SURFACE_Y + height;
      lookAtX = cx; lookAtY = BOARD_SURFACE_Y + 0.4; lookAtZ = cz;

      // Camera shake
      if (phase > 0.44) {
        const shakeT = (phase - 0.44) / 0.08;
        const shake = Math.max(0, 1 - shakeT) * 0.1;
        camX += Math.sin(phase * 200) * shake;
        camZ += Math.cos(phase * 170) * shake;
        roll = Math.max(0, 1 - shakeT) * 5;
      }
    } else if (phase < 0.88) {
      // Follow attacker walking from fromPos to capturePos
      const walkT = (phase - 0.55) / 0.33;
      const eased = walkT < 0.5 ? 2 * walkT * walkT : 1 - Math.pow(-2 * walkT + 2, 2) / 2;
      const walkerX = fx + (cx - fx) * eased;
      const walkerZ = fz + (cz - fz) * eased;
      const dist = 2.5 + walkT * 0.5;
      const height = 1.2 + walkT * 0.8;
      const a = sideAngle + walkT * 0.3;
      camX = walkerX + Math.sin(a) * dist;
      camZ = walkerZ + Math.cos(a) * dist;
      camY = BOARD_SURFACE_Y + height;
      lookAtX = walkerX; lookAtY = BOARD_SURFACE_Y + 0.4; lookAtZ = walkerZ;
    } else {
      // Pull back to overview
      const t = (phase - 0.88) / 0.12;
      const eased = t * t;
      const dist = 3.0 + eased * 3.0;
      const height = 2.0 + eased * 2.5;
      camX = cx + Math.sin(sideAngle + 0.3) * dist;
      camZ = cz + Math.cos(sideAngle + 0.3) * dist;
      camY = BOARD_SURFACE_Y + height;
      lookAtX = cx; lookAtY = BOARD_SURFACE_Y + 0.3; lookAtZ = cz;
    }

    const dx = lookAtX - camX;
    const dz = lookAtZ - camZ;
    const dy = lookAtY - camY;
    const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * (180 / Math.PI);
    const yaw = Math.atan2(dx, dz) * (180 / Math.PI);

    const newPos: [number, number, number] = [camX, camY, camZ];
    const newRot: [number, number, number] = [pitch, yaw, roll];
    setCamPos(newPos);
    setCamRot(newRot);
    lastCamPosRef.current = newPos;
    lastCamRotRef.current = newRot;
  }, []);

  // Checkmate camera
  const updateCheckmateCamera = useCallback((kingPos: Pos, winner: PieceColor, phase: number) => {
    const kx = kingPos[1] - 3.5;
    const kz = kingPos[0] - 3.5;
    const targetY = BOARD_SURFACE_Y + 0.4;
    const baseAngle = winner === 'white' ? Math.PI * 0.3 : Math.PI * 1.3;

    let camX: number, camY: number, camZ: number;

    if (phase < 0.2) {
      // Swoop to losing king (dramatic low angle)
      const t = phase / 0.2;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const dist = 5 - eased * 3.5;
      const height = 4 - eased * 3.3;
      camX = kx + Math.sin(baseAngle) * dist;
      camZ = kz + Math.cos(baseAngle) * dist;
      camY = BOARD_SURFACE_Y + height;
    } else if (phase < 0.4) {
      // Hold on losing king as it tips
      const t = (phase - 0.2) / 0.2;
      const angle = baseAngle + t * 0.2;
      const dist = 1.5 + t * 0.3;
      const height = 0.7 + t * 0.3;
      camX = kx + Math.sin(angle) * dist;
      camZ = kz + Math.cos(angle) * dist;
      camY = BOARD_SURFACE_Y + height;
    } else if (phase < 0.7) {
      // Pull up + orbit around board
      const t = (phase - 0.4) / 0.3;
      const angle = baseAngle + 0.2 + t * Math.PI * 0.8;
      const dist = 1.8 + t * 4;
      const height = 1.0 + t * 5;
      camX = Math.sin(angle) * dist; // orbit around center
      camZ = Math.cos(angle) * dist;
      camY = BOARD_SURFACE_Y + height;
    } else {
      // Slow fade, hold position
      const t = (phase - 0.7) / 0.3;
      const angle = baseAngle + 0.2 + Math.PI * 0.8;
      const dist = 5.8;
      const height = 6;
      camX = Math.sin(angle) * dist;
      camZ = Math.cos(angle) * dist;
      camY = BOARD_SURFACE_Y + height;
    }

    // Look-at: first half look at king, second half look at board center
    const lookAtX = phase < 0.4 ? kx : kx * (1 - smoothstep(0.4, 0.55, phase));
    const lookAtZ = phase < 0.4 ? kz : kz * (1 - smoothstep(0.4, 0.55, phase));

    const lookX = lookAtX - camX;
    const lookZ = lookAtZ - camZ;
    const lookY = targetY - camY;
    const pitch = Math.atan2(lookY, Math.sqrt(lookX * lookX + lookZ * lookZ)) * (180 / Math.PI);
    const yaw = Math.atan2(lookX, lookZ) * (180 / Math.PI);

    const newPos: [number, number, number] = [camX, camY, camZ];
    const newRot: [number, number, number] = [pitch, yaw, 0];
    setCamPos(newPos);
    setCamRot(newRot);
    lastCamPosRef.current = newPos;
    lastCamRotRef.current = newRot;
  }, []);

  const endCutscene = useCallback(() => {
    // Check if there's a pending checkmate
    const pending = pendingCheckmateRef.current;
    if (pending) {
      pendingCheckmateRef.current = null;
      // Trigger checkmate animation (camera is already overridden)
      triggerCheckmate(pending.state);
    } else {
      // Start smooth camera return
      setCameraReturn({
        fromPos: lastCamPosRef.current,
        fromRot: lastCamRotRef.current,
        progress: 0,
      });
    }
  }, []);

  const endCheckmate = useCallback(() => {
    // Start smooth camera return
    setCameraReturn({
      fromPos: lastCamPosRef.current,
      fromRot: lastCamRotRef.current,
      progress: 0,
    });
  }, []);

  const skipCutscene = useCallback(() => {
    if (cutscene) {
      cancelAnimationFrame(cutsceneFrameRef.current);
      setCutscene(null);
    }
    if (checkmateAnim) {
      cancelAnimationFrame(checkmateFrameRef.current);
      setCheckmateAnim(null);
    }
    if (cameraReturn) {
      cancelAnimationFrame(returnFrameRef.current);
      setCameraReturn(null);
    }
    pendingCheckmateRef.current = null;
    // Snap camera back immediately on skip
    setCamOverride(false);
    setCamPos(DEFAULT_CAM_POS);
    setCamRot(DEFAULT_CAM_ROT);
  }, [cutscene, checkmateAnim, cameraReturn]);

  // Execute a move with animation
  const executeMove = useCallback((state: GameState, from: Pos, to: Pos) => {
    const piece = state.board[from[0]][from[1]];
    if (!piece) return;

    const target = state.board[to[0]][to[1]];
    const newState = makeMove(state, from, to);

    setAnimation({
      pieceType: piece.type,
      pieceColor: piece.color,
      from, to,
      isCapture: !!target,
      isKnight: piece.type === 'knight',
      progress: 0,
      newState,
      capturedType: target?.type,
      capturedColor: target?.color,
    });

    setSelectedSquare(null);
    setValidMoves([]);
  }, []);

  // AI move logic
  useEffect(() => {
    if (gameState.status === 'checkmate' || gameState.status === 'stalemate') return;
    if (!aiReady || aiThinking || animation || cutscene || checkmateAnim) return;

    const isAiTurn = (
      (gameMode === 'pvai' && gameState.turn === 'black') ||
      (gameMode === 'aivai')
    );
    if (!isAiTurn) return;

    const engine = gameState.turn === 'white' ? engineWhiteRef.current : engineBlackRef.current;
    if (!engine) return;

    setAiThinking(true);

    const gen = gameGenRef.current;
    const makeAiMove = async () => {
      try {
        const fen = stateToFen(gameState);
        const moveTime = gameMode === 'aivai' ? aiSpeed : 800;
        const uciMove = await engine.getBestMove(fen, moveTime, searchDepth);
        // Discard if game was reset while AI was thinking
        if (gameGenRef.current !== gen) return;
        const parsed = parseUciMove(uciMove);

        if (parsed) {
          const moves = getValidMoves(gameState, parsed.from);
          const isValid = moves.some(([r, c]) => r === parsed.to[0] && c === parsed.to[1]);
          if (isValid) {
            if (gameMode === 'aivai') await new Promise(r => setTimeout(r, 200));
            if (gameGenRef.current !== gen) return;
            executeMove(gameState, parsed.from, parsed.to);
          }
        }
      } catch (err) {
        console.error('AI move error:', err);
      } finally {
        if (gameGenRef.current === gen) setAiThinking(false);
      }
    };

    makeAiMove();
  }, [gameState, gameMode, aiReady, aiThinking, aiSpeed, searchDepth, animation, cutscene, checkmateAnim, executeMove]);

  // ---- PGN Replay logic ----
  const handleLoadPgn = useCallback((pgn: string) => {
    const replay = createReplayState(pgn);
    if (!replay) return;
    // Reset game to initial
    setGameState(createInitialState());
    setSelectedSquare(null);
    setValidMoves([]);
    setAnimation(null);
    if (cutscene) { cancelAnimationFrame(cutsceneFrameRef.current); setCutscene(null); }
    if (checkmateAnim) { cancelAnimationFrame(checkmateFrameRef.current); setCheckmateAnim(null); }
    if (cameraReturn) { cancelAnimationFrame(returnFrameRef.current); setCameraReturn(null); }
    pendingCheckmateRef.current = null;
    setCamOverride(false);
    setCamPos(DEFAULT_CAM_POS);
    setCamRot(DEFAULT_CAM_ROT);

    setReplayMoves(replay.moves);
    setReplayIndex(-1);
    setReplayPlaying(false);
  }, [cutscene, checkmateAnim, cameraReturn]);

  const replayStep = useCallback(() => {
    if (!replayMoves) return;
    const nextIdx = replayIndex + 1;
    if (nextIdx >= replayMoves.length) {
      setReplayPlaying(false);
      return;
    }
    const move = replayMoves[nextIdx];
    executeMove(gameState, move.from, move.to);
    setReplayIndex(nextIdx);
  }, [replayMoves, replayIndex, gameState, executeMove]);

  const replayStepBack = useCallback(() => {
    if (!replayMoves || replayIndex < 0) return;
    // Rebuild state from scratch up to replayIndex - 1
    let state = createInitialState();
    const targetIdx = replayIndex - 1;
    for (let i = 0; i <= targetIdx; i++) {
      state = makeMove(state, replayMoves[i].from, replayMoves[i].to);
    }
    setGameState(state);
    setReplayIndex(targetIdx);
    setAnimation(null);
  }, [replayMoves, replayIndex]);

  const stopReplay = useCallback(() => {
    setReplayMoves(null);
    setReplayIndex(-1);
    setReplayPlaying(false);
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
  }, []);

  // Auto-play replay moves
  useEffect(() => {
    if (!replayPlaying || !replayMoves) return;
    if (animation || cutscene || checkmateAnim || cameraReturn) return;
    if (replayIndex >= replayMoves.length - 1) {
      setReplayPlaying(false);
      return;
    }

    replayTimerRef.current = setTimeout(() => {
      replayStep();
    }, replaySpeed);

    return () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    };
  }, [replayPlaying, replayMoves, replayIndex, animation, cutscene, checkmateAnim, cameraReturn, replaySpeed, replayStep]);

  const handleNewGame = useCallback(() => {
    gameGenRef.current++;
    setGameState(createInitialState());
    setSelectedSquare(null);
    setValidMoves([]);
    setAiThinking(false);
    setAnimation(null);
    if (cutscene) {
      cancelAnimationFrame(cutsceneFrameRef.current);
      setCutscene(null);
    }
    if (checkmateAnim) {
      cancelAnimationFrame(checkmateFrameRef.current);
      setCheckmateAnim(null);
    }
    if (cameraReturn) {
      cancelAnimationFrame(returnFrameRef.current);
      setCameraReturn(null);
    }
    pendingCheckmateRef.current = null;
    setCamOverride(false);
    setCamPos(DEFAULT_CAM_POS);
    setCamRot(DEFAULT_CAM_ROT);
    // Clear replay
    setReplayMoves(null);
    setReplayIndex(-1);
    setReplayPlaying(false);
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
  }, [cutscene, checkmateAnim, cameraReturn]);

  const handleModeChange = useCallback((mode: GameMode) => {
    if (engineWhiteRef.current) { engineWhiteRef.current.destroy(); engineWhiteRef.current = null; }
    if (engineBlackRef.current) { engineBlackRef.current.destroy(); engineBlackRef.current = null; }
    setAiReady(false);
    setGameMode(mode);
    handleNewGame();
  }, [handleNewGame]);

  const handleSquareClick = useCallback((pos: Pos) => {
    if (animation || cutscene || checkmateAnim) return;
    if (replayMoves) return; // block clicks during replay
    if (gameMode === 'aivai') return;
    if (gameMode === 'pvai' && gameState.turn === 'black') return;
    if (aiThinking) return;

    const [row, col] = pos;
    const { board, turn, status } = gameState;
    if (status === 'checkmate' || status === 'stalemate') return;

    const clickedPiece = board[row][col];

    if (selectedSquare && validMoves.some(([r, c]) => r === row && c === col)) {
      executeMove(gameState, selectedSquare, pos);
      return;
    }

    if (clickedPiece && clickedPiece.color === turn) {
      setSelectedSquare(pos);
      setValidMoves(getValidMoves(gameState, pos));
      return;
    }

    setSelectedSquare(null);
    setValidMoves([]);
  }, [gameState, selectedSquare, validMoves, gameMode, aiThinking, animation, cutscene, checkmateAnim, executeMove]);

  // Build pieces list
  const pieces: JSX.Element[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (animation && animation.from[0] === row && animation.from[1] === col) continue;
      if (animation && animation.isCapture && animation.to[0] === row && animation.to[1] === col) continue;
      // During cutscene, skip the attacker at capture pos (rendered separately as CutsceneAttacker)
      if (cutscene && cutscene.capturePos[0] === row && cutscene.capturePos[1] === col) continue;
      // During checkmate, skip the losing king (rendered as FallenKing)
      if (checkmateAnim && checkmateAnim.loserKingPos[0] === row && checkmateAnim.loserKingPos[1] === col) continue;

      const piece = gameState.board[row][col];
      if (piece) {
        const isSelected = selectedSquare !== null && selectedSquare[0] === row && selectedSquare[1] === col;
        pieces.push(
          <ChessPiece
            key={`${row}-${col}-${piece.type}-${piece.color}`}
            type={piece.type} color={piece.color}
            row={row} col={col}
            isSelected={isSelected}
            onClick={() => handleSquareClick([row, col])}
            pieceStyle={pieceStyle}
          />
        );
      }
    }
  }

  const moveIndicators = validMoves.map(([row, col]) => {
    const hasPiece = gameState.board[row][col] !== null;
    return <MoveIndicator key={`move-${row}-${col}`} row={row} col={col} isCapture={hasPiece} onClick={() => handleSquareClick([row, col])} />;
  });

  // Compute cutscene dynamic lighting values
  const csPhase = cutscene?.phase ?? 0;
  const csActive = !!cutscene;
  const spotlightCol: [number, number, number] = cutscene
    ? (cutscene.attackerColor === 'white' ? [0.42, 0.84, 0.9] : [0.81, 0.4, 0.15])
    : [1, 1, 1];
  // Spotlight intensity: ramp 0→2 (0-0.2), hold, flare to 3 at impact (0.42-0.50), fade
  const spotIntensity = csActive
    ? (smoothstep(0, 0.2, csPhase) * 2.0
      + smoothstep(0.42, 0.46, csPhase) * 1.0 * (1 - smoothstep(0.50, 0.55, csPhase))
      ) * (1 - smoothstep(0.78, 0.92, csPhase))
    : 0;
  // Ambient dim during cutscene
  const ambientIntensity = csActive ? 0.3 - smoothstep(0, 0.1, csPhase) * 0.2 * (1 - smoothstep(0.85, 1, csPhase)) : 0.3;
  // Rim light behind attacker
  const rimIntensity = csActive ? smoothstep(0.05, 0.15, csPhase) * 0.8 * (1 - smoothstep(0.80, 0.95, csPhase)) : 0;

  // Spotlight + rim light positions
  const spotPos: [number, number, number] = cutscene
    ? [cutscene.capturePos[1] - 3.5, BOARD_SURFACE_Y + 5, cutscene.capturePos[0] - 3.5]
    : [0, 5, 0];
  const spotTarget: [number, number, number] = cutscene
    ? [cutscene.capturePos[1] - 3.5, BOARD_SURFACE_Y, cutscene.capturePos[0] - 3.5]
    : [0, 0, 0];
  // Spotlight rotation: look straight down at capture point
  const spotDx = spotTarget[0] - spotPos[0];
  const spotDz = spotTarget[2] - spotPos[2];
  const spotDy = spotTarget[1] - spotPos[1];
  const spotPitch = Math.atan2(spotDy, Math.sqrt(spotDx * spotDx + spotDz * spotDz)) * (180 / Math.PI);
  const spotYaw = Math.atan2(spotDx, spotDz) * (180 / Math.PI);

  const rimPos: [number, number, number] = cutscene
    ? [
        (cutscene.capturePos[1] - 3.5) - Math.sin(cutscene.attackAngle) * 1.5,
        BOARD_SURFACE_Y + 1.5,
        (cutscene.capturePos[0] - 3.5) - Math.cos(cutscene.attackAngle) * 1.5,
      ]
    : [0, 2, 0];

  // Determine if any overlay is active
  const anyOverlay = !!cutscene || !!checkmateAnim;

  return (
    <>
      <Application fillMode={FILLMODE_FILL_WINDOW} resolutionMode={RESOLUTION_AUTO} style={{ width: '100vw', height: '100vh' }}>
        {/* Camera */}
        <Entity position={camPos} rotation={camRot}>
          <Camera fov={cutscene ? 40 : checkmateAnim ? 38 : responsiveFov} near={0.1} far={100} clearColor={[0.12, 0.14, 0.18, 1]} />
          {!camOverride && (
            <OrbitControls distance={8.7} distanceMin={2} distanceMax={50} frameOnStart={false} />
          )}
        </Entity>

        {/* Lighting */}
        <Entity rotation={[50, 30, 0]}>
          <Light type="directional" color={[1, 0.97, 0.92]} intensity={1.2} castShadows />
        </Entity>
        <Entity rotation={[-30, -60, 0]}>
          <Light type="directional" color={[0.5, 0.55, 0.7]} intensity={0.4} />
        </Entity>
        <Entity position={[0, 6, 0]}>
          <Light type="omni" color={[0.9, 0.85, 0.8]} intensity={ambientIntensity} range={20} />
        </Entity>

        {/* Dynamic cutscene spotlight from above */}
        {spotIntensity > 0.01 && (
          <Entity position={spotPos} rotation={[spotPitch, spotYaw, 0]}>
            <Light
              type="spot"
              color={spotlightCol}
              intensity={spotIntensity}
              range={8}
              innerConeAngle={15}
              outerConeAngle={40}
              castShadows
            />
          </Entity>
        )}

        {/* Dynamic rim light behind attacker */}
        {rimIntensity > 0.01 && (
          <Entity position={rimPos}>
            <Light type="omni" color={[1, 0.95, 0.85]} intensity={rimIntensity} range={4} />
          </Entity>
        )}

        <ChessBoard
          selectedSquare={selectedSquare} validMoves={validMoves}
          lastMove={gameState.lastMove} onSquareClick={handleSquareClick}
        />


        {pieces}

        {animation && (
          <AnimatingPiece
            type={animation.pieceType} color={animation.pieceColor}
            from={animation.from} to={animation.to}
            progress={animation.progress} isKnight={animation.isKnight}
            pieceStyle={pieceStyle}
          />
        )}

        {/* Cutscene attacker - melee: behind victim; ranged: at fromPos */}
        {cutscene && (
          <CutsceneAttacker
            type={cutscene.attackerType}
            color={cutscene.attackerColor}
            capturePos={cutscene.capturePos}
            fromPos={cutscene.fromPos}
            attackAngle={cutscene.attackAngle}
            phase={cutscene.phase}
            isRanged={cutscene.weaponCategory === 'ranged'}
            pieceStyle={pieceStyle}
          />
        )}

        {/* Ghost victim piece during cutscene - gets hit and launched */}
        {cutscene && (
          <GhostPiece
            type={cutscene.victimType}
            color={cutscene.victimColor}
            row={cutscene.capturePos[0]}
            col={cutscene.capturePos[1]}
            phase={cutscene.phase}
            knockbackAngle={cutscene.attackAngle}
            pieceStyle={pieceStyle}
          />
        )}

        {/* 3D weapon during cutscene */}
        {cutscene && (
          <CutsceneWeapon
            weaponDef={{ category: cutscene.weaponCategory, type: cutscene.weaponType, name: cutscene.weaponName, emoji: cutscene.weaponEmoji }}
            capturePos={cutscene.capturePos}
            fromPos={cutscene.fromPos}
            attackAngle={cutscene.attackAngle}
            phase={cutscene.phase}
            attackerColor={cutscene.attackerColor}
          />
        )}

        {/* Fallen king during checkmate */}
        {checkmateAnim && (
          <FallenKing
            color={checkmateAnim.winner === 'white' ? 'black' : 'white'}
            row={checkmateAnim.loserKingPos[0]}
            col={checkmateAnim.loserKingPos[1]}
            phase={checkmateAnim.phase}
            pieceStyle={pieceStyle}
          />
        )}

        {moveIndicators}
      </Application>

      {/* Cutscene overlay */}
      {cutscene && (
        <CutsceneOverlay
          attackerType={cutscene.attackerType}
          attackerColor={cutscene.attackerColor}
          victimType={cutscene.victimType}
          victimColor={cutscene.victimColor}
          phase={cutscene.phase}
          onSkip={skipCutscene}
          weaponName={cutscene.weaponName}
          weaponEmoji={cutscene.weaponEmoji}
          isRanged={cutscene.weaponCategory === 'ranged'}
        />
      )}

      {/* Checkmate overlay */}
      {checkmateAnim && (
        <CheckmateOverlay
          winner={checkmateAnim.winner}
          phase={checkmateAnim.phase}
          onSkip={skipCutscene}
        />
      )}

      {/* Game UI (hidden during cutscene/checkmate) */}
      {!anyOverlay && (
        <GameUI
          state={gameState} gameMode={gameMode} aiThinking={aiThinking}
          onNewGame={handleNewGame} onModeChange={handleModeChange}
          aiSpeed={aiSpeed} onAiSpeedChange={setAiSpeed}
          skillLevel={skillLevel} onSkillLevelChange={setSkillLevel}
          searchDepth={searchDepth} onSearchDepthChange={setSearchDepth}
          cinematicCaptures={cinematicCaptures}
          onCinematicCapturesChange={setCinematicCaptures}
          pieceStyle={pieceStyle}
          onPieceStyleChange={setPieceStyle}
          // Replay props
          onLoadPgn={handleLoadPgn}
          onStopReplay={stopReplay}
          isReplaying={!!replayMoves}
          replayIndex={replayIndex}
          replayTotal={replayMoves?.length ?? 0}
          isReplayPlaying={replayPlaying}
          onToggleReplayPlay={() => setReplayPlaying(p => !p)}
          onReplayStep={replayStep}
          onReplayStepBack={replayStepBack}
          replaySpeed={replaySpeed}
          onReplaySpeedChange={setReplaySpeed}
        />
      )}
    </>
  );
}

function MoveIndicator({ row, col, isCapture, onClick }: { row: number; col: number; isCapture: boolean; onClick: () => void }) {
  const material = useMaterial({
    diffuse: isCapture ? [0.9, 0.3, 0.3] : [0.3, 0.9, 0.4],
    opacity: 0.5,
  });
  const x = col - 3.5;
  const z = row - 3.5;
  return (
    <Entity position={[x, isCapture ? 0.05 : -0.35, z]} onClick={onClick}>
      <Entity scale={isCapture ? [0.4, 0.05, 0.4] : [0.2, 0.05, 0.2]}>
        <Render type="cylinder" material={material} />
      </Entity>
    </Entity>
  );
}

export function App() {
  return <Scene />;
}

export default App;
