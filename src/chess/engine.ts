export type PieceColor = 'white' | 'black';
export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export type Board = (Piece | null)[][];
export type Pos = [number, number]; // [row, col]

export interface GameState {
  board: Board;
  turn: PieceColor;
  enPassantTarget: Pos | null;
  captured: Piece[];
  status: 'playing' | 'check' | 'checkmate' | 'stalemate';
  lastMove: { from: Pos; to: Pos } | null;
}

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

  const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRow[col], color: 'black' };
    board[1][col] = { type: 'pawn', color: 'black' };
    board[6][col] = { type: 'pawn', color: 'white' };
    board[7][col] = { type: backRow[col], color: 'white' };
  }

  return board;
}

export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    turn: 'white',
    enPassantTarget: null,
    captured: [],
    status: 'playing',
    lastMove: null,
  };
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(p => (p ? { ...p } : null)));
}

function findKing(board: Board, color: PieceColor): Pos {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.color === color) return [r, c];
    }
  }
  throw new Error(`No ${color} king found`);
}

function isSquareAttacked(board: Board, pos: Pos, byColor: PieceColor): boolean {
  const [tr, tc] = pos;

  // Knight attacks
  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightMoves) {
    const r = tr + dr, c = tc + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === 'knight') return true;
    }
  }

  // Pawn attacks
  const pawnDir = byColor === 'white' ? 1 : -1; // direction pawns attack FROM
  for (const dc of [-1, 1]) {
    const r = tr + pawnDir, c = tc + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === 'pawn') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = tr + dr, c = tc + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === 'king') return true;
      }
    }
  }

  // Sliding pieces (rook/queen along ranks/files, bishop/queen along diagonals)
  const straightDirs = [[0,1],[0,-1],[1,0],[-1,0]];
  const diagDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];

  for (const [dr, dc] of straightDirs) {
    let r = tr + dr, c = tc + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === 'rook' || p.type === 'queen')) return true;
        break;
      }
      r += dr; c += dc;
    }
  }

  for (const [dr, dc] of diagDirs) {
    let r = tr + dr, c = tc + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === 'bishop' || p.type === 'queen')) return true;
        break;
      }
      r += dr; c += dc;
    }
  }

  return false;
}

export function isInCheck(board: Board, color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  const enemy = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(board, kingPos, enemy);
}

// Get raw moves without checking if they leave king in check
function getRawMoves(board: Board, from: Pos, enPassantTarget: Pos | null): Pos[] {
  const [r, c] = from;
  const piece = board[r][c];
  if (!piece) return [];

  const moves: Pos[] = [];
  const color = piece.color;
  const enemy = color === 'white' ? 'black' : 'white';

  const addIfValid = (nr: number, nc: number) => {
    if (!inBounds(nr, nc)) return;
    const target = board[nr][nc];
    if (!target || target.color === enemy) moves.push([nr, nc]);
  };

  switch (piece.type) {
    case 'pawn': {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;

      // Forward
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        // Double forward
        if (r === startRow && !board[r + 2 * dir][c]) {
          moves.push([r + 2 * dir, c]);
        }
      }

      // Captures
      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (target && target.color === enemy) moves.push([nr, nc]);
        // En passant
        if (enPassantTarget && enPassantTarget[0] === nr && enPassantTarget[1] === nc) {
          moves.push([nr, nc]);
        }
      }
      break;
    }
    case 'knight': {
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of offsets) addIfValid(r + dr, c + dc);
      break;
    }
    case 'king': {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          addIfValid(r + dr, c + dc);
        }
      }
      // Castling
      if (!piece.hasMoved && !isSquareAttacked(board, [r, c], enemy)) {
        // Kingside
        const kRook = board[r][7];
        if (kRook && kRook.type === 'rook' && !kRook.hasMoved &&
            !board[r][5] && !board[r][6] &&
            !isSquareAttacked(board, [r, 5], enemy) &&
            !isSquareAttacked(board, [r, 6], enemy)) {
          moves.push([r, 6]);
        }
        // Queenside
        const qRook = board[r][0];
        if (qRook && qRook.type === 'rook' && !qRook.hasMoved &&
            !board[r][1] && !board[r][2] && !board[r][3] &&
            !isSquareAttacked(board, [r, 2], enemy) &&
            !isSquareAttacked(board, [r, 3], enemy)) {
          moves.push([r, 2]);
        }
      }
      break;
    }
    case 'rook': {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target) { moves.push([nr, nc]); }
          else {
            if (target.color === enemy) moves.push([nr, nc]);
            break;
          }
          nr += dr; nc += dc;
        }
      }
      break;
    }
    case 'bishop': {
      for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target) { moves.push([nr, nc]); }
          else {
            if (target.color === enemy) moves.push([nr, nc]);
            break;
          }
          nr += dr; nc += dc;
        }
      }
      break;
    }
    case 'queen': {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target) { moves.push([nr, nc]); }
          else {
            if (target.color === enemy) moves.push([nr, nc]);
            break;
          }
          nr += dr; nc += dc;
        }
      }
      break;
    }
  }

  return moves;
}

