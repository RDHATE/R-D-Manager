"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Pen, Eraser, Type, Trash2, Undo2, Download } from "lucide-react"

interface Props {
  value: string | null          // base64 PNG ou null
  onChange: (v: string) => void
  readonly?: boolean
}

const COLORS  = ["#ffffff", "#60a5fa", "#34d399", "#f87171", "#fbbf24", "#a78bfa"]
const SIZES   = [2, 4, 8, 14]
const PAD_H   = 340
const PAD_W   = "100%"

type Tool = "pen" | "eraser" | "text"

export function DrawingPad({ value, onChange, readonly }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLInputElement>(null)
  const [tool, setTool]     = useState<Tool>("pen")
  const [color, setColor]   = useState(COLORS[0])
  const [size, setSize]     = useState(SIZES[1])
  const [drawing, setDrawing] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Initialiser le canvas avec la valeur existante
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#0d1520"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = value
    }
  }, []) // eslint-disable-line

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }

  function saveHistory() {
    const canvas = canvasRef.current!
    setHistory(h => [...h.slice(-20), canvas.toDataURL()])
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (readonly || tool === "text") return
    e.preventDefault()
    const canvas = canvasRef.current!
    saveHistory()
    setDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing || readonly || tool === "text") return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const pos = getPos(e, canvas)
    const from = lastPos.current ?? pos

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = tool === "eraser" ? "#0d1520" : color
    ctx.lineWidth   = tool === "eraser" ? size * 4 : size
    ctx.lineCap     = "round"
    ctx.lineJoin    = "round"
    ctx.stroke()

    lastPos.current = pos
  }

  function endDraw() {
    if (!drawing) return
    setDrawing(false)
    lastPos.current = null
    const canvas = canvasRef.current!
    onChange(canvas.toDataURL("image/png"))
  }

  function undo() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      onChange(canvas.toDataURL("image/png"))
    }
    img.src = prev
  }

  function clear() {
    saveHistory()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#0d1520"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onChange(canvas.toDataURL("image/png"))
  }

  function download() {
    const canvas = canvasRef.current!
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = `eln-dessin-${Date.now()}.png`
    a.click()
  }

  // Outil texte : ajouter texte à la position du clic
  function handleTextClick(e: React.MouseEvent) {
    if (tool !== "text" || readonly) return
    const canvas = canvasRef.current!
    const pos = getPos(e, canvas)
    const text = prompt("Texte à insérer :")
    if (!text) return
    saveHistory()
    const ctx = canvas.getContext("2d")!
    ctx.font = `${size * 5 + 8}px Inter, sans-serif`
    ctx.fillStyle = color
    ctx.fillText(text, pos.x, pos.y)
    onChange(canvas.toDataURL("image/png"))
  }

  const toolBtn = (t: Tool, Icon: React.ElementType, title: string) => (
    <button title={title} onClick={() => setTool(t)}
      style={{
        padding: "6px 10px", borderRadius: 6, cursor: "pointer",
        background: tool === t ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)",
        border: tool === t ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
        color: tool === t ? "#818cf8" : "#94a3b8",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (tool !== t) e.currentTarget.style.background = "rgba(255,255,255,0.09)" }}
      onMouseLeave={e => { if (tool !== t) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
    >
      <Icon size={14} />
    </button>
  )

  if (readonly && value) {
    return (
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Bloc-notes" style={{ width: "100%", display: "block", background: "#0d1520" }} />
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
      {/* Barre d'outils */}
      {!readonly && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flexWrap: "wrap",
          background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          {/* Outils */}
          <div style={{ display: "flex", gap: 5 }}>
            {toolBtn("pen",    Pen,    "Stylo")}
            {toolBtn("eraser", Eraser, "Gomme")}
            {toolBtn("text",   Type,   "Texte (cliquer sur le canvas)")}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Couleurs */}
          <div style={{ display: "flex", gap: 5 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                style={{
                  width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer",
                  border: color === c ? "2px solid white" : "2px solid transparent",
                  boxShadow: color === c ? `0 0 6px ${c}90` : "none",
                  transition: "all 0.12s",
                }} />
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

          {/* Tailles */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {SIZES.map(s => (
              <button key={s} onClick={() => setSize(s)}
                style={{
                  width: s * 2.5 + 10, height: s * 2.5 + 10, borderRadius: "50%",
                  background: size === s ? color : "rgba(255,255,255,0.2)",
                  border: size === s ? `2px solid ${color}` : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.12s",
                }} />
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", marginLeft: "auto" }} />

          {/* Actions */}
          <div style={{ display: "flex", gap: 5 }}>
            <button title="Annuler" onClick={undo} disabled={history.length === 0}
              style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: history.length ? "#94a3b8" : "#334155", cursor: history.length ? "pointer" : "not-allowed" }}>
              <Undo2 size={13} />
            </button>
            <button title="Effacer tout" onClick={clear}
              style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer" }}>
              <Trash2 size={13} />
            </button>
            <button title="Télécharger" onClick={download}
              style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer" }}>
              <Download size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={400}
        style={{
          display: "block", width: "100%", height: PAD_H,
          background: "#0d1520",
          cursor: tool === "pen" ? "crosshair" : tool === "eraser" ? "cell" : "text",
          touchAction: "none",
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        onClick={handleTextClick}
      />

      {!readonly && (
        <div style={{ padding: "5px 12px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 10, color: "#334155" }}>Stylo / tablette — tracé libre · Clic droit pour texte · Tactile supporté</span>
        </div>
      )}
    </div>
  )
}
