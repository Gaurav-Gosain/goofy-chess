import { useState, useMemo, useEffect, useRef } from 'react';
import type { PieceType, PieceColor } from './engine';
import { memeAudio } from './sounds';

// ---- Dialogue arrays ----

const VICTIM_SCARED: string[] = [
  "Wait, what?!",
  "Oh no no no no...",
  "Please, I have a family!",
  "Can we talk about this?!",
  "I don't like where this is going...",
  "Is it too late to resign?",
  "*nervous sweating*",
  "Mom? MOM?!",
  "This isn't what I signed up for!",
  "I thought we were friends!",
  "Oh... oh no.",
  "My therapist warned me about this...",
  "NOT THE FACE!",
  "I just got here!",
  "*gulp*",
  "Is that a weapon? WHY IS THAT A WEAPON?!",
];

const ATTACKER_TAUNTS: Record<PieceType, string[]> = {
  pawn: [
    "Any last words?",
    "I may be small, but I'm DANGEROUS!",
    "Underestimate me one more time!",
    "First blood goes to ME!",
    "This pawn promotes to PAIN!",
    "Step aside or get stepped ON!",
  ],
  knight: [
    "Didn't see me coming, did ya?",
    "L-shaped JUSTICE!",
    "SURPRISE! It's me!",
    "Hop, skip, and... you're DONE!",
    "Parkour into your DEMISE!",
    "Nobody expects the horse!",
  ],
  bishop: [
    "The angles were never in your favor.",
    "Diagonally DELETE'd!",
    "Math class pays off!",
    "I snipe from the diagonal!",
    "Geometry is my weapon of choice!",
    "You never saw me coming... diagonally.",
  ],
  rook: [
    "Straight. Through. You.",
    "The tower has spoken!",
    "No wall can save you now!",
    "I am the wall. And I'm COMING!",
    "Steamroller coming through!",
    "Castle THIS!",
  ],
  queen: [
    "Bow before my power!",
    "I go wherever I PLEASE!",
    "Your reign ends HERE!",
    "Did somebody call for DESTRUCTION?",
    "ALL HAIL THE QUEEN!",
    "I'm built different!",
  ],
  king: [
    "A king handles business PERSONALLY!",
    "Even kings must fight!",
    "Royal execution incoming!",
    "Off with your head!",
    "The king has entered the chat!",
    "Rare king moment!",
  ],
};

const ATTACKER_VICTORY: string[] = [
  "GG no re.",
  "Too easy.",
  "And STAY down!",
  "Next!",
  "That's what I thought.",
  "Another one bites the dust!",
  "Send the next one!",
  "I do this for a living.",
  "Was that supposed to be hard?",
  "Skill issue, honestly.",
  "EZ clap.",
  "Get rekt!",
  "I didn't even break a sweat.",
  "*blows on weapon*",
  "You were saying?",
  "That's going on my highlight reel!",
  "I'd say sorry but... nah.",
  "Your sacrifice is noted. Moving on!",
];

const KILL_VERBS = [
  'ELIMINATED', 'DESTROYED', 'OBLITERATED', "YEET'D",
  'ANNIHILATED', 'BONKED', 'DELETED', 'REKT',
  'EVAPORATED', 'FLATTENED', 'LAUNCHED', 'DEMOLISHED',
  'SENT TO THE SHADOW REALM', 'UNINSTALLED',
  'CTRL+ALT+DELETED', "GAME OVER'D",
  'YEETED INTO ORBIT', 'REDUCED TO ATOMS',
];

// === MEME OVERLAYS ===

// Impact meme texts (shown at hit moment)
const IMPACT_MEMES = [
  'EMOTIONAL DAMAGE',
  'WASTED',
  'FATALITY',
  'BOOM HEADSHOT',
  'CRITICAL HIT',
  'K.O.',
  'OVERKILL',
  'ULTRA KILL',
  'GET REKT',
  'SKILL ISSUE',
  'NO SCOPE',
  'RATIO + L',
  'COPE',
  'SEETHE',
  'SKILL DIFF',
];

// Post-kill meme texts
const POST_KILL_MEMES = [
  'Press F to pay respects',
  'gg ez no re',
  'Skill issue tbh',
  'Sent to the backrooms',
  'Bro got folded',
  'That was personal',
  'Violated the Geneva Convention',
  'Bro rage quit life',
  'Certified hood classic',
  'Bro got ratio\'d irl',
  'Main character energy',
  'Absolutely maidenless behavior',
  'Bro got isekai\'d',
];

