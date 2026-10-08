# ADR-001 — Tenant école et espace personnel

- Statut : décision de conception pour l’étape 5 ; à valider avant les modèles SQLAlchemy.
- Date : 1 octobre 2026.
- Références : [architecture](../architecture.md), [modèle de données](../data-model.md), cahier des charges §4, §22–26, §28–30 et guide MVP §4–6.

## Contexte

Une identité peut appartenir à plusieurs écoles et apprendre aussi hors école. Les données d’une école ne doivent pas devenir visibles dans une autre ou dans l’espace personnel par simple identité commune. L’architecture précédente proposait `tenant_id` technique, `school_id` fonctionnel et un tenant personnel ; elle ne fixait pas encore le schéma relationnel.

## Options comparées

| Option | Avantages | Coûts et risques |
| --- | --- | --- |
| A — `School = tenant`, sans table tenant ; apprentissage personnel avec `school_id` nul | Moins de tables et de jointures pour les seules écoles | `NULL` confondrait espace personnel et contexte oublié ; références et index des états d’apprentissage auraient deux formes ; séparation des progressions plus fragile |
| B — `tenants` de type `SCHOOL` ou `PERSONAL`, école liée 1:1 | Toute donnée pédagogique privée porte un `tenant_id` non nul ; même contrat de contexte pour école et autonome ; un utilisateur conserve une seule identité | Une table et une résolution de contexte supplémentaires ; propriété du tenant personnel à vérifier |
| C — propriétaire polymorphe (`owner_type`, `owner_id`) ou espaces génériques | Souplesse pour d’autres propriétaires | FK réelle impossible sur un identifiant polymorphe ; règles plus complexes sans besoin MVP établi |

## Décision

Retenir **B**, avec une simplification : `schools.id` est aussi la clé du tenant `SCHOOL` correspondant (`schools.id → tenants.id`). Il n’existe pas deux UUID indépendants à transporter pour une école. Un tenant `PERSONAL` a `owner_user_id` unique et aucune ligne `schools`. Un même `users.id` peut avoir un tenant personnel et plusieurs `school_memberships`.

Les tables purement scolaires portent `school_id` (`classes`, `groups`, affectations, inscriptions, branding) ; les états d’apprentissage privés portent `tenant_id` (`user_language_profiles`, futurs progrès, SRS et conversations). Les cours portent `school_id` seulement pour les scopes `SCHOOL` et `CLASS`, sans `tenant_id` redondant. La résolution `school_id → tenant_id` reste vraie et, pour un tenant école, les valeurs UUID sont identiques. Le backend ne reçoit ni ne fait confiance à un couple indépendant envoyé par le client.

Le tenant est un **contexte de sécurité et de données**, pas une seconde identité utilisateur. Une école et son tenant sont créés dans une transaction. Une contrainte de FK garantit qu’une école pointe vers un tenant existant ; une règle de service vérifie son type `SCHOOL` et la réciproque « tout tenant SCHOOL possède une école ». Cette réciproque ne découle pas d’une simple FK. Le type d’un tenant devient immuable après création.

## Progression et partage entre contextes (A03)

Un profil `user_language_profiles` est unique par `(tenant_id, user_id, language_id)`. Dans **un même tenant**, Parcours École et Parcours Communication peuvent alimenter ce profil et, plus tard, les mêmes connaissances SRS validées. Le profil personnel et celui de School A pour la même langue restent distincts. Une appartenance à School B n’autorise ni lecture ni fusion des données de School A. Aucun transfert implicite d’une conversation, d’un score ou d’une notion privée.

Le CDC demande un pont pédagogique entre les deux parcours ; cette décision le préserve **dans le même contexte**. Un pont entre contexte scolaire et personnel devra être défini par le produit : quelles notions sont transférables, dans quel sens, avec quel consentement et quelle visibilité pour l’école. Ne pas implémenter de fusion avant cet arbitrage. Deux options à valider :

- A03a — pont uniquement intra-tenant, simple et sûr ; le personnel reste indépendant.
- A03b — transfert explicite de certains acquis vers le personnel, avec consentement, provenance et exclusion des données scolaires privées ; plus utile potentiellement, mais exige une politique de droits et de rétention.

**Recommandation : A03a pour le premier modèle.** A03b demande validation produit avant son implémentation. Cette décision ne retire pas le pont entre les deux parcours lorsqu’ils sont utilisés dans une école ou dans l’espace personnel.

## Conséquences et preuve attendue

- Requêtes privées bornées par le contexte vérifié ; les données scolaires sont aussi limitées par membership, permission et affectation/propriété. Les FK composites des relations scolaires empêchent de relier une classe de A à un membership de B.
- L’intégrité « utilisateur propriétaire du tenant personnel » et « profil scolaire appuyé par un membership actif » doit être contrôlée transactionnellement par les services ; les FK seules ne la prouvent pas.
- Tests avec deux écoles, une personne multi-écoles et un profil personnel avant toute mise en service réelle. Le cache, les jobs et les médias futurs reprennent le même contexte.
- PostgreSQL RLS renforcera l’isolation après conception des rôles DB et du pooling ; il n’est ni configuré ni réputé actif ici. La cible de l’architecture reste de l’activer et de le tester avant un pilote avec des données réelles.

Cette précision remplace la lecture littérale « `tenant_id` et `school_id` sur chaque ligne ». Elle conserve la frontière de sécurité de l’architecture et des règles existantes. Aucun schéma SQL ni donnée n’est créé par cet ADR.
