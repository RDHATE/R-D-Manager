"use client"

import { Plus, Trash2, GripVertical } from "lucide-react"

export type TableData = {
  columns: string[]
  rows: string[][]
}

const CELL_STYLE: React.CSSProperties = {
  background: "none", border: "none", outline: "none",
  color: "white", fontSize: 12, padding: "6px 8px",
  width: "100%", resize: "none", fontFamily: "inherit",
}

const dark = {
  border: "rgba(255,255,255,0.1)",
  header: "rgba(255,255,255,0.07)",
  row:    "rgba(255,255,255,0.02)",
  rowAlt: "rgba(255,255,255,0.04)",
}

interface Props {
  value: TableData
  onChange: (v: TableData) => void
  readonly?: boolean
}

export function TableEditor({ value, onChange, readonly }: Props) {
  const { columns, rows } = value

  function setCol(i: number, v: string) {
    const c = [...columns]; c[i] = v
    onChange({ columns: c, rows })
  }

  function setCell(ri: number, ci: number, v: string) {
    const r = rows.map(row => [...row])
    r[ri][ci] = v
    onChange({ columns, rows: r })
  }

  function addCol() {
    onChange({
      columns: [...columns, `Col ${columns.length + 1}`],
      rows: rows.map(r => [...r, ""]),
    })
  }

  function addRow() {
    onChange({ columns, rows: [...rows, columns.map(() => "")] })
  }

  function delCol(i: number) {
    if (columns.length <= 1) return
    onChange({
      columns: columns.filter((_, idx) => idx !== i),
      rows: rows.map(r => r.filter((_, idx) => idx !== i)),
    })
  }

  function delRow(i: number) {
    onChange({ columns, rows: rows.filter((_, idx) => idx !== i) })
  }

  return (
    <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${dark.border}` }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 400 }}>
        {/* En-têtes colonnes */}
        <thead>
          <tr style={{ background: dark.header }}>
            {!readonly && <th style={{ width: 24, padding: "4px 6px" }} />}
            {columns.map((col, ci) => (
              <th key={ci} style={{ border: `1px solid ${dark.border}`, padding: 0, minWidth: 120 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {readonly ? (
                    <span style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", width: "100%" }}>{col}</span>
                  ) : (
                    <input
                      value={col}
                      onChange={e => setCol(ci, e.target.value)}
                      placeholder={`Colonne ${ci + 1}`}
                      style={{ ...CELL_STYLE, fontWeight: 700, color: "#94a3b8", flex: 1 }}
                    />
                  )}
                  {!readonly && (
                    <button onClick={() => delCol(ci)} title="Supprimer colonne"
                      style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", color: "#475569", flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </th>
            ))}
            {!readonly && (
              <th style={{ width: 36, border: `1px solid ${dark.border}` }}>
                <button onClick={addCol} title="Ajouter colonne"
                  style={{ padding: "6px 8px", background: "none", border: "none", cursor: "pointer", color: "#6366f1", width: "100%" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#818cf8")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#6366f1")}>
                  <Plus size={13} />
                </button>
              </th>
            )}
          </tr>
        </thead>

        {/* Données */}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? dark.row : dark.rowAlt }}>
              {!readonly && (
                <td style={{ border: `1px solid ${dark.border}`, padding: "2px 4px", textAlign: "center" }}>
                  <button onClick={() => delRow(ri)} title="Supprimer ligne"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
                    <Trash2 size={10} />
                  </button>
                </td>
              )}
              {row.map((cell, ci) => (
                <td key={ci} style={{ border: `1px solid ${dark.border}`, padding: 0 }}>
                  {readonly ? (
                    <span style={{ padding: "6px 10px", fontSize: 12, color: "#e2e8f0", display: "block" }}>{cell}</span>
                  ) : (
                    <textarea
                      value={cell}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      placeholder="—"
                      rows={1}
                      style={{ ...CELL_STYLE, minHeight: 32 }}
                      onInput={e => {
                        const el = e.currentTarget
                        el.style.height = "auto"
                        el.style.height = el.scrollHeight + "px"
                      }}
                    />
                  )}
                </td>
              ))}
              {!readonly && <td style={{ border: `1px solid ${dark.border}` }} />}
            </tr>
          ))}

          {!readonly && (
            <tr>
              <td colSpan={columns.length + 2} style={{ border: `1px solid ${dark.border}` }}>
                <button onClick={addRow}
                  style={{
                    width: "100%", padding: "7px 0", background: "none", border: "none",
                    cursor: "pointer", color: "#6366f1", fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <Plus size={13} /> Ajouter une ligne
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {!readonly && (
        <div style={{ padding: "6px 10px", borderTop: `1px solid ${dark.border}`, display: "flex", gap: 16 }}>
          <span style={{ fontSize: 10, color: "#475569" }}>{rows.length} ligne{rows.length !== 1 ? "s" : ""} · {columns.length} colonne{columns.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  )
}

/** Valeur par défaut pour un nouveau tableau */
export function defaultTable(cols = 3, rowCount = 3): TableData {
  const columns = Array.from({ length: cols }, (_, i) => `Paramètre ${i + 1}`)
  const rows = Array.from({ length: rowCount }, () => columns.map(() => ""))
  return { columns, rows }
}