// Filter moves that would leave own king in check
export function getValidMoves(state: GameState, from: Pos): Pos[] {
  const { board, enPassantTarget } = state;
  const [r, c] = from;
  const piece = board[r][c];
  if (!piece) return [];

  const raw = getRawMoves(board, from, enPassantTarget);
  return raw.filter(([tr, tc]) => {
    const newBoard = cloneBoard(board);
    // Execute move on clone
    newBoard[tr][tc] = newBoard[r][c];
    newBoard[r][c] = null;
    // En passant capture
    if (piece.type === 'pawn' && enPassantTarget &&
        tr === enPassantTarget[0] && tc === enPassantTarget[1]) {
      const capturedRow = piece.color === 'white' ? tr + 1 : tr - 1;
      newBoard[capturedRow][tc] = null;
    }
    return !isInCheck(newBoard, piece.color);
  });
}

export function makeMove(state: GameState, from: Pos, to: Pos): GameState {
  const [fr, fc] = from;
  const [tr, tc] = to;
  const board = cloneBoard(state.board);
  const piece = board[fr][fc]!;
  const captured = [...state.captured];
  let enPassantTarget: Pos | null = null;

  // Capture
  const targetPiece = board[tr][tc];
  if (targetPiece) captured.push(targetPiece);

  // En passant capture
  if (piece.type === 'pawn' && state.enPassantTarget &&
      tr === state.enPassantTarget[0] && tc === state.enPassantTarget[1]) {
    const capturedRow = piece.color === 'white' ? tr + 1 : tr - 1;
    const epPiece = board[capturedRow][tc];
    if (epPiece) captured.push(epPiece);
    board[capturedRow][tc] = null;
  }

  // Move piece
  board[tr][tc] = { ...piece, hasMoved: true };
  board[fr][fc] = null;

  // Double pawn push - set en passant target
  if (piece.type === 'pawn' && Math.abs(tr - fr) === 2) {
    enPassantTarget = [(fr + tr) / 2, fc];
  }

  // Castling - move rook
  if (piece.type === 'king' && Math.abs(tc - fc) === 2) {
    if (tc === 6) { // Kingside
      board[fr][5] = { ...board[fr][7]!, hasMoved: true };
      board[fr][7] = null;
    } else if (tc === 2) { // Queenside
      board[fr][3] = { ...board[fr][0]!, hasMoved: true };
      board[fr][0] = null;
    }
  }

  // Pawn promotion (auto-queen)
  const promoRow = piece.color === 'white' ? 0 : 7;
  if (piece.type === 'pawn' && tr === promoRow) {
    board[tr][tc] = { type: 'queen', color: piece.color, hasMoved: true };
  }

  const nextTurn = state.turn === 'white' ? 'black' : 'white';

  // Determine game status
  let status: GameState['status'] = 'playing';
  const inCheck = isInCheck(board, nextTurn);
  const hasLegalMoves = hasAnyLegalMoves({ ...state, board, turn: nextTurn, enPassantTarget }, nextTurn);

  if (inCheck && !hasLegalMoves) {
    status = 'checkmate';
  } else if (!inCheck && !hasLegalMoves) {
    status = 'stalemate';
  } else if (inCheck) {
    status = 'check';
  }

  return {
    board,
    turn: nextTurn,
    enPassantTarget,
    captured,
    status,
    lastMove: { from, to },
  };
}

function hasAnyLegalMoves(state: GameState, color: PieceColor): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color) {
        const moves = getValidMoves(state, [r, c]);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

export function posToAlgebraic(pos: Pos): string {
  return String.fromCharCode(97 + pos[1]) + (8 - pos[0]);
}

// Convert board state to FEN string for Stockfish
const PIECE_TO_FEN: Record<string, string> = {
  'white-king': 'K', 'white-queen': 'Q', 'white-rook': 'R',
  'white-bishop': 'B', 'white-knight': 'N', 'white-pawn': 'P',
  'black-king': 'k', 'black-queen': 'q', 'black-rook': 'r',
  'black-bishop': 'b', 'black-knight': 'n', 'black-pawn': 'p',
};

export function stateToFen(state: GameState): string {
  const { board, turn, enPassantTarget } = state;

  // Board
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let row = '';
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) {
        empty++;
      } else {
        if (empty > 0) { row += empty; empty = 0; }
        row += PIECE_TO_FEN[`${p.color}-${p.type}`];
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }

  // Castling rights
  let castling = '';
  const wk = board[7][4]; // white king
  const bk = board[0][4]; // black king
  if (wk?.type === 'king' && !wk.hasMoved) {
    const wr7 = board[7][7];
    if (wr7?.type === 'rook' && !wr7.hasMoved) castling += 'K';
    const wr0 = board[7][0];
    if (wr0?.type === 'rook' && !wr0.hasMoved) castling += 'Q';
  }
  if (bk?.type === 'king' && !bk.hasMoved) {
    const br7 = board[0][7];
    if (br7?.type === 'rook' && !br7.hasMoved) castling += 'k';
    const br0 = board[0][0];
    if (br0?.type === 'rook' && !br0.hasMoved) castling += 'q';
  }
  if (!castling) castling = '-';

  // En passant
  const ep = enPassantTarget ? posToAlgebraic(enPassantTarget) : '-';

  return `${rows.join('/')} ${turn === 'white' ? 'w' : 'b'} ${castling} ${ep} 0 1`;
}

// Parse UCI move (e.g. "e2e4") to [from, to]
export function parseUciMove(uci: string): { from: Pos; to: Pos } | null {
  if (uci.length < 4) return null;
  const fc = uci.charCodeAt(0) - 97;
  const fr = 8 - parseInt(uci[1]);
  const tc = uci.charCodeAt(2) - 97;
  const tr = 8 - parseInt(uci[3]);
  if ([fr, fc, tr, tc].some(v => v < 0 || v > 7)) return null;
  return { from: [fr, fc], to: [tr, tc] };
}
