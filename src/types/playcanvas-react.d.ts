// Type augmentation for @playcanvas/react
// The library's Serializable type maps Color → string, but at runtime
// it accepts number arrays [r, g, b] and [r, g, b, a] as well.
// These augmentations widen the types to match actual runtime behavior.

import 'react';

type ColorArray = [number, number, number] | [number, number, number, number] | number[];

declare module '@playcanvas/react/hooks' {
  export function useMaterial(
    props: Record<string, unknown>
  ): import('playcanvas').StandardMaterial;
}

declare module '@playcanvas/react/components' {
  import type { FC } from 'react';

  interface CameraColorOverride {
    clearColor?: string | ColorArray;
  }

  interface LightColorOverride {
    color?: string | ColorArray;
  }

  export const Camera: FC<Record<string, unknown> & CameraColorOverride>;
  export const Light: FC<Record<string, unknown> & LightColorOverride & { type: 'directional' | 'omni' | 'spot' }>;
}
