# Configuration des environnements

Le `.env.example` racine sert de modèle local. Les valeurs non secrètes de développement peuvent y figurer ; les clés et secrets restent vides. Copier ce fichier en `.env` ignoré par Git et renseigner `POSTGRES_PASSWORD`. Les exemples sous `frontend/`, `backend/` et `infra/` restent des catalogues de noms, sans chargement automatique.

Compose construit et transmet au backend les URLs internes `postgres:5432` et `redis:6379`. Pour un backend exécuté sur Windows, utiliser `localhost` et les ports publiés. `FRONTEND_URL` pilote l’origine CORS autorisée. `BACKEND_URL` est une URL accessible depuis le navigateur ; Compose la transmet au frontend comme `NEXT_PUBLIC_API_BASE_URL`. Aucune variable de langue ou d’école n’est codée en dur.

Les variables NEXT_PUBLIC_* sont visibles par le navigateur : ne jamais y placer de secret. Les variables LLM, TTS, S3 et e-mail ne sont pas utilisées dans ce socle. Les valeurs de production demanderont une gestion de secrets distincte.
