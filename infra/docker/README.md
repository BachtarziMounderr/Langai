# Docker de développement

Le fichier Compose unique est `docker-compose.yml` à la racine. Il lance `frontend`, `backend`, `postgres` et `redis` sur le réseau Compose par défaut. Les Dockerfiles de développement vivent dans `frontend/` et `backend/`. Les sources sont montées pour le reload ; PostgreSQL, Redis et les dépendances Node utilisent des volumes nommés.

PostgreSQL 18 monte son volume sur `/var/lib/postgresql`, conformément au layout de l’image 18. Les ports sont publiés uniquement sur `127.0.0.1` pour le workflow hôte. Le port hôte PostgreSQL est 55432 sur ce PC, car Windows refuse 5432 ; dans le réseau Compose, PostgreSQL reste sur `postgres:5432`. `docker compose down -v` détruit les données locales. Nginx, workers Celery, stockage S3 et optimisations d’image de production restent hors de cette étape.
