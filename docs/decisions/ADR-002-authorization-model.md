# ADR-002 — RBAC contextualisé et contrôles de ressource

- Statut : décision de conception de l’étape 6 ; à valider avant implémentation.
- Date : 2 octobre 2026.
- Références : [architecture](../architecture.md), [modèle de données](../data-model.md), [modèle d’autorisation](../authorization-model.md), [matrice](../permission-matrix.md), [ADR-001](ADR-001-tenant-model.md).

## Contexte

Le cahier des charges exige quatre rôles, des enseignants limités à leurs classes, des permissions variables pour ajout d’élèves et publication, plusieurs écoles par identité et des apprenants autonomes. Un rôle seul ne peut pas exprimer simultanément école, affectation, inscription, auteur et confidentialité d’une conversation. Les tables de l’étape 5 prévoient rôles de plateforme/école, permissions, droits par rôle et grants de membership, sans table ACL par ressource.

## Options examinées

| Option | Avantage | Risque/coût |
| --- | --- | --- |
| Rôles seuls | Simple à expliquer | TEACHER deviendrait trop large ou exigerait des conditions dispersées ; droits variables difficiles |
| RBAC + rôles de membership + grants positifs bornés + gardes de ressource | Utilise les tables déjà proposées ; permet multi-écoles et exceptions professeur sans accès transversal | Nécessite des vérifications cohérentes dans chaque cas d’usage et des tests A/B |
| Moteur ACL/ABAC générique avec ALLOW, DENY, priorité et héritage | Très flexible | Complexité et ambiguïtés inutiles pour le MVP, risque de mauvaises combinaisons |

## Décision

Retenir la deuxième option. `SUPER_ADMIN` est attribué globalement ; `SCHOOL_ADMIN`, `TEACHER` et `STUDENT` sont attribués au membership d’une école. `role_permissions` donne les capacités par défaut du rôle. Les seuls grants individuels initiaux possibles pour un TEACHER sont `school:students:create`, `school:students:import` et `school:content_school:publish` dans **son** école. Les grants sont **ALLOW only**, sans DENY individuel ni hiérarchie entre écoles. Ils n’enlèvent jamais la vérification de classe assignée, d’auteur, de publication ou de confidentialité.

Les politiques `SELF` reposent sur l’identité, l’inscription et la propriété d’un tenant personnel ; elles ne nécessitent pas un rôle fictif `PERSONAL_STUDENT` ni une nouvelle valeur `permissions.scope`. Les permissions persistées ont seulement scope `PLATFORM` ou `SCHOOL`, conformément au modèle de données. Les scopes effectifs `SELF`, `ASSIGNED_CLASS`, `SCHOOL` et `PLATFORM` sont des gardes calculés pour une opération et une ressource.

Un rôle global n’est pas une autorisation de franchir toutes les frontières tenant. Les opérations de plateforme sont nommées et séparées des routes scolaires. `platform:analytics:read` couvre des agrégats autorisés, pas les dossiers ou conversations bruts ; `platform:users:suspend` agit sur un compte global, tandis que l’admin d’école peut seulement suspendre son membership. Tout éventuel accès support individuel exige une décision, une permission dédiée, une finalité, une trace et une politique de données avant création. Un School Admin peut attribuer les rôles STUDENT/TEACHER et les trois grants enseignants autorisés, mais pas SCHOOL_ADMIN, SUPER_ADMIN ni ses propres privilèges. L’association des School Admin relève d’une opération de plateforme explicite. L’attribution du premier SUPER_ADMIN relève d’une procédure d’amorçage à définir.

## Conséquences

- Chaque route et cas d’usage futur nomme sa permission et son garde de ressource ; `require_permission` seul ne suffit pas. Refus par défaut, avec contexte actif vérifié côté FastAPI.
- Un changement de rôle, grant, membership ou affectation prend effet sur les requêtes suivantes ; caches et tokens ne sont pas l’autorité de décision.
- Les futures tables de résultats/progression conservent assez de provenance (classe, cours, tenant) pour éviter qu’un enseignant d’une classe voie des activités d’une autre classe d’un élève commun. Les agrégats sans provenance filtrable ne sont pas exposés au professeur.
- Les conversations IA brutes sont `SELF` par défaut. Les enseignants et admins voient des signaux pédagogiques dérivés et nécessaires, pas les messages complets. Un autre choix demande un arbitrage produit explicite.
- Les règles `School → Class → Group` sont suivies provisoirement ; une restriction professeur à quelques groupes nécessitera une affectation supplémentaire, pas un raccourci de permission.
- Le catalogue et la matrice documentent les futurs seeds ; aucun seed, middleware, endpoint, table ou audit log n’est créé ici.

## Vérification avant pilote

Tester écoles A/B, identifiants croisés, utilisateur multi-écoles, rôle global avec et sans membership scolaire, tenant personnel, révocation de grant/affectation, contenus aux trois scopes, publications et lectures de données pédagogiques. Les politiques RLS restent la cible supplémentaire fixée par l’architecture avant un pilote avec données réelles. Cette décision n’ajoute pas d’exception à cette cible.