// MLG / Doritos / Mountain Dew style effects
const MLG_TEXTS = [
  '360 NO SCOPE', 'MLG PRO', 'WOMBO COMBO',
  'MOM GET THE CAMERA', 'OH BABY A TRIPLE',
  'AIRHORN.EXE', 'xXx_PR0_xXx',
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PIECE_EMOJI: Record<PieceType, string> = {
  pawn: '\u265F', knight: '\u265E', bishop: '\u265D', rook: '\u265C', queen: '\u265B', king: '\u265A',
};

// Generate speed lines for impact effect
function generateSpeedLines(count: number) {
  const lines: { angle: number; length: number; width: number; offset: number }[] = [];
  for (let i = 0; i < count; i++) {
    lines.push({
      angle: (i / count) * 360 + (Math.random() - 0.5) * 15,
      length: 40 + Math.random() * 60,
      width: 1 + Math.random() * 2.5,
      offset: 15 + Math.random() * 20,
    });
  }
  return lines;
}

interface CutsceneOverlayProps {
  attackerType: PieceType;
  attackerColor: PieceColor;
  victimType: PieceType;
  victimColor: PieceColor;
  phase: number;
  onSkip: () => void;
  weaponName: string;
  weaponEmoji: string;
  isRanged: boolean;
}

export function CutsceneOverlay({
  attackerType, attackerColor, victimType, victimColor, phase, onSkip,
  weaponName, weaponEmoji, isRanged,
}: CutsceneOverlayProps) {
  const [victimScared] = useState(() =>
    VICTIM_SCARED[Math.floor(Math.random() * VICTIM_SCARED.length)]
  );
  const [attackerTaunt] = useState(() => {
    const lines = ATTACKER_TAUNTS[attackerType];
    return lines[Math.floor(Math.random() * lines.length)];
  });
  const [attackerVictory] = useState(() =>
    ATTACKER_VICTORY[Math.floor(Math.random() * ATTACKER_VICTORY.length)]
  );
  const [killVerb] = useState(() =>
    KILL_VERBS[Math.floor(Math.random() * KILL_VERBS.length)]
  );

  // Meme text selections (stable per cutscene)
  const [impactMeme] = useState(() =>
    IMPACT_MEMES[Math.floor(Math.random() * IMPACT_MEMES.length)]
  );
  const [postKillMeme] = useState(() =>
    POST_KILL_MEMES[Math.floor(Math.random() * POST_KILL_MEMES.length)]
  );
  const [mlgText] = useState(() =>
    MLG_TEXTS[Math.floor(Math.random() * MLG_TEXTS.length)]
  );
  // Randomize which meme combo we show (keeps it fresh)
  const [memeVariant] = useState(() => Math.floor(Math.random() * 5));

  // Hitmarker positions (randomized)
  const hitmarkerPositions = useMemo(() => {
    const positions: { x: number; y: number; rot: number; scale: number }[] = [];
    for (let i = 0; i < 3; i++) {
      positions.push({
        x: 45 + Math.random() * 10,
        y: 40 + Math.random() * 20,
        rot: Math.random() * 45 - 22.5,
        scale: 0.8 + Math.random() * 0.6,
      });
    }
    return positions;
  }, []);

  // Sound effect triggers
  const soundPhaseRef = useRef({ dramatic: false, blaster: false, impact: false, victim: false, hype: false });
  useEffect(() => {
    memeAudio.preload();
  }, []);

  useEffect(() => {
    const sp = soundPhaseRef.current;
    // Dramatic stinger at showdown
    if (phase >= 0.03 && !sp.dramatic) {
      sp.dramatic = true;
      memeAudio.playDramatic();
    }
    // Blaster fire for ranged
    if (isRanged && phase >= 0.30 && !sp.blaster) {
      sp.blaster = true;
      memeAudio.playBlasterFire();
    }
    // Impact sound at hit
    if (phase >= 0.43 && !sp.impact) {
      sp.impact = true;
      memeAudio.playImpact(isRanged);
    }
    // Victim reaction after impact
    if (phase >= 0.50 && !sp.victim) {
      sp.victim = true;
      memeAudio.playVictimReaction();
    }
    // Hype sound on kill confirmation
    if (phase >= 0.56 && !sp.hype) {
      sp.hype = true;
      memeAudio.playHype();
    }
  }, [phase, isRanged]);

  const speedLines = useMemo(() => generateSpeedLines(24), []);

  const attackerName = `${attackerColor === 'white' ? 'Blue' : 'Orange'} ${capitalize(attackerType)}`;
  const victimName = `${victimColor === 'white' ? 'Blue' : 'Orange'} ${capitalize(victimType)}`;
  const attackerCol = attackerColor === 'white' ? '#6AD7E5' : '#CE6527';
  const victimCol = victimColor === 'white' ? '#6AD7E5' : '#CE6527';

  // ---- Phase-based opacity/transform calculations ----

  // Letterbox + vignette
  const letterboxH = smoothstep(0, 0.05, phase) * (1 - smoothstep(0.92, 1, phase));
  const vignetteOp = smoothstep(0, 0.06, phase) * 0.85 * (1 - smoothstep(0.90, 1, phase));

  // === COWBOY SHOWDOWN FACE-OFF (0.02-0.18) ===
  // Both pieces face each other with a diagonal slash between them
  const showdownOp = smoothstep(0.02, 0.06, phase) * (1 - smoothstep(0.16, 0.22, phase));
  const showdownSlashGrow = smoothstep(0.03, 0.08, phase);

  // Phase 1: Victim scared line (0.08-0.20) — right side
  const victimScaredOp = smoothstep(0.08, 0.13, phase) * (1 - smoothstep(0.18, 0.24, phase));
  const victimScaredSlide = (1 - Math.min(smoothstep(0.08, 0.14, phase) * 2, 1)) * 60;

  // Phase 2: Attacker taunt (0.22-0.35) — left side
  const attackerTauntOp = smoothstep(0.22, 0.27, phase) * (1 - smoothstep(0.33, 0.40, phase));
  const attackerTauntSlide = -(1 - Math.min(smoothstep(0.22, 0.28, phase) * 2, 1)) * 60;

  // Weapon title + emoji (0.32-0.42)
  const weaponOp = smoothstep(0.32, 0.37, phase) * (1 - smoothstep(0.70, 0.82, phase));

  // === IMPACT FRAME (0.42-0.44) — brief white freeze ===
  const impactFrameT = phase > 0.42 && phase < 0.445 ? (phase - 0.42) / 0.025 : -1;
  const impactFrameOp = impactFrameT >= 0 ? (impactFrameT < 0.3 ? 1 : 1 - (impactFrameT - 0.3) / 0.7) : 0;

  // Impact moment (0.43-0.54)
  const impactT = phase > 0.43 && phase < 0.56 ? (phase - 0.43) / 0.13 : -1;
  const impactOp = impactT >= 0 ? Math.sin(impactT * Math.PI) : 0;

  // === ANIME SPEED LINES (radial, 0.43-0.52) ===
  const speedLineOp = smoothstep(0.43, 0.45, phase) * (1 - smoothstep(0.50, 0.55, phase));

  // Phase 3: Kill verb text (0.44-0.68)
  const killOp = smoothstep(0.44, 0.50, phase) * (1 - smoothstep(0.62, 0.72, phase));
  const killScale = 0.15 + smoothstep(0.44, 0.50, phase) * 0.85;

  // === ANIME SLASH (multiple slashes at impact) ===
  const slashCount = 3;

  // Phase 4: Attacker victory quip (0.52-0.75)
  const victoryOp = smoothstep(0.52, 0.57, phase) * (1 - smoothstep(0.72, 0.80, phase));
  const victorySlide = -(1 - Math.min(smoothstep(0.52, 0.59, phase) * 2, 1)) * 50;

  // Kill feed (0.55-0.82)
  const killFeedOp = smoothstep(0.55, 0.60, phase) * (1 - smoothstep(0.78, 0.86, phase));

  // Screen shake
  const shakeAmt = impactT >= 0 ? Math.max(0, 1 - impactT) * 14 : 0;
  const shakeX = shakeAmt > 0 ? Math.sin(phase * 283) * shakeAmt : 0;
  const shakeY = shakeAmt > 0 ? Math.cos(phase * 197) * shakeAmt : 0;

  // Master fade
  const masterFade = 1 - smoothstep(0.93, 1, phase);

  // Weapon emoji bounce
  const weaponBounce = impactT >= 0 && impactT < 0.5
    ? Math.sin(impactT * Math.PI * 4) * 20 * (1 - impactT * 2)
    : 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        pointerEvents: 'auto', cursor: 'pointer',
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
      onClick={onSkip}
    >
      {/* Letterbox bars */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: `${letterboxH * 13}%`, background: 'black',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${letterboxH * 13}%`, background: 'black',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.85) 100%)',
        opacity: vignetteOp,
      }} />

      {/* === COWBOY SHOWDOWN FACE-OFF === */}
      {showdownOp > 0.01 && (
        <>
          {/* Left side: Attacker face */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: showdownOp * masterFade,
            transform: `translateX(${-(1 - showdownOp) * 80}px)`,
          }}>
            <div style={{
              fontSize: '80px',
              filter: `drop-shadow(0 0 20px ${attackerCol})`,
              transform: `scaleX(-1)`, // face right
            }}>
              {PIECE_EMOJI[attackerType]}
            </div>
            <div style={{
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              fontSize: '14px', fontWeight: 700, color: attackerCol,
              letterSpacing: '3px', textTransform: 'uppercase',
              marginTop: '8px',
              textShadow: `0 0 15px ${attackerCol}88`,
            }}>
              {attackerName}
            </div>
          </div>

          {/* Right side: Victim face */}
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: showdownOp * masterFade,
            transform: `translateX(${(1 - showdownOp) * 80}px)`,
          }}>
            <div style={{
              fontSize: '80px',
              filter: `drop-shadow(0 0 20px ${victimCol})`,
            }}>
              {PIECE_EMOJI[victimType]}
            </div>
            <div style={{
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              fontSize: '14px', fontWeight: 700, color: victimCol,
              letterSpacing: '3px', textTransform: 'uppercase',
              marginTop: '8px',
              textShadow: `0 0 15px ${victimCol}88`,
            }}>
              {victimName}
            </div>
          </div>

          {/* Center diagonal slash line */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '4px',
            height: `${showdownSlashGrow * 140}%`,
            background: `linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.9) 30%, #fff 50%, rgba(255,255,255,0.9) 70%, transparent 100%)`,
            transform: `translate(-50%, -50%) rotate(15deg)`,
            boxShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.2)',
          }} />

          {/* VS text */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            fontSize: '24px', fontWeight: 900, color: '#fff',
            letterSpacing: '6px',
            textShadow: '0 0 20px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.8)',
            opacity: showdownOp,
          }}>
            VS
          </div>
        </>
      )}

      {/* Phase 1: Victim scared line (right side) */}
      <DialogCard
        name={victimName}
        emoji={PIECE_EMOJI[victimType]}
        line={victimScared}
        color={victimCol}
        opacity={victimScaredOp * masterFade}
        slideX={victimScaredSlide}
        side="right"
        style="scared"
      />

      {/* Phase 2: Attacker taunt (left side) */}
      <DialogCard
        name={attackerName}
        emoji={PIECE_EMOJI[attackerType]}
        line={attackerTaunt}
        color={attackerCol}
        opacity={attackerTauntOp * masterFade}
        slideX={attackerTauntSlide}
        side="left"
        style="taunt"
      />

      {/* Weapon title + emoji */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%',
        transform: `translateX(-50%) translateY(${weaponBounce}px)`,
        textAlign: 'center',
        opacity: weaponOp * masterFade,
      }}>
        <div style={{ fontSize: '52px', marginBottom: '4px' }}>
          {weaponEmoji}
        </div>
        <div style={{
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: '11px', fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '6px',
          textTransform: 'uppercase',
        }}>
          {weaponName}
        </div>
      </div>

      {/* === IMPACT FRAME (white freeze) === */}
      {impactFrameOp > 0.01 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#fff',
          opacity: impactFrameOp * 0.85,
        }} />
      )}

      {/* Impact colored flash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${attackerCol}aa 0%, ${attackerCol}33 30%, transparent 60%)`,
        opacity: impactOp,
        mixBlendMode: 'screen',
      }} />

      {/* === ANIME SPEED LINES (radial from center) === */}
      {speedLineOp > 0.01 && (
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          opacity: speedLineOp * masterFade,
        }}>
          {speedLines.map((line, i) => {
            const rad = (line.angle * Math.PI) / 180;
            const startX = 50 + Math.cos(rad) * line.offset;
            const startY = 50 + Math.sin(rad) * line.offset;
            const endX = 50 + Math.cos(rad) * (line.offset + line.length);
            const endY = 50 + Math.sin(rad) * (line.offset + line.length);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${startX}%`, top: `${startY}%`,
                  width: `${line.length}%`,
                  height: `${line.width}px`,
                  background: `linear-gradient(90deg, ${attackerCol} 0%, rgba(255,255,255,0.8) 40%, transparent 100%)`,
                  transform: `rotate(${line.angle}deg)`,
                  transformOrigin: '0% 50%',
                  opacity: 0.6,
                }}
              />
            );
          })}
        </div>
      )}

      {/* === ANIME SLASH MARKS (multiple diagonal slashes) === */}
      {impactOp > 0.03 && Array.from({ length: slashCount }).map((_, i) => {
        const angle = -25 + i * 25 + Math.sin(phase * 80 + i * 2) * 3;
        const delay = i * 0.02;
        const slashPhase = Math.max(0, Math.min(1, (impactOp - delay) / (1 - delay)));
        const width = slashPhase * 160;
        return (
          <div key={`slash-${i}`} style={{
            position: 'absolute', top: `${46 + (i - 1) * 5}%`, left: '50%',
            width: `${width}%`, height: `${3 - i * 0.5}px`,
            background: `linear-gradient(90deg, transparent 0%, ${attackerCol}cc 15%, #fff 50%, ${attackerCol}cc 85%, transparent 100%)`,
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            opacity: impactOp * 0.8,
            boxShadow: `0 0 15px ${attackerCol}, 0 0 30px ${attackerCol}44`,
          }} />
        );
      })}

      {/* Phase 3: Kill verb */}
      {killOp > 0.01 && (
        <div style={{
          position: 'absolute', top: '46%', left: '50%',
          transform: `translate(-50%, -50%) scale(${killScale})`,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: '42px', fontWeight: 900,
          color: `rgba(255,255,255,${killOp * masterFade})`,
          letterSpacing: '5px',
          textTransform: 'uppercase',
          textShadow: `0 0 40px ${attackerCol}, 0 0 80px ${attackerCol}66, 0 2px 8px rgba(0,0,0,0.9)`,
          whiteSpace: 'nowrap',
          WebkitTextStroke: `1px ${attackerCol}44`,
        }}>
          {killVerb}
        </div>
      )}

      {/* Phase 4: Attacker victory quip */}
      <DialogCard
        name={attackerName}
        emoji={PIECE_EMOJI[attackerType]}
        line={attackerVictory}
        color={attackerCol}
        opacity={victoryOp * masterFade}
        slideX={victorySlide}
        side="left"
        style="victory"
      />

      {/* Kill feed */}
      {killFeedOp > 0.05 && (
        <div style={{
          position: 'absolute', bottom: '15%', right: '6%',
          opacity: killFeedOp * masterFade * 0.8,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: '13px', color: 'rgba(255,255,255,0.7)',
          background: 'rgba(0,0,0,0.6)',
          padding: '6px 14px', borderRadius: '6px',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ color: attackerCol, fontWeight: 700 }}>{attackerName}</span>
          {' '}{weaponEmoji}{' '}
          <span style={{ color: victimCol, fontWeight: 700 }}>{victimName}</span>
        </div>
      )}

      {/* === MEME OVERLAYS === */}

      {/* BIG HITMARKER CROSSHAIR at center on impact */}
      {impactOp > 0.03 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) scale(${1.5 + impactOp * 1.5})`,
          opacity: impactOp * masterFade,
          pointerEvents: 'none',
        }}>
          <div style={{ width: '60px', height: '60px', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '40px', height: '5px', background: '#fff',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              boxShadow: '0 0 15px #ff0000, 0 0 30px #ff000066',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '40px', height: '5px', background: '#fff',
              transform: 'translate(-50%, -50%) rotate(-45deg)',
              boxShadow: '0 0 15px #ff0000, 0 0 30px #ff000066',
            }} />
          </div>
        </div>
      )}

      {/* Extra hitmarkers scattered */}
      {impactOp > 0.03 && hitmarkerPositions.map((pos, i) => (
        <div key={`hitmarker-${i}`} style={{
          position: 'absolute',
          left: `${pos.x}%`, top: `${pos.y}%`,
          transform: `translate(-50%, -50%) rotate(${pos.rot}deg) scale(${pos.scale * (1 + impactOp)})`,
          opacity: impactOp * 0.8 * masterFade,
          pointerEvents: 'none',
        }}>
          <div style={{ width: '40px', height: '40px', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '28px', height: '4px', background: '#fff',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              boxShadow: '0 0 10px #ff0000',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '28px', height: '4px', background: '#fff',
              transform: 'translate(-50%, -50%) rotate(-45deg)',
              boxShadow: '0 0 10px #ff0000',
            }} />
          </div>
        </div>
      ))}

      {/* IMPACT MEME TEXT — always shown, big and bold */}
      {impactOp > 0.01 && (
        <div style={{
          position: 'absolute',
          top: impactMeme === 'WASTED' ? '35%' : '56%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${0.3 + impactOp * 1.2})`,
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          fontSize: impactMeme === 'WASTED' ? '80px' : '48px',
          fontWeight: 900,
          color: impactMeme === 'WASTED' ? '#ff0000' : '#ffee00',
          letterSpacing: impactMeme === 'WASTED' ? '14px' : '6px',
          textShadow: impactMeme === 'WASTED'
            ? '0 0 40px #ff0000, 0 0 80px #ff000088, 0 4px 12px rgba(0,0,0,1), 0 0 120px #ff000044'
            : '0 0 30px #ff6600, 0 0 60px #ff660088, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 4px 12px rgba(0,0,0,1)',
          opacity: impactOp * masterFade,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          zIndex: 10,
        }}>
          {impactMeme}
        </div>
      )}

      {/* MLG spinning text at impact — always shown */}
      {impactOp > 0.02 && (
        <div style={{
          position: 'absolute', top: '22%', right: '6%',
          opacity: impactOp * masterFade * 0.9,
          transform: `rotate(${impactOp * 720}deg) scale(${0.2 + impactOp * 1.2})`,
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          fontSize: '28px', fontWeight: 900,
          color: '#00ff00',
          textShadow: '0 0 20px #00ff00, 0 0 40px #00ff0088, 3px 3px 0 #000',
          letterSpacing: '3px',
          whiteSpace: 'nowrap',
        }}>
          {mlgText}
        </div>
      )}

      {/* DEAL WITH IT SUNGLASSES sliding down on victory */}
      {victoryOp > 0.01 && (
        <div style={{
          position: 'absolute',
          top: `${14 + smoothstep(0.52, 0.62, phase) * 10}%`,
          left: '12%',
          opacity: victoryOp * masterFade,
          transform: `translateY(${(1 - smoothstep(0.52, 0.58, phase)) * -60}px) scale(1.4)`,
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          <div style={{
            fontFamily: "'Courier New', monospace",
            fontSize: '18px',
            color: '#000',
            background: 'linear-gradient(180deg, #111 60%, #333 100%)',
            padding: '6px 20px',
            borderRadius: '2px',
            border: '3px solid #000',
            letterSpacing: '-1px',
            lineHeight: 1,
            whiteSpace: 'pre',
            boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
          }}>
            {'  \u2588\u2588  \u2588\u2588  '}
            {'\n'}
            {'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588'}
          </div>
        </div>
      )}

      {/* "Press F to pay respects" — post kill, always shown */}
      {killFeedOp > 0.05 && (
        <div style={{
          position: 'absolute', bottom: '22%', left: '50%',
          transform: 'translateX(-50%)',
          opacity: killFeedOp * masterFade * 0.85,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: '16px', color: 'rgba(255,255,255,0.8)',
          background: 'rgba(0,0,0,0.7)',
          padding: '10px 24px', borderRadius: '6px',
          backdropFilter: 'blur(8px)',
          letterSpacing: '1px',
          border: '1px solid rgba(255,255,255,0.15)',
          zIndex: 10,
        }}>
          <span style={{
            color: '#fff', fontSize: '14px',
            border: '2px solid #888', padding: '3px 10px',
            borderRadius: '4px', marginRight: '10px',
            background: 'rgba(255,255,255,0.1)',
            fontWeight: 700,
          }}>F</span>
          {postKillMeme}
        </div>
      )}

      {/* LENS FLARES at impact — big and bright */}
      {impactOp > 0.03 && (
        <>
          <div style={{
            position: 'absolute', top: '45%', left: '50%',
            width: `${impactOp * 400}px`, height: `${impactOp * 400}px`,
            background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,200,50,0.3) 25%, transparent 65%)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: impactOp * 0.7 * masterFade,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '35%', left: '55%',
            width: `${impactOp * 150}px`, height: `${impactOp * 150}px`,
            background: 'radial-gradient(circle, rgba(100,200,255,0.6) 0%, transparent 65%)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: impactOp * 0.5 * masterFade,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }} />
          {/* Horizontal lens flare streak */}
          <div style={{
            position: 'absolute', top: '48%', left: '0',
            width: '100%', height: `${impactOp * 8}px`,
            background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.3) 60%, transparent 90%)',
            opacity: impactOp * 0.5 * masterFade,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* COMBO COUNTER — big and prominent */}
      {killOp > 0.01 && (
        <div style={{
          position: 'absolute', top: '6%', right: '4%',
          opacity: killOp * masterFade,
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          textAlign: 'right',
        }}>
          <div style={{
            fontSize: '52px', fontWeight: 900,
            color: '#ff4444',
            textShadow: '0 0 20px #ff0000, 0 0 40px #ff000066, 3px 3px 0 #000',
            letterSpacing: '2px',
          }}>
            +100
          </div>
          <div style={{
            fontSize: '14px', color: '#ffaa00',
            letterSpacing: '6px', marginTop: '-6px',
            textShadow: '2px 2px 0 #000',
            fontWeight: 900,
          }}>
            POINTS
          </div>
        </div>
      )}

      {/* RED SCREEN TINT on impact (GTA wasted style) */}
      {impactMeme === 'WASTED' && impactOp > 0.01 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(80, 0, 0, 0.4)',
          opacity: impactOp * masterFade,
          pointerEvents: 'none',
        }} />
      )}

      {/* Skip hint */}
      <div style={{
        position: 'absolute', bottom: '3%', left: '50%',
        transform: 'translateX(-50%)',
        color: `rgba(255,255,255,${0.2 * masterFade})`, fontSize: '10px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        letterSpacing: '3px', textTransform: 'uppercase',
      }}>
        click to skip
      </div>
    </div>
  );
}

