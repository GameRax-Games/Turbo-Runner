"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { World, type GameData } from "./world"
import { Hud } from "./hud"
import { INITIAL_SPEED } from "@/lib/game-constants"

type Status = "menu" | "playing" | "over"

export function RunnerGame() {
  const [status, setStatus] = useState<Status>("menu")
  const [finalScore, setFinalScore] = useState(0)
  const [finalCoins, setFinalCoins] = useState(0)
  const [best, setBest] = useState(0)

  const dataRef = useRef<GameData>({ score: 0, coins: 0, speed: INITIAL_SPEED })
  const inputRef = useRef<{ jump: boolean; roll: boolean; lane: -1 | 0 | 1 }>({
    jump: false,
    roll: false,
    lane: 0,
  })
  const crashedRef = useRef(false)

  useEffect(() => {
    const saved = Number(localStorage.getItem("runner-best") || 0)
    if (saved) setBest(saved)
  }, [])

  const start = useCallback(() => {
    crashedRef.current = false
    setStatus("playing")
  }, [])

  const handleCrash = useCallback(() => {
    if (crashedRef.current) return
    crashedRef.current = true
    const sc = dataRef.current.score
    const co = dataRef.current.coins
    setFinalScore(sc)
    setFinalCoins(co)
    setBest((b) => {
      const nb = Math.max(b, sc)
      localStorage.setItem("runner-best", String(nb))
      return nb
    })
    setStatus("over")
  }, [])

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status !== "playing") {
        if (e.key === " " || e.key === "Enter") start()
        return
      }
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          inputRef.current.lane = -1
          break
        case "ArrowRight":
        case "d":
        case "D":
          inputRef.current.lane = 1
          break
        case "ArrowUp":
        case "w":
        case "W":
          inputRef.current.jump = true
          break
        case "ArrowDown":
        case "s":
        case "S":
          inputRef.current.roll = true
          break
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [status, start])

  // touch / swipe controls
  useEffect(() => {
    let sx = 0
    let sy = 0
    let tracking = false
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      sx = t.clientX
      sy = t.clientY
      tracking = true
    }
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      const dx = t.clientX - sx
      const dy = t.clientY - sy
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      if (status !== "playing") {
        if (absX < 12 && absY < 12) start()
        return
      }
      if (Math.max(absX, absY) < 24) return
      if (absX > absY) {
        inputRef.current.lane = dx > 0 ? 1 : -1
      } else {
        if (dy < 0) inputRef.current.jump = true
        else inputRef.current.roll = true
      }
    }
    window.addEventListener("touchstart", onStart, { passive: true })
    window.addEventListener("touchend", onEnd, { passive: true })
    return () => {
      window.removeEventListener("touchstart", onStart)
      window.removeEventListener("touchend", onEnd)
    }
  }, [status, start])

  return (
    <div className="relative h-dvh w-full touch-none overflow-hidden bg-gradient-to-b from-sky-400 to-sky-200 select-none">
      <Canvas shadows camera={{ position: [0, 4.4, 8], fov: 60 }} dpr={[1, 2]}>
        <fog attach="fog" args={["#bfe3ff", 30, 90]} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[6, 12, 6]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Environment preset="city" />
        <World status={status} dataRef={dataRef} inputRef={inputRef} onCrash={handleCrash} />
      </Canvas>

      {status === "playing" && <Hud dataRef={dataRef} />}

      {/* on-screen controls (mobile) */}
      {status === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-end justify-between px-4 sm:hidden">
          <ControlPad
            onLeft={() => (inputRef.current.lane = -1)}
            onRight={() => (inputRef.current.lane = 1)}
          />
          <ActionPad
            onJump={() => (inputRef.current.jump = true)}
            onRoll={() => (inputRef.current.roll = true)}
          />
        </div>
      )}

      {status === "menu" && (
        <Overlay>
          <h1 className="text-balance text-center text-5xl font-black tracking-tight text-white drop-shadow-lg sm:text-6xl">
            Turbo Runner
          </h1>
          <p className="max-w-md text-balance text-center text-white/90">
            Dash down the endless tracks. Dodge the trains, leap the barriers, slide under the beams,
            and grab every coin you can.
          </p>
          <button
            onClick={start}
            className="pointer-events-auto rounded-full bg-white px-10 py-4 text-lg font-bold text-sky-600 shadow-xl transition-transform hover:scale-105 active:scale-95"
          >
            Play
          </button>
          <Legend />
        </Overlay>
      )}

      {status === "over" && (
        <Overlay>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Game Over</p>
          <h2 className="text-6xl font-black text-white drop-shadow-lg">{finalScore.toLocaleString()}</h2>
          <div className="flex items-center gap-6 text-white">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-white/60">Coins</p>
              <p className="text-2xl font-bold">{finalCoins}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-white/60">Best</p>
              <p className="text-2xl font-bold">{best.toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={start}
            className="pointer-events-auto rounded-full bg-white px-10 py-4 text-lg font-bold text-sky-600 shadow-xl transition-transform hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </Overlay>
      )}
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/30 p-6 backdrop-blur-sm">
      {children}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-white/80">
      <span>← → / A D — Change lane</span>
      <span>↑ / W — Jump</span>
      <span>↓ / S — Roll</span>
      <span>Swipe on touch</span>
    </div>
  )
}

function ControlPad({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  return (
    <div className="pointer-events-auto flex gap-3">
      <PadButton onPress={onLeft} label="Left">
        ‹
      </PadButton>
      <PadButton onPress={onRight} label="Right">
        ›
      </PadButton>
    </div>
  )
}

function ActionPad({ onJump, onRoll }: { onJump: () => void; onRoll: () => void }) {
  return (
    <div className="pointer-events-auto flex gap-3">
      <PadButton onPress={onRoll} label="Roll">
        ⤓
      </PadButton>
      <PadButton onPress={onJump} label="Jump">
        ⤒
      </PadButton>
    </div>
  )
}

function PadButton({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode
  onPress: () => void
  label: string
}) {
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25 text-3xl font-bold text-white backdrop-blur-md active:scale-90 active:bg-white/40"
    >
      {children}
    </button>
  )
}
