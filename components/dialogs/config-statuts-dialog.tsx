"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Settings2 } from "lucide-react"

type StatusConfig = { id: string; label: string; color: string }

const COLOR_OPTIONS = [
  { value: "slate", label: "Gris" },
  { value: "blue", label: "Bleu" },
  { value: "amber", label: "Jaune" },
  { value: "green", label: "Vert" },
  { value: "red", label: "Rouge" },
  { value: "purple", label: "Violet" },
  { value: "orange", label: "Orange" },
]

const COLOR_CLASSES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
}

interface Props {
  projectId: string
  statuses: StatusConfig[]
}

export function ConfigStatutsDialog({ projectId, statuses: initialStatuses }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [statuses, setStatuses] = useState<StatusConfig[]>(initialStatuses)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  function updateLabel(id: string, label: string) {
    setStatuses((s) => s.map((st) => st.id === id ? { ...st, label } : st))
  }

  function updateColor(id: string, color: string) {
    setStatuses((s) => s.map((st) => st.id === id ? { ...st, color } : st))
  }

  async function handleSave() {
    setLoading(true)
    await fetch(`/api/projets/${projectId}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statuses }),
    })
    setLoading(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-1.5" />
          Personnaliser les statuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personnaliser les statuts</DialogTitle>
          <DialogDescription>
            Renommez les statuts selon votre workflow. L&apos;identifiant interne reste le même.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={`text-xs font-medium px-2 py-1 rounded-full w-24 text-center shrink-0 ${COLOR_CLASSES[s.color] ?? COLOR_CLASSES.slate}`}>
                {s.label || s.id}
              </div>
              <Input
                value={s.label}
                onChange={(e) => updateLabel(s.id, e.target.value)}
                placeholder={s.id}
                className="flex-1"
              />
              <div className="flex gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => updateColor(s.id, c.value)}
                    className={`w-5 h-5 rounded-full border-2 ${COLOR_CLASSES[c.value]?.split(" ")[0]} ${s.color === c.value ? "border-foreground" : "border-transparent"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
          <Button onClick={handleSave} disabled={loading}>
            {saved ? "✓ Sauvegardé" : loading ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
