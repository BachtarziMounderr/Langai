# Authentification — étape 8

Ce socle identifie un compte global ; il n'accorde aucun rôle, permission ou accès à une école. Les règles de [tenancy](architecture.md), d'[autorisation](authorization-model.md) et de [sécurité](security-rules.md) restent à appliquer à chaque future route métier. Le choix de transport est consigné dans [ADR-003](decisions/ADR-003-browser-auth-session.md).

## Identité et mots de passe

`users.password_hash` existait dans le modèle initial. `users.must_change_password` est ajouté avec valeur initiale `false`. Le hasher abstrait du module `identity` utilise Argon2id, un sel aléatoire et une vérification via la bibliothèque maintenue `argon2-cffi`. Un hash ancien est recalculé à la connexion si ses paramètres sont dépassés. Aucun mot de passe ou hash n'est retourné dans les réponses.

Seul `ACTIVE` peut se connecter. `PENDING` et `SUSPENDED` sont refusés avec le même message générique que des identifiants incorrects. Le modèle validé ne contient pas `DISABLED` ; aucun nouveau statut n'a été introduit. La création/import scolaire et l'envoi d'un mot de passe temporaire appartiennent à l'onboarding futur. Lorsqu'un compte `ACTIVE` possède déjà un hash de mot de passe temporaire et `must_change_password=true`, il peut se connecter, lire `/me` et changer son mot de passe. La dépendance standard `get_current_user` refuse **par défaut** l'accès aux futures routes applicatives normales tant que ce drapeau reste actif ; `/me` et `/change-password` utilisent la dépendance plus limitée `get_authenticated_user`. Aucune route métier n'existe encore. Le changement exige l'ancien mot de passe, remplace son hash, enlève le drapeau et révoque toutes les sessions : une nouvelle connexion est nécessaire.

## Access et refresh

Les JWT HS256 contiennent uniquement `iss`, `aud`, `sub` (UUID utilisateur), `sid` (UUID session), `type`, `jti`, `iat` et `exp`. Le backend vérifie signature, expiration, émetteur, destinataire, type et session active. Le statut du compte est relu à chaque appel protégé. Aucun rôle, tenant ni permission n'est copié dans le JWT.

L'access token dure 15 minutes par défaut, reste **en mémoire JavaScript** et passe dans `Authorization: Bearer`. Le refresh token dure 14 jours par défaut et est envoyé seulement via le cookie `lingua_refresh`, `HttpOnly`, `SameSite=Lax`. Depuis l'étape 9, son chemin est `/` pour permettre la vérification du routing côté serveur Next.js ; voir [ADR-004](decisions/ADR-004-server-routing-session.md). `Secure` est activé hors environnement `development` ; la production doit utiliser HTTPS et déployer frontend et API sous le même site. Aucune session ou refresh token n'est stocké dans `localStorage`.

La table `auth_sessions` conserve l'UUID utilisateur, le hash SHA-256 du **JWT refresh complet**, l'expiration et la révocation ; elle ne conserve jamais le token brut. `POST /refresh` verrouille la session, compare l'empreinte et remplace le token. Une réutilisation de l'ancien token révoque la session. `POST /logout` révoque la session reconnue et efface le cookie ; l'access token de cette session cesse aussi de fonctionner. Un compte suspendu ou un changement de mot de passe invalide les accès existants. Une rotation simultanée depuis deux onglets peut être traitée comme une réutilisation et fermer la session ; ce cas sera à traiter si l'usage multi-onglets le rend fréquent.

## Cookies, CSRF et CORS

Les mutations qui s'authentifient par cookie (`refresh`, `logout`) exigent **à la fois** `Origin` égal exactement à `FRONTEND_URL` et l'en-tête `X-Requested-With: XMLHttpRequest`. Cet en-tête déclenche un prévol CORS pour l'origine frontend autorisée ; `SameSite=Lax` apporte une protection complémentaire. CORS autorise seulement `FRONTEND_URL`, les méthodes GET/POST et les en-têtes nécessaires, avec credentials. Dans le développement local, `http://localhost:3000` et `http://localhost:8000` sont de la même famille de site malgré leurs ports différents. La topologie de production devra préserver un même site HTTPS ; un domaine frontend réellement distinct nécessitera une nouvelle décision cookie/CSRF avant déploiement.

## Endpoints

| Route | Entrée | Effet / sortie |
| --- | --- | --- |
| `POST /api/v1/auth/login` | email, password | access token JSON, `must_change_password`, cookie refresh |
| `POST /api/v1/auth/refresh` | cookie refresh et en-têtes CSRF | nouvel access token et nouveau cookie |
| `POST /api/v1/auth/logout` | cookie refresh et en-têtes CSRF | révocation, 204 et suppression du cookie |
| `POST /api/v1/auth/change-password` | bearer, ancien et nouveau mot de passe | hash remplacé, sessions révoquées, 204 |
| `GET /api/v1/auth/me` | bearer | ID, email, noms, statut, drapeau de changement |
| `GET /api/v1/auth/session` | cookie refresh, lecture sans rotation | identité, rôles globaux et contextes de routing actifs ; aucun token |

Les erreurs auth utilisent l'enveloppe `{ "error": { "code", "message", "details" } }`. Login invalide ne révèle ni existence d'email ni état du compte. Les réponses auth et erreurs auth portent `Cache-Control: no-store`. Les réponses n'exposent pas `password_hash`.

## Configuration et opérations

Variables côté backend : `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (défaut 15), `JWT_REFRESH_TOKEN_EXPIRE_DAYS` (défaut 14), `FRONTEND_URL`, `ENVIRONMENT`. `JWT_SECRET` doit être généré aléatoirement (au moins 32 octets), gardé dans `.env` local ou un gestionnaire de secrets et identique entre processus backend qui valident les tokens. Compose exige qu'il soit défini. Une rotation du secret invalide tous les JWT existants. Aucune variable `JWT_*` n'est publique au frontend.

Après `docker compose up -d --build` :

```powershell
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
docker compose ps
```

Le CLI `python -m app.modules.identity.dev_cli --email vous@example.test` demande le mot de passe sans l'inscrire dans l'historique du shell, crée uniquement un compte de développement actif et refuse tout autre `ENVIRONMENT`. L'option `--temporary` active le changement obligatoire. Ce CLI n'attribue aucun rôle ou membership et refuse de modifier un compte existant. Aucun Super Admin n'est créé à cette étape. Le premier Super Admin devrait être créé **plus tard** par une commande d'amorçage à usage contrôlé, après le seed des rôles, qui vérifie l'absence d'un premier titulaire, exige une identité préexistante confirmée et journalise l'attribution ; aucun endpoint public ni compte codé en dur.

La migration `d28b7d480e21_add_authentication_sessions` ajoute le drapeau et la table sans modifier la migration initiale. Son downgrade supprime les sessions et le drapeau ; ne l'exécuter que sur une base de développement sans session utile. Le rate limiting du login, l'invitation/activation, la durée absolue des sessions, la politique multi-onglets et le bootstrap opérationnel Super Admin restent ouverts avant le pilote réel.
