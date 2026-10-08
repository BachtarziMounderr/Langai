# Structure du repository

La structure validée à l’étape 2 est conservée. Le socle technique ajoute `frontend/package.json`, `frontend/pnpm-lock.yaml`, `frontend/pnpm-workspace.yaml`, les configurations Next.js/TypeScript/ESLint/PostCSS, `frontend/src/app/{layout,page,globals.css}`, `backend/app/{__init__,main}.py`, deux Dockerfiles, deux `.dockerignore` et les quatre services dans `docker-compose.yml`. Les dossiers métier vides restent conservés par `.gitkeep`. L’inventaire historique en fin de document montre l’état de l’étape 2 ; les ajouts du socle sont listés ici.

## Responsabilités

| Emplacement | Utilisation future |
| --- | --- |
| frontend/src/app | App Router : (public), (auth), onboarding et segments student/teacher/admin/super-admin |
| frontend/src/components/ui | Composants communs ; installation de shadcn/ui plus tard |
| frontend/src/components/layout | Navigation, cadres de page et layouts partagés |
| frontend/src/features | Vues et interactions par domaine, ajoutées progressivement |
| frontend/src/lib/api | Client HTTP et contrats OpenAPI générés |
| frontend/src/lib/auth et lib/tenancy | Contexte d’affichage ; aucune autorisation métier décisive ici |
| frontend/src/lib/branding | Application des paramètres d’école autorisés |
| frontend/src/services | Composition d’appels backend ; pas de client fournisseur IA |
| frontend/src/hooks et types | Hooks partagés et types locaux d’interface |
| frontend/src/styles/theme | Variables/tokens du thème global, sans palette ni CSS créé maintenant |
| backend/app/core | Configuration, sécurité et contexte d’accès |
| backend/app/db | Infrastructure SQLAlchemy future ; session/connexion, pas de tables |
| backend/app/api | Assemblage futur de l’API et de ses dépendances HTTP |
| backend/app/models, schemas, services, repositories | Emplacements transverses réservés ; les éléments métier appartiennent aux modules |
| backend/app/modules | Domaines du monolithe décrits ci-dessous |
| backend/app/integrations | Adaptateurs LLM, TTS, stockage et futur e-mail |
| backend/app/workers | Points d’entrée Celery, sans duplication des services |
| backend/migrations | Emplacement futur Alembic, non initialisé |
| backend/tests | Tests Python unitaires, intégration et sécurité |
| tests/e2e | Tests futurs entre frontend et backend |
| infra/docker, nginx, storage | Notes sur images, reverse proxy et stockage |
| scripts | Futurs utilitaires, préparation locale, seeds et maintenance |
| .github/workflows | Futurs workflows, aucun YAML actif |
| config | Contrat de configuration, aucun chargeur implémenté |

## Domaines progressifs

Les sept dossiers de modules déjà présents sont conservés. Les autres seront créés avec leur première fonctionnalité ; pas de catalogue de trente dossiers vides.

| Domaine de l’architecture | Concepts demandés | État |
| --- | --- | --- |
| identity | auth, users | Dossier vide |
| tenancy | schools comme tenant, memberships, roles, permissions, branding | Dossier vide |
| schools | classes, groups, organisation scolaire, invitations et imports | Dossier vide |
| catalog | languages, levels | À créer au besoin |
| learning | user_languages, activation des parcours | Dossier vide |
| content | courses, lessons, exercises, content, scénarios | À créer au besoin |
| assessment | assessments, attempts | À créer au besoin |
| progress | progress, history | Dossier vide |
| knowledge | knowledge, états utilisateur | À créer au besoin |
| srs | srs, reviews | Dossier vide |
| ai | ai, conversations, feedback | Dossier vide |
| notifications | notifications | À créer au besoin |
| analytics | analytics | À créer au besoin |
| media | files | À créer au besoin |

Aucun contenu de domaine, export Python ni route ne sera généré dans ces dossiers pendant cette étape.

## Ajustements documentés sans changement architectural

- L’architecture et ses diagrammes restent inchangés. Le nom existant lingua-ai-platform et les dossiers frontend/backend sont conservés.
- Les dossiers backend transverses demandés coexistent avec modules, avec une règle explicite pour éviter une seconde organisation métier par couches.
- db est un emplacement technique pour la persistance évoquée dans le socle core de l’architecture ; core conserve configuration et contexte. Cette précision d’emplacement ne change aucune responsabilité métier.
- Les anciens emplacements vides tests/unit, integration et security sont regroupés sous backend/tests. tests/e2e reste à la racine. Les futurs tests unitaires peuvent être regroupés par module à l’intérieur de backend/tests/unit.
- Les exemples d’environnement initiaux utilisaient des valeurs fictives et plusieurs noms. Ils sont harmonisés en variables vides ; AUTH_SECRET devient JWT_SECRET, APP_ENV devient ENVIRONMENT, FRONTEND_ORIGIN devient FRONTEND_URL et les noms S3 suivent la demande actuelle. Aucun code ne dépendait des anciens noms.
- docker-compose.yml devient l’unique emplacement Compose. L’ancien infra/compose.yaml.example, également vide, est retiré pour éviter deux sources concurrentes ; ses intentions sont reprises dans infra/docker/README.md.
- Aucun Dockerfile artificiel, Makefile ou package.json avec des commandes inexistantes. pyproject.toml contient seulement les métadonnées du futur backend, sans dépendances ni système de build.
- Le répertoire local .qodo préexistant est conservé et ignoré par Git. Il ne fait pas partie de l’application.
- Les sources Word/PDF restent externes au dépôt. Les ambiguïtés A01–A12 de l’architecture ne sont pas résolues par cette préparation de dossiers.

