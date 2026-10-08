# Modèle d’autorisation — conception de l’étape 6

**Statut : design uniquement, 2 octobre 2026.** Aucun contrôle RBAC, endpoint, seed, modèle SQLAlchemy ou migration n’est implémenté. Ce document complète la [matrice](permission-matrix.md), le [modèle de données](data-model.md), les [règles de sécurité](security-rules.md) et l’[ADR-002](decisions/ADR-002-authorization-model.md). Références fonctionnelles externes : **CAHIER DES CHARGES V1.docx** et **Guide_MVP_Plateforme_Langues_Scalable.pdf**. Les décisions récentes English/German et offline hors scope priment.

## 1. Principe de décision

Un **rôle** regroupe des permissions par défaut ; une **permission** désigne une opération ; le **scope** borne les ressources sur lesquelles cette opération peut agir. `Role != Permission` et `Permission != accès à tout objet`. L’accès effectif exige ensemble : identité et session valides, contexte vérifié, capacité autorisée, ressource dans le périmètre, relation requise (propriété, inscription ou affectation), état compatible, et politique de confidentialité. Toute condition absente entraîne un refus. Une permission ne traverse jamais implicitement un tenant. Cette règle s’applique aux listes, détails, mutations, agrégats, exports, recherches, médias, caches et tâches de fond, pas seulement aux routes avec un UUID.

Le serveur FastAPI prend la décision à chaque requête ; Next.js utilise les mêmes informations pour l’interface, sans devenir l’autorité. Cette approche suit les recommandations OWASP de [refus par défaut et vérification de chaque requête](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) et d’[autorisation au niveau de l’objet](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/).

### Rôles et scopes

| Rôle ou contexte | Attribution | Scope habituel | Limite |
| --- | --- | --- | --- |
| `SUPER_ADMIN` | `user_global_roles`, rôle `PLATFORM` | `PLATFORM` pour **opérations globales nommées** | Pas de lecture brute des données privées par défaut ; pas de rôle scolaire implicite |
| `SCHOOL_ADMIN` | `school_membership_roles` dans une école | `SCHOOL` | Son école seulement ; ni référentiel global ni autre école |
| `TEACHER` | `school_membership_roles` dans une école | `ASSIGNED_CLASS` | Affectation active à la classe ; groupe hérite provisoirement de sa classe |
| `STUDENT` | `school_membership_roles` dans une école | `SELF` | Ses profils et inscriptions, ses contenus publiés et éligibles |
| Apprenant autonome | Propriétaire de `tenants.kind=PERSONAL` | `SELF` | Aucun rôle scolaire ni permission de gestion d’école |

`SELF` couvre les données de l’acteur dans le tenant actif ; pour une classe ou un contenu de classe, il faut en plus une inscription active de l’étudiant. `ASSIGNED_CLASS` désigne les classes pour lesquelles `teacher_class_assignments` est actif, et leurs élèves inscrits actifs. `SCHOOL` désigne exclusivement l’école du membership actif. `PLATFORM` couvre les opérations de registre, catalogue et agrégats globaux **explicitement exposées**, jamais un accès universel aux données privées. Ces scopes de décision ne sont pas les deux valeurs `PLATFORM`/`SCHOOL` de `roles.scope` et `permissions.scope` dans le modèle de données : ces dernières classent seulement le type de rôle et de permission. Aucune nouvelle table de scope n’est demandée.

Un utilisateur peut avoir plusieurs rôles dans un même membership ; leurs permissions scolaires se combinent **dans cette seule école**. Teacher dans A et School Admin dans B donnent Teacher dans A et School Admin dans B, sans union transversale. Un détenteur de `SUPER_ADMIN` qui ouvre une école comme membre ordinaire doit utiliser les droits de son membership pour les routes scolaires ; les opérations de plateforme passent par des routes séparées.

## 2. Frontière de tenant et contexte d’autorisation

