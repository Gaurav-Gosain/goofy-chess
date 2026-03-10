import { useState, useMemo, useEffect, useRef } from 'react';
import type { PieceType, PieceColor } from './engine';
import { memeAudio, type MemeMode } from './sounds';

// ---- Dialogue arrays ----

const VICTIM_SCARED: string[] = [
  "Wait, what?!", "Oh no no no no...", "Please, I have a family!",
  "Can we talk about this?!", "I don't like where this is going...",
  "Is it too late to resign?", "*nervous sweating*", "Mom? MOM?!",
  "This isn't what I signed up for!", "I thought we were friends!",
  "Oh... oh no.", "My therapist warned me about this...",
  "NOT THE FACE!", "I just got here!", "*gulp*",
  "Is that a weapon? WHY IS THAT A WEAPON?!",
  "Tell my pawns I love them", "I'm too young to be captured!",
  "Can I phone a friend?", "This was NOT in the job description",
];

const ATTACKER_TAUNTS: Record<PieceType, string[]> = {
  pawn: [
    "Any last words?", "I may be small, but I'm DANGEROUS!",
    "Underestimate me one more time!", "First blood goes to ME!",
    "This pawn promotes to PAIN!", "Step aside or get stepped ON!",
    "Small but mighty!", "I'm not just a pawn in your game... wait",
  ],
  knight: [
    "Didn't see me coming, did ya?", "L-shaped JUSTICE!",
    "SURPRISE! It's me!", "Hop, skip, and... you're DONE!",
    "Parkour into your DEMISE!", "Nobody expects the horse!",
    "I jump, therefore I am", "The L stands for LETHAL",
  ],
  bishop: [
    "The angles were never in your favor.", "Diagonally DELETE'd!",
    "Math class pays off!", "I snipe from the diagonal!",
    "Geometry is my weapon of choice!", "You never saw me coming... diagonally.",
    "Death at 45 degrees", "Calculated to the last angle",
  ],
  rook: [
    "Straight. Through. You.", "The tower has spoken!",
    "No wall can save you now!", "I am the wall. And I'm COMING!",
    "Steamroller coming through!", "Castle THIS!",
    "Nothing personal, I just go straight", "Tower of POWER",
  ],
  queen: [
    "Bow before my power!", "I go wherever I PLEASE!",
    "Your reign ends HERE!", "Did somebody call for DESTRUCTION?",
    "ALL HAIL THE QUEEN!", "I'm built different!",
    "I didn't come to play. I came to SLAY.", "Crown = earned",
  ],
  king: [
    "A king handles business PERSONALLY!", "Even kings must fight!",
    "Royal execution incoming!", "Off with your head!",
    "The king has entered the chat!", "Rare king moment!",
    "You made me get up from my throne for THIS?", "King activity",
  ],
};

const ATTACKER_VICTORY: string[] = [
  "GG no re.", "Too easy.", "And STAY down!", "Next!",
  "That's what I thought.", "Another one bites the dust!",
  "Send the next one!", "I do this for a living.",
  "Was that supposed to be hard?", "Skill issue, honestly.",
  "EZ clap.", "Get rekt!", "I didn't even break a sweat.",
  "*blows on weapon*", "You were saying?",
  "That's going on my highlight reel!", "I'd say sorry but... nah.",
  "Your sacrifice is noted. Moving on!",
  "Ratio + L + didn't ask", "Rest in pieces", "GG go next",
  "That was personal and I'm not sorry", "Built different fr",
  "Should have stayed home", "Another one for the montage",
];

const KILL_VERBS = [
  'ELIMINATED', 'DESTROYED', 'OBLITERATED', "YEET'D",
  'ANNIHILATED', 'BONKED', 'DELETED', 'REKT',
  'EVAPORATED', 'FLATTENED', 'LAUNCHED', 'DEMOLISHED',
  'SENT TO THE SHADOW REALM', 'UNINSTALLED',
  'CTRL+ALT+DELETED', "GAME OVER'D",
  'YEETED INTO ORBIT', 'REDUCED TO ATOMS',
  'RATIO\'D', 'CANCELLED', 'FOLDED', 'PACKED UP',
];

