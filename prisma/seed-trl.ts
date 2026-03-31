/**
 * Script de seed NMT/TRL — Gouvernement du Canada
 * Peuple tous les projets existants avec les listes de vérification officielles
 * si elles ne sont pas encore présentes.
 *
 * Exécution :  npx ts-node prisma/seed-trl.ts
 */

import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"

const pool   = new Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool as any)
const prisma  = new PrismaClient({ adapter })

// ── Données officielles GC ────────────────────────────────────────────────────
const NMT_CHECKLIST: Record<number, string[]> = {
  1: [
    "Les activités de recherche fondamentale ont été menées et les principes fondamentaux ont été définis.",
    "Les principes et les résultats ont été publiés dans la littérature (p. ex. des articles de recherche, des articles évalués par des pairs, des livres blancs).",
  ],
  2: [
    "Les applications des principes fondamentaux ont été déterminées.",
    "Les applications et les analyses justificatives ont été publiées dans la littérature (p. ex. études analytiques, petits éléments de code pour les logiciels, articles comparant les technologies).",
  ],
  3: [
    "La validation de principe ou la fonction analytique et expérimentale essentielle ont été mises au point.",
    "Les composants distincts ont été validés dans un environnement de laboratoire.",
  ],
  4: [
    "Les composants intégrés de façon « spéciale », les sous-systèmes ou les sous-processus ont été validés dans un environnement en laboratoire.",
    "La différence entre l'intégration « spéciale » et les résultats des tests par rapport aux objectifs attendus du système est comprise.",
  ],
  5: [
    "Les composants/sous-systèmes ou processus semi-intégrés ont été validés dans un environnement simulé.",
    "La différence entre l'environnement simulé et l'environnement opérationnel prévu et la comparaison entre les résultats des tests et les attentes sont comprises.",
  ],
  6: [
    "Le modèle ou le prototype sont développés à l'échelle pilote.",
    "Le système pour le modèle ou le prototype se rapproche de la configuration souhaitée pour ce qui est du rendement et du volume, à une échelle généralement plus petite que la pleine échelle.",
    "Le système pour le prototype ou le modèle à l'échelle pilote a été démontré dans un environnement simulé.",
    "La différence entre l'environnement simulé et l'environnement opérationnel et entre les résultats et les attentes est comprise.",
  ],
  7: [
    "Un prototype à pleine échelle prêt (forme, ajustage et fonction) est développé.",
    "Un prototype à pleine échelle est démontré dans un environnement opérationnel, mais sous certaines conditions.",
  ],
  8: [
    "La configuration finale de la technologie est développée.",
    "La configuration finale est testée avec succès dans un environnement opérationnel.",
    "La capacité de la technologie à satisfaire aux exigences opérationnelles a été évaluée et les problèmes ont été consignés; des plans, des options ou des mesures pour résoudre les problèmes ont été déterminés.",
  ],
  9: [
    "La technologie a été déployée avec succès et a fait ses preuves dans toute une série de conditions opérationnelles.",
    "Les rapports d'opérations, de tests et d'évaluation ont été réalisés.",
  ],
}

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, name: true } })
  console.log(`\n🔬 Seed NMT — ${projects.length} projet(s) à traiter\n`)

  let totalCreated = 0

  for (const project of projects) {
    let projectCreated = 0

    for (let lvl = 1; lvl <= 9; lvl++) {
      const existing = await prisma.tRLChecklistItem.count({
        where: { projectId: project.id, trlLevel: lvl },
      })
      if (existing > 0) continue // déjà seedé

      const items = NMT_CHECKLIST[lvl]
      await prisma.tRLChecklistItem.createMany({
        data: items.map((text, i) => ({
          projectId: project.id,
          trlLevel:  lvl,
          text,
          checked:   false,
          isCustom:  false,
          sortOrder: i,
        })),
      })
      projectCreated += items.length
    }

    if (projectCreated > 0) {
      console.log(`  ✓ ${project.name} — ${projectCreated} critère(s) ajouté(s)`)
      totalCreated += projectCreated
    } else {
      console.log(`  · ${project.name} — déjà à jour`)
    }
  }

  console.log(`\n✅ Terminé — ${totalCreated} critère(s) créé(s) au total`)
  console.log(`\nRécapitulatif des critères officiels par NMT :`)
  for (let lvl = 1; lvl <= 9; lvl++) {
    console.log(`  NMT ${lvl} : ${NMT_CHECKLIST[lvl].length} critère(s)`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
