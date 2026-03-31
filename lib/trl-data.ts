/**
 * Données officielles NMT/TRL — Gouvernement du Canada
 * Source : Outil d'évaluation du niveau de maturité technologique, 25 mars 2021
 * Carrefour de la croissance propre, Ressources naturelles Canada
 */

export const STAGES = [
  { id: 1, label: "Recherche fondamentale",          levels: [1, 2],    color: "#8b5cf6" },
  { id: 2, label: "Recherche et développement",      levels: [3, 4, 5], color: "#3b82f6" },
  { id: 3, label: "Projets pilotes et démonstration", levels: [6, 7],   color: "#06b6d4" },
  { id: 4, label: "Adoption précoce",                levels: [8, 9],    color: "#10b981" },
] as const

export type TRLLevelData = {
  level: number
  definition: string
  description: string
  stage: number
  color: string
  defaultChecklist: string[]
}

export const TRL_LEVELS: TRLLevelData[] = [
  {
    level: 1,
    definition: "Observation et mention des principes fondamentaux",
    description:
      "La recherche scientifique commence par les propriétés d'une technologie potentielle observées dans le monde physique. Ces propriétés fondamentales font l'objet de rapports dans la littérature.",
    stage: 1,
    color: "#8b5cf6",
    defaultChecklist: [
      "Les activités de recherche fondamentale ont été menées et les principes fondamentaux ont été définis.",
      "Les principes et les résultats ont été publiés dans la littérature (articles de recherche, articles évalués par des pairs, livres blancs).",
    ],
  },
  {
    level: 2,
    definition: "Formulation du concept de l'application ou de la technologie",
    description:
      "La recherche appliquée commence par la détermination des applications pratiques de principes scientifiques fondamentaux. L'accent est mis sur une compréhension accrue de la science et sur la corroboration des observations scientifiques fondamentales faites au cours des travaux du NMT 1. L'analyse de la faisabilité des applications spéculatives est menée et mentionnée dans les études scientifiques.",
    stage: 1,
    color: "#7c3aed",
    defaultChecklist: [
      "Les applications des principes fondamentaux ont été déterminées.",
      "Les applications et les analyses justificatives ont été publiées dans la littérature (études analytiques, petits éléments de code pour les logiciels, articles comparant les technologies).",
    ],
  },
  {
    level: 3,
    definition: "Validation de principe expérimentale",
    description:
      "Les activités de recherche et développement commencent. Les applications passent du stade théorique au stade de travail expérimental. La faisabilité de composants technologiques distincts est validée au moyen d'études analytiques et d'études en laboratoire. On n'a pas encore tenté d'intégrer les composants dans un système complet.",
    stage: 2,
    color: "#6366f1",
    defaultChecklist: [
      "La validation de principe ou la fonction analytique et expérimentale essentielle ont été mises au point.",
      "Les composants distincts ont été validés dans un environnement de laboratoire.",
    ],
  },
  {
    level: 4,
    definition: "Validation du ou des composants dans un environnement de laboratoire",
    description:
      "Les composants technologiques de base sont intégrés de façon « spéciale » pour valider le bon fonctionnement commun dans un environnement de laboratoire. Le système « spécial » sera probablement un mélange de matériel sur place et de quelques composants spéciaux qui peuvent nécessiter une manipulation, un calibrage ou un alignement particuliers pour fonctionner.",
    stage: 2,
    color: "#3b82f6",
    defaultChecklist: [
      "Les composants intégrés de façon « spéciale », les sous-systèmes ou les sous-processus ont été validés dans un environnement en laboratoire.",
      "La différence entre l'intégration « spéciale » et les résultats des tests par rapport aux objectifs attendus du système est comprise.",
    ],
  },
  {
    level: 5,
    definition: "Validation du ou des composants semi-intégrés dans un environnement simulé",
    description:
      "Les composants technologiques de base intégrés fonctionnent pour les applications prévues dans un environnement simulé. Les configurations sont en cours d'élaboration, mais peuvent être soumises à des changements fondamentaux. La technologie et l'environnement au NMT 5 sont plus proches de l'application finale qu'elles l'étaient au NMT 4.",
    stage: 2,
    color: "#0ea5e9",
    defaultChecklist: [
      "Les composants/sous-systèmes ou processus semi-intégrés ont été validés dans un environnement simulé.",
      "La différence entre l'environnement simulé et l'environnement opérationnel prévu et la comparaison entre les résultats des tests et les attentes sont comprises.",
    ],
  },
  {
    level: 6,
    definition: "Démonstration du système ou du processus prototype dans un environnement simulé",
    description:
      "Un modèle ou un prototype qui représente une configuration quasi souhaitée est en train d'être développé à l'échelle pilote, généralement plus petite que la pleine échelle. Le modèle ou le prototype sont testés dans un environnement simulé.",
    stage: 3,
    color: "#06b6d4",
    defaultChecklist: [
      "Le modèle ou le prototype sont développés à l'échelle pilote.",
      "Le système pour le modèle ou le prototype se rapproche de la configuration souhaitée pour ce qui est du rendement et du volume, à une échelle généralement plus petite que la pleine échelle.",
      "Le système pour le prototype ou le modèle à l'échelle pilote a été démontré dans un environnement simulé.",
      "La différence entre l'environnement simulé et l'environnement opérationnel et entre les résultats et les attentes est comprise.",
    ],
  },
  {
    level: 7,
    definition:
      "Démonstration du système prototype prêt (forme, ajustage et fonction) dans un environnement opérationnel approprié",
    description:
      "Un prototype à pleine échelle est démontré dans un environnement opérationnel, mais sous certaines conditions (p. ex. des tests sur le terrain). À ce stade, la conception finale est presque terminée.",
    stage: 3,
    color: "#14b8a6",
    defaultChecklist: [
      "Un prototype à pleine échelle prêt (forme, ajustage et fonction) est développé.",
      "Un prototype à pleine échelle est démontré dans un environnement opérationnel, mais sous certaines conditions.",
    ],
  },
  {
    level: 8,
    definition: "Mise au point de la technologie actuelle et qualification au moyen de tests et de démonstrations",
    description:
      "Il est prouvé que la technologie fonctionne dans sa forme finale et dans les conditions prévues. Ce stade représente généralement la fin du développement de la technologie. À ce stade, les opérations sont bien comprises, les procédures opérationnelles sont élaborées et les derniers ajustements sont effectués.",
    stage: 4,
    color: "#f59e0b",
    defaultChecklist: [
      "La configuration finale de la technologie est développée.",
      "La configuration finale est testée avec succès dans un environnement opérationnel.",
      "La capacité de la technologie à satisfaire aux exigences opérationnelles a été évaluée et les problèmes ont été consignés; des plans, des options ou des mesures pour résoudre les problèmes ont été déterminés.",
    ],
  },
  {
    level: 9,
    definition:
      "Validation de la technologie réelle par le déploiement réussi dans un environnement opérationnel",
    description:
      "L'application réelle de la technologie dans sa forme finale est effectuée dans toute une série de conditions opérationnelles. Ce stade, parfois appelé « opérations du système », est celui où la technologie est retravaillée et adoptée.",
    stage: 4,
    color: "#10b981",
    defaultChecklist: [
      "La technologie a été déployée avec succès et a fait ses preuves dans toute une série de conditions opérationnelles.",
      "Les rapports d'opérations, de tests et d'évaluation ont été réalisés.",
    ],
  },
]

export function getTRLLevel(level: number): TRLLevelData {
  return TRL_LEVELS[level - 1] ?? TRL_LEVELS[0]
}

export function getStage(level: number) {
  return STAGES.find(s => (s.levels as readonly number[]).includes(level)) ?? STAGES[0]
}
