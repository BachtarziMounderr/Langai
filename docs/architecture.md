# Architecture de la plateforme Lingua AI

Version de conception du 30 septembre 2026. Cette architecture reste la cible. Le socle technique décrit dans [bootstrap.md](bootstrap.md) initialise maintenant Next.js, FastAPI et les services Docker ; aucun domaine métier de cette architecture n’est implémenté.

## Références et ordre de priorité

1. Demande actuelle de l’utilisateur : architecture uniquement, English et German activés, offline hors scope.
2. **CAHIER DES CHARGES V1.docx**, version consolidée septembre 2026, sections 1 à 45 : référence fonctionnelle, lue intégralement.
3. **Guide_MVP_Plateforme_Langues_Scalable.pdf**, 18 pages : stratégie technique et progression, lu intégralement.

Les références « CDC § » et « Guide p. » ci-dessous renvoient à ces documents. Le registre d’arbitrage en annexe distingue les décisions imposées, les choix techniques proposés et les questions produit ouvertes. Les documents d’origine restent inchangés dans Downloads. La présente architecture remplace la note préliminaire créée avant leur lecture.

## 1. Vision globale du système

La plateforme doit servir les élèves d’écoles et les apprenants autonomes. Elle soutient la boucle apprendre, pratiquer, évaluer, mémoriser, réviser et réutiliser en communication. Le Parcours 1 complète les cours de l’école ; le Parcours 2 fait pratiquer avec l’IA. Un utilisateur peut activer les deux pour une même langue. Il n’y a pas de messagerie entre apprenants ni de réseau social (CDC §1–7, §43–45).

Le produit repose sur une application Next.js, un backend FastAPI organisé en **monolithe modulaire**, une base PostgreSQL et des adaptateurs externes. Les workers Celery exécutent le même code métier dans un autre processus. Cette séparation d’exécution ne crée pas de microservices : dépôt, modèle de données et cycle de livraison restent communs.

La première école utilise exactement les mécanismes de tenant, d’adhésion et de droits prévus pour la suivante. Aucune école pilote n’est codée en dur. Le premier rendu Student est un jalon intermédiaire ; il ne remplace pas le périmètre complet du MVP.

## 2. Architecture frontend

**Stack retenue :** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form et Zod. Les versions exactes seront fixées au bootstrap après vérification de compatibilité. Aucun package n’est installé à cette étape.

### Espaces et responsabilités

| Espace | Responsabilité |
| --- | --- |
| Pages publiques | Présentation, connexion et inscription autonome |
| /onboarding | Choix des langues et parcours, niveau initial ou débutant A1 |
| /student | Aujourd’hui, apprendre, pratiquer, révisions, progression, historique |
| /teacher | Classes affectées, élèves, difficultés, contenus autorisés |
| /admin | Utilisateurs, classes, groupes, imports, invitations, contenus et branding de l’école |
| /super-admin | Écoles, administrateurs, bibliothèque et paramètres globaux |

Chaque espace possède son layout et son dashboard. Les composants UI, les tokens visuels et les comportements de formulaire restent communs. Les segments d’URL student, teacher, admin et super-admin sont explicites. Les groupes Next.js entre parenthèses n’ajoutent pas de préfixe d’URL : reprendre littéralement plusieurs groupes avec dashboard créerait des collisions. Voir la [documentation des route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups).

### Organisation future dans frontend/src

- app : routes et layouts, avec un layout racine partagé.
- features : vues et interactions par domaine, notamment student, learning, conversations et reviews.
- components/ui : composants du design system ; components/layout : navigation et structure.
- lib/api : client HTTP et contrats issus d’OpenAPI ; lib/auth et lib/tenancy : contexte d’affichage.
- lib/branding : application des paramètres visuels validés.

TanStack Query gère les données serveur interactives ; React Hook Form et Zod gèrent la saisie. Les règles pédagogiques et permissions restent dans FastAPI. Les Server Components peuvent demander des données à cette même API ; ils n’accèdent pas directement à PostgreSQL. Next.js assure le rendu et le transport web, sans deuxième backend métier Node.js.

Chaque clé de cache privée contient au minimum le tenant, l’utilisateur et la langue lorsque pertinente. Un changement d’école ou une déconnexion invalide les données privées. Le rendu serveur et le cache HTTP ne doivent jamais partager une réponse personnelle entre sessions.

### Premier rendu Student

Prévoir d’abord les contrats d’affichage de /student : langue active, niveau, leçons à poursuivre, révisions dues et accès à la pratique IA. Lors d’une étape ultérieure explicitement autorisée, des données fictives conformes aux contrats permettront de présenter ce layout avant que tous les endpoints soient disponibles. Les composants dépendront du client API, pas des fixtures. Remplacer la source de données préservera les vues et les layouts. Aucun écran ni fixture n’est créé maintenant.

## 3. Architecture backend

**Stack retenue :** Python, FastAPI, Pydantic, SQLAlchemy 2 et Alembic. L’API est versionnée sous /api/v1. Elle expose des contrats de réponse explicites, des listes paginées et des identifiants publics opaques. OpenAPI servira de source pour les types TypeScript.

| Couche | Responsabilité | Limite |
| --- | --- | --- |
| Routes FastAPI et schémas Pydantic | Validation HTTP, résolution de session et contexte, sérialisation | Pas de règles pédagogiques dans les routes |
| Services applicatifs | Cas d’usage, autorisations, orchestration et transactions | Ne dépendent pas de composants React |
| Domaine | Scores, accès au contenu, progression, connaissances et SRS | Ne dépend pas du SDK LLM ni de Celery |
| Repositories SQLAlchemy | Requêtes filtrées, persistance et intégrité | Pas de repository public sans contexte d’accès |
| Adaptateurs externes | LLM, TTS, e-mail, fichiers, cache | Détails fournisseur confinés à cette couche |
| Tâches Celery | Exécution différée des services applicatifs | Pas de seconde implémentation du métier |

