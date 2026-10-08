# Décisions d’architecture

La référence actuelle est [architecture.md](../architecture.md), issue du cahier des charges complet, du guide MVP et des décisions de scope du 30 septembre 2026. Les [diagrammes](../architecture-diagram.md) présentent les composants et les frontières de données.

Le [modèle de données](../data-model.md) et l’[ADR-001 — tenant école et espace personnel](ADR-001-tenant-model.md) précisent les clés d’isolation et les profils langue contextualisés. Les migrations initiales sont décrites dans [database.md](../database.md) et [authentication.md](../authentication.md).

Le [modèle d’autorisation](../authorization-model.md), sa [matrice](../permission-matrix.md) et l’[ADR-002 — RBAC contextualisé](ADR-002-authorization-model.md) définissent les futurs droits par rôle, les grants limités et les contrôles de ressource. Aucun droit n’est appliqué par du code à cette étape.

L'[ADR-003 — session navigateur](ADR-003-browser-auth-session.md) fixe le transport des tokens, la rotation et la révocation du refresh, ainsi que les protections d'origine pour l'étape 8. Elle n'attribue aucune permission métier.

L'[ADR-004 — lecture de session pour le routing serveur](ADR-004-server-routing-session.md) précise l'évolution du chemin du cookie et la lecture de session sans rotation pour les layouts Next.js.

## Décisions retenues

- Monolithe modulaire FastAPI ; Next.js pour le frontend et son rendu ; aucun backend Node métier supplémentaire.
- Base PostgreSQL et schéma partagés, tenant explicite, memberships et permissions granulaires.
- English et German seulement au MVP ; langues configurables et CEFR A1–C2.
- Deux parcours reliés, LLM/TTS externes via adaptateurs, SRS déterministe indépendant de l’IA.
- Celery/Redis et stockage S3 compatible ; branding par école sur une seule codebase.
- Offline suspendu ; pgvector différé sans besoin démontré.
- Socle Docker/Next.js/FastAPI en place ; conventions de contribution documentées. CI/CD, reverse proxy et implémentation métier restent pour des étapes ultérieures.

## Propositions et arbitrages

L’annexe A de l’architecture conserve les questions ouvertes A01 à A12. En particulier : canal de notification, activation ou mot de passe temporaire, données d’un utilisateur entre écoles/espace autonome, couverture de la bibliothèque et règles pédagogiques détaillées. Le tenant personnel est une proposition de conception explicite, pas une exigence ajoutée au cahier des charges.

Résoudre chaque arbitrage avant l’implémentation concernée, en consignant contexte, choix et conséquences. Ne pas interpréter une question ouverte comme une autorisation de supprimer la fonctionnalité du MVP.
