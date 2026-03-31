"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, X, Check, CheckCheck, Trash2 } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  link?: string
  isRead: boolean
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  TASK_ASSIGNED:    "#22d3ee",
  TASK_OVERDUE:     "#f87171",
  TASK_DONE:        "#4ade80",
  BUDGET_ALERT_90:  "#fb923c",
  BUDGET_ALERT_100: "#f87171",
  EXPENSE_PENDING:  "#facc15",
  EXPENSE_APPROVED: "#4ade80",
  EXPENSE_REJECTED: "#f87171",
  SPRINT_STARTING:  "#a78bfa",
  SPRINT_ENDING:    "#fb923c",
  MEMBER_ADDED:     "#38bdf8",
  PIVOT_CREATED:    "#e879f9",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return "à l'instant"
  if (min < 60) return `il y a ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24)   return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

export function NotificationBell() {
  const [open, setOpen]           = useState(false)
  const [notifs, setNotifs]       = useState<Notification[]>([])
  const [unread, setUnread]       = useState(0)
  const [loading, setLoading]     = useState(false)
  const ref                       = useRef<HTMLDivElement>(null)

  const fetchNotifs = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications")
      if (!res.ok) return
      const data = await res.json()
      setNotifs(data.notifications ?? [])
      setUnread(data.unreadCount ?? 0)
    } catch { /* silent */ }
  }, [])

  // Poll toutes les 30 secondes
  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifs])

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" })
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnread(0)
  }

  async function deleteNotif(id: string, wasRead: boolean) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" })
    setNotifs(prev => prev.filter(n => n.id !== id))
    if (!wasRead) setUnread(prev => Math.max(0, prev - 1))
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bouton cloche */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs() }}
        style={{
          position:        "relative",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          width:           36,
          height:          36,
          borderRadius:    8,
          border:          "1px solid rgba(255,255,255,0.08)",
          background:      open ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.04)",
          cursor:          "pointer",
          transition:      "background 0.2s",
          flexShrink:      0,
        }}
        title="Notifications"
      >
        <Bell style={{ width: 16, height: 16, color: unread > 0 ? "#22d3ee" : "#64748b" }} />
        {unread > 0 && (
          <span style={{
            position:        "absolute",
            top:             -4,
            right:           -4,
            minWidth:        18,
            height:          18,
            borderRadius:    9,
            background:      "#f87171",
            color:           "#fff",
            fontSize:        10,
            fontWeight:      700,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            padding:         "0 4px",
            border:          "2px solid #060d1a",
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Panel dropdown */}
      {open && (
        <div style={{
          position:    "fixed",
          left:        268,
          bottom:      60,
          width:       360,
          maxHeight:   520,
          borderRadius: 12,
          border:      "1px solid rgba(255,255,255,0.1)",
          background:  "#0d1929",
          boxShadow:   "0 20px 60px rgba(0,0,0,0.6)",
          display:     "flex",
          flexDirection: "column",
          zIndex:      1000,
          overflow:    "hidden",
        }}>
          {/* Header */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "12px 16px",
            borderBottom:   "1px solid rgba(255,255,255,0.08)",
            flexShrink:     0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell style={{ width: 16, height: 16, color: "#22d3ee" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Notifications</span>
              {unread > 0 && (
                <span style={{
                  background: "rgba(248,113,113,0.15)",
                  color: "#f87171",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  padding: "1px 6px",
                }}>
                  {unread} non lue{unread > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  title="Tout marquer comme lu"
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            4,
                    padding:        "4px 8px",
                    borderRadius:   6,
                    border:         "1px solid rgba(34,211,238,0.2)",
                    background:     "rgba(34,211,238,0.06)",
                    color:          "#22d3ee",
                    fontSize:       11,
                    cursor:         "pointer",
                  }}
                >
                  <CheckCheck style={{ width: 12, height: 12 }} />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  width:          28,
                  height:         28,
                  borderRadius:   6,
                  border:         "none",
                  background:     "rgba(255,255,255,0.04)",
                  color:          "#64748b",
                  cursor:         "pointer",
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && (
              <div style={{ padding: 32, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                Chargement…
              </div>
            )}
            {!loading && notifs.length === 0 && (
              <div style={{ padding: 40, textAlign: "center" }}>
                <Bell style={{ width: 32, height: 32, color: "#1e293b", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 13, color: "#475569" }}>Aucune notification</p>
              </div>
            )}
            {notifs.map(n => {
              const dot = TYPE_COLORS[n.type] ?? "#64748b"
              return (
                <div
                  key={n.id}
                  style={{
                    display:      "flex",
                    gap:          10,
                    padding:      "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background:   n.isRead ? "transparent" : "rgba(34,211,238,0.03)",
                    transition:   "background 0.15s",
                    cursor:       n.link ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (n.link) { window.location.href = n.link }
                    if (!n.isRead) markRead(n.id)
                  }}
                >
                  {/* Dot type */}
                  <div style={{ paddingTop: 4, flexShrink: 0 }}>
                    <div style={{
                      width:        8,
                      height:       8,
                      borderRadius: "50%",
                      background:   dot,
                      opacity:      n.isRead ? 0.35 : 1,
                      boxShadow:    n.isRead ? "none" : `0 0 6px ${dot}`,
                    }} />
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize:    13,
                      fontWeight:  n.isRead ? 400 : 600,
                      color:       n.isRead ? "#64748b" : "#e2e8f0",
                      marginBottom: 2,
                      lineHeight:  1.4,
                    }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.4, marginBottom: 2 }}>
                        {n.body}
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: "#334155" }}>{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    {!n.isRead && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead(n.id) }}
                        title="Marquer comme lu"
                        style={{
                          display:        "flex",
                          alignItems:     "center",
                          justifyContent: "center",
                          width:          24,
                          height:         24,
                          borderRadius:   4,
                          border:         "none",
                          background:     "rgba(34,211,238,0.08)",
                          color:          "#22d3ee",
                          cursor:         "pointer",
                        }}
                      >
                        <Check style={{ width: 11, height: 11 }} />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotif(n.id, n.isRead) }}
                      title="Supprimer"
                      style={{
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        width:          24,
                        height:         24,
                        borderRadius:   4,
                        border:         "none",
                        background:     "rgba(248,113,113,0.08)",
                        color:          "#f87171",
                        cursor:         "pointer",
                      }}
                    >
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
