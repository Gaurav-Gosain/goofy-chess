import type { GameState, PieceType } from './engine';
import type { PieceStyle } from './pieces';
import { memeAudio, type MemeMode } from './sounds';
import { ReplayPanel } from './ReplayPanel';
import { useState } from 'react';

const PIECE_SYMBOLS: Record<PieceType, string> = {
  king: '\u265A', queen: '\u265B', rook: '\u265C', bishop: '\u265D', knight: '\u265E', pawn: '\u265F',
};

type GameMode = 'pvp' | 'pvai' | 'aivai';

interface GameUIProps {
  state: GameState;
  gameMode: GameMode;
  aiThinking: boolean;
  onNewGame: () => void;
  onModeChange: (mode: GameMode) => void;
  aiSpeed: number;
  onAiSpeedChange: (speed: number) => void;
  skillLevel: number;
  onSkillLevelChange: (level: number) => void;
  searchDepth: number;
  onSearchDepthChange: (depth: number) => void;
  cinematicCaptures: boolean;
  onCinematicCapturesChange: (enabled: boolean) => void;
  pieceStyle: PieceStyle;
  onPieceStyleChange: (style: PieceStyle) => void;
  memeMode: MemeMode;
  onMemeModeChange: (mode: MemeMode) => void;
  // Replay
  onLoadPgn: (pgn: string) => void;
  onStopReplay: () => void;
  isReplaying: boolean;
  replayIndex: number;
  replayTotal: number;
  isReplayPlaying: boolean;
  onToggleReplayPlay: () => void;
  onReplayStep: () => void;
  onReplayStepBack: () => void;
  replaySpeed: number;
  onReplaySpeedChange: (speed: number) => void;
}

const pill: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(8px)',
  borderRadius: '6px',
  padding: '5px 12px',
  fontSize: '12px',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'left' as const,
};

const pillActive: React.CSSProperties = {
  ...pill,
  background: 'rgba(255,255,255,0.2)',
  border: '1px solid rgba(255,255,255,0.3)',
};

const sliderBlock: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  borderRadius: '6px',
  padding: '5px 12px',
  backdropFilter: 'blur(8px)',
};

const sliderLabel: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: '11px',
  display: 'block',
  marginBottom: '2px',
};

