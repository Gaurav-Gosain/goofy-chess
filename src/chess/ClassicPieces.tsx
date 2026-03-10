import { useEffect, useRef } from 'react';
import { Entity, Gltf } from '@playcanvas/react';
import { useModel, useMaterial } from '@playcanvas/react/hooks';
import type { PieceColor, PieceType } from './engine';
import type { Entity as PcEntity, StandardMaterial } from 'playcanvas';

// GLB model URLs served from /assets/chess/
const MODEL_URLS: Record<PieceType, string> = {
  king: '/assets/chess/King.glb',
  queen: '/assets/chess/Queen.glb',
  bishop: '/assets/chess/Bishop.glb',
  knight: '/assets/chess/Knight.glb',
  rook: '/assets/chess/Rook.glb',
  pawn: '/assets/chess/Pawn.glb',
};

// Scale factors per piece type — models are very small, need large scale
const MODEL_SCALES: Record<PieceType, number> = {
  pawn: 14,
  rook: 14,
  knight: 14,
  bishop: 14,
  queen: 14,
  king: 14,
};

// Apply material to all render components in entity tree
function applyMaterialToTree(entity: PcEntity, material: StandardMaterial) {
  if (entity.render) {
    const meshInstances = entity.render.meshInstances;
    if (meshInstances) {
      for (const mi of meshInstances) {
        mi.material = material;
      }
    }
  }
  if (entity.children) {
    for (const child of entity.children) {
      applyMaterialToTree(child as PcEntity, material);
    }
  }
}

function ClassicPieceModel({ type, color }: { type: PieceType; color: PieceColor }) {
  const { asset } = useModel(MODEL_URLS[type]);
  const isWhite = color === 'white';
  const entityRef = useRef<any>(null);

  const material = useMaterial({
    diffuse: isWhite ? [0.97, 0.95, 0.90] : [0.08, 0.06, 0.05],
    specular: isWhite ? [0.6, 0.6, 0.55] : [0.15, 0.15, 0.15],
    gloss: isWhite ? 0.85 : 0.65,
  });

  // Apply material after Gltf instantiates — use interval to retry until children exist
  useEffect(() => {
    if (!entityRef.current || !material) return;
    const entity = entityRef.current as PcEntity;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (entity.children.length > 0 || attempts > 20) {
        applyMaterialToTree(entity, material);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [asset, material, color, type]);

  if (!asset) return null;

  const s = MODEL_SCALES[type];

  return (
    <Entity scale={[s, s, s]} ref={entityRef}>
      <Gltf asset={asset} key={`${asset.id}-${color}`} />
    </Entity>
  );
}

// Individual piece components that match the { color: PieceColor } interface
function ClassicPawn({ color }: { color: PieceColor }) {
  return <ClassicPieceModel type="pawn" color={color} />;
}
function ClassicRook({ color }: { color: PieceColor }) {
  return <ClassicPieceModel type="rook" color={color} />;
}
function ClassicKnight({ color }: { color: PieceColor }) {
  return <ClassicPieceModel type="knight" color={color} />;
}
function ClassicBishop({ color }: { color: PieceColor }) {
  return <ClassicPieceModel type="bishop" color={color} />;
}
function ClassicQueen({ color }: { color: PieceColor }) {
  return <ClassicPieceModel type="queen" color={color} />;
}
function ClassicKing({ color }: { color: PieceColor }) {
  return <ClassicPieceModel type="king" color={color} />;
}

export const CLASSIC_PIECE_COMPONENTS: Record<PieceType, React.FC<{ color: PieceColor }>> = {
  pawn: ClassicPawn,
  rook: ClassicRook,
  knight: ClassicKnight,
  bishop: ClassicBishop,
  queen: ClassicQueen,
  king: ClassicKing,
};

// Export for FallenKing classic variant
export { ClassicKing };
