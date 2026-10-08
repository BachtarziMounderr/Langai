# Backend

Application FastAPI : `app.main:app`, `GET /health` non versionné et les cinq routes `/api/v1/auth`. CORS autorise seulement `FRONTEND_URL` pour GET/POST, les en-têtes requis et les cookies de refresh. Voir [authentication.md](../docs/authentication.md).

Le socle PostgreSQL contient les modèles SQLAlchemy des six domaines initiaux et les migrations Alembic. Le module `identity` ajoute les mots de passe Argon2id, les sessions et JWT. `app/integrations` et `app/workers` restent réservés. Aucune route métier, tâche Celery ni SDK externe n’est ajouté. Voir [database.md](../docs/database.md) pour le schéma.

Depuis ce dossier : `python -m venv .venv`, puis `.\.venv\Scripts\python.exe -m pip install -e .` et `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`. La connexion hôte PostgreSQL utilise `DATABASE_URL` avec `localhost:55432` ; Docker fournit son URL interne. Voir [bootstrap.md](../docs/bootstrap.md).

Pour contribuer, installer les outils optionnels avec `.\.venv\Scripts\python.exe -m pip install -e ".[dev]"`, puis exécuter `.\.venv\Scripts\ruff.exe check .` et `.\.venv\Scripts\ruff.exe format --check .`. Les [conventions de modules](../docs/code-conventions.md), [API](../docs/api-conventions.md) et [tenancy](../docs/security-rules.md) s’appliquent aux fonctionnalités futures.
