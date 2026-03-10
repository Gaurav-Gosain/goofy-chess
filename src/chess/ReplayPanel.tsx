import { useState, useRef } from 'react';

interface ReplayPanelProps {
  onLoadPgn: (pgn: string) => void;
  onStopReplay: () => void;
  isReplaying: boolean;
  replayIndex: number;
  replayTotal: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onStepBack: () => void;
  replaySpeed: number;
  onSpeedChange: (speed: number) => void;
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

export function ReplayPanel({
  onLoadPgn, onStopReplay, isReplaying,
  replayIndex, replayTotal, isPlaying, onTogglePlay,
  onStep, onStepBack, replaySpeed, onSpeedChange,
}: ReplayPanelProps) {
  const [showInput, setShowInput] = useState(false);
  const [pgnText, setPgnText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLoad = () => {
    if (pgnText.trim()) {
      onLoadPgn(pgnText.trim());
      setShowInput(false);
      setPgnText('');
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      onLoadPgn(text.trim());
      setShowInput(false);
      setPgnText('');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (isReplaying) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '4px',
        marginTop: '8px',
      }}>
        <div style={{
          ...pill, display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
        }}>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>
            Move {replayIndex + 1}/{replayTotal}
          </span>
          <div style={{
            flex: 1, height: '3px', background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: '#6AD7E5',
              width: `${((replayIndex + 1) / replayTotal) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={onStepBack} style={{ ...pill, flex: 1, textAlign: 'center' }}>
            &#9664;&#9664;
          </button>
          <button onClick={onTogglePlay} style={{ ...(isPlaying ? pillActive : pill), flex: 1, textAlign: 'center' }}>
            {isPlaying ? '\u23F8' : '\u25B6'}
          </button>
          <button onClick={onStep} style={{ ...pill, flex: 1, textAlign: 'center' }}>
            &#9654;&#9654;
          </button>
        </div>
        <div style={pill}>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>
            Speed: {replaySpeed < 1000 ? `${replaySpeed}ms` : `${(replaySpeed / 1000).toFixed(1)}s`}
          </label>
          <input
            type="range" min={200} max={5000} step={200}
            value={replaySpeed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
        <button onClick={onStopReplay} style={pill}>
          Stop Replay
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {!showInput ? (
        <button onClick={() => setShowInput(true)} style={pill}>
          Replay PGN
        </button>
      ) : (
        <>
          <textarea
            value={pgnText}
            onChange={e => setPgnText(e.target.value)}
            placeholder="Paste PGN notation here..."
            style={{
              ...pill,
              height: '100px',
              resize: 'vertical',
              outline: 'none',
              fontSize: '11px',
              lineHeight: '1.4',
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleLoad} style={{ ...pillActive, flex: 1, textAlign: 'center' }}>
              Load
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ ...pill, flex: 1, textAlign: 'center' }}
            >
              Upload
            </button>
            <button onClick={() => { setShowInput(false); setPgnText(''); }} style={{ ...pill, textAlign: 'center' }}>
              X
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pgn,.txt"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </>
      )}
    </div>
  );
}
