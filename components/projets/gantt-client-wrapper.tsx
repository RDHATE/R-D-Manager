"use client"

import { useState, useCallback } from "react"
import { GanttView } from "./gantt-view"
import { TaskDetailPanel } from "./task-detail-panel"

type GTask = any  // full task with predecessors/successors

interface Props {
  tasks: GTask[]
  projectId: string
  members: { id: string; name: string }[]
}

export function GanttClientWrapper({ tasks: initTasks, projectId, members }: Props) {
  const [tasks, setTasks]           = useState<GTask[]>(initTasks)
  const [selectedTask, setSelected] = useState<GTask | null>(null)

  const allLight = tasks.map(t => ({
    id: t.id, title: t.title, isMilestone: t.isMilestone, parentId: t.parentId,
  }))

  const handleUpdated = useCallback((updated: GTask) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === updated.id ? { ...t, ...updated } : t)
      // If parentId changed, we may need to re-sort but keep flat list for Gantt
      return next
    })
    setSelected(updated)
  }, [])

  return (
    <>
      <GanttView
        tasks={tasks}
        projectId={projectId}
        onTaskClick={setSelected}
      />
      <TaskDetailPanel
        task={selectedTask}
        allTasks={allLight}
        projectId={projectId}
        members={members}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </>
  )
}