// === MEME OVERLAYS ===

const IMPACT_MEMES = [
  'EMOTIONAL DAMAGE', 'WASTED', 'FATALITY', 'BOOM HEADSHOT',
  'CRITICAL HIT', 'K.O.', 'OVERKILL', 'ULTRA KILL',
  'SKILL ISSUE', 'NO SCOPE', 'RATIO + L', 'SKILL DIFF',
  'NOT EVEN CLOSE', 'VIOLATED', 'DOWN BAD', 'CAUGHT IN 4K',
];

const POST_KILL_MEMES = [
  'Press F to pay respects', 'gg ez no re', 'Skill issue tbh',
  'Sent to the backrooms', 'Bro got folded', 'That was personal',
  'Violated the Geneva Convention', 'Certified hood classic',
  'Absolutely maidenless behavior', 'Bro got isekai\'d',
  'RIP bozo', 'Returned to sender', 'Bro got Thanos snapped',
  'Tell Cersei it was me', 'Gone but not forgotten... jk already forgot',
  'Omae wa mou shindeiru', 'Peace was never an option',
  'Call an ambulance... but not for me',
];

const MLG_TEXTS = [
  '360 NO SCOPE', 'MLG PRO', 'WOMBO COMBO',
  'MOM GET THE CAMERA', 'OH BABY A TRIPLE',
  'AIRHORN.EXE', 'xXx_PR0_xXx', 'GET DUNKED ON',
  'TRIPLE KILL', 'HEADSHOT', 'NOSCOPE420',
];

// === DESI MEME OVERLAYS ===

const DESI_VICTIM_SCARED: string[] = [
  "Arey baap re!", "Mummy bachao!", "Yeh kya ho raha hai!",
  "Bhai bhai bhai!", "Nahi nahi nahi!", "Meri toh lag gayi!",
  "Koi bachao mujhe!", "Main toh gaya!", "Yeh dhokha hai!",
  "Sharma ji ka beta hota toh bach jaata", "Arey yaar nahi!",
  "Mujhe ghar jaana hai!", "Papa ko mat batana!",
];

const DESI_TAUNTS: Record<PieceType, string[]> = {
  pawn: [
    "Chota packet bada dhamaka!", "Apna time aa gaya!",
    "Aukaat mein reh!", "Pyaade se darr!",
  ],
  knight: [
    "Ghoda palti maarta hai!", "Kya jump tha!",
    "L shape mein aaya, life khatam!", "Ulti seedhi chal!",
  ],
  bishop: [
    "Tirchhi nazar se dekha!", "Angle se maara!",
    "Diagonal wala aatank!", "Geometry ka gyaan!",
  ],
  rook: [
    "Tanker aa gaya!", "Seedha nipta diya!",
    "Hathi ki chaal!", "Tower of destruction!",
  ],
  queen: [
    "Rani ka aadesh hai!", "Sab pe bhari!",
    "Queen ne bola game over!", "Boss lady in action!",
  ],
  king: [
    "Raja ne khud kiya kaam!", "Royal treatment diya!",
    "King mode activated!", "Rajaji aaye the!",
  ],
};

const DESI_VICTORY: string[] = [
  "Khatam, tata, bye bye!", "Bahut hard!",
  "Jhakaas!", "Ek number!", "Mogambo khush hua!",
  "Thalaiva style!", "Picture abhi baaki hai!",
  "Pushpa naam sunke flower samjhe kya?",
  "Game set match!", "Zabardast!", "Paisa vasool!",
];

const DESI_KILL_VERBS = [
  'SUPARI COMPLETE', 'NIPTA DIYA', 'KHATAM',
  'GAME OVER', 'OUT HO GAYA', 'DHULAI HO GAYI',
  'SAFAYA', 'TATA BYE BYE', 'RETIRED',
  'PACK UP', 'FATEH', 'DEMOLISHED',
];

