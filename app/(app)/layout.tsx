import { requireAuth } from "@/lib/session"
import { AppSidebar } from "@/components/app-sidebar"
import { TimerProvider } from "@/components/timer/timer-provider"
import { FloatingTimer } from "@/components/timer/floating-timer"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return (
    <TimerProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
      <FloatingTimer />
    </TimerProvider>
  )
}
