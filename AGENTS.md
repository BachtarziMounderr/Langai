# Instructions du dépôt Lingua AI Platform

Avant de modifier du code, lire `docs/architecture.md`, `docs/development-guidelines.md`, `docs/code-conventions.md`, `docs/api-conventions.md` et `docs/security-rules.md`. Les instructions explicites de l’utilisateur et les décisions de scope les plus récentes priment.

- Conserver un frontend Next.js et un backend FastAPI en monolithe modulaire. Placer le métier dans `backend/app/modules/<domaine>/` selon la convention documentée.
- Toute donnée privée d’école exige un contexte tenant vérifié côté backend. `school_id` est résolu vers le `tenant_id` technique ; aucun contournement pour simplifier une requête.
- Le frontend n’accède ni à PostgreSQL, ni aux fournisseurs LLM/TTS, ni aux secrets. Les permissions, transactions et validations autoritaires restent dans FastAPI.
- English et German sont le scope MVP actuel, géré par données configurables. Aucun code ou dossier métier par langue. Aucun composant offline/PWA.
- Ne pas ajouter de dépendance, de migration, de modèle ou de fonctionnalité sans besoin dans la tâche en cours. Documenter tout changement architectural important dans `docs/decisions/`.
- Avant de conclure, exécuter les contrôles applicables : Ruff lint/format dans `backend/`, ESLint/TypeScript dans `frontend/`, puis les vérifications Docker si l’environnement a été touché.
