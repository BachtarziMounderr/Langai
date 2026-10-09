# Déployer la V1 de démonstration sur Vercel

Cette V1 comprend un frontend Next.js, une API FastAPI, une base PostgreSQL, une ressource PDF publique et une conversation Gemini. Le dépôt reste un monolithe modulaire : Vercel héberge deux projets issus du même dépôt Git. Redis et Celery ne sont pas utilisés par cette démonstration hébergée.

## 1. Avant le déploiement

- Pousser ce dépôt dans un **repository privé**. Aucun fichier `.env` ni mot de passe de fixture ne doit être ajouté à Git.
- Créer une base PostgreSQL persistante chez un fournisseur compatible (par exemple via une intégration Vercel Marketplace). Relever son URL de connexion TLS pour `DATABASE_URL`. Vercel ne fournit plus de nouveau Vercel Postgres natif.
- Préparer une valeur aléatoire de `JWT_SECRET` d'au moins 32 caractères, une clé Gemini active, et un mot de passe fort pour le seul compte Étudiant de démonstration. Garder ces valeurs hors du dépôt.

## 2. Créer les deux projets Vercel

Importer **deux fois le même repository** dans Vercel :

| Projet | Root Directory | Framework | Variables de production |
| --- | --- | --- | --- |
| API | `backend` | FastAPI / Python | `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `ENVIRONMENT=production`, `GEMINI_API_KEY` |
| Web | `frontend` | Next.js | `BACKEND_INTERNAL_URL` |

L'entrée API est `backend/index.py`, qui expose l'application `app.main.app`. Le frontend utilise la réécriture Next.js `/api/v1/*` et `/health` vers `BACKEND_INTERNAL_URL`. Dans le projet Web, **laisser `NEXT_PUBLIC_API_BASE_URL` non défini** : le navigateur doit appeler son propre domaine. Ne jamais placer la clé Gemini, `DATABASE_URL` ou `JWT_SECRET` dans les variables `NEXT_PUBLIC_*`.

Créer les projets et relever leurs URL fixes avant de renseigner les variables :

- `FRONTEND_URL=https://<domaine-web>` sur l'API, **sans barre finale**. Cette origine exacte est requise par la protection CSRF existante.
- `BACKEND_INTERNAL_URL=https://<domaine-api>` sur le Web, sans barre finale.
- `DATABASE_URL` doit pointer vers la base hébergée, avec TLS selon le fournisseur. Si un pooler PostgreSQL est fourni, utiliser son URL compatible avec SQLAlchemy/psycopg.
- `GEMINI_MODEL` et `GEMINI_TTS_MODEL` sont facultatifs ; les valeurs par défaut sont décrites dans `docs/student-demo-v1.md`.

Déployer l'API, puis le Web. Une modification des variables Vercel exige un nouveau déploiement. Le fichier PDF placé dans `frontend/public/demo-resources/` est inclus dans le projet Web.

## 3. Initialiser la base une seule fois

Depuis un environnement local de confiance disposant de Python 3.13 et des dépendances `backend/`, définir temporairement `DATABASE_URL` vers la base hébergée. Exécuter depuis `backend/` :

```powershell
python -m alembic upgrade head
python -m app.modules.identity.bootstrap_demo_student --email etudiant-demo@example.com --school-name "École démo" --school-slug ecole-demo
```

La seconde commande demande le mot de passe dans le terminal, sans argument ni fichier versionné. Elle crée une école et **un seul compte STUDENT**, sans administrateur. Choisir une adresse contrôlée et un mot de passe unique d'au moins 12 caractères. Ne pas exécuter les fixtures DEV sur la base hébergée. Le script refuse les doublons d'email ou de slug ; il n'est pas destiné à être relancé à chaque déploiement. Supprimer la variable `DATABASE_URL` de la session locale après ces commandes.

## 4. Vérifier la V1 publiée

1. Ouvrir `https://<domaine-api>/health` : réponse HTTP 200.
2. Ouvrir `https://<domaine-web>/demo-resources/Past-Simple-A1-Students-worksheet.pdf` : le navigateur affiche le PDF de démonstration.
3. Se connecter à `https://<domaine-web>/login` avec le compte créé. Le contexte doit mener à `/student`.
4. Ouvrir la leçon et sa ressource PDF depuis `/student/learn`.
5. Envoyer un message texte depuis `/student/practice`. Tester ensuite le micro avec l'autorisation du navigateur. Le texte requiert une clé Gemini active ; l'audio dépend de l'accès au modèle TTS. Le navigateur peut lire la réponse texte en secours.
6. Vérifier que l'API renvoie une erreur de droits sans connexion ou sans contexte Étudiant valide. La clé Gemini reste côté FastAPI.

## Contraintes actuelles

- `FRONTEND_URL` accepte une seule origine exacte. Les URL de Preview Vercel qui changent à chaque branche ne permettent pas une session authentifiée sans configuration d'origine correspondante. Tester d'abord le domaine de production stable.
- Le PDF de démonstration est **public** car servi depuis `public/`. Ne pas y déposer de documents scolaires privés. Leur accès demandera plus tard l'API autorisée et un stockage S3 compatible.
- Les conversations, scores et progrès de cette maquette ne constituent pas encore un moteur pédagogique persistant. Les requêtes vocales utilisent les limites des fonctions Vercel, notamment la taille de charge utile de 4,5 Mo ; l'application limite déjà les enregistrements à 1,5 Mo.
- PostgreSQL hébergé est obligatoire pour l'authentification. Redis, les workers Celery et le stockage S3 ne sont pas nécessaires pour tester cette V1.

Références : [monorepos Vercel](https://vercel.com/docs/monorepos), [FastAPI sur Vercel](https://vercel.com/docs/frameworks/backend/fastapi), [réécritures Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites), [variables Vercel](https://vercel.com/docs/environment-variables), [Postgres sur Vercel](https://vercel.com/docs/postgres), [limites des fonctions](https://vercel.com/docs/functions/limitations).


## Publication de la V2 visuelle

La V2 conserve les API, la base hébergée et le compte Étudiant de démonstration existants. Elle ajoute le thème navy/gold, les photos fournies, la cohérence des pages Student et login et les apparitions uniques au scroll. Les migrations et les variables Vercel restent identiques.

- `main` : version publiée sur le domaine de production existant.
- `v2` : branche de travail de la V2, également poussée sur GitHub.
- `v1` : version locale préservée au commit `3fe35d9`, dans `C:/Users/bacht/Desktop/lingua-ai-platform-v1`.
- V2 locale : `C:/Users/bacht/Desktop/lingua-ai-platform`.
- Connexion hébergée : `https://frontend-seven-lime-44.vercel.app/login`.
- API hébergée : `https://backend-three-eta-99.vercel.app/health`.

Les identifiants du compte hébergé restent dans `backend/.env.production.local`, ignoré par Git : `DEMO_STUDENT_EMAIL` et `DEMO_STUDENT_PASSWORD`. Les fixtures DEV locales ne sont pas les identifiants de la base Neon. Aucun mot de passe n'est publié dans ce document.

### Revenir à V1 localement

V1 et V2 restent dans deux dossiers distincts. Une seule version utilise les ports locaux 3000/8000 à la fois. Pour tester V1 sur les services et volumes locaux existants :

```powershell
cd C:\Users\bacht\Desktop\lingua-ai-platform-v1
docker compose -p lingua-ai-platform --env-file ..\lingua-ai-platform\.env up -d --build
```

Pour revenir à V2 :

```powershell
cd C:\Users\bacht\Desktop\lingua-ai-platform
docker compose -p lingua-ai-platform up -d --build
```

Le nom de projet Docker reste identique pour conserver les volumes locaux. Le fichier d'environnement existant reste hors de Git ; ne pas supprimer les volumes pour changer de présentation. Ces commandes basculent uniquement l'environnement local. La publication Vercel est pilotée par `main`.
