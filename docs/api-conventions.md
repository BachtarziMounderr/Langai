# Conventions API HTTP

## Routes et méthodes

Les futures routes métier sont sous `/api/v1` ; la route technique existante `GET /health` reste hors version. Utiliser des noms de ressources au pluriel, par exemple `/api/v1/schools`, `/api/v1/users` et `/api/v1/courses`. Les méthodes suivent leur sens HTTP : `GET` lit, `POST` crée, `PATCH` modifie partiellement, `DELETE` supprime ou déclenche une suppression explicitement documentée. Éviter `/getUsers`, `/createSchool` et les verbes arbitraires dans l’URL. Un endpoint d’action exceptionnel doit correspondre à une opération métier claire et être justifié dans sa documentation.

Choisir des statuts cohérents : `200` lecture/modification, `201` création avec ressource, `204` suppression sans corps, `400` requête sémantiquement invalide, `401` non authentifié, `403` contexte ou permission refusé, `404` ressource absente du périmètre autorisé, `409` conflit d’état, `422` validation d’entrée, `429` limite atteinte et `5xx` erreur serveur. Une ressource privée appartenant à une autre école ne doit pas être confirmée par sa réponse : répondre comme pour une ressource introuvable dans le contexte. La pagination et les quotas s’appliquent aux listes potentiellement grandes.

## Contrats Pydantic et validation

Dans chaque module, nommer les contrats `SchoolCreate`, `SchoolUpdate`, `SchoolRead` (et analogues) lorsque ce domaine existe. Les schémas d’entrée, de sortie et les modèles de persistance sont distincts. Un schéma `Update` décrit les champs modifiables et leur caractère facultatif ; il ne réutilise pas aveuglément `Create`. Définir explicitement les champs de réponse : mot de passe, hash, secret, jeton, identifiant interne sensible et champ d’un autre tenant n’y figurent jamais.

Le frontend peut valider tôt pour guider l’utilisateur, mais **la validation backend est obligatoire et autoritaire**. Pydantic valide les formes et types externes ; le service vérifie les règles métier et permissions. Ne jamais faire confiance à un identifiant tenant, une note, un rôle ou un champ calculé envoyé par le navigateur. Les contrats OpenAPI générés par FastAPI seront la source future des types TypeScript, avec une génération légère ajoutée lorsque les premières routes métier seront stables. D’ici là, garder les types de la page de santé locaux et minimaux ; ne pas installer un générateur maintenant.

## Erreurs

Les futures erreurs métier utilisent des exceptions structurées traduites à la frontière HTTP. Forme cible :

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Ressource introuvable.",
    "details": {}
  }
}
```

Les codes sont stables, en `UPPER_SNAKE_CASE` et indépendants du texte traduit : `RESOURCE_NOT_FOUND`, `PERMISSION_DENIED`, `TENANT_CONTEXT_REQUIRED`, `CONFLICT`, `VALIDATION_ERROR`, `RATE_LIMITED`. `message` reste sûr à afficher ; `details` contient seulement des données utiles et non sensibles. Ne jamais exposer traceback, SQL, secret ou existence d’une ressource d’un autre tenant. Les erreurs de validation FastAPI (`422`) seront adaptées au même contrat au moment de la première API métier ; `/health` et `/docs` conservent leur comportement technique actuel. Les erreurs inattendues sont journalisées côté serveur avec un identifiant de requête à ajouter plus tard, puis renvoient un message générique.

## Listes et pagination

Toutes les listes non bornées (utilisateurs, élèves, cours, conversations, historique) sont paginées côté backend. Convention cible : `limit` avec défaut 20 et maximum 100 ; un `cursor` opaque pour la page suivante, construit à partir d’un tri stable et unique. Réponse : `items` et `next_cursor` (`null` en fin de liste). Le curseur est validé, lié aux filtres et au contexte autorisé ; il ne peut pas servir à traverser un tenant. Les petites listes de référence explicitement bornées peuvent rester non paginées. Les filtres et tris autorisés sont déclarés par endpoint et appliqués après résolution des droits. Éviter une lecture massive suivie d’un filtrage dans le frontend.

## Frontière frontend/backend

Le client HTTP commun vit plus tard dans `frontend/src/lib/api` ; `frontend/src/services` pourra composer ses opérations. Toute requête métier va vers FastAPI, depuis un Client ou Server Component selon le besoin. Les Server Components ne contournent ni la même autorisation ni la séparation des données. Le navigateur n’appelle jamais PostgreSQL, le fournisseur LLM/TTS ou un stockage privé avec des credentials. `NEXT_PUBLIC_*` ne porte que des URLs et paramètres réellement publics. Les erreurs API et la perte de connexion sont affichées honnêtement, sans annoncer une sauvegarde inexistante.