export function GameUI({
  state, gameMode, aiThinking, onNewGame, onModeChange,
  aiSpeed, onAiSpeedChange, skillLevel, onSkillLevelChange,
  searchDepth, onSearchDepthChange,
  cinematicCaptures, onCinematicCapturesChange,
  pieceStyle, onPieceStyleChange,
  memeMode, onMemeModeChange,
  onLoadPgn, onStopReplay, isReplaying, replayIndex, replayTotal,
  isReplayPlaying, onToggleReplayPlay, onReplayStep, onReplayStepBack,
  replaySpeed, onReplaySpeedChange,
}: GameUIProps) {
  const { turn, status, captured } = state;

  const whiteCaptured = captured.filter(p => p.color === 'white');
  const blackCaptured = captured.filter(p => p.color === 'black');

  const statusText = () => {
    if (aiThinking) return `${turn === 'white' ? 'Blue' : 'Orange'} gopher is thinking...`;
    switch (status) {
      case 'checkmate': return `Checkmate! ${turn === 'white' ? 'Orange' : 'Blue'} gophers win!`;
      case 'stalemate': return 'Stalemate! Draw!';
      case 'check': return `${turn === 'white' ? 'Blue' : 'Orange'} gophers are in check!`;
      default: return `${turn === 'white' ? 'Blue' : 'Orange'} gophers' turn`;
    }
  };

  const turnColor = turn === 'white' ? '#6AD7E5' : '#CE6527';
  const showAiControls = gameMode !== 'pvp';

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      pointerEvents: 'none',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      zIndex: 10,
    }}>
      {/* Top status bar */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '12px 20px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(0,0,0,0.5)', borderRadius: '12px',
          padding: '8px 20px', backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            width: '16px', height: '16px', borderRadius: '50%',
            backgroundColor: turnColor, boxShadow: `0 0 12px ${turnColor}`,
            animation: aiThinking ? 'pulse 1s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            color: '#fff', fontSize: '18px', fontWeight: 600,
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}>
            {statusText()}
          </span>
        </div>
      </div>

      {/* Left panel - mode & AI controls */}
      <div style={{
        position: 'absolute', top: '60px', left: '20px',
        pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '4px',
        maxWidth: '180px',
      }}>
        <h1 style={{
          color: '#fff', fontSize: '14px', fontWeight: 400,
          margin: '0 0 8px 0', opacity: 0.5,
        }}>
          Goofy Chess
        </h1>

        {/* Mode buttons */}
        {(['pvp', 'pvai', 'aivai'] as GameMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            style={gameMode === mode ? pillActive : pill}
          >
            {{ pvp: 'Player vs Player', pvai: 'Player vs Stockfish', aivai: 'Stockfish vs Stockfish' }[mode]}
          </button>
        ))}

        {/* AI controls */}
        <button
          onClick={() => onCinematicCapturesChange(!cinematicCaptures)}
          style={cinematicCaptures ? pillActive : pill}
        >
          {cinematicCaptures ? 'Cutscenes: ON' : 'Cutscenes: OFF'}
        </button>

        <button
          onClick={() => onPieceStyleChange(pieceStyle === 'gopher' ? 'classic' : 'gopher')}
          style={pill}
        >
          Pieces: {pieceStyle === 'gopher' ? 'Gopher' : 'Classic'}
        </button>

        <button
          onClick={() => onMemeModeChange(memeMode === 'normal' ? 'desi' : 'normal')}
          style={memeMode === 'desi' ? pillActive : pill}
        >
          {memeMode === 'desi' ? 'Desi Mode ON' : 'Desi Mode OFF'}
        </button>

        <VolumeControl />

        {showAiControls && (
          <>
            <div style={sliderBlock}>
              <label style={sliderLabel}>Skill Level: {skillLevel}/20</label>
              <input
                type="range" min={0} max={20} step={1}
                value={skillLevel}
                onChange={e => onSkillLevelChange(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
            <div style={sliderBlock}>
              <label style={sliderLabel}>
                {searchDepth > 0 ? `Search Depth: ${searchDepth}` : 'Search: by time'}
              </label>
              <input
                type="range" min={0} max={20} step={1}
                value={searchDepth}
                onChange={e => onSearchDepthChange(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <span style={{ ...sliderLabel, marginTop: '2px' }}>
                {searchDepth === 0 ? 'Uses time limit' : `Fixed ${searchDepth} ply`}
              </span>
            </div>
            {gameMode === 'aivai' && (
              <div style={sliderBlock}>
                <label style={sliderLabel}>Think time: {aiSpeed}ms</label>
                <input
                  type="range" min={100} max={3000} step={100}
                  value={aiSpeed}
                  onChange={e => onAiSpeedChange(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            )}
          </>
        )}

        <ReplayPanel
          onLoadPgn={onLoadPgn}
          onStopReplay={onStopReplay}
          isReplaying={isReplaying}
          replayIndex={replayIndex}
          replayTotal={replayTotal}
          isPlaying={isReplayPlaying}
          onTogglePlay={onToggleReplayPlay}
          onStep={onReplayStep}
          onStepBack={onReplayStepBack}
          replaySpeed={replaySpeed}
          onSpeedChange={onReplaySpeedChange}
        />
      </div>

      {/* Right panel - captured pieces */}
      <div style={{
        position: 'absolute', top: '60px', right: '20px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {blackCaptured.length > 0 && (
          <CapturedRow pieces={blackCaptured} color="#CE6527" />
        )}
        {whiteCaptured.length > 0 && (
          <CapturedRow pieces={whiteCaptured} color="#6AD7E5" />
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'fixed', bottom: '20px', left: '50%',
        transform: 'translateX(-50%)', pointerEvents: 'auto',
      }}>
        <button
          onClick={onNewGame}
          style={pill}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.4)'; }}
        >
          New Game
        </button>
      </div>

      {/* Game over modal */}
      {(status === 'checkmate' || status === 'stalemate') && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)',
          borderRadius: '16px', padding: '32px 48px', textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>
            {status === 'checkmate' ? '\uD83C\uDFC6' : '\uD83E\uDD1D'}
          </div>
          <h2 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '24px' }}>
            {status === 'checkmate' ? 'Checkmate!' : 'Stalemate!'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 20px 0' }}>
            {status === 'checkmate'
              ? `${turn === 'white' ? 'Orange' : 'Blue'} gophers win!`
              : "It's a draw!"}
          </p>
          <button
            onClick={onNewGame}
            style={{
              background: turnColor, color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 32px', fontSize: '16px',
              cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            Play Again
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

function VolumeControl() {
  const [vol, setVol] = useState(memeAudio.volume);
  const [muted, setMuted] = useState(memeAudio.muted);

  const handleVolChange = (v: number) => {
    setVol(v);
    memeAudio.volume = v;
    if (v > 0 && muted) { setMuted(false); memeAudio.muted = false; }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    memeAudio.muted = next;
    if (next) memeAudio.stopAll();
  };

  return (
    <div style={{ ...sliderBlock, display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={toggleMute}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '16px', lineHeight: 1 }}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '\uD83D\uDD07' : vol < 0.3 ? '\uD83D\uDD08' : vol < 0.6 ? '\uD83D\uDD09' : '\uD83D\uDD0A'}
      </button>
      <input
        type="range" min={0} max={1} step={0.05}
        value={muted ? 0 : vol}
        onChange={e => handleVolChange(Number(e.target.value))}
        style={{ width: '100%', cursor: 'pointer' }}
      />
    </div>
  );
}

function CapturedRow({ pieces, color }: { pieces: { type: PieceType }[]; color: string }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
      padding: '6px 10px', backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: '16px', letterSpacing: '2px' }}>
        {pieces.map((p, i) => (
          <span key={i} style={{ color, textShadow: `0 0 4px ${color}` }}>
            {PIECE_SYMBOLS[p.type]}
          </span>
        ))}
      </div>
    </div>
  );
}
