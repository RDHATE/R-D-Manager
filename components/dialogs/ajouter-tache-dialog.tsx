"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, CheckSquare, Flag } from "lucide-react"

type Member = { id: string; name: string }
type Task = { id: string; title: string }
type StatusConfig = { id: string; label: string; color: string }

interface Props {
  projectId: string
  members: Member[]
  tasks: Task[]
  statuses: StatusConfig[]
  parentId?: string
  parentTitle?: string
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "ghost"
}

export function AjouterTacheDialog({
  projectId, members, tasks, statuses,
  parentId, parentTitle,
  triggerLabel = "Ajouter une tâche",
  triggerVariant = "default",
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"tache" | "jalon">(parentId ? "tache" : "tache")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: statuses[0]?.id ?? "TODO",
    priority: "MEDIUM",
    assigneeId: "none",
    startDate: "",
    dueDate: "",
    estimatedHours: "",
    isRDEligible: "true",
    parentId: parentId ?? "none",
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))
  const setSelect = (field: string) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }))

  function reset() {
    setForm({ title: "", description: "", status: statuses[0]?.id ?? "TODO", priority: "MEDIUM", assigneeId: "none", startDate: "", dueDate: "", estimatedHours: "", isRDEligible: "true", parentId: parentId ?? "none" })
    setType("tache")
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const url = type === "jalon"
      ? `/api/projets/${projectId}/jalons`
      : `/api/projets/${projectId}/taches`

    const body = type === "jalon"
      ? { title: form.title, description: form.description, dueDate: form.dueDate }
      : {
          ...form,
          assigneeId: form.assigneeId === "none" ? null : form.assigneeId,
          parentId: form.parentId === "none" ? null : form.parentId,
          isRDEligible: form.isRDEligible === "true",
        }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Erreur")
      setLoading(false)
    } else {
      setOpen(false)
      reset()
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentTitle ? `Sous-tâche de : ${parentTitle}` : "Nouvel élément"}
          </DialogTitle>
        </DialogHeader>

        {/* Sélecteur Type — masqué pour les sous-tâches */}
        {!parentId && (
          <Tabs value={type} onValueChange={(v) => setType(v as "tache" | "jalon")} className="mt-1">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="tache" className="flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" /> Tâche
              </TabsTrigger>
              <TabsTrigger value="jalon" className="flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5" /> Jalon
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>Titre *</Label>
            <Input
              placeholder={type === "jalon" ? "Ex: Livraison prototype v1" : "Ex: Développer le module de détection"}
              value={form.title} onChange={set("title")} required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Détails..." value={form.description} onChange={set("description")} rows={2} />
          </div>

          {type === "jalon" ? (
            /* Jalon : seulement date d'échéance obligatoire */
            <div className="space-y-1.5">
              <Label>Date du jalon *</Label>
              <Input type="date" value={form.dueDate} onChange={set("dueDate")} required />
            </div>
          ) : (
            /* Tâche : formulaire complet */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select value={form.status} onValueChange={setSelect("status")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Select value={form.priority} onValueChange={setSelect("priority")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Faible</SelectItem>
                      <SelectItem value="MEDIUM">Moyen</SelectItem>
                      <SelectItem value="HIGH">Élevé</SelectItem>
                      <SelectItem value="CRITICAL">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Assigné à</Label>
                <Select value={form.assigneeId} onValueChange={setSelect("assigneeId")}>
                  <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date de début</Label>
                  <Input type="date" value={form.startDate} onChange={set("startDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date d&apos;échéance</Label>
                  <Input type="date" value={form.dueDate} onChange={set("dueDate")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Heures estimées</Label>
                  <Input type="number" step="0.5" min="0" placeholder="Ex: 8" value={form.estimatedHours} onChange={set("estimatedHours")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Admissible RS&DE</Label>
                  <Select value={form.isRDEligible} onValueChange={setSelect("isRDEligible")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Oui</SelectItem>
                      <SelectItem value="false">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!parentId && tasks.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Tâche parente (sous-tâche)</Label>
                  <Select value={form.parentId} onValueChange={setSelect("parentId")}>
                    <SelectTrigger><SelectValue placeholder="Aucune (tâche principale)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {tasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : type === "jalon" ? "Créer le jalon" : "Créer la tâche"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