Pour une école, `schools.id = tenants.id` selon [ADR-001](decisions/ADR-001-tenant-model.md). Pour un tenant personnel, `owner_user_id` doit être l’acteur. Un school ID, tenant ID, rôle ou permission reçu du navigateur indique au mieux un **contexte demandé** ; le backend le résout et vérifie les données courantes. Aucun passage de contexte par sous-domaine, logo ou JWT ancien n’accorde seul l’accès. Un appel scolaire exige école active, `users.status=ACTIVE`, membership `ACTIVE`, rôle et permission dans **ce membership**. `PENDING`, `INVITED`, `SUSPENDED` et `LEFT` n’accordent aucun accès scolaire. L’accès personnel exige compte actif et propriété du tenant personnel.

Le futur `AuthorizationContext` conceptuel contient `user_id`, identité de session, type de contexte (`PLATFORM`, `SCHOOL`, `PERSONAL`), `tenant_id`, `school_id` et `membership_id` pour SCHOOL seulement, rôles globaux, rôles de ce membership, permissions scolaires effectives, et informations de validité. Il ne transporte pas un tableau de toutes les affectations comme preuve durable : l’affectation ou l’inscription active et l’état de la ressource sont vérifiés au moment de l’opération. `school_id` et `tenant_id` ont le même UUID pour SCHOOL ; pour PERSONAL, `school_id`/`membership_id` sont absents. Pour PLATFORM, aucun tenant scolaire n’est présumé.

Résolution logique :

1. Authentifier la session et vérifier le compte actif ; charger les rôles globaux actuels.
2. Identifier le type de contexte demandé. Une opération PLATFORM doit être une route de plateforme explicite et exiger le rôle global et la permission correspondante.
3. Pour SCHOOL, résoudre l’école active, puis le membership actif de l’acteur ; charger uniquement ses rôles scolaires, les permissions par défaut et les grants scolaires valides.
4. Pour PERSONAL, vérifier la propriété du tenant ; appliquer les seules politiques `SELF` et l’offre personnelle disponible, sans rôles scolaires.
5. Pour toute opération, vérifier le code de permission si requis, puis charger/filtrer la ressource par tenant et relation active. Vérifier statut, publication, langue et autres règles métier pertinentes avant de répondre ou modifier.

Un changement d’école ou de rôle recrée ce contexte à partir des données actuelles. Les droits de A ne sont pas conservés en B par cache, token ou onglet. Une révocation, fin d’affectation ou suspension doit prendre effet sur les requêtes suivantes ; les détails de session/cache seront conçus avec l’auth. Les repositories n’exposent pas de lecture privée par `id` seul. Les futures politiques RLS restent la cible documentée avant pilote réel, en défense supplémentaire, sans remplacer les contrôles applicatifs.

## 3. Catalogue canonique des permissions

**Syntaxe unique : `domain:resource:action`**, en `lower_snake_case` pour chaque segment et avec exactement deux `:`. `platform:*:*` porte `permissions.scope=PLATFORM` ; `school:*:*` porte `permissions.scope=SCHOOL`. Les codes sont stables ; un changement de sens exige un nouveau code et une transition, pas une réutilisation silencieuse. `manage` regroupe seulement les opérations précisées ci-dessous. Ce catalogue est la source conceptuelle des futurs enregistrements `roles`, `permissions` et `role_permissions` ; chaque permission est ajoutée au seed **avec la fonctionnalité correspondante**, sans seed écrit aujourd’hui. Les politiques `SELF` personnelles ne sont pas des lignes `permissions` : elles découlent de l’identité/propriété et sont contrôlées par service.

### Plateforme — rôle `SUPER_ADMIN` seulement

