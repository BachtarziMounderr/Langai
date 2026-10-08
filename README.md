# Lingua AI Platform

Plateforme SaaS d'apprentissage des langues pour écoles et apprenants autonomes. Le MVP couvre **English** et **German** ; les langues sont des données, sans application distincte par langue. Le mode hors ligne est hors scope.

## État de la V1

Le dépôt contient le socle Next.js, FastAPI, PostgreSQL et Redis, l'authentification, le choix de contexte et quatre espaces de rôle. L'espace Étudiant propose une maquette interactive de cours, exercices, progression et conversation avec Gemini (texte et courts échanges vocaux). La fiche PDF de démonstration est accessible depuis la leçon et dans `frontend/public/demo-resources/`. Les espaces Enseignant, Administration scolaire et Super Administration restent provisoires. Les parcours pédagogiques persistants, les permissions métier complètes et le stockage privé de documents restent à développer.

Le contenu de cours, les progrès et les scénarios de la maquette sont décrits dans [la documentation Étudiant](docs/student-demo-v1.md). Le PDF public est seulement une ressource de démonstration : un document scolaire privé nécessitera un accès autorisé côté backend et un stockage compatible S3.

## Architecture

Un frontend **Next.js / React / TypeScript** communique avec un backend **FastAPI / Python**, organisé en monolithe modulaire. **PostgreSQL** stocke les comptes, écoles, contextes et sessions ; **Redis** est disponible pour les futurs traitements. Les données d'école doivent toujours être isolées par tenant. Le branding sera configurable par école, sans fork de l'application. Les appels Gemini et leurs clés restent côté backend.

Lire [l'architecture](docs/architecture.md), les [diagrammes](docs/architecture-diagram.md), le [modèle de données](docs/data-model.md), le [modèle d'autorisation](docs/authorization-model.md), les [conventions](docs/development-guidelines.md) et le [guide de déploiement Vercel](docs/deployment-vercel.md). Les références fonctionnelles externes sont **CAHIER DES CHARGES V1.docx** et **Guide_MVP_Plateforme_Langues_Scalable.pdf** ; elles ne sont pas copiées dans le dépôt. Le scope English/German et la mise en pause de l'offline priment sur leurs mentions antérieures.

## Démarrage local

Installer Docker Desktop. Copier `.env.example` vers `.env`, puis définir localement `POSTGRES_PASSWORD` et un `JWT_SECRET` aléatoire d'au moins 32 caractères. Pour tester Gemini, ajouter `GEMINI_API_KEY` dans ce fichier ignoré par Git. Ne jamais versionner les secrets ni les mots de passe de fixtures.

```powershell
Copy-Item .env.example .env
docker compose config
docker compose up --build -d
docker compose exec backend alembic upgrade head
docker compose ps
```

Le frontend est sur <http://localhost:3000>, l'API sur <http://localhost:8000>, sa documentation sur <http://localhost:8000/docs> et la santé sur <http://localhost:8000/health>. Le PDF de démonstration se trouve sur <http://localhost:3000/demo-resources/Past-Simple-A1-Students-worksheet.pdf>. Le compte Étudiant local est créé par les [fixtures DEV](docs/routing-and-context.md) ; leur mot de passe généré reste dans un fichier ignoré par Git.

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
```

`docker compose down -v` supprime aussi les données locales PostgreSQL et Redis. Pour les contrôles, lancer `ruff check .` et `ruff format --check .` dans `backend/`, puis `pnpm lint`, `pnpm typecheck`, `pnpm test:routing` et `pnpm build` dans `frontend/`.

## Déploiement

La V1 peut être déployée sur Vercel comme **deux projets issus du même dépôt** (`frontend` et `backend`), avec un PostgreSQL hébergé séparément. Le frontend appelle l'API sous sa propre origine grâce aux réécritures Next.js : la session par cookie HttpOnly fonctionne alors sur le domaine Web. Suivre [les étapes détaillées](docs/deployment-vercel.md) pour les variables, les migrations, le compte Étudiant de test et les vérifications du PDF et de Gemini. Aucune clé API ni URL de base contenant des identifiants ne doit être ajoutée aux variables publiques Next.js.

## Structure

`frontend/` contient l'interface et ses ressources publiques ; `backend/` contient FastAPI, ses modules et les migrations ; `infra/` contient les fichiers Docker ; `docs/` les décisions et règles du projet ; `scripts/` les utilitaires ; `tests/` les tests de bout en bout futurs. Aucune logique hors ligne, worker Celery ou stockage S3 actif n'est présent dans cette V1.
