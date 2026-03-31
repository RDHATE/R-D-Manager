"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"

export function AjouterMembreOrgDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MEMBER",
    hourlyRate: "",
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/equipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Erreur")
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      router.refresh()
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setForm({ name: "", email: "", password: "", role: "MEMBER", hourlyRate: "" })
      }, 1500)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un membre
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un membre à l&apos;organisation</DialogTitle>
          <DialogDescription>
            Créez un compte pour votre collègue. Partagez-lui son email et mot de passe pour qu&apos;il puisse se connecter.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center text-emerald-600 font-medium">
            ✓ Membre ajouté avec succès !
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nom complet *</Label>
              <Input placeholder="Prénom Nom" value={form.name} onChange={set("name")} required />
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="collegue@exemple.com" value={form.email} onChange={set("email")} required />
            </div>

            <div className="space-y-1.5">
              <Label>Mot de passe temporaire *</Label>
              <Input
                type="text"
                placeholder="Min. 8 caractères"
                value={form.password}
                onChange={set("password")}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">Partagez ce mot de passe avec votre collègue.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                    <SelectItem value="PROJECT_MANAGER">Chef de projet</SelectItem>
                    <SelectItem value="MEMBER">Membre</SelectItem>
                    <SelectItem value="VIEWER">Observateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Taux horaire ($/h)</Label>
                <Input type="number" step="0.01" min="0" placeholder="Ex: 75" value={form.hourlyRate} onChange={set("hourlyRate")} />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer le compte"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
