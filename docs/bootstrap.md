# Démarrer le socle de développement

## Mode A — tout avec Docker Compose

Depuis la racine du dépôt, copier `.env.example` vers `.env`, puis définir `POSTGRES_PASSWORD` avec une valeur alphanumérique locale. `.env` reste ignoré par Git. Docker Compose injecte `DATABASE_URL=postgresql://…@postgres:5432/…` et `REDIS_URL=redis://redis:6379/0` au backend ; aucune connexion métier n’est encore ouverte.

```powershell
Copy-Item .env.example .env
# Éditer .env pour définir POSTGRES_PASSWORD.
docker compose config
docker compose up --build -d
docker compose ps
```

Vérifier <http://localhost:3000>, <http://localhost:8000/health> et <http://localhost:8000/docs>. La page Next.js interroge `/health` depuis le navigateur et doit afficher `Backend: ok`. Les quatre services doivent apparaître `healthy` dans `docker compose ps`.

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose up --build -d
docker compose down
docker compose down -v  # suppression volontaire des volumes et données locales
```

Le bind mount des sources et le polling de fichiers permettent le rechargement sur Windows/Docker Desktop. Les ports des quatre services sont liés à `127.0.0.1`, donc accessibles à la machine locale seulement. Les noms `postgres` et `redis` fonctionnent dans Compose ; dans un processus hôte, utiliser `localhost`.

## Mode B — données dans Docker, applications sur l’hôte

Ce mode exige pnpm 11.19.0 dans le PATH, Python 3.13 et l’accès aux registres de paquets. Après préparation du même `.env` :

```powershell
docker compose up -d postgres redis
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Dans un deuxième terminal PowerShell à la racine :

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .
$env:FRONTEND_URL = 'http://localhost:3000'
$env:DATABASE_URL = 'postgresql://lingua:VOTRE_MOT_DE_PASSE@localhost:55432/lingua'
$env:REDIS_URL = 'redis://localhost:6379/0'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Remplacer la valeur de démonstration par le mot de passe de `.env` sans l’inscrire dans Git. La page frontend utilise `http://localhost:8000` par défaut. La commande backend n’a pas besoin de PostgreSQL ou Redis pour répondre à `/health` ; les URLs sont préparées pour la suite.

Le frontend n’accède jamais directement à PostgreSQL ou au fournisseur LLM. Toute future logique métier et toute isolation tenant seront assurées dans FastAPI. Les langues et le branding resteront des données configurables. Aucun composant offline n’est préparé.
