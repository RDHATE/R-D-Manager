"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  Users,
  DollarSign,
  FileBarChart2,
  FlaskConical,
  LogOut,
  ChevronRight,
  CalendarDays,
  Building2,
  BookOpen,
  Settings,
  ArrowUpFromLine,
  GitBranch,
  Beaker,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { NotificationBell } from "@/components/notification-bell"
import { useTheme } from "@/components/theme-provider"

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/projets", label: "Projets", icon: FolderKanban },
  { href: "/taches", label: "Tâches", icon: CheckSquare },
  { href: "/temps", label: "Saisie de temps", icon: Clock },
  { href: "/charge", label: "Charge de travail", icon: BarChart3 },
  { href: "/reunions", label: "Réunions", icon: CalendarDays },
  { href: "/experiences", label: "Expériences R&D", icon: Beaker },
  { href: "/tests", label: "Tests & Expériences", icon: FlaskConical },
  { href: "/journal", label: "Journal de bord", icon: BookOpen },
  { href: "/pivots", label: "Pivots R&D", icon: GitBranch },
  { href: "/depenses", label: "Dépenses", icon: DollarSign },
  { href: "/rapports", label: "Rapports RS&DE", icon: FileBarChart2 },
  { href: "/equipe", label: "Équipe", icon: Building2 },
]

const adminNavItems = [
  { href: "/import",     label: "Importer",   icon: ArrowUpFromLine },
  { href: "/parametres", label: "Paramètres", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="bg-primary rounded-lg p-1.5">
          <FlaskConical className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">R&D Manager</p>
          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
            {session?.user?.organizationName ?? "Organisation"}
          </p>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>
          )
        })}

        {session?.user?.role === "ADMIN" && (
          <>
            <div className="pt-2 pb-1 px-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Administration</p>
            </div>
            {adminNavItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/")
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="h-3 w-3 opacity-50" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <Separator />

      {/* Notifications + User */}
      <div className="px-3 py-3">
        {/* Cloche notifications */}
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <NotificationBell />
          <span className="text-xs text-muted-foreground">Notifications</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
        >
          <span className="text-base leading-none">{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="text-xs">{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
        </button>

        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
