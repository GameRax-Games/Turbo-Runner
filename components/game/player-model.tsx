"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type { Group } from "three"

/**
 * A stylized runner character built from primitive shapes.
 * The outer group's transform is controlled by the game loop (lane, jump, roll).
 * This component only animates the limbs to fake a running cycle.
 */
export function PlayerModel() {
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime * 14
    const swing = Math.sin(t) * 0.9
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * 0.8
    if (armR.current) armR.current.rotation.x = swing * 0.8
  })

  return (
    <group>
      {/* torso */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.62, 0.8, 0.42]} />
        <meshStandardMaterial color="#3ad0ff" />
      </mesh>
      {/* backpack */}
      <mesh position={[0, 0.9, -0.28]} castShadow>
        <boxGeometry args={[0.5, 0.55, 0.22]} />
        <meshStandardMaterial color="#ffce3a" />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial color="#ffd9b3" />
      </mesh>
      {/* cap */}
      <mesh position={[0, 1.66, 0.02]} castShadow>
        <boxGeometry args={[0.42, 0.18, 0.42]} />
        <meshStandardMaterial color="#ff4d6d" />
      </mesh>
      <mesh position={[0, 1.6, 0.28]} castShadow>
        <boxGeometry args={[0.42, 0.08, 0.22]} />
        <meshStandardMaterial color="#ff4d6d" />
      </mesh>

      {/* arms */}
      <group ref={armL} position={[0.42, 1.15, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.18, 0.6, 0.18]} />
          <meshStandardMaterial color="#2bb8e6" />
        </mesh>
      </group>
      <group ref={armR} position={[-0.42, 1.15, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.18, 0.6, 0.18]} />
          <meshStandardMaterial color="#2bb8e6" />
        </mesh>
      </group>

      {/* legs */}
      <group ref={legL} position={[0.16, 0.45, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.22, 0.7, 0.22]} />
          <meshStandardMaterial color="#243b6b" />
        </mesh>
      </group>
      <group ref={legR} position={[-0.16, 0.45, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.22, 0.7, 0.22]} />
          <meshStandardMaterial color="#243b6b" />
        </mesh>
      </group>
    </group>
  )
}