const DESI_IMPACT_MEMES = [
  'EMOTIONAL DAMAGE', 'WASTED', 'BAHUT HARD',
  'THALAIVA', 'FATALITY', 'ACHHE DIN GAYE',
  'MOGAMBO KHUSH HUA', 'K.O.', 'OUT!',
  'SIXER!', 'HOWZAT!', 'CLEAN BOLD',
];

const DESI_POST_KILL_MEMES = [
  'Isko koi ambulance bulao', 'Sharma ji ka beta rota hai',
  'Achhe din the yeh', 'Mann ki baat: game over',
  'Press F for izzat', 'IPL se reject, yahan bhi out',
  'Ghar ja ke so ja', 'Apna time aa gaya... next life mein',
  'Mogambo sad hua', 'Thoda drama aur karo',
  'Sasural genda phool', 'RIP bhai RIP',
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PIECE_EMOJI: Record<PieceType, string> = {
  pawn: '\u265F', knight: '\u265E', bishop: '\u265D',
  rook: '\u265C', queen: '\u265B', king: '\u265A',
};

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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
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
  memeMode: MemeMode;
}

export function CutsceneOverlay({
  attackerType, attackerColor, victimType, victimColor, phase, onSkip,
  weaponName, weaponEmoji, isRanged, memeMode,
}: CutsceneOverlayProps) {
  const isDesi = memeMode === 'desi';

  const [victimScared] = useState(() =>
    pickRandom(isDesi ? DESI_VICTIM_SCARED : VICTIM_SCARED)
  );
  const [attackerTaunt] = useState(() => {
    const pool = isDesi ? (DESI_TAUNTS[attackerType] ?? []) : ATTACKER_TAUNTS[attackerType];
    return pickRandom(pool);
  });
  const [attackerVictory] = useState(() =>
    pickRandom(isDesi ? DESI_VICTORY : ATTACKER_VICTORY)
  );
  const [killVerb] = useState(() =>
    pickRandom(isDesi ? DESI_KILL_VERBS : KILL_VERBS)
  );
  const [impactMeme] = useState(() =>
    pickRandom(isDesi ? DESI_IMPACT_MEMES : IMPACT_MEMES)
  );
  const [postKillMeme] = useState(() =>
    pickRandom(isDesi ? DESI_POST_KILL_MEMES : POST_KILL_MEMES)
  );
  const [mlgText] = useState(() => pickRandom(MLG_TEXTS));

  const speedLines = useMemo(() => generateSpeedLines(24), []);

  // Sound triggers — no repeats per cutscene
  const soundPhaseRef = useRef({ showdown: false, blaster: false, impact: false, victim: false, hype: false });
  useEffect(() => { memeAudio.preload(); }, []);
  useEffect(() => {
    const sp = soundPhaseRef.current;
    if (phase >= 0.03 && !sp.showdown) { sp.showdown = true; memeAudio.playShowdown(); }
    if (isRanged && phase >= 0.30 && !sp.blaster) { sp.blaster = true; memeAudio.playBlasterFire(); }
    if (phase >= 0.43 && !sp.impact) { sp.impact = true; memeAudio.playImpact(isRanged); }
    if (phase >= 0.50 && !sp.victim) { sp.victim = true; memeAudio.playVictimReaction(); }
    if (phase >= 0.56 && !sp.hype) { sp.hype = true; memeAudio.playHype(); }
  }, [phase, isRanged]);

  const attackerName = `${attackerColor === 'white' ? 'Blue' : 'Orange'} ${capitalize(attackerType)}`;
  const victimName = `${victimColor === 'white' ? 'Blue' : 'Orange'} ${capitalize(victimType)}`;
  const attackerCol = attackerColor === 'white' ? '#6AD7E5' : '#CE6527';
  const victimCol = victimColor === 'white' ? '#6AD7E5' : '#CE6527';

  // ---- Phase opacities ----
  const letterboxH = smoothstep(0, 0.05, phase) * (1 - smoothstep(0.92, 1, phase));
  const vignetteOp = smoothstep(0, 0.06, phase) * 0.85 * (1 - smoothstep(0.90, 1, phase));
  const showdownOp = smoothstep(0.02, 0.06, phase) * (1 - smoothstep(0.16, 0.22, phase));
  const showdownSlashGrow = smoothstep(0.03, 0.08, phase);
  const victimScaredOp = smoothstep(0.08, 0.13, phase) * (1 - smoothstep(0.18, 0.24, phase));
  const victimScaredSlide = (1 - Math.min(smoothstep(0.08, 0.14, phase) * 2, 1)) * 60;
  const attackerTauntOp = smoothstep(0.22, 0.27, phase) * (1 - smoothstep(0.33, 0.40, phase));
  const attackerTauntSlide = -(1 - Math.min(smoothstep(0.22, 0.28, phase) * 2, 1)) * 60;
  const weaponOp = smoothstep(0.32, 0.37, phase) * (1 - smoothstep(0.70, 0.82, phase));
  const impactFrameT = phase > 0.42 && phase < 0.445 ? (phase - 0.42) / 0.025 : -1;
  const impactFrameOp = impactFrameT >= 0 ? (impactFrameT < 0.3 ? 1 : 1 - (impactFrameT - 0.3) / 0.7) : 0;
  const impactT = phase > 0.43 && phase < 0.56 ? (phase - 0.43) / 0.13 : -1;
  const impactOp = impactT >= 0 ? Math.sin(impactT * Math.PI) : 0;
  const speedLineOp = smoothstep(0.43, 0.45, phase) * (1 - smoothstep(0.50, 0.55, phase));
  const killOp = smoothstep(0.44, 0.50, phase) * (1 - smoothstep(0.62, 0.72, phase));
  const killScale = 0.15 + smoothstep(0.44, 0.50, phase) * 0.85;
  const slashCount = 3;
  const victoryOp = smoothstep(0.52, 0.57, phase) * (1 - smoothstep(0.72, 0.80, phase));
  const victorySlide = -(1 - Math.min(smoothstep(0.52, 0.59, phase) * 2, 1)) * 50;
  const killFeedOp = smoothstep(0.55, 0.60, phase) * (1 - smoothstep(0.78, 0.86, phase));
  const shakeAmt = impactT >= 0 ? Math.max(0, 1 - impactT) * 14 : 0;
  const shakeX = shakeAmt > 0 ? Math.sin(phase * 283) * shakeAmt : 0;
  const shakeY = shakeAmt > 0 ? Math.cos(phase * 197) * shakeAmt : 0;
  const masterFade = 1 - smoothstep(0.93, 1, phase);
  const weaponBounce = impactT >= 0 && impactT < 0.5
    ? Math.sin(impactT * Math.PI * 4) * 20 * (1 - impactT * 2) : 0;

  // Meme overlay phase (visible longer, more prominent)
  const memeImpactOp = smoothstep(0.43, 0.46, phase) * (1 - smoothstep(0.58, 0.65, phase));
  const postKillOp = smoothstep(0.58, 0.63, phase) * (1 - smoothstep(0.80, 0.88, phase));

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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${letterboxH * 13}%`, background: 'black' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${letterboxH * 13}%`, background: 'black' }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.85) 100%)',
        opacity: vignetteOp,
      }} />

      {/* === COWBOY SHOWDOWN === */}
      {showdownOp > 0.01 && (
        <>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: showdownOp * masterFade,
            transform: `translateX(${-(1 - showdownOp) * 80}px)`,
          }}>
            <div style={{ fontSize: '80px', filter: `drop-shadow(0 0 20px ${attackerCol})`, transform: 'scaleX(-1)' }}>
              {PIECE_EMOJI[attackerType]}
            </div>
            <div style={{
              fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '14px', fontWeight: 700,
              color: attackerCol, letterSpacing: '3px', textTransform: 'uppercase', marginTop: '8px',
              textShadow: `0 0 15px ${attackerCol}88`,
            }}>{attackerName}</div>
          </div>
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: showdownOp * masterFade,
            transform: `translateX(${(1 - showdownOp) * 80}px)`,
          }}>
            <div style={{ fontSize: '80px', filter: `drop-shadow(0 0 20px ${victimCol})` }}>
              {PIECE_EMOJI[victimType]}
            </div>
            <div style={{
              fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '14px', fontWeight: 700,
              color: victimCol, letterSpacing: '3px', textTransform: 'uppercase', marginTop: '8px',
              textShadow: `0 0 15px ${victimCol}88`,
            }}>{victimName}</div>
          </div>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '4px', height: `${showdownSlashGrow * 140}%`,
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.9) 30%, #fff 50%, rgba(255,255,255,0.9) 70%, transparent 100%)',
            transform: 'translate(-50%, -50%) rotate(15deg)',
            boxShadow: '0 0 20px rgba(255,255,255,0.5)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '24px', fontWeight: 900,
            color: '#fff', letterSpacing: '6px',
            textShadow: '0 0 20px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.8)',
            opacity: showdownOp,
          }}>VS</div>
        </>
      )}

      {/* Victim scared dialog */}
      <DialogCard name={victimName} emoji={PIECE_EMOJI[victimType]} line={victimScared!}
        color={victimCol} opacity={victimScaredOp * masterFade} slideX={victimScaredSlide} side="right" style="scared" />

      {/* Attacker taunt */}
      <DialogCard name={attackerName} emoji={PIECE_EMOJI[attackerType]} line={attackerTaunt!}
        color={attackerCol} opacity={attackerTauntOp * masterFade} slideX={attackerTauntSlide} side="left" style="taunt" />

      {/* Weapon title */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%',
        transform: `translateX(-50%) translateY(${weaponBounce}px)`,
        textAlign: 'center', opacity: weaponOp * masterFade,
      }}>
        <div style={{ fontSize: '52px', marginBottom: '4px' }}>{weaponEmoji}</div>
        <div style={{
          fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '11px', fontWeight: 700,
          color: 'rgba(255,255,255,0.5)', letterSpacing: '6px', textTransform: 'uppercase',
        }}>{weaponName}</div>
      </div>

      {/* Impact white flash */}
      {impactFrameOp > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: impactFrameOp * 0.85 }} />
      )}

      {/* Impact colored flash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${attackerCol}aa 0%, ${attackerCol}33 30%, transparent 60%)`,
        opacity: impactOp, mixBlendMode: 'screen',
      }} />

      {/* WASTED red tint */}
      {impactMeme === 'WASTED' && impactOp > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(80,0,0,0.5)', opacity: impactOp * masterFade, pointerEvents: 'none' }} />
      )}

      {/* Speed lines */}
      {speedLineOp > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: speedLineOp * masterFade }}>
          {speedLines.map((line, i) => {
            const rad = (line.angle * Math.PI) / 180;
            const startX = 50 + Math.cos(rad) * line.offset;
            const startY = 50 + Math.sin(rad) * line.offset;
            return (
              <div key={i} style={{
                position: 'absolute', left: `${startX}%`, top: `${startY}%`,
                width: `${line.length}%`, height: `${line.width}px`,
                background: `linear-gradient(90deg, ${attackerCol} 0%, rgba(255,255,255,0.8) 40%, transparent 100%)`,
                transform: `rotate(${line.angle}deg)`, transformOrigin: '0% 50%', opacity: 0.6,
              }} />
            );
          })}
        </div>
      )}

      {/* Anime slash marks */}
      {impactOp > 0.03 && Array.from({ length: slashCount }).map((_, i) => {
        const angle = -25 + i * 25 + Math.sin(phase * 80 + i * 2) * 3;
        const delay = i * 0.02;
        const slashPhase = Math.max(0, Math.min(1, (impactOp - delay) / (1 - delay)));
        return (
          <div key={`slash-${i}`} style={{
            position: 'absolute', top: `${46 + (i - 1) * 5}%`, left: '50%',
            width: `${slashPhase * 160}%`, height: `${3 - i * 0.5}px`,
            background: `linear-gradient(90deg, transparent 0%, ${attackerCol}cc 15%, #fff 50%, ${attackerCol}cc 85%, transparent 100%)`,
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            opacity: impactOp * 0.8,
            boxShadow: `0 0 15px ${attackerCol}, 0 0 30px ${attackerCol}44`,
          }} />
        );
      })}

      {/* === HITMARKER CROSSHAIR at center === */}
      {impactOp > 0.03 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) scale(${1.2 + impactOp * 1.5})`,
          opacity: impactOp * masterFade, pointerEvents: 'none',
        }}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <line x1="10" y1="10" x2="25" y2="25" stroke="#fff" strokeWidth="4" />
            <line x1="50" y1="10" x2="35" y2="25" stroke="#fff" strokeWidth="4" />
            <line x1="10" y1="50" x2="25" y2="35" stroke="#fff" strokeWidth="4" />
            <line x1="50" y1="50" x2="35" y2="35" stroke="#fff" strokeWidth="4" />
          </svg>
        </div>
      )}

      {/* Kill verb */}
      {killOp > 0.01 && (
        <div style={{
          position: 'absolute', top: '46%', left: '50%',
          transform: `translate(-50%, -50%) scale(${killScale})`,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: '42px', fontWeight: 900,
          color: `rgba(255,255,255,${killOp * masterFade})`,
          letterSpacing: '5px', textTransform: 'uppercase', whiteSpace: 'nowrap',
          textShadow: `0 0 40px ${attackerCol}, 0 0 80px ${attackerCol}66, 0 2px 8px rgba(0,0,0,0.9)`,
          WebkitTextStroke: `1px ${attackerCol}44`,
        }}>{killVerb}</div>
      )}

      {/* === MEME IMPACT TEXT (EMOTIONAL DAMAGE / WASTED / etc) === */}
      {memeImpactOp > 0.01 && (
        <div style={{
          position: 'absolute',
          top: impactMeme === 'WASTED' ? '36%' : '58%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${0.3 + memeImpactOp * 1.0})`,
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          fontSize: impactMeme === 'WASTED' ? '72px' : '38px',
          fontWeight: 900,
          color: impactMeme === 'WASTED' ? '#ff0000' : '#ffee00',
          letterSpacing: impactMeme === 'WASTED' ? '12px' : '5px',
          textShadow: impactMeme === 'WASTED'
            ? '0 0 40px #ff0000, 0 0 80px #ff000088, 0 4px 12px rgba(0,0,0,1)'
            : '0 0 25px #ff6600, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000',
          opacity: memeImpactOp * masterFade,
          whiteSpace: 'nowrap', textTransform: 'uppercase', zIndex: 10,
        }}>{impactMeme}</div>
      )}

      {/* MLG spinning text */}
      {memeImpactOp > 0.02 && (
        <div style={{
          position: 'absolute', top: '22%', right: '6%',
          opacity: memeImpactOp * masterFade * 0.85,
          transform: `rotate(${memeImpactOp * 720}deg) scale(${0.2 + memeImpactOp * 1.0})`,
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          fontSize: '24px', fontWeight: 900, color: '#00ff00',
          textShadow: '0 0 15px #00ff00, 0 0 30px #00ff0066, 3px 3px 0 #000',
          letterSpacing: '3px', whiteSpace: 'nowrap',
        }}>{mlgText}</div>
      )}

      {/* +100 POINTS combo counter */}
      {killOp > 0.01 && (
        <div style={{
          position: 'absolute', top: '6%', right: '4%',
          opacity: killOp * masterFade,
          fontFamily: "'Impact', 'Arial Black', sans-serif", textAlign: 'right',
        }}>
          <div style={{
            fontSize: '48px', fontWeight: 900, color: '#ff4444',
            textShadow: '0 0 20px #ff0000, 3px 3px 0 #000',
          }}>+100</div>
          <div style={{
            fontSize: '13px', color: '#ffaa00', letterSpacing: '5px', marginTop: '-4px',
            textShadow: '2px 2px 0 #000', fontWeight: 900,
          }}>POINTS</div>
        </div>
      )}

      {/* Lens flare at impact */}
      {impactOp > 0.03 && (
        <>
          <div style={{
            position: 'absolute', top: '45%', left: '50%',
            width: `${impactOp * 350}px`, height: `${impactOp * 350}px`,
            background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,200,50,0.2) 30%, transparent 65%)',
            borderRadius: '50%', transform: 'translate(-50%, -50%)',
            opacity: impactOp * 0.6 * masterFade, mixBlendMode: 'screen', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '48%', left: 0, width: '100%', height: `${impactOp * 6}px`,
            background: 'linear-gradient(90deg, transparent 15%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 55%, transparent 85%)',
            opacity: impactOp * 0.5 * masterFade, mixBlendMode: 'screen', pointerEvents: 'none',
          }} />
        </>
      )}

      {/* Victory quip */}
      <DialogCard name={attackerName} emoji={PIECE_EMOJI[attackerType]} line={attackerVictory!}
        color={attackerCol} opacity={victoryOp * masterFade} slideX={victorySlide} side="left" style="victory" />

      {/* Kill feed */}
      {killFeedOp > 0.05 && (
        <div style={{
          position: 'absolute', bottom: '15%', right: '6%',
          opacity: killFeedOp * masterFade * 0.8,
          fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.7)',
          background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: '6px',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ color: attackerCol, fontWeight: 700 }}>{attackerName}</span>
          {' '}{weaponEmoji}{' '}
          <span style={{ color: victimCol, fontWeight: 700 }}>{victimName}</span>
        </div>
      )}

      {/* Post-kill meme text (Press F / gg ez / etc) */}
      {postKillOp > 0.05 && (
        <div style={{
          position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)',
          opacity: postKillOp * masterFade * 0.85,
          fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '15px', color: 'rgba(255,255,255,0.8)',
          background: 'rgba(0,0,0,0.7)', padding: '10px 24px', borderRadius: '8px',
          backdropFilter: 'blur(8px)', letterSpacing: '1px',
          border: '1px solid rgba(255,255,255,0.12)', zIndex: 10,
        }}>
          {postKillMeme!.startsWith('Press F') && (
            <span style={{
              color: '#fff', fontSize: '13px', border: '2px solid #666', padding: '2px 9px',
              borderRadius: '4px', marginRight: '10px', background: 'rgba(255,255,255,0.08)', fontWeight: 700,
            }}>F</span>
          )}
          {postKillMeme}
        </div>
      )}

      {/* Skip hint */}
      <div style={{
        position: 'absolute', bottom: '3%', left: '50%', transform: 'translateX(-50%)',
        color: `rgba(255,255,255,${0.2 * masterFade})`, fontSize: '10px',
        fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: '3px', textTransform: 'uppercase',
      }}>click to skip</div>
    </div>
  );
}