Chaque module regroupe ses routes, schémas, services et accès aux données. Séparer physiquement davantage seulement lorsque le volume le justifie. Les modules collaborent via des services ou contrats nommés ; un module ne modifie pas directement les tables privées d’un autre. Les projections de lecture transverses sont explicites et soumises aux mêmes droits.

core contient configuration, sécurité, connexion base, contexte tenant, erreurs et observabilité. Il ne devient pas un dépôt de règles métier. integrations contient les adaptateurs ; workers les points d’entrée des tâches. Les dossiers existants restent des emplacements vides, sans migration ni code généré.

## 4. Architecture PostgreSQL

**Une base et un schéma partagés** pour le MVP. PostgreSQL est la source de vérité. Redis sert de cache et de broker. Les fichiers binaires résident dans un stockage S3 compatible. pgvector ne fait pas partie de la base active : son ajout dépendra d’un besoin de recherche sémantique établi.

### Modèle conceptuel proposé — aucune table créée

| Ensemble | Entités principales et liens |
| --- | --- |
| Identité | users, sessions, refresh_tokens ; identité unique, profil personnel |
| Tenancy et accès | tenants, schools, memberships, roles, permissions, role_permissions, membership_roles |
| Organisation scolaire | classes, groups, class_memberships, group_memberships, teacher_assignments |
| Référentiels | languages, cefr_levels, language_levels ; états d’activation et ordre des niveaux |
| Apprenant | user_languages, parcours activés et niveau par langue et contexte |
| Contenu | courses, lessons, lesson_blocks, exercises, exercise_options, content_assignments, versions |
| Évaluation | assessments, attempts, answers, lesson_results, level_suggestions |
| Mémoire | knowledge_items, user_knowledge, srs_state, review_events |
| Communication | communication_scenarios, conversations, messages, ai_feedback, corrections |
| Progression | progress_events, user_skill_progress, agrégats de lecture professeur |
| Opérations | import_jobs, invitation_codes, notifications, notification_preferences, background_jobs, audit_events |
| Fichiers et école | files, school_branding, school_settings, school_languages |

### Trois catégories de données

| Catégorie | Propriété et accès |
| --- | --- |
| Global Data | Langues, CEFR, bibliothèque publiée et paramètres de plateforme. Une donnée globale n’est pas nécessairement publique : sessions et identité restent privées. |
| School/Tenant Data | Classes, groupes, affectations, contenus privés et paramètres portant `school_id` (identique à l’ID du tenant école selon ADR-001). Accès conditionné à une adhésion et aux permissions. |
| User Data | Progression, historique, conversations, erreurs et SRS rattachés à tenant_id + user_id + language_id. Préférences personnelles et identité globale restent accessibles à leur propriétaire selon des endpoints dédiés. |

Une seule table de contenus peut distinguer GLOBAL, SCHOOL et CLASS avec une contrainte : GLOBAL implique `school_id` absent, SCHOOL/CLASS implique `school_id` présent. Cette exception est réservée au catalogue. Les états pédagogiques privés portent `tenant_id` obligatoire ; les entités purement scolaires portent `school_id` obligatoire. Un NULL n’autorise jamais un accès global par défaut. Le schéma proposé et ses justifications figurent dans [data-model.md](data-model.md) et [ADR-001](decisions/ADR-001-tenant-model.md).

Les relations privées utilisent des clés étrangères qui conservent le tenant, par exemple une tentative ne peut référencer un exercice d’une autre école. Les références au catalogue global passent par une publication autorisée et une version. Une école adapte un contenu par copie/version privée, sans modifier l’original global.

Prévoir l’unicité des adhésions tenant/utilisateur et des états utilisateur/langue/contexte. Indexer les filtres tenant, langue et date, notamment les révisions dues. Utiliser des timestamps UTC et le fuseau utilisateur pour les rappels. Versionner contenus, règles de notation et algorithme SRS afin d’expliquer les résultats historiques. JSONB reste limité aux blocs de contenu, retours structurés et paramètres validés ; les relations et permissions restent relationnelles.

Les migrations Alembic seront versionnées et exécutées dans une étape contrôlée. Aucun DDL ni modèle SQLAlchemy n’est créé ici.

## 5. Architecture multi-tenant

### Convention proposée

`tenant_id` est l’identifiant technique du périmètre d’isolation. `school_id` désigne une école ; chaque école possède exactement un tenant. **ADR-001 précise que l’école et son tenant partagent le même UUID** : `school_id` se résout donc vers ce même `tenant_id`, sans dupliquer les deux colonnes sur chaque table. Le backend n’accepte jamais deux valeurs indépendantes fournies par le navigateur.

Pour préserver les apprenants autonomes du CDC §26, la proposition est un tenant personnel privé lié à son propriétaire, sans créer une fausse école. Une personne peut avoir cet espace et des memberships dans plusieurs écoles. Le type SCHOOL ou PERSONAL est vérifié lors de la résolution du contexte. Cette proposition rend l’isolation explicite ; le rapprochement de progression entre contextes demeure un arbitrage produit A03.

### Résolution et contrôle du contexte

1. Authentifier l’utilisateur et vérifier l’état de sa session.
2. Résoudre le contexte demandé ; vérifier l’adhésion active à l’école ou la propriété du tenant personnel.
3. Calculer les permissions effectives dans ce contexte et les affectations classe/groupe.
4. Charger la ressource dans ce périmètre, puis appliquer les règles de propriété et de visibilité.
5. Effectuer lecture ou mutation avec les mêmes contraintes ; tracer les actions sensibles.

Le contexte voyage dans les services, repositories et tâches. Il ne provient pas uniquement d’un header, d’un sous-domaine, d’un logo ou d’un claim ancien. Toute requête sans contexte valide échoue. Les endpoints globaux ont un chemin de contrôle distinct. Le Super-Admin ne bénéficie pas d’un contournement automatique de toute donnée privée.

### Isolation à plusieurs niveaux

