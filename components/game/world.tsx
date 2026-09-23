"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type { Group, Mesh, MeshStandardMaterial } from "three"
import { Color } from "three"
import { PlayerModel } from "./player-model"
import {
  COIN_POOL,
  DESPAWN_Z,
  GRAVITY,
  INITIAL_SPEED,
  JUMP_VELOCITY,
  LANE_LERP,
  LANES,
  MAX_SPEED,
  OBSTACLE_POOL,
  OBSTACLE_SHAPE,
  type ObstacleType,
  ROLL_DURATION,
  SCENERY_POOL,
  SPAWN_Z,
  SPEED_ACCEL,
} from "@/lib/game-constants"

export type GameData = {
  score: number
  coins: number
  speed: number
}

type Props = {
  status: "menu" | "playing" | "over"
  dataRef: React.MutableRefObject<GameData>
  inputRef: React.MutableRefObject<{ jump: boolean; roll: boolean; lane: -1 | 0 | 1 }>
  onCrash: () => void
}

type Obstacle = { active: boolean; z: number; lane: number; type: ObstacleType }
type Coin = { active: boolean; z: number; lane: number }
type Scenery = { z: number; side: number; h: number }

const OBSTACLE_TYPES: ObstacleType[] = ["train", "low", "overhead"]

export function World({ status, dataRef, inputRef, onCrash }: Props) {
  const { camera } = useThree()

  const playerRef = useRef<Group>(null)
  const obstacleRefs = useRef<(Group | null)[]>([])
  const obstacleMatRefs = useRef<(MeshStandardMaterial | null)[]>([])
  const coinRefs = useRef<(Mesh | null)[]>([])
  const sceneryRefs = useRef<(Group | null)[]>([])

  const obstacles = useMemo<Obstacle[]>(
    () => Array.from({ length: OBSTACLE_POOL }, () => ({ active: false, z: 0, lane: 1, type: "low" as ObstacleType })),
    [],
  )
  const coins = useMemo<Coin[]>(
    () => Array.from({ length: COIN_POOL }, () => ({ active: false, z: 0, lane: 1 })),
    [],
  )
  const scenery = useMemo<Scenery[]>(
    () =>
      Array.from({ length: SCENERY_POOL }, (_, i) => ({
        z: -i * 8 - 10,
        side: i % 2 === 0 ? -1 : 1,
        h: 4 + Math.random() * 10,
      })),
    [],
  )

  // mutable player + game runtime state (not React state to avoid re-renders)
  const rt = useRef({
    x: 0,
    targetLane: 1,
    y: 0,
    vy: 0,
    rolling: false,
    rollTimer: 0,
    speed: INITIAL_SPEED,
    distance: 0,
    spawnAcc: 0,
    grounded: true,
  })

  const resetGame = () => {
    const s = rt.current
    s.x = 0
    s.targetLane = 1
    s.y = 0
    s.vy = 0
    s.rolling = false
    s.rollTimer = 0
    s.speed = INITIAL_SPEED
    s.distance = 0
    s.spawnAcc = 0
    s.grounded = true
    obstacles.forEach((o) => (o.active = false))
    coins.forEach((c) => (c.active = false))
    dataRef.current.score = 0
    dataRef.current.coins = 0
    dataRef.current.speed = INITIAL_SPEED
    inputRef.current.lane = 0
    inputRef.current.jump = false
    inputRef.current.roll = false
  }

  useEffect(() => {
    if (status === "playing") resetGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const spawnRow = () => {
    const s = rt.current
    // choose which lanes get obstacles; always leave at least one lane open
    const openLane = Math.floor(Math.random() * 3)
    for (let lane = 0; lane < 3; lane++) {
      if (lane === openLane) continue
      if (Math.random() < 0.62) {
        const slot = obstacles.find((o) => !o.active)
        if (slot) {
          slot.active = true
          slot.z = SPAWN_Z
          slot.lane = lane
          slot.type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)]
        }
      }
    }
    // coin cluster in the open lane
    if (Math.random() < 0.75) {
      const count = 4 + Math.floor(Math.random() * 4)
      for (let i = 0; i < count; i++) {
        const slot = coins.find((c) => !c.active)
        if (slot) {
          slot.active = true
          slot.z = SPAWN_Z - i * 2.2
          slot.lane = openLane
        }
      }
    }
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const s = rt.current
    const player = playerRef.current

    if (status === "playing") {
      // speed ramps up over time
      s.speed = Math.min(MAX_SPEED, s.speed + SPEED_ACCEL * delta)
      s.distance += s.speed * delta
      dataRef.current.speed = s.speed
      dataRef.current.score = Math.floor(s.distance) + dataRef.current.coins * 5

      // lane input (edge triggered by parent, consumed here)
      if (inputRef.current.lane !== 0) {
        s.targetLane = Math.max(0, Math.min(2, s.targetLane + inputRef.current.lane))
        inputRef.current.lane = 0
      }
      // jump
      if (inputRef.current.jump) {
        inputRef.current.jump = false
        if (s.grounded && !s.rolling) {
          s.vy = JUMP_VELOCITY
          s.grounded = false
        }
      }
      // roll
      if (inputRef.current.roll) {
        inputRef.current.roll = false
        if (s.grounded) {
          s.rolling = true
          s.rollTimer = ROLL_DURATION
        }
      }

      // vertical physics
      s.vy += GRAVITY * delta
      s.y += s.vy * delta
      if (s.y <= 0) {
        s.y = 0
        s.vy = 0
        s.grounded = true
      }
      // roll timer
      if (s.rolling) {
        s.rollTimer -= delta
        if (s.rollTimer <= 0) s.rolling = false
      }

      // spawn scheduling — tighter as speed grows
      s.spawnAcc += s.speed * delta
      const spawnGap = 16
      if (s.spawnAcc >= spawnGap) {
        s.spawnAcc -= spawnGap
        spawnRow()
      }

      // move + recycle obstacles, collision test
      const playerLane = s.targetLane
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i]
        if (!o.active) continue
        o.z += s.speed * delta
        if (o.z > DESPAWN_Z) {
          o.active = false
          continue
        }
        // collision window around player at z=0
        if (o.z > -1.6 && o.z < 1.6 && o.lane === playerLane && Math.abs(s.x - LANES[o.lane]) < 1.2) {
          let hit = false
          if (o.type === "train") hit = true
          else if (o.type === "low") hit = s.y < 1.0
          else if (o.type === "overhead") hit = !s.rolling
          if (hit) {
            onCrash()
          }
        }
      }

      // move + recycle coins, collect
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i]
        if (!c.active) continue
        c.z += s.speed * delta
        if (c.z > DESPAWN_Z) {
          c.active = false
          continue
        }
        if (
          c.z > -1.1 &&
          c.z < 1.1 &&
          c.lane === playerLane &&
          Math.abs(s.x - LANES[c.lane]) < 1.1 &&
          s.y < 1.6
        ) {
          c.active = false
          dataRef.current.coins += 1
        }
      }

      // scenery scroll for sense of speed
      for (let i = 0; i < scenery.length; i++) {
        const sc = scenery[i]
        sc.z += s.speed * delta
        if (sc.z > DESPAWN_Z + 4) {
          sc.z -= SCENERY_POOL * 8
          sc.h = 4 + Math.random() * 10
        }
      }
    }

    // ----- apply transforms every frame (also while menu/over so it looks alive) -----
    s.x += (LANES[s.targetLane] - s.x) * Math.min(1, delta * LANE_LERP)
    if (player) {
      player.position.x = s.x
      player.position.y = s.y
      const targetScaleY = s.rolling ? 0.5 : 1
      const targetScaleZ = s.rolling ? 1.7 : 1
      player.scale.y += (targetScaleY - player.scale.y) * Math.min(1, delta * 18)
      player.scale.z += (targetScaleZ - player.scale.z) * Math.min(1, delta * 18)
      // lean into lane changes
      const lean = (LANES[s.targetLane] - s.x) * -0.25
      player.rotation.z += (lean - player.rotation.z) * Math.min(1, delta * 10)
    }

    // obstacle meshes
    for (let i = 0; i < obstacles.length; i++) {
      const ref = obstacleRefs.current[i]
      const o = obstacles[i]
      if (!ref) continue
      ref.visible = o.active
      if (!o.active) continue
      const shape = OBSTACLE_SHAPE[o.type]
      ref.position.set(LANES[o.lane], shape.y, o.z)
      ref.scale.set(shape.size[0], shape.size[1], shape.size[2])
      const mat = obstacleMatRefs.current[i]
      if (mat) mat.color.set(shape.color)
    }

    // coin meshes
    const spin = performance.now() * 0.005
    for (let i = 0; i < coins.length; i++) {
      const ref = coinRefs.current[i]
      const c = coins[i]
      if (!ref) continue
      ref.visible = c.active
      if (!c.active) continue
      ref.position.set(LANES[c.lane], 1.0, c.z)
      ref.rotation.z = spin
    }

    // scenery meshes
    for (let i = 0; i < scenery.length; i++) {
      const ref = sceneryRefs.current[i]
      const sc = scenery[i]
      if (!ref) continue
      ref.position.set(sc.side * 6.2, sc.h / 2, sc.z)
      ref.scale.set(3, sc.h, 3)
    }

    // camera follows the player laterally
    const camX = s.x * 0.35
    camera.position.x += (camX - camera.position.x) * Math.min(1, delta * 6)
    camera.position.y = 4.4
    camera.position.z = 8
    camera.lookAt(camX * 0.4, 1.3, -14)
  })

  return (
    <group>
      {/* ground track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]} receiveShadow>
        <planeGeometry args={[9, 240]} />
        <meshStandardMaterial color="#4a4a55" />
      </mesh>
      {/* lane dividers */}
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -30]}>
          <planeGeometry args={[0.12, 240]} />
          <meshStandardMaterial color="#c9c9d6" />
        </mesh>
      ))}
      {/* grass sides */}
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[side * 20, -0.02, -30]} receiveShadow>
          <planeGeometry args={[30, 240]} />
          <meshStandardMaterial color="#3f7d4f" />
        </mesh>
      ))}

      {/* player */}
      <group ref={playerRef} position={[0, 0, 0]}>
        <PlayerModel />
      </group>

      {/* obstacle pool */}
      {obstacles.map((_, i) => (
        <mesh
          key={`o${i}`}
          ref={(el) => {
            obstacleRefs.current[i] = el as unknown as Group
          }}
          visible={false}
          castShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            ref={(m) => {
              obstacleMatRefs.current[i] = m as MeshStandardMaterial
            }}
            color="#ffffff"
          />
        </mesh>
      ))}

      {/* coin pool */}
      {coins.map((_, i) => (
        <mesh
          key={`c${i}`}
          ref={(el) => {
            coinRefs.current[i] = el as Mesh
          }}
          visible={false}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.35, 0.35, 0.08, 20]} />
          <meshStandardMaterial color="#ffcf33" metalness={0.6} roughness={0.25} emissive={new Color("#7a5a00")} />
        </mesh>
      ))}

      {/* scenery pool */}
      {scenery.map((sc, i) => (
        <group
          key={`s${i}`}
          ref={(el) => {
            sceneryRefs.current[i] = el
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#6b7bb0" : i % 3 === 1 ? "#8a6d9e" : "#5c8a9e"} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