| Code | Opération permise ; exclusions |
| --- | --- |
| `platform:schools:read` | Lire registre, statut et paramètres de gestion des écoles ; pas les dossiers pédagogiques bruts |
| `platform:schools:create` | Créer tenant SCHOOL et école atomiquement |
| `platform:schools:update` | Modifier métadonnées d’une école |
| `platform:schools:suspend` | Suspendre/réactiver une école sous procédure contrôlée |
| `platform:school_admins:assign` | Associer ou retirer des School Admin d’une école précise ; vérifier identité et traçabilité |
| `platform:users:read` | Rechercher l’identité globale minimale nécessaire à l’administration des comptes ; pas les activités pédagogiques |
| `platform:users:suspend` | Suspendre/réactiver le **compte global** sous procédure contrôlée, distinct du membership d’école |
| `platform:library:manage` | Créer, modifier, publier/archiver la bibliothèque **globale** |
| `platform:languages:manage` | Gérer disponibilité du référentiel global de langues |
| `platform:levels:manage` | Gérer le référentiel CEFR global sous contrôle de cohérence |
| `platform:settings:manage` | Gérer les paramètres de plateforme explicitement exposés |
| `platform:analytics:read` | Lire les agrégats globaux autorisés, sans messages privés ni dossiers élève bruts |

L’attribution/révocation du rôle `SUPER_ADMIN` lui-même, l’accès support aux données privées et la lecture d’audit globale ne sont **pas** inclus dans ce seed conceptuel ; leur procédure et leurs codes éventuels nécessitent une décision distincte. L’amorçage du premier Super Admin est une opération d’exploitation sécurisée à définir, jamais une auto-attribution publique.

### École — rôle scolaire et membership actifs

| Code | Opération permise ; garde supplémentaire |
| --- | --- |
| `school:students:read` | Lire les dossiers administratifs nécessaires : SCHOOL pour admin, ASSIGNED_CLASS pour professeur ; projection minimale |
| `school:students:create` | Créer/rattacher un élève sans dupliquer son compte ; professeur granté limité à ses classes assignées |
| `school:students:import` | Import CSV d’élèves ; mêmes limites et validation ligne par ligne ; grant séparé de `create` |
| `school:students:manage` | Modifier inscription et statut du **membership de cette école** ; niveau via `school:levels:assign`, jamais credentials ni identité globale |
| `school:teachers:read` | Voir les enseignants et leurs affectations dans l’école |
| `school:teachers:manage` | Créer/rattacher, affecter, modifier ou suspendre un membership TEACHER de l’école |
| `school:classes:read` | Lire les classes : SCHOOL pour admin, ASSIGNED_CLASS pour professeur, inscription propre pour étudiant |
| `school:classes:manage` | Créer/modifier/archiver les classes, affecter professeurs et inscrire élèves dans l’école |
| `school:groups:read` | Lire les groupes : SCHOOL pour admin, classe parente assignée pour professeur, inscription propre pour étudiant |
| `school:groups:manage` | Créer/modifier/archiver les groupes et gérer leurs inscriptions dans une classe de l’école |
| `school:languages:manage` | Activer/désactiver pour l’école une langue globalement disponible ; ne crée pas de langue globale |
| `school:levels:assign` | Attribuer/corriger un niveau CEFR existant à un profil scolaire selon la règle de traçabilité future |
| `school:content:read` | Lire selon publication, langue, classe et rôle ; ne donne pas accès à tous les brouillons |
| `school:content_class:create` | Créer un cours de scope CLASS dans une classe assignée (professeur) ou de l’école (admin) |
| `school:content_class:update` | Modifier un cours CLASS : professeur auteur **et** toujours affecté ; admin dans son école |
| `school:content_class:publish` | Publier/archiver pour la classe : même limite auteur + affectation pour professeur ; admin dans son école |
| `school:content_school:manage` | Admin : créer, modifier et archiver les cours SCHOOL de son école ; publication via code distinct |
| `school:content_school:publish` | Grant exceptionnel à un professeur : promouvoir **son** contenu CLASS d’une classe encore assignée au scope SCHOOL ; pas de gestion générale des cours de l’école |
| `school:memberships:assign_role` | Admin : attribuer/retirer STUDENT ou TEACHER dans son école ; jamais SCHOOL_ADMIN/SUPER_ADMIN ni auto-élévation |
| `school:permissions:grant_teacher` | Admin : attribuer/retirer seulement les grants enseignants de la liste autorisée, jamais un privilège de plateforme ou d’admin |
| `school:branding:manage` | Modifier les paramètres visuels de sa seule école |
| `school:settings:manage` | Gérer les futurs paramètres scolaires explicitement définis ; aucun réglage global |
| `school:invitations:manage` | Gérer plus tard les invitations/codes de sa seule école, avec limites d’usage |
| `school:progress:read` | Lire signaux pédagogiques dérivés : SELF étudiant, ASSIGNED_CLASS professeur, SCHOOL admin ; jamais conversation brute |
| `school:analytics:read` | Lire les agrégats d’école autorisés ; pas d’accès brut aux données personnelles hors besoin pédagogique |