// ---- Reusable dialog card component ----

function DialogCard({ name, emoji, line, color, opacity, slideX, side, style: cardStyle }: {
  name: string;
  emoji: string;
  line: string;
  color: string;
  opacity: number;
  slideX: number;
  side: 'left' | 'right';
  style: 'scared' | 'taunt' | 'victory';
}) {
  if (opacity <= 0.01) return null;

  const isLeft = side === 'left';
  const isScared = cardStyle === 'scared';
  const isVictory = cardStyle === 'victory';

  const posStyle: React.CSSProperties = isLeft
    ? { bottom: isVictory ? '22%' : '24%', left: '6%' }
    : { top: '22%', right: '6%' };

  const borderRadius = isLeft ? '16px 16px 16px 4px' : '16px 16px 4px 16px';

  return (
    <div style={{
      position: 'absolute',
      ...posStyle,
      maxWidth: '340px',
      opacity,
      transform: `translateX(${slideX}px)`,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.85)',
        border: `2px solid ${color}`,
        borderRadius,
        padding: '16px 20px',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 30px ${color}33, inset 0 0 20px ${color}11`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '8px',
        }}>
          <span style={{
            fontSize: '22px',
            filter: `drop-shadow(0 0 6px ${color})`,
            ...(isScared ? { transform: 'scale(1.1)' } : {}),
          }}>
            {emoji}
          </span>
          <span style={{
            fontSize: '11px', color,
            fontWeight: 700, letterSpacing: '2px',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            textTransform: 'uppercase',
          }}>
            {name}
          </span>
        </div>
        <div style={{
          fontSize: isScared ? '16px' : '18px',
          color: '#fff',
          fontWeight: isScared ? 400 : 700,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontStyle: isScared ? 'italic' : 'normal',
          lineHeight: 1.4,
        }}>
          &ldquo;{line}&rdquo;
        </div>
      </div>
    </div>
  );
}
