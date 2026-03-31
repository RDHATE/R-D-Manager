import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@prisma/client"

interface NotifyOptions {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}

/** Crée une notification en base. Ne lance pas d'exception — erreur silencieuse. */
export async function notify(opts: NotifyOptions) {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type:   opts.type,
        title:  opts.title,
        body:   opts.body,
        link:   opts.link,
      },
    })
  } catch {
    // Non-bloquant
  }
}

/** Notifie plusieurs utilisateurs en parallèle */
export async function notifyMany(users: string[], opts: Omit<NotifyOptions, "userId">) {
  await Promise.all(users.map(userId => notify({ ...opts, userId })))
}
