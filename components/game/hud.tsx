"use client"

import { useEffect, useRef, useState } from "react"
import type { GameData } from "./world"

export function Hud({ dataRef }: { dataRef: React.MutableRefObject<GameData> }) {
  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const tick = () => {
      setScore(dataRef.current.score)
      setCoins(dataRef.current.coins)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [dataRef])

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
      <div className="rounded-2xl bg-black/35 px-4 py-2 backdrop-blur-md">
        <p className="text-xs font-medium uppercase tracking-widest text-white/60">Score</p>
        <p className="font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">
          {score.toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-2xl bg-black/35 px-4 py-2 backdrop-blur-md">
        <span className="inline-block h-5 w-5 rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 ring-2 ring-yellow-200/70" />
        <p className="font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">{coins}</p>
      </div>
    </div>
  )
}
