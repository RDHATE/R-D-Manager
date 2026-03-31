"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle2, Circle, Plus, Pencil, Trash2,
  Check, X, ChevronDown, ChevronRight,
  Clock, AlertTriangle, ArrowRight, FlaskConical,
} from "lucide-react"
import { TRL_LEVELS, STAGES, getTRLLevel } from "@/lib/trl-data"
import { useThemeColors } from "@/hooks/use-theme-colors"

type DC = ReturnType<typeof useThemeColors>

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type ChecklistItem = {
  id: string
  trlLevel: number
  text: string
  checked: boolean
  isCustom: boolean
  sortOrder: number
}
type HistoryEntry = {
  id: string; fromLevel: number; toLevel: number
  note: string | null; createdAt: string
}

/* trlLevel 10/20/30/40 = custom stade 1/2/3/4 */
const STAGE_CUSTOM_LEVEL: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 40 }


/* ─── Barre de progression ───────────────────────────────────────────────────── */
function ProgressBar({ pct, color, h = 5, dark }: { pct: number; color: string; h?: number; dark: DC }) {
  return (
    <div style={{ height: h, background: dark.border, borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(pct, 100)}%`, borderRadius: 99,
        background: color, transition: "width 0.5s ease",
        boxShadow: pct > 0 ? `0 0 8px ${color}55` : "none",
      }} />
    </div>
  )
}

/* ─── Composant principal ───────────────────────────────────────────────────── */
export function TRLDashboard({ projectId }: { projectId: string }) {
  const dark = useThemeColors()
  const [trlLevel,    setTrlLevel]    = useState(1)
  const [history,     setHistory]     = useState<HistoryEntry[]>([])
  const [items,       setItems]       = useState<ChecklistItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [apiError,    setApiError]    = useState<string | null>(null)
  const [expandedStage, setExpandedStage] = useState<number>(1)
  const [expandedNMTs, setExpandedNMTs]   = useState<Set<number>>(new Set<number>())

  // Avancement
  const [advanceTarget, setAdvanceTarget] = useState<number | null>(null)
  const [advanceNote,   setAdvanceNote]   = useState("")
  const [advancing,     setAdvancing]     = useState(false)

  // Ajout item custom
  const [addingStage, setAddingStage] = useState<number | null>(null)
  const [newText,     setNewText]     = useState("")
  const [addSaving,   setAddSaving]   = useState(false)

  // Édition inline
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")

  /* ─── Chargement ──────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      const res  = await fetch(`/api/projets/${projectId}/trl`)
      const data = await res.json()
      if (!res.ok) {
        setApiError(data.error ?? `Erreur ${res.status}`)
        setLoading(false)
        return
      }
      const lvl  = data.trlLevel ?? 1
      setTrlLevel(lvl)
      setHistory(data.trlHistory ?? [])
      setItems(data.checklistItems ?? [])
      const stageId = STAGES.find(s => (s.levels as readonly number[]).includes(lvl))?.id ?? 1
      setExpandedStage(stageId)
      setExpandedNMTs(new Set([lvl]))
    } catch (err) {
      setApiError(String(err))
    }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  /* ─── Helpers ────────────────────────────────────────────────────────────── */
  // Items officiels pour un NMT donné
  const nmtItems = (lvl: number) => items.filter(i => i.trlLevel === lvl)
  // Items custom pour un stade
  const stageCustomItems = (stageId: number) => items.filter(i => i.trlLevel === STAGE_CUSTOM_LEVEL[stageId])

  // Tous les items d'un stade (NMT officiel + custom stade)
  const allStageItems = (stageId: number) => {
    const stage = STAGES[stageId - 1]
    const official = (stage.levels as readonly number[]).flatMap(lvl => nmtItems(lvl))
    return [...official, ...stageCustomItems(stageId)]
  }

  const stagePct = (stageId: number) => {
    const all = allStageItems(stageId)
    return all.length === 0 ? 0 : Math.round(all.filter(i => i.checked).length / all.length * 100)
  }

  const currentStageId = STAGES.find(s => (s.levels as readonly number[]).includes(trlLevel))?.id ?? 1

  /* ─── Mutations ──────────────────────────────────────────────────────────── */
  async function toggleItem(item: ChecklistItem) {
    const next = !item.checked
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i))
    await fetch(`/api/projets/${projectId}/trl/checklist`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, checked: next }),
    })
  }

  async function saveEdit(itemId: string) {
    if (!editingText.trim()) { setEditingId(null); return }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, text: editingText.trim() } : i))
    setEditingId(null)
    await fetch(`/api/projets/${projectId}/trl/checklist`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, text: editingText.trim() }),
    })
  }

  async function deleteItem(itemId: string) {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await fetch(`/api/projets/${projectId}/trl/checklist`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    })
  }

  async function addCustomItem(stageId: number) {
    if (!newText.trim()) return
    setAddSaving(true)
    const res = await fetch(`/api/projets/${projectId}/trl/checklist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trlLevel: STAGE_CUSTOM_LEVEL[stageId], text: newText.trim() }),
    })
    if (res.ok) {
      const item = await res.json()
      setItems(prev => [...prev, item])
      setNewText(""); setAddingStage(null)
    }
    setAddSaving(false)
  }

  async function doAdvance() {
    if (!advanceTarget) return
    setAdvancing(true)
    const res = await fetch(`/api/projets/${projectId}/trl`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toLevel: advanceTarget, note: advanceNote }),
    })
    if (res.ok) {
      setHistory(prev => [{
        id: Date.now().toString(), fromLevel: trlLevel, toLevel: advanceTarget,
        note: advanceNote || null, createdAt: new Date().toISOString(),
      }, ...prev])
      setTrlLevel(advanceTarget)
      const nextStage = STAGES.find(s => (s.levels as readonly number[]).includes(advanceTarget))
      if (nextStage) setExpandedStage(nextStage.id)
      setAdvanceTarget(null); setAdvanceNote("")
    }
    setAdvancing(false)
  }

  /* ─── Loading ────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ padding: 48, textAlign: "center", color: dark.muted, fontSize: 14 }}>
      Chargement…
    </div>
  )

  if (apiError) return (
    <div style={{
      padding: 24, borderRadius: 12, background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.3)", color: "#f87171",
    }}>
      <p style={{ fontWeight: 700, marginBottom: 8 }}>Erreur de chargement NMT</p>
      <p style={{ fontSize: 13, fontFamily: "monospace", color: "#fca5a5" }}>{apiError}</p>
      <p style={{ fontSize: 12, marginTop: 12, color: "#94a3b8" }}>
        Vérifiez que la migration Prisma a été appliquée :{" "}
        <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>
          npx prisma db push
        </code>
      </p>
      <button onClick={load} style={{
        marginTop: 14, padding: "8px 18px", borderRadius: 8, border: "none",
        background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
      }}>
        Réessayer
      </button>
    </div>
  )

  const currentInfo = getTRLLevel(trlLevel)

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Bandeau NMT actuel ── */}
      <div style={{
        background: `linear-gradient(135deg, ${dark.card}, ${dark.panel})`,
        border: `1px solid ${currentInfo.color}44`,
        borderRadius: 14, padding: "18px 22px",
        display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at left, ${currentInfo.color}0d 0%, transparent 60%)` }} />

        {/* Badge NMT */}
        <div style={{
          width: 70, height: 70, borderRadius: 14, flexShrink: 0,
          background: `${currentInfo.color}20`, border: `2px solid ${currentInfo.color}55`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 20px ${currentInfo.color}22`,
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: currentInfo.color, letterSpacing: 1.5 }}>NMT</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: currentInfo.color, lineHeight: 1 }}>{trlLevel}</span>
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: dark.text, marginBottom: 3 }}>
            {currentInfo.definition}
          </p>
          <p style={{ fontSize: 12, color: dark.sub, lineHeight: 1.6 }}>
            {currentInfo.description}
          </p>
        </div>

        {/* Boutons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {trlLevel < 9 && (
            <button onClick={() => { setAdvanceTarget(trlLevel + 1); setAdvanceNote("") }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: `linear-gradient(135deg, ${currentInfo.color}bb, ${currentInfo.color})`,
                color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
              <ArrowRight style={{ width: 14, height: 14 }} />
              Avancer NMT {trlLevel + 1}
            </button>
          )}
          {trlLevel > 1 && (
            <button onClick={() => { setAdvanceTarget(trlLevel - 1); setAdvanceNote("") }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                border: `1px solid ${dark.border}`, background: "transparent",
                color: dark.muted, fontSize: 12, cursor: "pointer",
              }}>
              Reculer NMT {trlLevel - 1}
            </button>
          )}
          {trlLevel === 9 && (
            <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>
              ✓ Niveau maximum
            </span>
          )}
        </div>
      </div>

      {/* ── Mini barre 9 niveaux ── */}
      <div style={{ display: "flex", gap: 4 }}>
        {TRL_LEVELS.map(t => {
          const isActive = t.level === trlLevel
          const isPast   = t.level < trlLevel
          return (
            <button key={t.level}
              onClick={() => { setAdvanceTarget(t.level); setAdvanceNote("") }}
              title={`NMT ${t.level} — ${t.definition}`}
              style={{
                flex: 1, height: 30, borderRadius: 6, border: "none", cursor: "pointer",
                background: isActive ? t.color : isPast ? `${t.color}44` : dark.hover,
                color: isActive ? "#000" : isPast ? t.color : dark.muted,
                fontSize: 12, fontWeight: 800, transition: "all 0.15s",
                boxShadow: isActive ? `0 0 10px ${t.color}66` : "none",
              }}>
              {t.level}
            </button>
          )
        })}
      </div>

      {/* ══ Les 4 stades ══ */}
      {STAGES.map(stage => {
        const isCurrentStage = stage.id === currentStageId
        const isPastStage    = stage.id < currentStageId
        const isOpen         = expandedStage === stage.id
        const spct           = stagePct(stage.id)
        const allItems       = allStageItems(stage.id)
        const checkedCount   = allItems.filter(i => i.checked).length
        const custom         = stageCustomItems(stage.id)

        return (
          <div key={stage.id} style={{
            background: isCurrentStage ? `${stage.color}07` : dark.card,
            border: `1.5px solid ${isCurrentStage ? stage.color + "44" : isOpen ? stage.color + "22" : dark.border}`,
            borderRadius: 12, overflow: "hidden",
          }}>

            {/* ── En-tête stade (cliquable) ── */}
            <button
              onClick={() => setExpandedStage(isOpen ? 0 : stage.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14,
                padding: "15px 18px", background: "transparent", border: "none",
                cursor: "pointer", textAlign: "left",
              }}>

              {/* Pastille stade */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${stage.color}${isPastStage ? "30" : isCurrentStage ? "20" : "10"}`,
                border: `1.5px solid ${stage.color}${isCurrentStage ? "55" : "30"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isCurrentStage ? `0 0 14px ${stage.color}22` : "none",
              }}>
                {isPastStage
                  ? <Check style={{ width: 17, height: 17, color: stage.color }} />
                  : <span style={{ fontSize: 17, fontWeight: 900, color: isCurrentStage ? stage.color : dark.muted }}>{stage.id}</span>
                }
              </div>

              {/* Titre + barre */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Stade {stage.id}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isCurrentStage ? dark.text : isPastStage ? dark.sub : dark.muted }}>
                    {stage.label}
                  </span>
                  <span style={{ fontSize: 11, color: dark.muted }}>
                    NMT {Math.min(...(stage.levels as readonly number[]))}–{Math.max(...(stage.levels as readonly number[]))}
                  </span>
                  {isCurrentStage && (
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10,
                      background: `${stage.color}22`, color: stage.color, fontWeight: 700 }}>
                      EN COURS
                    </span>
                  )}
                  {isPastStage && (
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10,
                      background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 700 }}>
                      COMPLÉTÉ
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar pct={isPastStage ? 100 : spct} color={stage.color} dark={dark} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: checkedCount > 0 ? stage.color : dark.muted, whiteSpace: "nowrap" }}>
                    {checkedCount} / {allItems.length}
                  </span>
                </div>
              </div>

              {/* Chevron */}
              <div style={{ color: dark.muted, flexShrink: 0 }}>
                {isOpen
                  ? <ChevronDown style={{ width: 17, height: 17 }} />
                  : <ChevronRight style={{ width: 17, height: 17 }} />
                }
              </div>
            </button>

            {/* ── Corps : items à plat ── */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${dark.border}`, padding: "14px 18px 18px" }}>

                {/* Items officiels — sous-accordéons par NMT */}
                {(stage.levels as readonly number[]).map(lvl => {
                  const levelInfo    = getTRLLevel(lvl)
                  const lvlItems     = nmtItems(lvl)
                  const isCurrentNMT = lvl === trlLevel
                  const isPastNMT    = lvl < trlLevel
                  const isNMTOpen    = expandedNMTs.has(lvl)
                  const nmtChecked   = lvlItems.filter(i => i.checked).length
                  const nmtComplete  = lvlItems.length > 0 && nmtChecked === lvlItems.length

                  const toggleNMT = () => setExpandedNMTs(prev => {
                    const next = new Set(prev)
                    if (next.has(lvl)) next.delete(lvl); else next.add(lvl)
                    return next
                  })

                  return (
                    <div key={lvl} style={{
                      marginBottom: 6,
                      background: isCurrentNMT ? `${levelInfo.color}07` : dark.hover,
                      border: `1px solid ${isCurrentNMT ? levelInfo.color + "33" : isNMTOpen ? levelInfo.color + "18" : dark.border}`,
                      borderRadius: 9, overflow: "hidden",
                    }}>

                      {/* ── En-tête NMT cliquable ── */}
                      <button onClick={toggleNMT} style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "11px 14px", background: "transparent", border: "none",
                        cursor: "pointer", textAlign: "left",
                      }}>
                        {/* Badge numéro */}
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                          background: `${levelInfo.color}${isCurrentNMT || isPastNMT ? "25" : "10"}`,
                          border: `1.5px solid ${levelInfo.color}${isCurrentNMT ? "66" : "30"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 900,
                          color: isCurrentNMT || isPastNMT ? levelInfo.color : dark.muted,
                          boxShadow: isCurrentNMT ? `0 0 10px ${levelInfo.color}22` : "none",
                        }}>
                          {nmtComplete
                            ? <CheckCircle2 style={{ width: 15, height: 15, color: levelInfo.color }} />
                            : lvl
                          }
                        </div>

                        {/* Titre */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isCurrentNMT ? dark.text : isPastNMT ? dark.sub : dark.muted }}>
                              NMT {lvl}
                            </span>
                            <span style={{ fontSize: 12, color: dark.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>
                              — {levelInfo.definition}
                            </span>
                            {isCurrentNMT && (
                              <span style={{ fontSize: 10, color: levelInfo.color, fontWeight: 700,
                                background: `${levelInfo.color}18`, padding: "1px 7px", borderRadius: 5, flexShrink: 0 }}>
                                ACTUEL
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Compteur + chevron */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {lvlItems.length > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 700,
                              color: nmtComplete ? "#10b981" : nmtChecked > 0 ? levelInfo.color : dark.muted }}>
                              {nmtChecked}/{lvlItems.length}
                            </span>
                          )}
                          {isNMTOpen
                            ? <ChevronDown  style={{ width: 14, height: 14, color: dark.muted }} />
                            : <ChevronRight style={{ width: 14, height: 14, color: dark.muted }} />
                          }
                        </div>
                      </button>

                      {/* ── Liste des critères (visible si ouvert) ── */}
                      {isNMTOpen && (
                        <div style={{
                          borderTop: `1px solid ${dark.border}`,
                          padding: "10px 14px 12px",
                          display: "flex", flexDirection: "column", gap: 5,
                        }}>
                          {lvlItems.length === 0 ? (
                            <p style={{ fontSize: 12, color: dark.muted, fontStyle: "italic" }}>
                              Chargement des critères…
                            </p>
                          ) : lvlItems.map((item, idx) => (
                            <ChecklistRow
                              key={item.id}
                              item={item}
                              label={`NMT ${lvl}.${idx + 1}`}
                              color={levelInfo.color}
                              editingId={editingId}
                              editingText={editingText}
                              onToggle={() => toggleItem(item)}
                              onStartEdit={() => { setEditingId(item.id); setEditingText(item.text) }}
                              onEditChange={setEditingText}
                              onSaveEdit={() => saveEdit(item.id)}
                              onCancelEdit={() => setEditingId(null)}
                              onDelete={() => deleteItem(item.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Items personnalisés du stade */}
                {custom.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{
                        height: 1, flex: 1, background: `${stage.color}30`,
                      }} />
                      <span style={{ fontSize: 11, color: stage.color, fontWeight: 700, whiteSpace: "nowrap" }}>
                        Critères personnalisés
                      </span>
                      <div style={{ height: 1, flex: 1, background: `${stage.color}30` }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {custom.map((item, idx) => (
                        <ChecklistRow
                          key={item.id}
                          item={item}
                          label={`Stade ${stage.id}.${idx + 1}`}
                          color={stage.color}
                          editingId={editingId}
                          editingText={editingText}
                          onToggle={() => toggleItem(item)}
                          onStartEdit={() => { setEditingId(item.id); setEditingText(item.text) }}
                          onEditChange={setEditingText}
                          onSaveEdit={() => saveEdit(item.id)}
                          onCancelEdit={() => setEditingId(null)}
                          onDelete={() => deleteItem(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bouton ajouter critère */}
                {addingStage === stage.id ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <input autoFocus value={newText} onChange={e => setNewText(e.target.value)}
                      placeholder="Nouveau critère personnalisé…"
                      onKeyDown={e => {
                        if (e.key === "Enter") addCustomItem(stage.id)
                        if (e.key === "Escape") { setAddingStage(null); setNewText("") }
                      }}
                      style={{
                        flex: 1, padding: "9px 12px", borderRadius: 8, fontSize: 13,
                        background: dark.input, border: `1px solid ${dark.border}`,
                        color: dark.text, outline: "none",
                      }} />
                    <button onClick={() => addCustomItem(stage.id)} disabled={addSaving || !newText.trim()}
                      style={{
                        padding: "9px 16px", borderRadius: 8, border: "none",
                        background: stage.color, color: "#000",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                        opacity: !newText.trim() ? 0.5 : 1,
                      }}>
                      {addSaving ? "…" : "Ajouter"}
                    </button>
                    <button onClick={() => { setAddingStage(null); setNewText("") }}
                      style={{
                        padding: "9px 10px", borderRadius: 8,
                        border: `1px solid ${dark.border}`, background: "transparent",
                        color: dark.muted, cursor: "pointer",
                      }}>
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setAddingStage(stage.id); setNewText("") }}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "8px 14px", borderRadius: 8, marginTop: 4,
                      border: `1.5px dashed ${stage.color}44`, background: `${stage.color}05`,
                      color: stage.color, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                    <Plus style={{ width: 14, height: 14 }} />
                    Ajouter un critère personnalisé
                  </button>
                )}

                {/* Bouton avancer si stade courant */}
                {isCurrentStage && trlLevel < 9 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${dark.border}` }}>
                    {spct < 100 && (
                      <div style={{
                        display: "flex", gap: 8, padding: "8px 12px", borderRadius: 8, marginBottom: 10,
                        background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)",
                      }}>
                        <AlertTriangle style={{ width: 13, height: 13, color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, color: "#fbbf24" }}>
                          {allItems.length - checkedCount} critère(s) non cochés.
                          Principe GC : <em>dans le doute, mieux vaut être prudent.</em>
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => { setAdvanceTarget(trlLevel + 1); setAdvanceNote("") }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 20px", borderRadius: 9, border: "none",
                        background: spct === 100
                          ? `linear-gradient(135deg, ${stage.color}bb, ${stage.color})`
                          : `${stage.color}20`,
                        color: spct === 100 ? "#000" : stage.color,
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}>
                      <ArrowRight style={{ width: 15, height: 15 }} />
                      Passer au NMT {trlLevel + 1}
                      {spct === 100 && " ✓"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Historique ── */}
      {history.length > 0 && (
        <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: dark.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            Historique
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map(entry => {
              const isUp   = entry.toLevel > entry.fromLevel
              const toInfo = getTRLLevel(entry.toLevel)
              return (
                <div key={entry.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "10px 12px", borderRadius: 8,
                  background: dark.hover, border: `1px solid ${dark.border}`,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `${toInfo.color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, color: toInfo.color,
                  }}>
                    {isUp ? "↑" : "↓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: dark.text }}>
                        NMT {entry.fromLevel} → NMT {entry.toLevel}
                      </span>
                      <span style={{ fontSize: 11, color: toInfo.color, fontWeight: 600 }}>
                        {toInfo.definition}
                      </span>
                    </div>
                    {entry.note && <p style={{ fontSize: 12, color: dark.sub, marginTop: 3 }}>{entry.note}</p>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.muted }}>
                    <Clock style={{ width: 11, height: 11 }} />
                    {new Date(entry.createdAt).toLocaleDateString("fr-CA")}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modale confirmation avancement ── */}
      {advanceTarget !== null && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setAdvanceTarget(null) }}
        >
          <div style={{
            background: dark.panel,
            border: `1px solid ${getTRLLevel(advanceTarget).color}33`,
            borderRadius: 16, padding: 28, maxWidth: 500, width: "100%",
            boxShadow: `0 0 50px ${getTRLLevel(advanceTarget).color}15`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <FlaskConical style={{ width: 22, height: 22, color: getTRLLevel(advanceTarget).color }} />
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: dark.text }}>
                  {advanceTarget > trlLevel ? "Avancer" : "Reculer"} au NMT {advanceTarget}
                </p>
                <p style={{ fontSize: 12, color: dark.muted }}>NMT {trlLevel} → NMT {advanceTarget}</p>
              </div>
            </div>

            <div style={{
              padding: "12px 14px", borderRadius: 10, marginBottom: 16,
              background: `${getTRLLevel(advanceTarget).color}10`,
              border: `1px solid ${getTRLLevel(advanceTarget).color}22`,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: getTRLLevel(advanceTarget).color, marginBottom: 4 }}>
                {getTRLLevel(advanceTarget).definition}
              </p>
              <p style={{ fontSize: 12, color: dark.sub, lineHeight: 1.6 }}>
                {getTRLLevel(advanceTarget).description}
              </p>
            </div>

            {advanceTarget > trlLevel && stagePct(currentStageId) < 100 && (
              <div style={{
                display: "flex", gap: 8, padding: "10px 12px", borderRadius: 8, marginBottom: 16,
                background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)",
              }}>
                <AlertTriangle style={{ width: 14, height: 14, color: "#fbbf24", flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "#fbbf24" }}>
                  Des critères ne sont pas encore cochés.
                  Principe GC : <em>dans le doute, mieux vaut être prudent.</em>
                </p>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 6 }}>
                Note justificative (recommandée pour la traçabilité RS&DE)
              </label>
              <textarea value={advanceNote} onChange={e => setAdvanceNote(e.target.value)}
                placeholder="Ex: Prototype validé en laboratoire, résultats conformes..."
                rows={3}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
                  background: dark.input, border: `1px solid ${dark.border}`,
                  color: dark.text, outline: "none", resize: "vertical",
                  fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box",
                }} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setAdvanceTarget(null)}
                style={{
                  padding: "9px 18px", borderRadius: 9,
                  border: `1px solid ${dark.border}`, background: "transparent",
                  color: dark.muted, fontSize: 13, cursor: "pointer",
                }}>
                Annuler
              </button>
              <button onClick={doAdvance} disabled={advancing}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 20px", borderRadius: 9, border: "none",
                  background: advancing ? "rgba(255,255,255,0.08)"
                    : `linear-gradient(135deg, ${getTRLLevel(advanceTarget).color}bb, ${getTRLLevel(advanceTarget).color})`,
                  color: advancing ? dark.muted : "#000",
                  fontSize: 13, fontWeight: 700, cursor: advancing ? "not-allowed" : "pointer",
                }}>
                <ArrowRight style={{ width: 14, height: 14 }} />
                {advancing ? "Enregistrement…" : `Confirmer NMT ${advanceTarget}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Composant ligne checklist ─────────────────────────────────────────────── */
function ChecklistRow({
  item, label, color,
  editingId, editingText,
  onToggle, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete,
}: {
  item: ChecklistItem; label: string; color: string
  editingId: string | null; editingText: string
  onToggle:     () => void
  onStartEdit:  () => void
  onEditChange: (v: string) => void
  onSaveEdit:   () => void
  onCancelEdit: () => void
  onDelete:     () => void
}) {
  const dark = useThemeColors()
  const isEditing = editingId === item.id

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "11px 13px", borderRadius: 9,
      background: item.checked ? `${color}09` : dark.hover,
      border: `1px solid ${item.checked ? color + "28" : dark.border}`,
      transition: "all 0.15s",
    }}>

      {/* Case à cocher */}
      <button onClick={onToggle}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
        {item.checked
          ? <CheckCircle2 style={{ width: 20, height: 20, color }} />
          : <Circle style={{ width: 20, height: 20, color: dark.muted }} />
        }
      </button>

      {/* Badge label + texte */}
      {isEditing ? (
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          <input autoFocus value={editingText} onChange={e => onEditChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit() }}
            style={{
              flex: 1, padding: "5px 9px", borderRadius: 7, fontSize: 13,
              background: dark.input, border: `1px solid ${dark.border}`,
              color: dark.text, outline: "none",
            }} />
          <button onClick={onSaveEdit}
            style={{ background: "none", border: "none", cursor: "pointer", color }}>
            <Check style={{ width: 15, height: 15 }} />
          </button>
          <button onClick={onCancelEdit}
            style={{ background: "none", border: "none", cursor: "pointer", color: dark.muted }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge NMT X.Y */}
          <span style={{
            display: "inline-block", marginRight: 7, marginBottom: 2,
            fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
            fontFamily: "monospace",
            color: item.checked ? color + "88" : color,
            background: `${color}15`,
            border: `1px solid ${color}30`,
            borderRadius: 5, padding: "1px 6px",
          }}>
            {label}
          </span>
          <span style={{
            fontSize: 13, lineHeight: 1.6,
            color: item.checked ? dark.muted : dark.text,
            textDecoration: item.checked ? "line-through" : "none",
            opacity: item.checked ? 0.65 : 1,
          }}>
            {item.text}
          </span>
          {!item.isCustom && (
            <span style={{
              marginLeft: 8, fontSize: 10, color: dark.muted,
              background: dark.hover, borderRadius: 4, padding: "1px 5px",
            }}>
              officiel GC
            </span>
          )}
        </div>
      )}

      {/* Actions (custom seulement) */}
      {!isEditing && item.isCustom && (
        <div style={{ display: "flex", gap: 3, flexShrink: 0, marginTop: 1 }}>
          <button onClick={onStartEdit}
            style={{ background: "none", border: "none", cursor: "pointer", color: dark.muted, padding: 3 }}>
            <Pencil style={{ width: 12, height: 12 }} />
          </button>
          <button onClick={onDelete}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 3 }}>
            <Trash2 style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}
    </div>
  )
}
