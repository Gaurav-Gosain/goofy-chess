import type { JSX } from 'react';
import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import type { Pos } from './engine';

interface SquareProps {
  row: number;
  col: number;
  isLight: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  isLastMove: boolean;
  onClick: () => void;
}

function Square({ row, col, isLight, isHighlighted, isSelected, isLastMove, onClick }: SquareProps) {
  let color: [number, number, number];

  if (isSelected) {
    color = [0.3, 0.8, 0.4];
  } else if (isHighlighted) {
    color = [0.4, 0.9, 0.5];
  } else if (isLastMove) {
    color = isLight ? [0.85, 0.85, 0.5] : [0.7, 0.7, 0.3];
  } else {
    color = isLight ? [0.93, 0.89, 0.82] : [0.28, 0.52, 0.52];
  }

  const material = useMaterial({ diffuse: color, specular: [0.1, 0.1, 0.1] });

  // Board centered at origin, each square = 1 unit
  const x = col - 3.5;
  const z = row - 3.5;

  return (
    <Entity
      position={[x, 0, z]}
      onClick={onClick}
    >
      <Render type="box" material={material} />
    </Entity>
  );
}

interface BoardProps {
  selectedSquare: Pos | null;
  validMoves: Pos[];
  lastMove: { from: Pos; to: Pos } | null;
  onSquareClick: (pos: Pos) => void;
}

export function ChessBoard({ selectedSquare, validMoves, lastMove, onSquareClick }: BoardProps) {
  const borderMaterial = useMaterial({ diffuse: [0.15, 0.1, 0.05], specular: [0.05, 0.05, 0.05] });

  const squares: JSX.Element[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isLight = (row + col) % 2 === 0;
      const isSelected = selectedSquare !== null && selectedSquare[0] === row && selectedSquare[1] === col;
      const isHighlighted = validMoves.some(([r, c]) => r === row && c === col);
      const isLastMove = lastMove !== null && (
        (lastMove.from[0] === row && lastMove.from[1] === col) ||
        (lastMove.to[0] === row && lastMove.to[1] === col)
      );

      squares.push(
        <Square
          key={`${row}-${col}`}
          row={row}
          col={col}
          isLight={isLight}
          isHighlighted={isHighlighted}
          isSelected={isSelected}
          isLastMove={isLastMove}
          onClick={() => onSquareClick([row, col])}
        />
      );
    }
  }

  return (
    <Entity name="board" position={[0, -0.5, 0]} scale={[1, 0.1, 1]}>
      {squares}
      {/* Border frame */}
      <Entity position={[0, 0, -4.5]} scale={[10, 1, 1]}>
        <Render type="box" material={borderMaterial} />
      </Entity>
      <Entity position={[0, 0, 4.5]} scale={[10, 1, 1]}>
        <Render type="box" material={borderMaterial} />
      </Entity>
      <Entity position={[-4.5, 0, 0]} scale={[1, 1, 10]}>
        <Render type="box" material={borderMaterial} />
      </Entity>
      <Entity position={[4.5, 0, 0]} scale={[1, 1, 10]}>
        <Render type="box" material={borderMaterial} />
      </Entity>
    </Entity>
  );
}