`school:students:create` et `school:students:import` sont des **capacités** ; un professeur granté doit encore désigner une classe à laquelle il est affecté activement, respecter école, langue et niveau, et ne peut ni gérer les enseignants ni attribuer un rôle élevé. `school:students:manage` n’autorise pas la modification des identifiants globaux ou du mot de passe. Le School Admin peut seulement gérer des données de son école et ne peut créer une nouvelle ligne `users` que comme effet contrôlé d’un onboarding, avec recherche d’identité globale, preuve/activation et règles anti-doublon. Seul `platform:users:suspend` suspend le compte global, et non un simple membership.

Lors de **sa propre création/import autorisé**, le professeur peut renseigner le niveau initial CEFR de l’élève affecté à sa classe, comme le prévoit le cahier des charges ; cela ne lui donne pas `school:levels:assign` pour modifier plus tard un profil quelconque. Un élève déjà membre de la même école peut être rattaché à une classe assignée sans créer un second compte. La correction ultérieure du niveau reste une opération d’administration scolaire tracée.

Les références `languages` et `cefr_levels` sont lisibles dans leur partie **disponible** pour permettre sélection, affichage et validation des niveaux ; cette lecture n’accorde aucune écriture. `platform:languages:manage` et `platform:levels:manage` contrôlent leurs référentiels globaux. `school:languages:manage` permet au School Admin de choisir, pour son école, un sous-ensemble des langues globalement actives. `school:levels:assign` applique seulement un niveau du référentiel à un profil scolaire autorisé : une école ne crée pas de code CEFR arbitraire. Un apprenant personnel choisit parmi les langues globalement disponibles ; un étudiant scolaire parmi celles activées par son école.

### Politiques `SELF` sans permission stockée

Un compte actif peut lire/modifier les champs **autorisés** de son identité globale et gérer ses propres identifiants de connexion via le futur module auth. Dans un tenant personnel qu’il possède, il peut choisir les langues globalement offertes, activer les parcours disponibles, lire et alimenter ses propres profils, résultats, historique, révisions et conversations IA. Dans un tenant scolaire, un étudiant avec membership/inscription actifs peut accéder à ses profils, activités et contenus éligibles ; le rôle STUDENT fournit en plus les permissions scolaires `read` de la [matrice](permission-matrix.md) lorsque des ressources de l’école sont impliquées. Aucun rôle TEACHER ou SCHOOL_ADMIN ne crée à lui seul une inscription d’apprentissage scolaire. Le profil personnel ne devient jamais visible à l’école par simple appartenance.

Ces politiques ne permettent pas de choisir n’importe quel `user_id` dans l’URL : l’acteur est dérivé de la session. La sélection de langue et le niveau restent soumis au catalogue, à l’offre de l’école, aux droits de parcours et à la validation backend. La mise à jour de son niveau scolaire par l’apprenant n’est pas libre : test, suggestion acceptée ou règle d’école autorisée.

## 4. Rôles par défaut, grants et révocation

