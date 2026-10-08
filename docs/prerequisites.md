# Prérequis et versions

Contrôle local du 1er octobre 2026 : Git 2.50.1, Docker CLI et moteur 29.5.2, Compose 5.1.4, Node hôte 22.17.1, npm 10.9.2, Python hôte 3.13.5 et pip 25.3. pnpm 11.19.0 a été installé via Corepack dans le répertoire npm de l’utilisateur, sans modifier l’installation Node sous Program Files.

Les images Docker utilisent Node 24.21.0 LTS, Python 3.13, PostgreSQL 18.6 et Redis 8.10.2. Le frontend fixe Next.js 16.3.8, React 19.3.0, TypeScript 5.9.3 et pnpm 11.19.0. Le backend fixe FastAPI 0.142.2, Pydantic 2.13.5 et Uvicorn 0.54.0. TypeScript 5.9 a été retenu car la version 7 dépasse la plage officiellement prise en charge par typescript-eslint utilisée par la configuration Next.js.

Pour le mode tout Docker : Docker Desktop en marche, Compose, ports locaux 3000/8000/5432/6379 libres et accès aux registres d’images/paquets. Pour le mode hôte : pnpm 11.19.0 dans le PATH et Python 3.13. GitHub CLI, uv et Poetry ne sont pas requis. PostgreSQL et Redis n’ont pas à être installés nativement.

Avant toute utilisation, vérifier de nouveau : `docker info`, `docker compose version`, `pnpm --version` (mode hôte), puis suivre [bootstrap.md](bootstrap.md). Le fichier `frontend/pnpm-lock.yaml` est généré et doit être versionné avec `package.json` ; ne pas le modifier manuellement.
