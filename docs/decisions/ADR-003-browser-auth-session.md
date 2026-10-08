# ADR-003 — session navigateur et refresh révocable

**Statut :** retenu pour le socle d'authentification de l'étape 8.

## Contexte

Le frontend Next.js et FastAPI sont sur deux ports locaux, avec une cible de déploiement sous un même site HTTPS. L'architecture demande des access tokens courts, des refresh tokens rotatifs, des sessions révocables et aucun refresh persistant dans `localStorage`. L'autorisation par école reste indépendante de l'identité.

## Décision

L'access JWT est renvoyé en JSON et conservé seulement en mémoire du navigateur. Le refresh JWT est limité à un cookie HttpOnly, SameSite=Lax et Secure hors développement. FastAPI conserve le hash du refresh courant par session, le remplace à chaque refresh et révoque la session en cas de réutilisation. Chaque access JWT porte un identifiant de session ; chaque requête protégée vérifie en base le compte actif et la session non révoquée. Les routes basées sur le cookie exigent Origin exact et en-tête non simple ; CORS n'autorise que le frontend configuré.

## Conséquences

Le navigateur récupère un nouvel access token après rechargement via `/refresh`. Logout, suspension et changement de mot de passe invalident les access tokens de la session, au prix d'une lecture SQL sur les requêtes protégées. Le cookie fonctionne en local entre les deux ports `localhost` et en production si frontend et API partagent un site HTTPS. Le déploiement sur deux sites distincts demandera une nouvelle décision sur le transport et la protection CSRF. L'identifiant de session n'accorde ni rôle ni accès tenant.