La [matrice](permission-matrix.md) est la proposition canonique des liaisons `role_permissions`. `SUPER_ADMIN` ne reçoit que des codes `platform:*:*`. `SCHOOL_ADMIN` reçoit les codes d’administration scolaire ; `TEACHER` reçoit lecture et création/édition/publication de contenu CLASS dans ses affectations, plus suivi pédagogique ; `STUDENT` reçoit uniquement les lectures scolaires nécessaires, toujours bornées à soi/à ses inscriptions. Les droits de chaque rôle sont proposés pour le seed futur, à ajouter progressivement avec les cas d’usage réels.

`school_membership_permission_grants` est **ALLOW only**. Un School Admin peut accorder à un TEACHER actif de sa propre école uniquement `school:students:create`, `school:students:import` ou `school:content_school:publish`, puis les retirer. Ces grants ne modifient pas le rôle et n’élargissent jamais l’école ni l’affectation. Le grant ne survit pas comme accès effectif à une suspension du compte/membership, à la perte du rôle TEACHER ou à la fin d’affectation. L’admin ne peut ni se grant lui-même une capacité, ni attribuer `SCHOOL_ADMIN`, `SUPER_ADMIN`, `school:permissions:grant_teacher` ou tout code hors liste. Une opération qui nécessite un droit d’admin reste impossible au professeur même avec un grant adjacent.

Pas de `DENY` explicite, priorité, héritage de rôle inter-écoles ni ACL générique par ligne pour le MVP. Le refus par défaut résulte de l’absence de capacité ou de l’échec d’un garde. Pour retirer un droit par défaut à tous les détenteurs d’un rôle, modifier sa configuration `role_permissions` dans une évolution contrôlée ; pour empêcher une personne d’exercer un rôle, retirer/suspendre son rôle ou membership. Un retrait individuel d’une seule permission fournie par un rôle n’est pas représenté ; si un tel besoin apparaît, décider alors d’un rôle distinct ou d’un modèle plus fin avant d’ajouter DENY.

## 5. Accès aux ressources

| Ressource | Étudiant / autonome | Professeur | School Admin | Super Admin |
| --- | --- | --- | --- | --- |
| Identité globale `users` | Champs personnels autorisés de soi | Ses propres champs ; données minimales des élèves affectés via projection scolaire | Données nécessaires des membres de son école, sans credentials ni dossiers d’autres écoles | Recherche minimale et suspension du compte global via opérations nommées ; aucun droit général de lire les activités privées |
| Classes | Étudiant : classes où inscrit activement ; autonome : aucune | Classes assignées activement | Toutes les classes de son école | Métadonnées de plateforme si opération prévue ; pas de route scolaire implicite |
| Groupes | Étudiant : groupes de ses inscriptions ; autonome : aucun | Groupes des classes assignées | Groupes de son école | Pas de lecture scolaire implicite |
| Profils langue, résultats, progression, SRS futur | Soi dans le tenant actif | Élèves activement inscrits dans ses classes assignées, données pédagogiques nécessaires uniquement | Données pédagogiques de son école pour gestion/suivi autorisés | Agrégats autorisés ; dossiers individuels seulement après décision support distincte |
| Conversations IA brutes, messages, corrections privées | Soi dans le tenant actif | **Refus par défaut** | **Refus par défaut** | **Refus par défaut** |
| Signaux IA/SRS dérivés | Soi | Difficultés, erreurs fréquentes, notions à revoir et révisions des élèves affectés, avec minimisation | Vue scolaire nécessaire, avec minimisation | Agrégats globaux autorisés |