- API : vérification de membership et permissions, y compris recherche, export, statistiques et téléchargement.
- Services et repositories : scope tenant obligatoire pour listes, jointures, sous-requêtes et écritures.
- Base : contraintes composites empêchant de relier deux tenants ; index cohérents avec les filtres.
- Cache : clés avec tenant et utilisateur ; invalidation sur changement de droits et de contexte.
- Celery : contexte sérialisé minimal, vérifié à l’exécution ; pas de session SQL ni de secret dans le message.
- S3 : métadonnées d’appartenance et contrôle serveur avant génération d’une URL signée ; les préfixes seuls ne sont pas une permission.

La cible de défense supplémentaire est RLS sur les tables privées avant ouverture du pilote à des données réelles. Les rôles applicatifs ne doivent être ni propriétaires des tables, ni superusers, ni BYPASSRLS. Le contexte sera limité à la transaction pour éviter les fuites avec le pool de connexions. Les politiques exactes et les tâches système seront définies au modèle détaillé. RLS ne remplace pas les droits métier. Ces conditions suivent la [documentation PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

### Une école puis plusieurs

Ajouter School B revient à créer son tenant, son école, ses memberships et paramètres dans la même base. Aucun déploiement, fork, schéma ou base supplémentaire. Prévoir dès les premiers tests deux écoles, même si une seule participe au pilote, ainsi qu’un utilisateur inscrit aux deux. Tester lecture, écriture, cache, worker, médias et analytics avec identifiants croisés.

## 6. Authentification

Le module identity possède l’identité, les mots de passe et les sessions. La proposition reprend le guide : access token de courte durée, refresh token rotatif, sessions révocables et hash Argon2id. L’appartenance à une école est séparée de l’identité globale (Guide p. 7).

Pour le navigateur, prévoir des cookies Secure, HttpOnly et SameSite adaptés à la topologie retenue, avec protection CSRF des mutations et contrôle d’origine. Aucun jeton de session persistant dans localStorage. Vérifier expiration, signature, émetteur et destinataire des tokens ; stocker les refresh tokens sous forme non réutilisable en clair et révoquer leur famille en cas de réutilisation. Le choix précis cookie/session et domaines est à figer avant implémentation. Voir [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Les droits restent évalués côté serveur, même avec un JWT valide. Déconnexion, désactivation de compte, fin d’adhésion et changement de droits doivent invalider les accès concernés. La durée des sessions et la politique MFA des administrateurs restent à décider.

### Flux attendus

- École : création manuelle ou import par un acteur autorisé ; association école, classe/groupe, langue et niveau ; e-mail de bienvenue ; définition obligatoire du mot de passe personnel à la première connexion ; niveau initial attribué par l’école, sans test obligatoire.
- Autonome : inscription directe, choix des langues et parcours disponibles, test de niveau ou option explicite « Je suis débutant complet (A1) ».
- Invitations : expiration, nombre d’utilisations limité, statut, désactivation et régénération ; consommation atomique pour respecter la limite même avec des requêtes simultanées.
- Import CSV : validation des colonnes, e-mails, doublons, classes, groupes, langues et niveaux ; rapport d’erreurs avant confirmation ; création idempotente après confirmation.

Le CDC §24 demande l’envoi d’un mot de passe temporaire ; le guide autorise aussi un lien d’activation. L’architecture peut accueillir les deux ; le lien à usage unique est proposé sans remplacer silencieusement l’exigence. Arbitrage A02 obligatoire avant développement de l’onboarding. Lorsqu’un e-mail existe déjà, l’école ne doit ni remplacer les identifiants globaux ni obtenir des données d’une autre école ; le rattachement à un compte existant demande une procédure explicite.

## 7. Rôles et permissions

Les rôles sont des ensembles de permissions, rattachés aux memberships pour les écoles. SUPER_ADMIN relève du périmètre plateforme. Un utilisateur peut être TEACHER dans une école et STUDENT dans une autre. Le profil utilisateur ne possède pas une unique colonne de rôle censée décider tous les accès. Le [modèle d’autorisation](authorization-model.md), sa [matrice](permission-matrix.md) et l’[ADR-002](decisions/ADR-002-authorization-model.md) fixent les codes et gardes de l’étape 6 ; les exemples de capacités ci-dessous ne sont pas des codes à seeder.

| Rôle | Périmètre | Exemples de permissions |
| --- | --- | --- |
| STUDENT | Ses propres activités autorisées | Consulter ses profils, contenus publiés et résultats selon inscription |
| TEACHER | Classes et élèves affectés | Suivre les élèves affectés ; créer du contenu de classe ; ajout d’élèves sur grant |
| SCHOOL_ADMIN | Son école | Gérer memberships, classes, groupes, langues offertes, contenus et branding |
| SUPER_ADMIN | Administration globale | Gérer écoles, administrateurs d’école et bibliothèque globale via opérations dédiées |

Autorisation effective = compte actif + contexte valide + permission ou politique `SELF` applicable + affectation/propriété de la ressource + état autorisé. Cacher un bouton n’assure aucune sécurité. Les noms de permissions suivent `domain:resource:action` ; un code scolaire n’accorde pas implicitement l’accès à toutes les classes.

Refus par défaut. Le professeur crée pour ses classes affectées ; une permission distincte autorise la publication à l’échelle de l’école. L’admin ne peut accorder que les droits qu’il peut déléguer ; jamais SUPER_ADMIN. La création des tout premiers administrateurs relève d’une procédure d’amorçage séparée. Journaliser attribution, retrait et usage des privilèges sensibles.

Le suivi professeur porte sur les activités pédagogiques autorisées, pas sur les conversations privées de tout apprenant. La visibilité des conversations du Parcours 2 reste à préciser en A03. Un éventuel accès de support Super-Admin aux données privées requiert une permission dédiée, une justification et une trace ; il n’est pas implicite dans la vision globale du produit.

## 8. Modules métier

Les domaines sont regroupés pour éviter des dizaines de composants à déployer. Les dossiers seront ajoutés lors du développement de chaque module ; ce tableau définit les responsabilités, pas une génération de fichiers.

| Module | Responsabilités et données possédées | Collaborations |
| --- | --- | --- |
| identity | Authentication, Users, sessions, récupération d’accès | tenancy pour les adhésions, notifications pour e-mail |
| tenancy | Schools, Memberships, Roles, Permissions, branding et configuration | contrôle commun à tous les services |
| schools | Classes, Groups, affectations, intégration, imports et invitations | identity, tenancy, notifications |
| catalog | Languages, CEFR Levels, disponibilité globale et école | learning, content, ai |
| content | Courses, Lessons, Exercises, scénarios, versions et publication | schools pour les affectations, media pour les fichiers |
| learning | User Languages, parcours, inscriptions pédagogiques, orchestration des activités | catalog, content, assessment |
| assessment | Assessments, Attempts, réponses, correction, règle 70 %, renforcement | ai pour réponses ouvertes ; knowledge et progress après validation |
| knowledge | Knowledge Items, observations, erreurs et User Knowledge State | reçoit des observations validées ; expose les notions au SRS et à l’IA |
| srs | Planning déterministe, Reviews, historique et next_review_at | knowledge et progress ; indépendant du fournisseur IA |
| ai | AI Conversations, Messages, AI Feedback, Corrections, contexte et orchestration TTS | content/scénarios, learning, knowledge, progress et adaptateurs |
| progress | Progress, Learning History, compétences, suggestions de niveau | événements de learning, assessment, ai et srs |
| analytics | Teacher Analytics et agrégats autorisés | projections de progress et knowledge, filtrées par affectation |
| notifications | Préférences, rappels, e-mails, état d’envoi et canal push à préciser | échéances SRS, événements d’école et workers |
| media | File/Media Storage, métadonnées, URLs signées et nettoyage | adaptateur S3 |

School Administration et Global Administration sont des ensembles de cas d’usage et de routes sur ces modules, pas des copies de leurs règles. Les notifications et analytics ne modifient pas directement la maîtrise d’une notion.

### Règles pédagogiques conservées

- Parcours 1 : cours → leçons → exercices → évaluation → renforcement/révision. Une leçon comporte objectif, contenu, exemples et activités.
- Score de validation de leçon : 70 % au MVP (CDC §37). Sous ce seuil, identifier les notions à renforcer. La règle de déblocage et le calcul précis du score seront explicités en A05.
- Formats initiaux du guide : QCM, texte à trous, association, réponse libre et flashcard. L’analyse des réponses ouvertes passe par l’IA ; les formats déterministes n’en dépendent pas.
- Parcours 2 : scénario choisi ou recommandé, échange textuel, corrections explicatives, formulations naturelles et TTS.
- Pont entre parcours : des notions récentes du Parcours 1 alimentent les scénarios de pratique, dans la même langue et le même contexte autorisé.
- Progression : par langue et compétence, notions maîtrisées/à revoir, résultats, régularité et historique. Une activité de communication ne valide pas arbitrairement un cours.
- Niveau dynamique : proposition fondée sur plusieurs activités, jamais changement silencieux. Cinq leçons, trois conversations, >90 % et <50 % sont des exemples configurables du CDC §21, pas des constantes définitives. La validation d’une leçon à 70 % reste indépendante.

## 9. Gestion des langues

Seules **English (en)** et **German (de)** seront activées au MVP. languages porte un code stable, un libellé et un état d’activation ; aucune branche métier du type « si anglais, sinon allemand ». Les écoles sélectionnent un sous-ensemble des langues activées globalement et ne peuvent activer une langue désactivée au niveau plateforme.

Les niveaux CEFR A1, A2, B1, B2, C1 et C2 sont des données ordonnées, associables à chaque langue. Le catalogue permet l’ajout d’une langue et l’association de ces niveaux sans migration métier spécifique à cette langue. Les contenus, scénarios, tentatives, notions, conversations et révisions référencent language_id.

User Languages conserve niveau initial, niveau courant, origine du niveau et parcours activés. Un utilisateur peut apprendre l’anglais et l’allemand simultanément, avec progression, historique et mémoire indépendants. Les états pédagogiques sont contextualisés par tenant ; la fusion entre écoles ou avec l’espace autonome n’est pas automatique (A03).

Ajouter une langue nécessitera des données, du contenu et la validation de sa prise en charge LLM/TTS, pas une nouvelle codebase. La langue apprise est distincte de la langue de l’interface ; la liste des langues d’interface n’est pas définie par « English + German » (A09).

## 10. Architecture IA

Flux : **Frontend → FastAPI → services IA du monolithe → adaptateur LLM → fournisseur externe**. Aucune clé ni invocation fournisseur dans le frontend. La synthèse vocale suit un adaptateur distinct TTSProvider. Ces interfaces internes ne nécessitent pas un service réseau supplémentaire.

### Responsabilités

1. Autoriser la conversation ou tentative dans son contexte tenant/utilisateur/langue.
2. Construire un contexte limité : niveau CEFR, scénario, derniers messages utiles, notions récentes, erreurs précédentes, révisions dues, progression pertinente et éventuellement notions du Parcours 1.
3. Envoyer une consigne contrôlée et des données pédagogiques clairement séparées. Les contenus utilisateur ne donnent pas d’autorité administrative au modèle.
4. Obtenir une réponse structurée selon un schéma Pydantic versionné.
5. Valider forme, tailles, types, catégories et références. Une référence à une notion ou un contenu doit appartenir au contexte autorisé.
6. Enregistrer réponse et feedback, puis transmettre des observations au module knowledge. Le backend décide des changements d’état.

Le contrat conceptuel couvre reply, corrections, errors, natural_alternatives, new_expressions, knowledge_items et difficulty_tags. Les divergences entre exemples JSON du guide et de la demande sont résolues par un schéma canonique à préciser avant implémentation, avec champs obligatoires/optionnels et version. Aucun parseur ni modèle n’est créé ici.

Une correction distingue faute grammaticale, explication et formulation plus naturelle. La complexité de la réponse dépend du CEFR. L’IA propose des éléments mémorisables ; le domaine contrôle leur déduplication et leur impact. La qualité pédagogique exige des exemples évalués par langue et niveau : la conformité JSON seule ne prouve pas la justesse.

### Défaillances et coût

Prévoir budget de contexte, limite de sortie, quotas par utilisateur/école, délais maximum et retries bornés. En cas de sortie invalide, ne pas écrire de note ou de maîtrise arbitraire : conserver un état d’échec/reprise visible. Une nouvelle tentative ne doit pas dupliquer les observations pédagogiques ni la facturation interne.

La réponse textuelle peut rester synchrone au début ; son enrichissement et le TTS passent en tâche asynchrone. Si le streaming est ajouté plus tard, aucun état pédagogique n’est validé avant réception et validation de l’objet final. Enregistrer fournisseur/modèle/version de prompt et mesures d’usage, avec politique de rétention à définir.

Le TTS lit les réponses IA ; il ne suppose ni microphone ni reconnaissance vocale. L’audio est réutilisé via une clé de cache liée au texte, à la langue, à la voix, au modèle et au contexte d’accès. L’échec TTS laisse le texte utilisable. Les audios privés restent privés.

## 11. Architecture SRS

Le SRS est un module déterministe, indépendant de l’IA. Il transforme les résultats validés en calendrier de révision ; le LLM ne fixe ni next_review_at ni le niveau de maîtrise final.

Flux : **Exercise/AI interaction → observation validée → Knowledge Item → User Knowledge State → SRS Engine → Review → next_review_at**.

Les notions couvrent vocabulaire, expressions, grammaire, structures, formulations et erreurs récurrentes des deux parcours. Leur provenance est conservée. Les notions globales et privées ont une visibilité explicite ; leur état de maîtrise appartient à un utilisateur, une langue et un tenant.

La première version peut utiliser une règle simple, pure et versionnée. Le contrat conserve réussite, échec, qualité de rappel, répétitions, intervalle, difficulté, dates et historique, afin de pouvoir accueillir SM-2 simplifié ou une variante. L’algorithme initial et la conversion d’une réponse en qualité sont à arrêter avant implémentation (A06) ; aucune formule n’est figée ici.

Un événement de révision est traité une seule fois au niveau métier, même après répétition HTTP ou retry Celery. Les mises à jour concurrentes d’un même état doivent être contrôlées par transaction/version. La liste des révisions dues est calculée à partir des dates persistantes : elle ne dépend pas de la réception d’une notification.

Le cas d’usage « Aujourd’hui » rassemble révisions, leçons inachevées, renforcements et éventuelle activité IA. Il compose les services existants sans devenir un deuxième moteur pédagogique. L’évaluation de la courbe de mémorisation sera présentée comme une estimation, pas comme une mesure directe de l’oubli réel.

## 12. Background jobs et notifications

**Celery + Redis** est conservé. Les workers réutilisent les services du monolithe. Un planificateur unique suffira au départ pour les rappels et traitements périodiques.

| Tâche | Responsabilité |
| --- | --- |
| E-mail | Bienvenue, activation selon arbitrage, récupération d’accès |
| Import CSV | Validation, rapport, puis création après confirmation explicite |
| TTS | Synthèse, stockage et état de disponibilité |
| Rappels | Déterminer les révisions dues et respecter les préférences utilisateur |
| Agrégats | Mettre à jour les vues de progression et professeur |
| Post-traitement IA | Enrichissement non bloquant après validation du résultat |

Chaque tâche possède un identifiant, tenant, acteur ou principal système, paramètres minimaux, état durable et clé d’idempotence. Vérifier les droits à l’exécution, notamment si l’enseignant a perdu son affectation depuis l’envoi. Les tâches système disposent d’un périmètre explicite et limité.

Ne pas supposer une livraison exactement une fois. Les écritures doivent rester idempotentes et les reprises bornées ; ces propriétés sont à concevoir dans l’application, conformément à la [documentation Celery](https://docs.celeryq.dev/en/stable/userguide/tasks.html). Les échecs définitifs sont visibles et peuvent être repris de manière contrôlée.

Enregistrer d’abord en PostgreSQL l’intention et l’état d’une tâche, puis publier après commit. Une reprise des tâches restées non publiées évite de perdre une opération entre commit et broker. Ce mécanisme reste dans le monolithe, sans bus distribué supplémentaire. Redis ne doit pas être l’unique preuve qu’un import ou une synthèse doit être exécuté.

### Notifications conservées, canal à arbitrer

Le CDC §33 demande des « notifications push locales ». Le guide p. 12 parle d’e-mail et de Web Push. La mise en pause offline ne supprime pas automatiquement les notifications. Le module et les préférences restent au MVP, mais la sémantique et les plateformes cibles sont à préciser (A01).

Le Web Push navigateur utilise un service worker, sans imposer de cache offline ; voir [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API). Un éventuel worker limité au push devra faire l’objet d’un choix explicite ultérieur. À cette étape, aucun service worker, cache offline ou mécanisme de notification n’est préparé. Un simple bandeau dans l’application ne sera pas présenté comme satisfaisant l’exigence push.

## 13. Stockage des fichiers

Le module media conserve en base la clé d’objet, le propriétaire/contexte, le type MIME, la taille, le statut, la visibilité et les références métier. Le binaire réside dans un stockage compatible S3. L’interface prévoit upload, lecture, suppression et URL signée ; les endpoints, credentials et fournisseurs sont configurables côté serveur.

Cas couverts : logos, images de cours, PDF, fichiers d’import temporaires, audio TTS et autres médias autorisés. Séparer les objets publics explicitement publiés des objets privés. Les préfixes tenant/user aident l’organisation sans remplacer l’autorisation. Une URL privée signée est courte et délivrée après contrôle d’accès.

Les uploads ont des limites de taille, des formats autorisés et une validation du contenu. Les fichiers non fiables ne deviennent pas immédiatement publiés. L’échec d’upload ou de transaction est compensé par un nettoyage des objets orphelins ; aucune transaction distribuée n’est nécessaire. Les politiques de conservation, suppression et sauvegarde restent à fixer par type de données.

## 14. Branding par école

Une école possède display_name, logo, couleurs principales et secondaires, éventuellement favicon/couverture et paramètres d’affichage. Le frontend charge cette configuration pour le tenant vérifié et l’applique via des tokens/variables CSS au design system commun.

Valider les couleurs, formats d’image et paramètres autorisés ; ne jamais accepter du CSS ou du JavaScript arbitraire fourni par une école. Prévoir un thème par défaut, une lisibilité suffisante et l’invalidation du cache de branding. Les assets privés restent protégés ; seuls ceux explicitement destinés aux pages publiques peuvent être publiés.

Les langues et parcours activés sont des paramètres fonctionnels validés par le backend. Un feature flag visuel ne contourne pas une permission. Une école peut personnaliser sa présentation sans fork, branche permanente, compilation dédiée ou thème intégral distinct. Les domaines personnalisés et la personnalisation avancée sont différés.

## 15. Sécurité générale

Avant usage de données réelles, prévoir HTTPS, gestion de secrets par environnement, privilèges minimum, sauvegardes vérifiées et journaux d’audit. Les environnements local, staging et production utilisent des accès séparés. Les données de démonstration sont fictives.

Les contrôles couvrent validation serveur, échappement des contenus affichés, protection CSRF avec cookies, limitation des tentatives de connexion, invitations et appels IA, contrôle de fichiers, quotas et pagination. Aucun secret LLM/TTS/S3 dans NEXT_PUBLIC_*. Ne pas journaliser mots de passe, tokens ou conversations complètes par défaut.

La suppression de compte, la rétention des conversations, les données de mineurs, les accès des enseignants et les conditions des fournisseurs doivent être cadrés avant le pilote. Ce document définit des points de conception, sans attester une conformité juridique ni choisir une durée de rétention absente des sources.

### Vérifications à mettre en place au développement

- Unitaires : règle 70 %, transitions de niveau, permissions et calendrier SRS avec horloge contrôlée.
- Intégration : API/PostgreSQL, contraintes et RLS avec le rôle applicatif réel, imports, invitations concurrentes et révocation.
- Isolation : école A/B, utilisateur multi-écoles, tenant personnel, cache, tâches, médias, analytics et publication globale.
- IA : schéma invalide, contenu hostile, référence interdite, timeout, coût/quota et fallback sans corruption de progression.
- Jobs : retries, double livraison, crash après commit et absence de duplication métier.
- Frontend/E2E : élève apprend → professeur autorisé voit le résultat ; autre classe et autre école refusées.

Ces tests sont prévus, pas exécutés : il n’existe aucun service applicatif à tester à cette étape.

## 16. Scalabilité

Les sessions et états métier sont partagés via les services de données ; aucune instance API ne garde l’unique copie d’un état utilisateur. Les fichiers persistants ne dépendent pas du disque du backend. Les contrats fournisseurs limitent le couplage.

| Besoin observé | Évolution possible sans changement de domaine |
| --- | --- |
| Nouvelle école | Données tenant, memberships, paramètres et contenus |
| Plus de requêtes | Réplicas FastAPI derrière répartition de charge |
| File de tâches longue | Plusieurs workers, puis files séparées selon les traitements |
| Base lente | Mesure SQL, index, pagination, agrégats, puis capacité/managé |
| Coût IA élevé | Budgets, contexte réduit, cache autorisé et choix de modèle via adaptateur |
| Plus de médias | Stockage S3 externe, lifecycle et CDN pour médias publics |
| Recherche sémantique utile | Évaluation puis ajout ciblé de pgvector |

Prévoir quotas par tenant pour éviter qu’une école monopolise les appels IA ou workers. Suivre latence, erreurs, durée des files, requêtes lentes et consommation LLM/TTS/stockage par école. Aucun nombre d’utilisateurs simultanés n’est garanti sans scénario et test de charge ; « plusieurs milliers » est une cible à qualifier.

## 17. Stratégie de déploiement

À l’étape de développement autorisée, Docker Compose décrira Next.js, FastAPI, un worker Celery, PostgreSQL, Redis et un stockage S3 local éventuel. Le worker utilise le même paquet backend que l’API. Le reverse proxy reste un emplacement réservé ; Nginx ou un proxy managé sera choisi selon l’hébergement.

Pour le pilote : frontend, API et worker, stockage S3 externe et PostgreSQL managé si le budget le permet. Exposer uniquement les points d’entrée web ; base et broker restent privés. Prévoir contrôles de santé, sauvegardes et restauration testée. Les migrations sont une étape de déploiement unique, avant bascule contrôlée, pas une action concurrente de tous les réplicas.

Le dépôt Git local est déjà initialisé. GitHub, CI/CD, images, secrets et hébergement ne sont pas configurés maintenant. La future CI couvrira lint, types, tests, migrations et builds ; le déploiement staging et la procédure production seront établis ensuite. Le report de leur configuration à une prochaine étape ne supprime pas leur nécessité pour exploiter le pilote.

Le constat local du bootstrap reste historique : Git/Node/Python et CLI Docker étaient présents, moteur Docker non joignable. Cette étape d’architecture ne démarre pas Docker et ne requalifie pas l’environnement comme opérationnel.

## 18. Ce qui appartient au MVP

Le périmètre fonctionnel reste celui du CDC, sous réserve des changements explicites de la demande. Une livraison progressive ne transforme pas une exigence du MVP en fonctionnalité facultative.

- Quatre rôles, authentification, permissions granulaires, école pilote et isolation multi-écoles réelle.
- Création manuelle/import CSV d’élèves, professeurs, classes, groupes, invitations et affectations.
- Inscription autonome, onboarding, test initial, option débutant A1 et niveau attribué par l’école.
- English et German, plusieurs langues par utilisateur, niveaux A1–C2 et états indépendants.
- Les deux parcours simultanés par langue et le pont pédagogique entre eux.
- Bibliothèque générique, contenu d’école et contenu de professeur limité par défaut à ses classes.
- Cours, leçons, exercices, évaluation, validation à 70 % et renforcement.
- Scénarios, IA textuelle adaptée au niveau, corrections ouvertes, explications, expressions et TTS.
- Connaissances, SRS simple, révisions du jour, progression par langue/compétence et historique.
- Propositions d’ajustement de niveau avec décision utilisateur.
- Notifications et préférences, avec canal push à préciser en A01.
- Suivi professeur limité aux classes affectées ; administration école et globale.
- Branding configurable par école et même code pour toutes les écoles.
- Pour la mise en service ultérieure : sécurité, tests, sauvegardes, observabilité et mesure des coûts.

Le CDC exige une bibliothèque A1–C2 ; le guide suggère un pilote avec un petit volume de contenus. Le modèle supporte tous les niveaux dès le départ, mais le nombre et la couverture des contenus restent un critère de recette à arbitrer (A04). Ne pas déclarer le MVP complet uniquement parce que les six niveaux sont présents dans un référentiel.

## 19. Ce qui est volontairement repoussé

- Reconnaissance vocale, réponse audio de l’apprenant, évaluation de prononciation et conversation vocale complète.
- Gamification, badges, recommandations avancées, BI et rapports pédagogiques avancés.
- Modèle IA auto-hébergé, pgvector sans besoin démontré, infrastructure de grande échelle.
- Personnalisation profonde et domaines d’école spécifiques.
- Microservices, Kubernetes, Kafka, Elasticsearch et base dédiée par école : aucune introduction au MVP.
- Configuration effective de CI/CD, reverse proxy et déploiement : étapes ultérieures, sans création aujourd’hui.

La quantité de contenus, les notifications push et l’onboarding ne sont pas retirés du MVP par cette liste ; leurs ambiguïtés sont identifiées séparément.

## 20. Offline hors scope actuel

La décision utilisateur suspend toutes les fonctions offline du CDC §34/§36 et du Guide p. 11–12, p. 14, p. 16–18. Aucun téléchargement pour usage sans connexion, stockage IndexedDB, Dexie.js, file de synchronisation, endpoint sync, service worker de cache ou PWA avancée n’est prévu dans l’architecture active.

Le produit fonctionne en ligne. En cas de perte de connexion, l’interface signale l’échec et évite d’annoncer une sauvegarde inexistante. Il n’existe pas de promesse de conservation d’une réponse hors connexion. Les identifiants stables, API versionnées et mutations idempotentes répondent aux besoins ordinaires de fiabilité ; ils n’introduisent pas une préparation offline dédiée.

Un futur projet offline devra définir son périmètre, les conflits et les règles de conservation. Le canal push demeure un sujet indépendant à arbitrer ; il ne réintroduit pas automatiquement l’offline.

## Annexe A — Ambiguïtés et décisions différées

| ID | Sources ou question | Position explicite à cette étape | Décision avant |
| --- | --- | --- | --- |
| A01 | CDC §33 « push locales » ; Guide p. 12 Web Push ; offline suspendu | Notifications conservées. Rappels locaux planifiés, Web Push et bandeaux ne sont pas équivalents. Aucun canal implémenté. | Notifications : appareils cibles, autorisations et usage éventuel d’un worker limité au push |
| A02 | CDC §24 mot de passe temporaire par e-mail ; Guide p. 7 activation possible | Proposer un lien à usage unique, sans modifier le CDC sans validation. Si mot de passe temporaire retenu, expiration et changement obligatoire. | Onboarding |
| A03 | CDC §4/§22 état par utilisateur/langue ; §28 isolation ; Guide p. 6 school_id nullable | Proposition de tenants école/personnel et états séparés par contexte. Fusion, portabilité et visibilité des conversations restent ouvertes ; aucune donnée privée partagée implicitement. | Modèle détaillé de User Languages et droits professeur |
| A04 | CDC §9/§35/§37 bibliothèque A1–C2 ; Guide p. 3/p. 15 petit corpus pilote | Support structurel A1–C2 assuré. Couverture réelle et volume attendus non fixés. | Backlog de contenu et recette du pilote |
| A05 | CDC §13 règle possible de 70 %, §37 règle MVP ; Guide p. 8 verrouillage configurable | Seuil 70 % retenu pour le MVP. Pondération, nouvelle tentative, correction libre et blocage effectif à préciser. | Évaluation et déblocage |
| A06 | CDC §17 type SM-2 ; demande actuelle première version simple évolutive | Contrat de moteur déterministe et versionné. Choix entre règle simple et SM-2 simplifié, hésitation et qualité de rappel ouverts. | Implémentation SRS |
| A07 | CDC §21 fenêtres et seuils présentés comme exemples | Suggestions avec consentement retenues ; métrique comparable entre cours/conversations et valeurs finales à valider. | Progression dynamique |
| A08 | Guide p. 10 pgvector conditionnel, p. 16 stack avec pgvector | Demande actuelle prioritaire : différé tant qu’aucun besoin sémantique réel. | Éventuelle recherche sémantique |
| A09 | Guide p. 8 next-intl ; demande limite les langues apprises | Langue d’interface et traduction non précisées. Ne pas déduire une interface bilingue obligatoire du catalogue pédagogique. | Design de l’interface |
| A10 | Identifiant ou e-mail, doublons et compte déjà membre d’une école | Identité globale proposée ; politique de rattachement, unicité des identifiants et preuve de possession à définir. Aucune réinitialisation par une autre école. | Import et invitations |
| A11 | Débutant/test, niveau école et acceptation du changement | Le niveau d’école initialise le parcours ; les suggestions restent consenties. Définir le droit ultérieur de l’admin à corriger un niveau et sa traçabilité. | Gestion des niveaux |
| A12 | Paramètres techniques et exploitation non figés | Fournisseurs LLM/TTS/S3/e-mail, modèles, hébergement, régions, budget, quotas, rétention, versions et politique MFA restent ouverts. | Bootstrap puis usage de données réelles |

Choix de nomenclature : conserver les dossiers existants frontend/ et backend/ plutôt que renommer vers apps/web et apps/api du guide. La séparation des responsabilités est identique. Le modèle tenants/schools explicite une proposition pour les autonomes ; il n’est pas présenté comme une structure déjà imposée par le CDC.

## Annexe B — Principaux risques architecturaux

| Risque | Mesure de conception | Preuve attendue au développement |
| --- | --- | --- |
| Fuite entre écoles ou via caches/jobs | Contexte obligatoire, intégrité SQL, RLS et cache contextualisé | Tests A/B sur tous les canaux |
| Confusion utilisateur global et données pédagogiques | Séparation identité/membership/état pédagogique ; arbitrage A03 | Scénarios multi-écoles et autonome validés |
| Permissions trop larges | RBAC + permissions + affectations + propriété | Tests élève/prof/admin et délégation refusée |
| Réponses IA erronées ou coûteuses | Schéma, validation métier, quotas, suivi et jeux d’évaluation | Cas de panne, sorties invalides et revue pédagogique EN/DE |
| Double traitement ou tâche perdue | État durable, idempotence, publication après commit et reprise | Tests de crash et redélivrance |
| Mauvaise calibration pédagogique | Score et niveau distincts ; SRS versionné ; décision utilisateur | Recette des règles et simulations de calendriers |
| MVP réduit sans accord | Matrice de traçabilité et arbitrages explicites | Recette fonctionnelle avec propriétaire produit |
| Dépendance à un fournisseur | Contrats LLM/TTS/S3 internes | Doubles de test et vérification de l’adaptateur |
| Isolation affichée mais non prouvée | Validation actuelle limitée aux documents | Tests d’intégration obligatoires avant pilote |

## Annexe C — Traçabilité et validation documentaire

Chaque ligne associe les exigences au lieu où elles sont prévues. « Couvert » signifie prévu par la conception, jamais développé ou testé.

| Source CDC | Couverture dans cette architecture | État |
| --- | --- | --- |
| §1–5 publics, objectifs, deux parcours et pont | §1, §8, §10, §18 | Couvert ; partage entre contextes A03 |
| §6–8 IA, correction ouverte, TTS | §10, §12, §13 | Couvert |
| §9–12 bibliothèque, contenus école/professeur, leçons | §4, §7, §8, §18 | Couvert ; volume A04 |
| §13 seuil de leçon | §8, §18 | 70 % retenu ; calcul/déblocage A05 |
| §14–15 communication et scénarios | §8, §10 | Couvert, sans messagerie entre utilisateurs |
| §16–18 oubli, SRS et notions des deux parcours | §8, §11 | Couvert ; algorithme A06 |
| §19–20 test et débutant A1 | §6, §9, §18 | Couvert |
| §21 évolution du niveau | §8, §18 | Consentement conservé ; paramètres A07/A11 |
| §22 plusieurs langues indépendantes | §4, §9 | EN/DE seulement, extensible ; contexte A03 |
| §23–25 intégration, première connexion et CSV | §6, §12 | Couvert ; A02/A10 ouverts |
| §26 autonome et parcours accessibles | §1, §5, §6 | Couvert ; tenant personnel proposé |
| §27 invitations | §6, §7 | Expiration, limites, statut et régénération couverts |
| §28 multi-écoles | §4, §5 | Shared database/shared schema, isolation conçue |
| §29–30 rôles et suivi professeur | §7, §8 | Couvert ; affectations et A03 |
| §31–32 progression et historique | §4, §8, §11 | Couvert |
| §33 notifications | §12 | Conservé au MVP ; canal A01 |
| §34 hors ligne | §20 | Suspendu par demande actuelle |
| §35 bibliothèque et administration globale | §7, §8, §18 | Couvert ; contenu A04 |
| §36 MVP étudiant | §6, §8–12, §18 | Couvert, sauf offline/sync explicitement suspendus |
| §37 MVP Parcours 1 | §7, §8, §18 | Couvert ; A04/A05 |
| §38 MVP Parcours 2 | §8, §10, §11 | Couvert, pont et TTS inclus |
| §39 MVP professeur | §7, §8 | Couvert ; création et ajout d’élèves soumis aux droits |
| §40 MVP admin école | §6–8 | Couvert |
| §41 MVP Super-Admin | §7, §8 | Couvert |
| §42 fonctionnalités futures | §19–20 | Différées, sans les implémenter |
| §43–45 boucle pédagogique et vision | §1, §8, §10, §11 | Couvert |

### Vérification des contraintes de la demande actuelle

- [x] Les 45 sections du CDC et les 18 pages du guide ont été lues.
- [x] L’architecture est un monolithe modulaire avec les couches et domaines définis.
- [x] English et German seulement activés au MVP ; autres langues ajoutables par données.
- [x] Les six niveaux CEFR restent utilisables pour chaque langue.
- [x] Offline suspendu sans IndexedDB, Dexie ou préparation de synchronisation.
- [x] Une école puis plusieurs dans une base et un schéma communs, sans refonte du principe d’isolation.
- [x] Quatre rôles, permissions granulaires et limites d’affectation prévues.
- [x] Branding par école sans duplication de code.
- [x] Frontend organisé pour permettre un premier rendu Student tôt.
- [x] Diagrammes de composants, données et flux métier dans architecture-diagram.md.
- [x] Ambiguïtés, risques et décisions différées rendus explicites.
- [x] Aucun code applicatif, table, migration, écran ou service développé à cette étape.

La conformité est **documentaire et conditionnelle aux arbitrages listés**. L’isolation, la sécurité, la capacité et la qualité pédagogique devront être démontrées par l’implémentation et ses tests. Cette étape s’arrête ici ; le développement exige une nouvelle instruction.
