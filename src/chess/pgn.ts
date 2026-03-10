import {
  type GameState, type Pos, type PieceType, type PieceColor,
  createInitialState, getValidMoves, makeMove,
} from './engine';

export interface ParsedMove {
  from: Pos;
  to: Pos;
}

// Parse PGN text into a list of {from, to} moves
export function parsePgn(pgn: string): ParsedMove[] {
  // Strip headers (lines starting with [)
  const lines = pgn.split('\n').filter(l => !l.trim().startsWith('['));
  const moveText = lines.join(' ');

  // Remove comments {…}, variations (…), NAGs ($N), result
  const cleaned = moveText
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\$\d+/g, '')
    .replace(/\d+\.(\.\.)?/g, '') // move numbers
    .replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/g, '')
    .trim();

  // Split into individual SAN tokens
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0 && t !== '...');

  const moves: ParsedMove[] = [];
  let state = createInitialState();

  for (const san of tokens) {
    const parsed = resolveMove(state, san);
    if (!parsed) {
      console.warn(`PGN: could not resolve move "${san}"`);
      break;
    }
    moves.push(parsed);
    state = makeMove(state, parsed.from, parsed.to);
  }

  return moves;
}

// Resolve a SAN move (e.g. "e4", "Nf3", "Bxe5+", "O-O", "O-O-O", "Qd1#", "exd5", "e8=Q")
// against the current game state → {from, to}
function resolveMove(state: GameState, san: string): ParsedMove | null {
  const { board, turn } = state;

  // Castling
  if (san === 'O-O' || san === '0-0') {
    const row = turn === 'white' ? 7 : 0;
    return { from: [row, 4], to: [row, 6] };
  }
  if (san === 'O-O-O' || san === '0-0-0') {
    const row = turn === 'white' ? 7 : 0;
    return { from: [row, 4], to: [row, 2] };
  }

  // Strip check/mate indicators and decorations
  let s = san.replace(/[+#!?]+$/g, '');

  // Promotion: e8=Q → just need the destination, engine handles promotion
  s = s.replace(/=[QRBN]$/i, '');

  // Parse the SAN
  let pieceType: PieceType = 'pawn';
  let isCapture = false;
  let disambigFile: number | null = null; // 0-7
  let disambigRank: number | null = null; // 0-7
  let destFile: number;
  let destRow: number;

  // Check if piece letter
  const pieceLetters: Record<string, PieceType> = {
    K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight',
  };

  let idx = 0;
  if (s[0] && pieceLetters[s[0]]) {
    pieceType = pieceLetters[s[0]];
    idx = 1;
  }

  // Remaining string could be: [file][rank][x]file rank
  // We need to find the destination square (last 2 chars that form a valid square)
  const remaining = s.slice(idx);

  // Find destination: the last 2-char substring that is a valid square
  const destMatch = remaining.match(/([a-h])([1-8])$/);
  if (!destMatch) return null;

  destFile = destMatch[1].charCodeAt(0) - 'a'.charCodeAt(0);
  destRow = 8 - parseInt(destMatch[2]); // rank 1 = row 7, rank 8 = row 0

  // Everything before destination is disambiguation + capture
  const beforeDest = remaining.slice(0, remaining.length - 2);

  for (const ch of beforeDest) {
    if (ch === 'x') {
      isCapture = true;
    } else if (ch >= 'a' && ch <= 'h') {
      disambigFile = ch.charCodeAt(0) - 'a'.charCodeAt(0);
    } else if (ch >= '1' && ch <= '8') {
      disambigRank = 8 - parseInt(ch);
    }
  }

  const to: Pos = [destRow, destFile];

  // Find which piece of that type can move to the destination
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== turn || piece.type !== pieceType) continue;

      // Apply disambiguation
      if (disambigFile !== null && c !== disambigFile) continue;
      if (disambigRank !== null && r !== disambigRank) continue;

      // Check if this piece can legally move to the destination
      const validMoves = getValidMoves(state, [r, c]);
      const canMove = validMoves.some(([mr, mc]) => mr === to[0] && mc === to[1]);
      if (canMove) {
        return { from: [r, c], to };
      }
    }
  }

  return null;
}

// Replay state: holds the parsed moves and current position
export interface ReplayState {
  moves: ParsedMove[];
  currentIndex: number; // -1 = start, 0 = after first move, etc.
  isPlaying: boolean;
}

export function createReplayState(pgn: string): ReplayState | null {
  const moves = parsePgn(pgn);
  if (moves.length === 0) return null;
  return { moves, currentIndex: -1, isPlaying: false };
}