Une même personne inscrite dans plusieurs classes peut être visible à plusieurs professeurs, mais **seulement dans le contexte scolaire courant** et pour les données pédagogiques nécessaires. Un résultat lié à une classe non affectée ne devient pas visible simplement parce que l’élève a aussi une classe affectée ; les futures tables de résultats devront garder une provenance de classe/contenu suffisante pour filtrer. Un profil langue agrégé à l’échelle du tenant peut mêler des activités de plusieurs classes : la vue professeur doit filtrer/projeter les signaux par provenance autorisée ou refuser l’agrégat indivisible. **Cette exigence doit guider le futur schéma de progression** ; le profil `user_language_profiles` seul ne prouve pas le droit d’un professeur sur toutes les activités d’un élève. Pour School Admin, l’accès pédagogique scolaire n’inclut pas automatiquement les conversations brutes.

### Contenu `GLOBAL`, `SCHOOL`, `CLASS`

- `GLOBAL` : seul un opérateur de plateforme avec `platform:library:manage` crée/modifie/publie. Les versions publiées et rendues disponibles sont consultables par les apprenants autorisés des contextes scolaire ou personnel selon langue, niveau/parcours et règles de diffusion. Brouillons réservés à la plateforme. Une école personnalise par copie/version SCHOOL, pas par écriture sur l’original global.
- `SCHOOL` : School Admin gère les cours de **son** école via `school:content_school:manage` et les publie via `school:content_school:publish`. Les membres peuvent consulter les versions publiées selon rôle, langue et disponibilité. Un professeur avec grant `school:content_school:publish` peut promouvoir son cours CLASS autorisé ; il ne gère pas tous les contenus SCHOOL. Après promotion, `created_by_user_id` ne lui donne pas à lui seul le droit de modifier la version scolaire : l’édition relève de l’administration de l’école jusqu’à une règle supplémentaire explicitement validée.
- `CLASS` : professeur affecté peut créer, modifier et publier son **propre** cours pour cette classe, suivant les trois permissions `school:content_class:*`. D’autres professeurs affectés peuvent consulter selon publication et besoin pédagogique, mais pas modifier sans règle additionnelle. School Admin gère dans son école. Étudiant inscrit activement voit seulement les versions publiées qui lui sont destinées.
- `lessons` héritent du scope et de l’état du cours, avec leur propre statut de publication. `courses.created_by_user_id` est une trace d’auteur, **pas** une règle d’accès suffisante : scope, tenant, affectation, rôle, permission, publication et éventuellement auteur sont évalués ensemble. Un enseignant retiré de sa classe perd la capacité d’éditer son ancien contenu CLASS. La promotion CLASS → SCHOOL exige une décision de publication transactionnelle et traçable ; le mécanisme de version/copie reste à concevoir avec le CMS.

L’hypothèse provisoire du [modèle de données](data-model.md) est `School → Class → Group`. Un professeur affecté à la classe a accès aux groupes de cette classe pour le suivi autorisé. Il n’existe pas encore d’affectation professeur-groupe séparée. Si le produit demande qu’un enseignant ne voie qu’un sous-groupe d’une classe, le modèle et les règles devront ajouter une affectation explicite avant l’implémentation correspondante ; on ne déduit pas ce droit du simple rôle TEACHER.

## 6. Confidentialité, API et traçabilité

Classer les futures données en **administratives** (membership, classe, statut), **pédagogiques** (niveau, tentatives, difficultés, progression) et **privées/sensibles** (identifiants, messages IA bruts, contenu libre, données personnelles hors besoin scolaire). Chaque vue/endpoint définit les champs minimaux pour son rôle et son objectif. `school:progress:read` donne des signaux pédagogiques autorisés, pas un export brut de toutes les conversations. Une nouvelle utilisation secondaire des conversations nécessite finalité, visibilité, rétention et décision produit explicites, notamment pour les mineurs. Les profils et conversations d’un tenant personnel ne sont jamais visibles à une école par simple présence du même `users.id`.

Convention future de contrôle : une frontière HTTP commune authentifie et résout le contexte ; les services métier appliquent `require_global_role`, `require_school_membership`, `require_permission`, `require_resource_scope` ou équivalents, avec refus par défaut. Ces noms sont **conceptuels**, aucun helper n’est créé maintenant. Les repositories filtrent le tenant, mais le service conserve la décision métier. Une ressource étrangère au contexte répond comme introuvable selon les [conventions API](api-conventions.md) ; ne jamais confirmer son existence. Pagination, filtres, statistiques, téléchargements et URL signées reprennent les mêmes gardes.

