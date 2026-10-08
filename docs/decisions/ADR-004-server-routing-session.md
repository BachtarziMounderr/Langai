# ADR-004 — lecture de session pour le routing serveur

**Statut :** retenu pour l’étape 9, 2 octobre 2026.

## Contexte

ADR-003 garde l’access JWT en mémoire du navigateur et le refresh JWT dans un cookie HttpOnly limité auparavant à `/api/v1/auth`. Un Server Component Next.js ne reçoit donc ni l’access token ni ce cookie sur `/student`, `/teacher`, `/admin` ou `/super-admin`. Le rendu protégé avant affichage exige une lecture de session côté serveur.

## Décision

Le cookie refresh conserve HttpOnly, SameSite=Lax et Secure hors développement, mais son chemin devient `/` pour atteindre Next.js sur les routes applicatives. Next.js transmet seulement ce cookie à `GET /api/v1/auth/session` via l’URL interne du backend. FastAPI vérifie signature, expiration, empreinte du refresh courant, session non révoquée et compte actif, puis relit rôles et contextes actifs en base. Cette lecture ne fait **aucune rotation** et ne retourne aucun token. Les POST `/refresh` et `/logout` conservent la vérification Origin et l’en-tête non simple d’ADR-003. L’access JWT reste exclusivement en mémoire et continue à servir aux appels API depuis le navigateur.

Le contexte choisi est un identifiant opaque dans un cookie de navigation posé par une Server Action Next.js. Ce cookie ne contient aucun secret et est effacé côté client à la connexion et à la déconnexion. Cet identifiant n’est jamais une preuve d’autorisation : chaque rendu relit les choix valides du backend et compare le choix actif. Les opérations métier futures résoudront de nouveau le tenant et les droits côté FastAPI. Aucun rôle n’est ajouté au JWT.

## Conséquences

Le cookie refresh est transmis au serveur frontend sur les routes du même hôte ; ce serveur doit être de confiance, ne jamais journaliser le cookie et ne jamais mettre en cache la réponse de session. Les réponses portent `Cache-Control: no-store`. Le cookie de l’ancien chemin est supprimé à la prochaine connexion ou rotation. Les sessions existantes devront se reconnecter si leur ancien cookie n’atteint pas Next.js. La stratégie de déploiement sous un même site HTTPS reste nécessaire. Une lecture de session ajoute une requête FastAPI et des lectures SQL au rendu protégé. Une API indisponible produit une page d’erreur explicite. Le cookie de navigation peut être périmé après révocation d’un rôle ; dans ce cas le sélecteur est affiché de nouveau.
