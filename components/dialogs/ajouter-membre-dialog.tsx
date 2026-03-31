"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"

type User = { id: string; name: string; email: string; role: string }

export function AjouterMembreDialog({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [role, setRole] = useState("Membre")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      fetch(`/api/projets/${projectId}/membres`)
        .then((r) => r.json())
        .then(setUsers)
    }
  }, [open, projectId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) return
    setLoading(true)
    setError("")

    const res = await fetch(`/api/projets/${projectId}/membres`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId, role }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Erreur")
      setLoading(false)
    } else {
      setOpen(false)
      setSelectedUserId("")
      setRole("Membre")
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Ajouter un membre
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un membre à l&apos;équipe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tous les membres de l&apos;organisation sont déjà dans ce projet.<br />
              Invitez d&apos;abord de nouveaux utilisateurs via la page Équipe.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Utilisateur</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Rôle dans le projet</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: Chercheur principal, Développeur..." />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={loading || !selectedUserId}>
                  {loading ? "Ajout..." : "Ajouter"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
