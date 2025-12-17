export enum GestureType {
  FIST = 'FIST',
  OPEN = 'OPEN',
  NONE = 'NONE'
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX?: number;
  targetY?: number;
  color: string;
  size: number;
  baseX: number;
  baseY: number;
}