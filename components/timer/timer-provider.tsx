"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react"

type TimerProject = { id: string; name: string; code: string; tasks: { id: string; title: string }[] }

type TimerState = {
  running: boolean
  startedAt: number | null   // timestamp ms
  elapsed: number            // secondes écoulées (mis à jour toutes les secondes)
  projectId: string
  taskId: string
  description: string
  category: string
  projects: TimerProject[]
  projectsLoaded: boolean
}

type TimerContextType = TimerState & {
  start: () => void
  stop: () => void
  reset: () => void
  setProjectId: (v: string) => void
  setTaskId: (v: string) => void
  setDescription: (v: string) => void
  setCategory: (v: string) => void
  loadProjects: () => void
  saveEntry: () => Promise<{ ok: boolean; error?: string }>
}

const TimerContext = createContext<TimerContextType | null>(null)

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error("useTimer must be used within TimerProvider")
  return ctx
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [running, setRunning]     = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed]     = useState(0)
  const [projectId, setProjectId] = useState("")
  const [taskId, setTaskId]       = useState("none")
  const [description, setDescription] = useState("")
  const [category, setCategory]   = useState("RD_DIRECT")
  const [projects, setProjects]   = useState<TimerProject[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tick every second when running
  useEffect(() => {
    if (running && startedAt !== null) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, startedAt])

  const start = useCallback(() => {
    const now = Date.now()
    setStartedAt(now)
    setElapsed(0)
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
  }, [])

  const reset = useCallback(() => {
    setRunning(false)
    setStartedAt(null)
    setElapsed(0)
    setProjectId("")
    setTaskId("none")
    setDescription("")
    setCategory("RD_DIRECT")
  }, [])

  const loadProjects = useCallback(async () => {
    if (projectsLoaded) return
    const res = await fetch("/api/projets?select=timer")
    if (res.ok) {
      const data = await res.json()
      setProjects(data)
      setProjectsLoaded(true)
    }
  }, [projectsLoaded])

  const saveEntry = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!projectId || elapsed < 60) {
      return { ok: false, error: "Projet requis et durée minimum 1 minute." }
    }
    const hours = parseFloat((elapsed / 3600).toFixed(2))
    const today = new Date().toISOString().split("T")[0]
    const res = await fetch("/api/temps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        taskId: taskId === "none" ? null : taskId,
        date: today,
        hours,
        description: description || `Session de travail — ${formatTime(elapsed)}`,
        category,
        isRetrospective: false,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, error: body.error ?? "Erreur lors de l'enregistrement." }
    }
    return { ok: true }
  }, [projectId, taskId, elapsed, description, category])

  return (
    <TimerContext.Provider value={{
      running, startedAt, elapsed,
      projectId, taskId, description, category,
      projects, projectsLoaded,
      start, stop, reset,
      setProjectId, setTaskId, setDescription, setCategory,
      loadProjects, saveEntry,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
