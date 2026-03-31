"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: "dark", setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    const stored = localStorage.getItem("rd-theme") as Theme | null
    const resolved = stored === "light" ? "light" : "dark"
    setThemeState(resolved)
    applyTheme(resolved)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem("rd-theme", t)
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyTheme(t: Theme) {
  const html = document.documentElement
  if (t === "dark") {
    html.classList.add("dark")
  } else {
    html.classList.remove("dark")
  }
}

export function useTheme() {
  return useContext(ThemeContext)
}