Les routes futures `/student`, `/teacher`, `/admin` et `/super-admin` organisent l’expérience. Le frontend peut masquer actions et rediriger un utilisateur ; un accès direct à l’API reste refusé côté FastAPI si les gardes échouent. Les Server Components Next.js ne disposent d’aucun privilège métier différent. L’affichage d’une route n’est pas une preuve d’autorisation.

À journaliser plus tard avec acteur, contexte, action, cible, décision et horodatage, sans secrets ni messages IA bruts : création/suspension d’école, suspension d’un compte global, association d’admin, changement de rôle, octroi/retrait/usage d’un grant spécial, suspension de membership, affectation de classe, import CSV et publication SCHOOL/GLOBAL. Aucun audit log ou table d’audit n’est créé à cette étape. Le canal d’audit, la rétention et l’accès aux traces seront définis avant les données réelles.

## 7. Revue des dix scénarios demandés

| Cas | Décision attendue |
| --- | --- |
| Teacher Alice A demande Student Bob B | Refus : membership et tenant B absents. |
| Alice enseigne Class 1, Student X relève de Class 2 dans A | Refus de lire les résultats Class 2 : aucun lien d’affectation/provenance autorisé. |
| Alice Teacher A et School Admin B | Contexte A : droits Teacher ; contexte B : droits School Admin ; aucun cumul entre écoles. |
| Teacher reçoit `school:students:create` | Peut ajouter un élève à ses classes assignées de son école ; ne gère pas les enseignants. |
| Teacher crée cours CLASS A | Peut publier pour cette classe ; publication SCHOOL refusée sans grant dédié. |
| School Admin A modifie B | Refus : contexte/membership B manquants. |
| Student ouvre `/admin` directement | Redirection UI possible ; toutes les API admin refusent côté backend. |
| Propriétaire d’un tenant PERSONAL utilise API de gestion scolaire | Refus : pas de membership SCHOOL ni de permission scolaire. |
| Teacher lit conversation IA brute d’un élève | Refus par défaut ; seuls signaux pédagogiques dérivés autorisés. |
| Super Admin traverse plusieurs écoles | Autorisé seulement par une route PLATFORM définie avec permission précise ; pas de bypass scolaire général. |

## 8. Arbitrages encore ouverts

- **Progression d’un élève dans plusieurs classes :** la future provenance des événements doit permettre le filtre par classe ; avant de créer des agrégats professeur, fixer la règle de projection pour les activités communes à plusieurs classes. Recommandation : ne montrer que les activités attribuables à une classe affectée et les indicateurs scolaires explicitement partagés ; masquer un agrégat indivisible.
- **Affectation par groupe :** l’hypothèse actuelle donne au professeur la classe et ses groupes. Une restriction à certains groupes demanderait un modèle d’affectation supplémentaire ; valider avec l’école pilote avant de développer le suivi par groupe.
- **A03 et conversations IA :** le pont inter-tenant et l’accès éventuel au texte brut par un adulte demandent consentement, finalité, provenance, visibilité et rétention. Recommandation : aucun transfert inter-tenant ni accès brut par défaut.
- **A02/A10 :** lien d’activation ou mot de passe temporaire, preuve de possession d’un compte existant, édition des données globales d’un élève par une école et bootstrap du premier Super Admin restent à définir avant auth/import.
- **Diffusion/version des contenus et analytics :** définir ciblage multi-classes/groupes, règles de disponibilité globale, copie/version SCHOOL et seuils de confidentialité des agrégats au moment des modules concernés.

La prochaine étape de développement ne peut pas traiter ces hypothèses comme des droits implicites. Ce document ne modifie aucune table de l’étape 5.
