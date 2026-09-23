export const LANES = [-2.1, 0, 2.1] as const

export const INITIAL_SPEED = 15
export const MAX_SPEED = 46
export const SPEED_ACCEL = 0.7 // per second

export const GRAVITY = -60
export const JUMP_VELOCITY = 19
export const ROLL_DURATION = 0.55

export const LANE_LERP = 13
export const PLAYER_Z = 0
export const DESPAWN_Z = 12
export const SPAWN_Z = -85

export const OBSTACLE_POOL = 30
export const COIN_POOL = 90
export const SCENERY_POOL = 22

export type ObstacleType = "train" | "low" | "overhead"

// visual dimensions per obstacle type (unit box scaled)
export const OBSTACLE_SHAPE: Record<
  ObstacleType,
  { size: [number, number, number]; y: number; color: string }
> = {
  train: { size: [1.7, 2.6, 5.5], y: 1.3, color: "#e23b4d" },
  low: { size: [1.7, 0.9, 0.7], y: 0.45, color: "#f5a524" },
  overhead: { size: [1.9, 0.8, 0.7], y: 2.0, color: "#7c5cff" },
}
