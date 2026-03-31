import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const CU_BASE = "https://api.clickup.com/api/v2"

async function cuFetch(apiKey: string, path: string) {
  const res = await fetch(`${CU_BASE}${path}`, {
    headers: { Authorization: apiKey },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`ClickUp ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

// Fetch all tasks (handles pagination)
async function fetchAllTasks(apiKey: string, listId: string): Promise<any[]> {
  const tasks: any[] = []
  let page = 0
  while (true) {
    const data = await cuFetch(
      apiKey,
      `/list/${listId}/task?archived=false&include_closed=true&subtasks=true&page=${page}&order_by=due_date`
    )
    tasks.push(...(data.tasks ?? []))
    if ((data.tasks ?? []).length < 100) break
    page++
  }
  return tasks
}

function mapStatus(s: string): string {
  const l = s.toLowerCase()
  if (l.includes("progress") || l.includes("active") || l.includes("doing") || l.includes("cours") || l.includes("en cours")) return "IN_PROGRESS"
  if (l.includes("review") || l.includes("révision") || l.includes("testing") || l.includes("qa")) return "IN_REVIEW"
  if (l.includes("done") || l.includes("complete") || l.includes("closed") || l.includes("terminé") || l.includes("finish")) return "DONE"
  if (l.includes("block") || l.includes("bloqué") || l.includes("stuck")) return "BLOCKED"
  return "TODO"
}

function mapPriority(p: any): string {
  if (!p) return "MEDIUM"
  const v = (p.priority ?? p.id ?? "").toString().toLowerCase()
  if (v === "urgent" || v === "1") return "CRITICAL"
  if (v === "high" || v === "2") return "HIGH"
  if (v === "low" || v === "4") return "LOW"
  return "MEDIUM"
}

function generateCode(name: string, taken: string[]): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  let base = words.length === 1
    ? name.slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, "")
    : words.map(w => w[0]).join("").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)
  if (!base) base = "PROJ"
  let code = base; let i = 2
  while (taken.includes(code)) code = `${base}${i++}`
  return code
}

// ── GET — proxy ClickUp API ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const sp     = new URL(req.url).searchParams
  const action = sp.get("action")
  const apiKey = sp.get("apiKey")
  if (!apiKey) return NextResponse.json({ error: "apiKey manquant" }, { status: 400 })

  try {
    // ── 1. Workspaces ────────────────────────────────────────────────────────
    if (action === "teams") {
      const data = await cuFetch(apiKey, "/team")
      return NextResponse.json(
        (data.teams ?? []).map((t: any) => ({ id: t.id, name: t.name, memberCount: t.members?.length ?? 0 }))
      )
    }

    // ── 2. Spaces ────────────────────────────────────────────────────────────
    if (action === "spaces") {
      const teamId = sp.get("teamId")
      if (!teamId) return NextResponse.json({ error: "teamId manquant" }, { status: 400 })
      const data = await cuFetch(apiKey, `/team/${teamId}/space?archived=false`)
      return NextResponse.json(
        (data.spaces ?? []).map((s: any) => ({ id: s.id, name: s.name }))
      )
    }

    // ── 3. Lists (folders + direct) ──────────────────────────────────────────
    if (action === "lists") {
      const spaceId = sp.get("spaceId")
      if (!spaceId) return NextResponse.json({ error: "spaceId manquant" }, { status: 400 })

      const [foldersData, directData] = await Promise.all([
        cuFetch(apiKey, `/space/${spaceId}/folder?archived=false`),
        cuFetch(apiKey, `/space/${spaceId}/list?archived=false`),
      ])

      const result: any[] = []
      // Direct lists (not in a folder)
      for (const l of directData.lists ?? []) {
        result.push({ id: l.id, name: l.name, taskCount: l.task_count ?? 0, folder: null })
      }
      // Lists inside folders
      for (const f of foldersData.folders ?? []) {
        for (const l of f.lists ?? []) {
          result.push({ id: l.id, name: l.name, taskCount: l.task_count ?? 0, folder: f.name })
        }
      }
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur ClickUp" }, { status: 502 })
  }
}

// ── POST — execute import ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { apiKey, selectedLists } = await req.json()
  // selectedLists: { id, name, code?, startDate? }[]

  if (!apiKey || !selectedLists?.length)
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })

  // Existing codes in org (to avoid duplicates)
  const existing = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId },
    select: { code: true },
  })
  const takenCodes = existing.map(p => p.code)

  const results: {
    listId: string; listName: string
    projectId?: string; projectCode?: string
    tasksCreated: number; milestonesCreated: number; subtasksCreated: number
    error?: string
  }[] = []

  for (const list of selectedLists) {
    try {
      // Fetch tasks
      const allTasks = await fetchAllTasks(apiKey, list.id)

      const code = list.code?.trim().toUpperCase() || generateCode(list.name, takenCodes)
      takenCodes.push(code)

      // Determine start date
      let startDate = list.startDate ? new Date(list.startDate) : null
      if (!startDate) {
        // Use earliest due_date from tasks, else today
        const dates = allTasks
          .filter(t => t.due_date)
          .map(t => parseInt(t.due_date))
          .sort()
        startDate = dates.length ? new Date(dates[0]) : new Date()
      }

      // Determine end date from latest due_date
      const endDates = allTasks.filter(t => t.due_date).map(t => parseInt(t.due_date)).sort()
      const endDate  = endDates.length ? new Date(endDates[endDates.length - 1]) : null

      // Create project
      const project = await prisma.project.create({
        data: {
          name:           list.name,
          code,
          status:         "ACTIVE",
          arcStatus:      "DRAFT",
          startDate,
          endDate,
          organizationId: session.user.organizationId,
        },
      })

      let tasksCreated = 0, milestonesCreated = 0, subtasksCreated = 0
      const idMap: Record<string, string> = {} // ClickUp task ID → our task ID

      // Top-level tasks
      const topLevel = allTasks.filter(t => !t.parent)
      for (const t of topLevel) {
        const isMilestone = t.type === "milestone"
          || t.name?.startsWith("📍")
          || t.name?.toLowerCase().startsWith("[milestone]")

        if (isMilestone) {
          await prisma.milestone.create({
            data: {
              title:       t.name.replace(/^(📍|\[milestone\])\s*/i, "").trim() || t.name,
              description: t.description?.slice(0, 500) || null,
              type:        "DELIVERABLE",
              dueDate:     t.due_date ? new Date(parseInt(t.due_date)) : new Date(),
              completed:   t.status?.type === "closed",
              completedAt: t.status?.type === "closed" ? new Date() : null,
              projectId:   project.id,
            },
          })
          milestonesCreated++
        } else {
          const status = mapStatus(t.status?.status ?? "")
          const task = await prisma.task.create({
            data: {
              title:        t.name,
              description:  t.description?.slice(0, 2000) || null,
              status:       status as any,
              priority:     mapPriority(t.priority) as any,
              startDate:    t.start_date ? new Date(parseInt(t.start_date)) : null,
              dueDate:      t.due_date   ? new Date(parseInt(t.due_date))   : null,
              completedAt:  status === "DONE" ? new Date() : null,
              isRDEligible: true,
              projectId:    project.id,
            },
          })
          idMap[t.id] = task.id
          tasksCreated++
        }
      }

      // Subtasks (second pass so parentId is available)
      const subtaskList = allTasks.filter(t => t.parent)
      for (const t of subtaskList) {
        const parentId = idMap[t.parent]
        if (!parentId) continue
        const status = mapStatus(t.status?.status ?? "")
        await prisma.task.create({
          data: {
            title:        t.name,
            description:  t.description?.slice(0, 2000) || null,
            status:       status as any,
            priority:     mapPriority(t.priority) as any,
            startDate:    t.start_date ? new Date(parseInt(t.start_date)) : null,
            dueDate:      t.due_date   ? new Date(parseInt(t.due_date))   : null,
            completedAt:  status === "DONE" ? new Date() : null,
            isRDEligible: true,
            parentId,
            projectId:    project.id,
          },
        })
        subtasksCreated++
      }

      results.push({ listId: list.id, listName: list.name, projectId: project.id, projectCode: code, tasksCreated, milestonesCreated, subtasksCreated })

    } catch (err: any) {
      results.push({ listId: list.id, listName: list.name, tasksCreated: 0, milestonesCreated: 0, subtasksCreated: 0, error: err.message })
    }
  }

  return NextResponse.json({ results })
}
