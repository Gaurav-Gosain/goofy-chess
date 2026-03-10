import { useState, useMemo } from 'react';
import type { PieceColor } from './engine';

const VICTORY_QUOTES: string[] = [
  "All according to plan!",
  "That's what happens when you mess with the best!",
  "GG EZ. No cap.",
  "Another day, another checkmate!",
  "I'd like to thank my pawns... they were delicious sacrifices.",
  "Calculated. Every. Single. Move.",
  "Your king is in a PERMANENT timeout!",
  "Skill diff was astronomical!",
  "Tell 'em I said GG!",
  "Checkmate speedrun, any% glitchless!",
  "I'm not trapped in here with you. You're trapped in here with ME!",
  "RIP bozo!",
  "Outplayed, outsmarted, outgophered!",
  "Built different. Wired different. CHECKMATE!",
  "That wasn't even my final form!",
  "*mic drop*",
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface CheckmateOverlayProps {
  winner: PieceColor;
  phase: number;
  onSkip: () => void;
}

// Generate confetti pieces deterministically
function generateConfetti(count: number) {
  const pieces: { x: number; delay: number; duration: number; color: string; size: number; rotation: number }[] = [];
  const colors = ['#FFD700', '#FF6B6B', '#6AD7E5', '#CE6527', '#FF69B4', '#7CFC00', '#FF4500', '#BA55D3'];
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
    });
  }
  return pieces;
}

export function CheckmateOverlay({ winner, phase, onSkip }: CheckmateOverlayProps) {
  const [victoryQuote] = useState(() =>
    VICTORY_QUOTES[Math.floor(Math.random() * VICTORY_QUOTES.length)]
  );

  const confetti = useMemo(() => generateConfetti(30), []);

  const winnerTeam = winner === 'white' ? 'Blue' : 'Orange';
  const winnerCol = winner === 'white' ? '#6AD7E5' : '#CE6527';
  const winnerGlow = winner === 'white' ? 'rgba(106, 215, 229, 0.3)' : 'rgba(206, 101, 39, 0.3)';

  // Phase 0.0-0.15: Screen darkens
  const darkenOp = smoothstep(0, 0.15, phase) * 0.75;

  // Phase 0.15-0.35: "CHECKMATE" text slams in (scale 3→1)
  const checkmateOp = smoothstep(0.15, 0.22, phase) * (1 - smoothstep(0.88, 0.96, phase));
  const checkmateScale = 3 - smoothstep(0.15, 0.28, phase) * 2;
  // Bounce: overshoot then settle
  const checkmateBounce = phase > 0.28 && phase < 0.35
    ? Math.sin((phase - 0.28) / 0.07 * Math.PI) * 0.08
    : 0;

  // Phase 0.35-0.6: Winner announcement
  const winnerOp = smoothstep(0.35, 0.42, phase) * (1 - smoothstep(0.85, 0.93, phase));

  // Phase 0.6-0.8: Victory quote
  const quoteOp = smoothstep(0.5, 0.58, phase) * (1 - smoothstep(0.82, 0.90, phase));

  // Confetti: starts at 0.2, ongoing
  const confettiOp = smoothstep(0.2, 0.3, phase) * (1 - smoothstep(0.85, 0.95, phase));

  // Phase 0.8-1.0: Fade to black
  const fadeToBlack = smoothstep(0.88, 1.0, phase);

  // Screen shake on CHECKMATE slam
  const slamT = phase > 0.22 && phase < 0.32 ? (phase - 0.22) / 0.10 : -1;
  const shakeAmt = slamT >= 0 ? Math.max(0, 1 - slamT) * 8 : 0;
  const shakeX = shakeAmt > 0 ? Math.sin(phase * 200) * shakeAmt : 0;
  const shakeY = shakeAmt > 0 ? Math.cos(phase * 150) * shakeAmt : 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        pointerEvents: 'auto', cursor: 'pointer',
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
      onClick={onSkip}
    >
      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'black',
        opacity: darkenOp,
      }} />

      {/* Radial glow in winner color */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${winnerGlow} 0%, transparent 60%)`,
        opacity: smoothstep(0.15, 0.3, phase) * 0.7 * (1 - smoothstep(0.85, 0.95, phase)),
      }} />

      {/* CHECKMATE text */}
      {checkmateOp > 0.01 && (
        <div style={{
          position: 'absolute', top: '32%', left: '50%',
          transform: `translate(-50%, -50%) scale(${checkmateScale + checkmateBounce})`,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: '72px', fontWeight: 900,
          color: `rgba(255, 255, 255, ${checkmateOp})`,
          letterSpacing: '8px',
          textTransform: 'uppercase',
          textShadow: `0 0 60px ${winnerCol}, 0 0 120px ${winnerCol}66, 0 4px 12px rgba(0,0,0,0.9)`,
          whiteSpace: 'nowrap',
          WebkitTextStroke: `2px ${winnerCol}`,
        }}>
          CHECKMATE
        </div>
      )}

      {/* Winner announcement */}
      {winnerOp > 0.01 && (
        <div style={{
          position: 'absolute', top: '48%', left: '50%',
          transform: `translate(-50%, -50%)`,
          textAlign: 'center',
          opacity: winnerOp,
        }}>
          <div style={{
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            fontSize: '28px', fontWeight: 700,
            color: winnerCol,
            letterSpacing: '4px',
            textTransform: 'uppercase',
            textShadow: `0 0 30px ${winnerCol}88`,
          }}>
            {winnerTeam} Gophers Win!
          </div>
        </div>
      )}

      {/* Victory quote */}
      {quoteOp > 0.01 && (
        <div style={{
          position: 'absolute', top: '60%', left: '50%',
          transform: `translate(-50%, -50%)`,
          maxWidth: '500px',
          textAlign: 'center',
          opacity: quoteOp,
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            border: `1px solid ${winnerCol}44`,
            borderRadius: '12px',
            padding: '16px 28px',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              fontSize: '18px', color: '#fff',
              fontStyle: 'italic', lineHeight: 1.5,
            }}>
              &ldquo;{victoryQuote}&rdquo;
            </div>
          </div>
        </div>
      )}

      {/* CSS Confetti */}
      {confettiOp > 0.01 && confetti.map((c, i) => {
        const elapsed = Math.max(0, phase - 0.2 - c.delay);
        const fallProgress = Math.min(elapsed / (c.duration * 0.15), 1);
        const y = -10 + fallProgress * 120; // fall from top to past bottom
        const wobbleX = Math.sin(elapsed * 8 + i) * 15;
        const spin = c.rotation + elapsed * 200;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${c.x + wobbleX * 0.1}%`,
              top: `${y}%`,
              width: `${c.size}px`,
              height: `${c.size * 0.7}px`,
              background: c.color,
              opacity: confettiOp * (y < 100 ? 1 : 0),
              transform: `rotate(${spin}deg)`,
              borderRadius: '1px',
            }}
          />
        );
      })}

      {/* Fade to black */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'black',
        opacity: fadeToBlack,
      }} />

      {/* Skip hint */}
      <div style={{
        position: 'absolute', bottom: '3%', left: '50%',
        transform: 'translateX(-50%)',
        color: `rgba(255,255,255,${0.25 * (1 - fadeToBlack)})`,
        fontSize: '10px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        letterSpacing: '3px', textTransform: 'uppercase',
      }}>
        click to skip
      </div>
    </div>
  );
}
