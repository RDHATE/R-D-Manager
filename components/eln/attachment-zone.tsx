"use client"

import { useState, useRef } from "react"
import { uploadFile } from "@/lib/supabase"
import {
  Upload, X, FileText, Film, Image as ImageIcon,
  File, Loader2, ExternalLink,
} from "lucide-react"

export type PendingFile = {
  id: string
  file: File
  url: string       // URL locale (preview)
  uploaded?: string // URL Supabase après upload
  error?: string
  uploading: boolean
}

interface Props {
  files: PendingFile[]
  onChange: (files: PendingFile[]) => void
  readonly?: boolean
  savedAttachments?: { id: string; fileName: string; fileUrl: string; mimeType: string | null }[]
}

function fileIcon(mime: string | undefined) {
  if (!mime) return <File size={18} />
  if (mime.startsWith("image/")) return <ImageIcon size={18} />
  if (mime.startsWith("video/")) return <Film size={18} />
  if (mime.includes("pdf"))      return <FileText size={18} />
  return <File size={18} />
}

function fmtSize(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function AttachmentZone({ files, onChange, readonly, savedAttachments = [] }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming)
    const newFiles: PendingFile[] = arr.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      url: URL.createObjectURL(f),
      uploading: true,
    }))
    const merged = [...files, ...newFiles]
    onChange(merged)

    // Upload chaque fichier vers Supabase Storage
    let current = merged
    for (const pf of newFiles) {
      try {
        const uploaded = await uploadFile(pf.file, "eln")
        current = current.map(x => x.id === pf.id ? { ...x, uploaded, uploading: false } : x)
        onChange(current)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        current = current.map(x => x.id === pf.id ? { ...x, error: msg, uploading: false } : x)
        onChange(current)
      }
    }
  }

  function remove(id: string) {
    onChange(files.filter(f => f.id !== id))
  }

  if (readonly) {
    const all = [
      ...savedAttachments.map(a => ({ key: a.id, name: a.fileName, url: a.fileUrl, mime: a.mimeType ?? undefined })),
    ]
    if (all.length === 0) return null
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {all.map(a => (
          <a key={a.key} href={a.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", textDecoration: "none", fontSize: 12, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "white" }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94a3b8" }}
          >
            <span style={{ color: "#6366f1" }}>{fileIcon(a.mime)}</span>
            <span style={{ flex: 1 }}>{a.name}</span>
            <ExternalLink size={11} />
          </a>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Zone de dépôt */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        style={{
          border: `2px dashed ${dragging ? "#6366f1" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 8, padding: "18px 0", textAlign: "center", cursor: "pointer",
          background: dragging ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.02)",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "rgba(99,102,241,0.05)" }}
        onMouseLeave={e => { if (!dragging) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)" } }}
      >
        <Upload size={20} style={{ color: "#475569", margin: "0 auto 6px" }} />
        <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Glisser-déposer ou cliquer</p>
        <p style={{ fontSize: 10, color: "#334155", marginTop: 3 }}>Images, vidéos, PDF, documents · Max 50 Mo</p>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          style={{ display: "none" }}
          onChange={e => e.target.files && addFiles(e.target.files)} />
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {files.map(pf => {
            const isImg = pf.file.type.startsWith("image/")
            const isVid = pf.file.type.startsWith("video/")
            return (
              <div key={pf.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                background: pf.error ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${pf.error ? "rgba(239,68,68,0.25)" : pf.uploaded ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`,
              }}>
                {/* Preview image */}
                {isImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pf.url} alt={pf.file.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                ) : isVid ? (
                  <video src={pf.url} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 5, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#6366f1" }}>
                    {fileIcon(pf.file.type)}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: "white", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pf.file.name}</p>
                  <p style={{ fontSize: 10, color: pf.error ? "#f87171" : pf.uploaded ? "#34d399" : "#64748b" }}>
                    {pf.error ? `Erreur : ${pf.error}` : pf.uploading ? "Upload en cours…" : `✓ Téléversé · ${fmtSize(pf.file.size)}`}
                  </p>
                </div>

                {pf.uploading && <Loader2 size={14} style={{ color: "#6366f1", flexShrink: 0, animation: "spin 1s linear infinite" }} />}
                {!pf.uploading && (
                  <button onClick={() => remove(pf.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