// ---- Reusable dialog card ----

function DialogCard({ name, emoji, line, color, opacity, slideX, side, style: cardStyle }: {
  name: string; emoji: string; line: string; color: string;
  opacity: number; slideX: number; side: 'left' | 'right';
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
    <div style={{ position: 'absolute', ...posStyle, maxWidth: '340px', opacity, transform: `translateX(${slideX}px)` }}>
      <div style={{
        background: 'rgba(0,0,0,0.85)', border: `2px solid ${color}`, borderRadius,
        padding: '16px 20px', backdropFilter: 'blur(12px)',
        boxShadow: `0 0 30px ${color}33, inset 0 0 20px ${color}11`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '22px', filter: `drop-shadow(0 0 6px ${color})`, ...(isScared ? { transform: 'scale(1.1)' } : {}) }}>
            {emoji}
          </span>
          <span style={{
            fontSize: '11px', color, fontWeight: 700, letterSpacing: '2px',
            fontFamily: "'Segoe UI', system-ui, sans-serif", textTransform: 'uppercase',
          }}>{name}</span>
        </div>
        <div style={{
          fontSize: isScared ? '16px' : '18px', color: '#fff',
          fontWeight: isScared ? 400 : 700,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontStyle: isScared ? 'italic' : 'normal', lineHeight: 1.4,
        }}>&ldquo;{line}&rdquo;</div>
      </div>
    </div>
  );
}