## Arborescence complète

L’inventaire ci-dessous inclut les fichiers de préparation, y compris les marqueurs .gitkeep. Le dossier interne .git et le répertoire local .qodo préexistant sont exclus ; ils ne sont pas des livrables applicatifs.

```text
lingua-ai-platform/
├── .github/
│   ├── workflows/
│   │   └── README.md
│   └── README.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── .gitkeep
│   │   ├── core/
│   │   │   └── .gitkeep
│   │   ├── db/
│   │   │   └── .gitkeep
│   │   ├── integrations/
│   │   │   ├── email/
│   │   │   │   └── .gitkeep
│   │   │   ├── llm/
│   │   │   │   └── .gitkeep
│   │   │   ├── storage/
│   │   │   │   └── .gitkeep
│   │   │   └── tts/
│   │   │       └── .gitkeep
│   │   ├── models/
│   │   │   └── .gitkeep
│   │   ├── modules/
│   │   │   ├── ai/
│   │   │   │   └── .gitkeep
│   │   │   ├── identity/
│   │   │   │   └── .gitkeep
│   │   │   ├── learning/
│   │   │   │   └── .gitkeep
│   │   │   ├── progress/
│   │   │   │   └── .gitkeep
│   │   │   ├── schools/
│   │   │   │   └── .gitkeep
│   │   │   ├── srs/
│   │   │   │   └── .gitkeep
│   │   │   ├── tenancy/
│   │   │   │   └── .gitkeep
│   │   │   └── README.md
│   │   ├── repositories/
│   │   │   └── .gitkeep
│   │   ├── schemas/
│   │   │   └── .gitkeep
│   │   ├── services/
│   │   │   └── .gitkeep
│   │   └── workers/
│   │       └── .gitkeep
│   ├── migrations/
│   │   └── .gitkeep
│   ├── tests/
│   │   ├── integration/
│   │   │   └── .gitkeep
│   │   ├── security/
│   │   │   └── .gitkeep
│   │   ├── unit/
│   │   │   └── .gitkeep
│   │   └── README.md
│   ├── .env.example
│   ├── pyproject.toml
│   └── README.md
├── config/
│   └── README.md
├── docs/
│   ├── decisions/
│   │   └── README.md
│   ├── architecture-diagram.md
│   ├── architecture.md
│   ├── bootstrap.md
│   ├── conventions.md
│   ├── development-guidelines.md
│   ├── prerequisites.md
│   └── project-structure.md
├── frontend/
│   ├── public/
│   │   └── .gitkeep
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── .gitkeep
│   │   │   ├── (public)/
│   │   │   │   └── .gitkeep
│   │   │   ├── admin/
│   │   │   │   └── .gitkeep
│   │   │   ├── onboarding/
│   │   │   │   └── .gitkeep
│   │   │   ├── student/
│   │   │   │   └── .gitkeep
│   │   │   ├── super-admin/
│   │   │   │   └── .gitkeep
│   │   │   └── teacher/
│   │   │       └── .gitkeep
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── .gitkeep
│   │   │   └── ui/
│   │   │       └── .gitkeep
│   │   ├── features/
│   │   │   └── .gitkeep
│   │   ├── hooks/
│   │   │   └── .gitkeep
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── auth/
│   │   │   │   └── .gitkeep
│   │   │   ├── branding/
│   │   │   │   └── .gitkeep
│   │   │   └── tenancy/
│   │   │       └── .gitkeep
│   │   ├── services/
│   │   │   └── .gitkeep
│   │   ├── styles/
│   │   │   └── theme/
│   │   │       └── README.md
│   │   └── types/
│   │       └── .gitkeep
│   ├── .env.example
│   └── README.md
├── infra/
│   ├── docker/
│   │   └── README.md
│   ├── nginx/
│   │   └── README.md
│   ├── storage/
│   │   └── README.md
│   └── .env.example
├── scripts/
│   └── README.md
├── tests/
│   ├── e2e/
│   │   └── .gitkeep
│   └── README.md
├── .dockerignore
├── .editorconfig
├── .env.example
├── .gitattributes
├── .gitignore
├── .pre-commit-config.yaml
├── docker-compose.yml
└── README.md
```
