# Modèle de données multi-écoles — conception

**Statut : conception uniquement (étape 5, 1 octobre 2026).** Aucune table, migration, classe SQLAlchemy, donnée de référence ou règle d’accès n’est créée. Lire avec le [diagramme ER](data-model-diagram.md), l’[architecture](architecture.md), les [règles de sécurité](security-rules.md) et l’[ADR-001](decisions/ADR-001-tenant-model.md). Références fonctionnelles externes : **CAHIER DES CHARGES V1.docx** et **Guide_MVP_Plateforme_Langues_Scalable.pdf** ; la décision plus récente limite le MVP à English et German et exclut l’offline.

## Règles structurantes

Une base PostgreSQL et un schéma partagés hébergent les comptes globaux, les écoles et les espaces personnels. `users` est l’identité unique ; `school_memberships` exprime l’appartenance à une école. `tenants` exprime le contexte privé `SCHOOL` ou `PERSONAL`. Pour une école, `schools.id = tenants.id` par PK/FK partagée. Pour un espace personnel, `tenants.owner_user_id` désigne le propriétaire. Les états d’apprentissage portent `tenant_id` non nul ; les entités scolaires portent `school_id`, qui est déjà l’identifiant de leur tenant. Ne pas recopier systématiquement les deux colonnes. Le backend résout et vérifie le contexte avant toute requête privée.

Un `user_language_profiles` correspond à **un utilisateur, une langue et un tenant**. Les deux parcours peuvent coexister et échanger des observations pédagogiques validées dans ce tenant. Le même utilisateur peut avoir un profil English personnel, un profil English dans School A et un autre dans School B. Aucune fusion ou lecture croisée automatique. Le pont inter-contextes reste l’arbitrage produit A03 décrit dans l’ADR.

Les valeurs `en` et `de` seront des **données de référence initiales**, pas des colonnes, enums PostgreSQL ou branches métier. `languages` pourra accueillir d’autres codes, et `school_languages` déterminera l’offre de chaque école. Les six niveaux CEFR sont des lignes de référence ordonnées. L’activation globale d’une langue et son offre par école sont contrôlées par service ; le modèle relationnel n’impose pas un catalogue codé en dur.

### Conventions de schéma pour l’implémentation future

- UUIDv4 natif PostgreSQL pour les identifiants d’entités publiques ; clés composites sur les relations de référence simples. Les codes de rôle, permission, langue et CEFR sont des clés textuelles stables quand cela évite un identifiant artificiel. Aucun UUID stocké comme chaîne.
- Instants en `TIMESTAMPTZ`, produits et interprétés en UTC. `created_at` et `updated_at` sur les entités mutables ; `joined_at`, `enrolled_at` et `assigned_at` seulement quand l’événement apporte un sens distinct. Pas d’auteur/modificateur ni de `deleted_at` systématique.
- Tous les champs listés sont `NOT NULL`, sauf mention `nullable`. Les statuts et scopes à vocabulaire fermé utilisent `CHECK` textuel pour le MVP ; les langues et niveaux restent des tables extensibles. Les valeurs de statuts ci-dessous sont proposées, pas un contrat applicatif déjà implémenté.
- FK sur une entité de référence ou métier : suppression `RESTRICT/NO ACTION` par défaut. Désactiver/archiver comptes, écoles, classes et contenus ; ne pas supprimer en cascade une école. Pour les tables de jonction pures, la suppression physique contrôlée peut utiliser `CASCADE` sur leurs parents, mais aucun flux métier ne doit compter sur une suppression accidentelle. Les choix précis de `ON DELETE` seront reproduits dans les migrations après validation.
- Les unicités impliquent déjà un index. Les « index » du catalogue ci-dessous s’ajoutent seulement pour des accès attendus ; PostgreSQL ne crée pas automatiquement l’index de chaque côté référençant d’une FK. Vérifier les requêtes et leurs plans avant d’ajouter d’autres index. Voir la [documentation PostgreSQL sur contraintes et FK](https://www.postgresql.org/docs/18/ddl-constraints.html).
- Une FK composite cite une clé unique correspondante sur la table parente. Les colonnes de contexte utilisées dans ces FK sont `NOT NULL` pour éviter qu’une FK composite soit contournée par une valeur nulle. Une unicité technique supplémentaire peut être nécessaire même si `id` est déjà PK.

## Classification et propriété métier

`GLOBAL` signifie administré par la plateforme, **pas lisible publiquement**. `USER` signifie données privées de l’utilisateur **dans un tenant**. `REFERENCE` désigne un catalogue global contrôlé. Le module propriétaire désigne la future place dans `backend/app/modules/`, sans fichier créé aujourd’hui.

| Scope | Tables proposées | Module propriétaire |
| --- | --- | --- |
| GLOBAL — identité/plateforme | `users`, `tenants`, `schools`, `roles`, `permissions`, `role_permissions`, `user_global_roles` | identity / tenancy |
| SCHOOL — données d’école | `school_branding`, `school_memberships`, `school_membership_roles`, `school_membership_permission_grants`, `classes`, `groups`, `class_enrollments`, `group_enrollments`, `teacher_class_assignments`, `school_languages` | tenancy / schools / catalog |
| REFERENCE — catalogue | `languages`, `cefr_levels` | catalog |
| USER — état pédagogique contextualisé | `user_language_profiles` | learning |
| GLOBAL/SCHOOL — contenu selon `scope` | `courses`, `lessons` (héritent du cours) | content |

## Catalogue des tables proposées

Les index cités incluent les clés uniques lorsqu’elles suffisent. `RESTRICT` dans ce catalogue désigne aussi le `NO ACTION` différable éventuel à choisir lors des migrations, sans cascade implicite.

### Identité, tenant et école

#### `users`

- **Purpose / Scope :** identité et connexion uniques à l’échelle plateforme ; `GLOBAL`, données personnelles privées.
- **Primary key :** `id UUIDv4`.
- **Main fields :** `email`, `password_hash nullable` pendant invitation/activation, `first_name nullable`, `last_name nullable`, `status` (`PENDING`, `ACTIVE`, `SUSPENDED`), `created_at`, `updated_at`.
- **Foreign keys :** aucune. **Unique :** index unique sur `lower(email)` après normalisation des espaces et de la casse ; `email` requis. Pas de `username` tant qu’un cas de connexion distinct n’est pas établi.
- **Important indexes :** unicité e-mail ; PK. **Delete behavior :** suppression bloquée par tenants, memberships, profils et contenus liés ; suspension et politique d’effacement à définir.
- **Notes :** `PENDING` ne permet pas une connexion active. L’école ne remplace jamais le mot de passe d’un compte existant via import CSV. Ne jamais exposer le hash. L’arbitrage A02 déterminera lien d’activation ou mot de passe temporaire.

#### `tenants`

- **Purpose / Scope :** contexte d’isolation `SCHOOL` ou `PERSONAL` ; `GLOBAL` comme registre, mais accès restreint.
- **Primary key :** `id UUIDv4`.
- **Main fields :** `kind`, `owner_user_id nullable`, `created_at`, `updated_at`.
- **Foreign keys :** `owner_user_id → users.id`. **Unique :** `owner_user_id` non nul unique ; un seul tenant personnel par utilisateur.
- **Important indexes :** PK, unicité du propriétaire. **Delete behavior :** `RESTRICT` sur propriétaire et données contextualisées ; archivage/effacement explicite.
- **Notes :** `CHECK` : `PERSONAL` exige `owner_user_id`, `SCHOOL` l’interdit. La FK ne prouve pas qu’un tenant `SCHOOL` a exactement une ligne `schools` ; service transactionnel et tests. `kind` immuable.

#### `schools`

- **Purpose / Scope :** organisation scolaire et identité affichable de base ; `GLOBAL` comme registre, données de gestion privées à l’école/plateforme.
- **Primary key :** `id UUIDv4`, partagé avec le tenant `SCHOOL`.
- **Main fields :** `name`, `slug`, `status` (`ACTIVE`, `SUSPENDED`), `created_at`, `updated_at`.
- **Foreign keys :** `id → tenants.id`. **Unique :** `slug` normalisé globalement ; PK.
- **Important indexes :** slug unique ; PK. **Delete behavior :** `RESTRICT` par memberships, classes, contenus et paramètres ; suspension au lieu d’une suppression ordinaire.
- **Notes :** `name` n’est pas unique. Le service vérifie `tenants.kind = SCHOOL` et crée les deux lignes atomiquement.

#### `school_branding`

- **Purpose / Scope :** paramètres visuels propres à une école, sans fork d’application ; `SCHOOL`.
- **Primary key :** `school_id UUIDv4` (une ligne par école).
- **Main fields :** `display_name nullable`, `primary_color nullable`, `secondary_color nullable`, `updated_at`.
- **Foreign keys :** `school_id → schools.id`. **Unique :** PK. **Important indexes :** PK.
- **Delete behavior :** `RESTRICT` avec l’école ; suppression explicite de la configuration si une école est réellement effacée.
- **Notes :** couleurs validées comme valeurs CSS sûres à l’entrée ; logo/favicon référenceront un futur modèle de fichiers autorisés, pas un chemin arbitraire ni un JSON fourre-tout. Absence de ligne = thème global.

#### `school_memberships`

- **Purpose / Scope :** rattachement d’une identité globale à une école ; `SCHOOL`.
- **Primary key :** `id UUIDv4`.
- **Main fields :** `school_id`, `user_id`, `status` (`INVITED`, `ACTIVE`, `SUSPENDED`, `LEFT`), `joined_at nullable`, `created_at`, `updated_at`.
- **Foreign keys :** `school_id → schools.id`, `user_id → users.id`. **Unique :** `(school_id,user_id)` ; `(school_id,id)` pour les FK composites des affectations.
- **Important indexes :** `(user_id,status)` pour retrouver les écoles d’une identité ; les deux uniques ci-dessus.
- **Delete behavior :** `RESTRICT` si rôles, affectations ou inscriptions ; modifier le statut plutôt que supprimer. **Notes :** une invitation n’accorde aucun droit ; seul un compte et un membership actifs peuvent accéder. Réinvitation actualise l’association existante sous contrôle, sans doublon. Le tenant scolaire est `school_id`.

### Autorisation

#### `roles`

- **Purpose / Scope :** rôles stables de plateforme ou d’école ; `GLOBAL`.
- **Primary key :** `code` text (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT` initialement).
- **Main fields :** `scope` (`PLATFORM` ou `SCHOOL`), `description`.
- **Foreign keys :** aucune. **Unique :** `code` PK ; `(code,scope)` pour FK de scope. **Important indexes :** PK et clé de scope.
- **Delete behavior :** `RESTRICT` tant que droits ou attributions référencent le rôle. **Notes :** rôles sont des données administrées/versionnées ; aucun rôle unique sur `users`.

#### `permissions`

- **Purpose / Scope :** capacités nommées et bornées, p. ex. `school:classes:manage` ; `GLOBAL`.
- **Primary key :** `code` text.
- **Main fields :** `scope` (`PLATFORM` ou `SCHOOL`), `description`.
- **Foreign keys :** aucune. **Unique :** `code` PK ; `(code,scope)` si vérification de scope en FK. **Important indexes :** PK.
- **Delete behavior :** `RESTRICT` si attribuée. **Notes :** le [catalogue canonique](authorization-model.md) et la [matrice](permission-matrix.md) de l’étape 6 fixent les capacités proposées ; pas d’ACL générique par ressource ni de seed réel à ce stade.

#### `role_permissions`

- **Purpose / Scope :** droits par défaut d’un rôle ; `GLOBAL` comme configuration, jamais preuve suffisante d’accès à une ligne privée.
- **Primary key :** `(role_code,permission_code)`.
- **Main fields :** deux codes ; `scope` commun si FK composites de scope retenues.
- **Foreign keys :** `role_code → roles.code`, `permission_code → permissions.code` ; FK composites possibles vers `(code,scope)` pour interdire un droit SCHOOL dans un rôle PLATFORM.
- **Unique :** PK. **Important indexes :** PK ; `(permission_code,role_code)` seulement si révocation/recherche inverse utilisée.
- **Delete behavior :** `CASCADE` possible sur suppression contrôlée d’un rôle/droit de référence ; aucun effet sur les données scolaires. **Notes :** refus par défaut et affectation/propriété restent exigés.

#### `user_global_roles`

- **Purpose / Scope :** attribution explicite des rôles plateforme, dont `SUPER_ADMIN` ; `GLOBAL`, accès très restreint.
- **Primary key :** `(user_id,role_code)`.
- **Main fields :** `user_id`, `role_code`, `role_scope` fixé à `PLATFORM`, `granted_at`.
- **Foreign keys :** `user_id → users.id`, `(role_code,role_scope) → roles(code,scope)` ; `CHECK role_scope=PLATFORM`.
- **Unique :** PK. **Important indexes :** PK, `(role_code,user_id)` pour audit des détenteurs.
- **Delete behavior :** révocation par suppression explicite de la jonction ; références principales `RESTRICT`. **Notes :** `SUPER_ADMIN` n’est pas un booléen ni une permission de lire automatiquement les données privées de toutes les écoles.

#### `school_membership_roles`

- **Purpose / Scope :** rôle(s) d’une personne dans **une** école ; `SCHOOL`.
- **Primary key :** `(school_id,membership_id,role_code)`.
- **Main fields :** ces trois clés, `role_scope` fixé à `SCHOOL`, `granted_at`.
- **Foreign keys :** `(school_id,membership_id) → school_memberships(school_id,id)` ; `(role_code,role_scope) → roles(code,scope)` ; `CHECK role_scope=SCHOOL`.
- **Unique :** PK. **Important indexes :** PK ; `(school_id,role_code,membership_id)` pour retrouver les personnes d’un rôle.
- **Delete behavior :** révocation explicite de la jonction ; `RESTRICT` sur membership encore affecté. **Notes :** Teacher dans A et School Admin dans B sans modifier le compte global.

#### `school_membership_permission_grants`

- **Purpose / Scope :** droit positif exceptionnel d’un membre, p. ex. import/ajout d’élèves ou publication ; `SCHOOL`.
- **Primary key :** `(school_id,membership_id,permission_code)`.
- **Main fields :** ces clés, `permission_scope` fixé à `SCHOOL`, `granted_at`.
- **Foreign keys :** `(school_id,membership_id) → school_memberships(school_id,id)` ; `(permission_code,permission_scope) → permissions(code,scope)` ; `CHECK permission_scope=SCHOOL`.
- **Unique :** PK. **Important indexes :** PK. **Delete behavior :** révocation par suppression explicite de la jonction ; parents `RESTRICT`.
- **Notes :** uniquement des grants, sans DENY ni délégation implicite. Le droit effectif reste limité par la classe attribuée, le statut et la ressource. Une seule table facultative évite un moteur IAM général.

### Organisation scolaire

#### `classes`

- **Purpose / Scope :** classes d’une école ; `SCHOOL`.
- **Primary key :** `id UUIDv4`.
- **Main fields :** `school_id`, `name`, `description nullable`, `status` (`ACTIVE`, `ARCHIVED`), `created_at`, `updated_at`.
- **Foreign keys :** `school_id → schools.id`. **Unique :** `(school_id,id)` en plus de la PK pour FK composites ; pas d’unicité sur le nom (réutilisable).
- **Important indexes :** `(school_id,status)` ; `(school_id,id)` couvre la clé contextuelle. **Delete behavior :** `RESTRICT` si groupe, inscription, enseignant ou contenu ; archiver.
- **Notes :** `academic_year` différé tant que sa sémantique (libre, calendrier, cohorte) n’est pas fixée ; peut être ajouté sans refonte.

#### `groups`

- **Purpose / Scope :** sous-groupe d’une classe dans une école ; `SCHOOL`.
- **Primary key :** `id UUIDv4`.
- **Main fields :** `school_id`, `class_id`, `name`, `status` (`ACTIVE`, `ARCHIVED`), `created_at`, `updated_at`.
- **Foreign keys :** `(school_id,class_id) → classes(school_id,id)` ; `school_id → schools.id` si exigé par l’ORM/migration.
- **Unique :** `(school_id,class_id,name)` ; `(school_id,class_id,id)` pour FK composite des inscriptions.
- **Important indexes :** `(school_id,class_id)` déjà préfixe des uniques. **Delete behavior :** `RESTRICT` si inscription ; archiver.
- **Notes :** hypothèse **classe → groupe** pour le MVP ; le CDC nomme les deux mais ne fixe pas formellement leur relation. Voir « Questions à valider ».

#### `class_enrollments`

- **Purpose / Scope :** inscription d’un étudiant membre à une classe ; `SCHOOL`.
- **Primary key :** `id UUIDv4`.
- **Main fields :** `school_id`, `class_id`, `student_membership_id`, `status` (`ACTIVE`, `ENDED`), `enrolled_at`, `created_at`, `updated_at`.
- **Foreign keys :** `(school_id,class_id) → classes(school_id,id)` ; `(school_id,student_membership_id) → school_memberships(school_id,id)`.
- **Unique :** `(school_id,class_id,student_membership_id)` ; `(school_id,class_id,id)` pour FK de groupe.
- **Important indexes :** `(school_id,student_membership_id,status)` pour les classes de l’étudiant ; `(school_id,class_id)` couvert par unique.
- **Delete behavior :** `RESTRICT` si groupe/résultats futurs ; terminer l’inscription. **Notes :** le service exige un membership actif avec rôle STUDENT. Le pointeur vers membership et les FK composites bloquent le croisement d’écoles.

#### `group_enrollments`

- **Purpose / Scope :** rattachement d’une inscription de classe à un groupe de cette même classe ; `SCHOOL`.
- **Primary key :** `(school_id,class_id,group_id,class_enrollment_id)`.
- **Main fields :** ces clés, `joined_at`.
- **Foreign keys :** `(school_id,class_id,group_id) → groups(school_id,class_id,id)` ; `(school_id,class_id,class_enrollment_id) → class_enrollments(school_id,class_id,id)`.
- **Unique :** PK. **Important indexes :** `(school_id,class_id,class_enrollment_id)` pour les groupes d’un étudiant ; PK pour les membres d’un groupe.
- **Delete behavior :** retrait explicite de la jonction ; parents `RESTRICT`. **Notes :** les deux FK garantissent école et classe communes ; plusieurs groupes par classe restent possibles, à limiter par règle produit si besoin.

#### `teacher_class_assignments`

- **Purpose / Scope :** classes attribuées à un professeur ; `SCHOOL`.
- **Primary key :** `(school_id,class_id,teacher_membership_id)`.
- **Main fields :** ces clés, `assigned_at`, `status` (`ACTIVE`, `ENDED`).
- **Foreign keys :** `(school_id,class_id) → classes(school_id,id)` ; `(school_id,teacher_membership_id) → school_memberships(school_id,id)`.
- **Unique :** PK. **Important indexes :** `(school_id,teacher_membership_id,status)` pour les classes accessibles ; PK pour les enseignants d’une classe.
- **Delete behavior :** terminer l’affectation avant effacement contrôlé ; parents `RESTRICT`. **Notes :** le rôle TEACHER et la permission ne suffisent jamais à lire toutes les classes ; le service exige une affectation active. Le service vérifie le rôle du membership.

### Langues et contexte d’apprentissage

#### `languages`

- **Purpose / Scope :** langues apprises disponibles sur la plateforme ; `REFERENCE`.
- **Primary key :** `code` text normalisé (ex. `en`, `de`).
- **Main fields :** `name`, `is_active`, `created_at`, `updated_at`.
- **Foreign keys :** aucune. **Unique :** code PK. **Important indexes :** PK ; petit référentiel, pas d’index supplémentaire.
- **Delete behavior :** `RESTRICT` si offert, utilisé par profil ou cours ; désactiver. **Notes :** codes normalisés compatibles BCP 47 quand nécessaires ; la politique exacte de variantes régionales sera décidée avant leur ajout.

#### `cefr_levels`

- **Purpose / Scope :** niveaux CEFR ordonnés ; `REFERENCE`.
- **Primary key :** `code` text (`A1` à `C2` comme lignes de référence).
- **Main fields :** `rank` entier positif, `name nullable`.
- **Foreign keys :** aucune. **Unique :** `code` PK, `rank`. **Important indexes :** uniques seulement.
- **Delete behavior :** `RESTRICT` si profil ou cours référencé. **Notes :** l’ordre vient de `rank`, pas d’une comparaison lexicale ou d’un enum fermé dans les tables métier.

#### `school_languages`

- **Purpose / Scope :** offre de langues d’une école ; `SCHOOL`.
- **Primary key :** `(school_id,language_code)`.
- **Main fields :** ces clés, `is_active`, `created_at`, `updated_at`.
- **Foreign keys :** `school_id → schools.id`, `language_code → languages.code`. **Unique :** PK. **Important indexes :** PK ; `(language_code,school_id)` seulement si recherche inverse demandée.
- **Delete behavior :** désactiver plutôt que supprimer si des profils existent ; parents `RESTRICT`. **Notes :** Spanish pourra être ajouté globalement puis activé dans une école sans migration de structure.

#### `user_language_profiles`

- **Purpose / Scope :** état initial et courant par identité/langue/contexte ; `USER` dans un tenant `SCHOOL` ou `PERSONAL`.
- **Primary key :** `id UUIDv4`.
- **Main fields :** `tenant_id`, `user_id`, `language_code`, `initial_cefr_code nullable`, `initial_level_source nullable` (`SCHOOL`, `PLACEMENT`, `BEGINNER`, `USER`), `current_cefr_code nullable` avant évaluation/attribution, `school_path_enabled`, `communication_path_enabled`, `status` (`ACTIVE`, `PAUSED`), `created_at`, `updated_at`.
- **Foreign keys :** `tenant_id → tenants.id`, `user_id → users.id`, `language_code → languages.code`, `initial_cefr_code` et `current_cefr_code → cefr_levels.code`.
- **Unique :** `(tenant_id,user_id,language_code)` ; `(tenant_id,user_id,language_code,id)` peut être ajouté pour les futures FK de SRS/IA si le besoin se confirme.
- **Important indexes :** `(user_id,tenant_id)` pour les contextes de l’apprenant ; unique pour lecture scoped.
- **Delete behavior :** `RESTRICT` dès que progression/IA/SRS y sont liés ; pause ou effacement contrôlé par politique de rétention. **Notes :** service : tenant personnel propriétaire, ou membership scolaire actif et langue offerte par l’école. Les deux parcours du **même tenant** partagent ce profil ; pas de fusion entre tenants. Le niveau initial et son origine sont conservés ici ; les changements ultérieurs pourront être tracés dans une future table d’événements. `CHECK` associe source et niveau initial (les deux nuls ou les deux renseignés) ; l’activation des parcours dépendra des droits et de l’offre, pas des deux booléens seuls.

### Contenu pédagogique structurel

#### `courses`

- **Purpose / Scope :** tronc commun de la bibliothèque et des contenus scolaires ; `GLOBAL` si `scope=GLOBAL`, sinon `SCHOOL`.
- **Primary key :** `id UUIDv4`.
- **Main fields :** `scope` (`GLOBAL`, `SCHOOL`, `CLASS`), `school_id nullable`, `class_id nullable`, `language_code`, `cefr_code nullable`, `title`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `created_by_user_id nullable`, `created_at`, `updated_at`.
- **Foreign keys :** `school_id → schools.id`, `(school_id,class_id) → classes(school_id,id)` pour `CLASS`, `language_code → languages.code`, `cefr_code → cefr_levels.code`, `created_by_user_id → users.id`.
- **Unique :** PK. **Important indexes :** `(scope,status,language_code)` pour bibliothèque globale ; `(school_id,status,language_code)` pour école ; `(school_id,class_id,status)` si le listing par classe le nécessite.
- **Delete behavior :** `RESTRICT` si leçons ou usages pédagogiques ; archiver/versionner. **Notes :** `CHECK` exclusif : GLOBAL ⇒ `school_id` et `class_id` nuls ; SCHOOL ⇒ `school_id` non nul et `class_id` nul ; CLASS ⇒ les deux non nuls. Une FK composite nullable est protégée par ce `CHECK`. Un cours professeur est `CLASS` par défaut ; promotion à `SCHOOL` seulement par service autorisé, sans modifier une version globale. `created_by_user_id` sert à l’audit, pas seul à accorder l’accès. Le ciblage de plusieurs classes/groupes ou le versionnement viendra avec le CMS.

#### `lessons`

- **Purpose / Scope :** séquence ordonnée d’un cours ; même scope que son parent (`GLOBAL` ou `SCHOOL`).
- **Primary key :** `id UUIDv4`.
- **Main fields :** `course_id`, `title`, `position` entier positif, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `created_at`, `updated_at`.
- **Foreign keys :** `course_id → courses.id`. **Unique :** `(course_id,position)`. **Important indexes :** cette unicité couvre la liste ordonnée.
- **Delete behavior :** `RESTRICT` si usages/exercices futurs ; archiver. **Notes :** aucune copie de `school_id` ou `scope` : toujours résoudre le cours parent pour l’accès. Contenu riche et variantes d’exercices restent hors de cette étape.

## Contrôles d’intégrité et d’accès transverses

Les FK composites `(school_id,...)` rendent impossibles les associations classe/membre/groupe **entre deux écoles**. Elles ne remplacent pas l’autorisation : statut actif du compte et de l’école, appartenance active, rôle, permission, affectation de classe et propriété doivent être validés par le service FastAPI. La création d’un profil scolaire exige la présence d’un membership actif du même utilisateur et une langue offerte ; la création d’un profil personnel exige que l’acteur possède le tenant personnel. Ces invariants inter-tables et dépendants d’un statut ne sont pas couverts par les FK proposées. Aucune requête privée par `id` seul, même si l’UUID est opaque. La bibliothèque globale publiée est visible selon les droits d’usage, mais les brouillons globaux et la table `users` ne sont pas publics.

Les transactions futures couvrent l’import CSV : normaliser et valider l’e-mail, rechercher/créer `users` par son unicité globale, créer ou réutiliser `school_memberships`, attribuer rôle, classe, groupe, langue et profil sous le même contexte, puis enregistrer une identité d’import pour reprise idempotente. Les tables de job/import et d’invitation seront conçues à leur étape ; elles ne sont pas nécessaires pour définir ce cœur. Un doublon CSV ne crée pas un second compte ou membership. Le compte existant n’est pas réinitialisé par une école. `PENDING` et `INVITED` permettent la future activation sans imposer aujourd’hui un mécanisme d’e-mail.

### RLS, suppression et données personnelles

**À la première implémentation :** filtrage de tenant et autorisation dans les services/repositories FastAPI, FK composites, tests de deux écoles et d’un utilisateur multi-écoles. PostgreSQL RLS ajoute une barrière côté base si une requête applicative oublie le contexte ; il complique toutefois le rôle de connexion, le pooling, les tâches de fond et l’administration globale. **Conformément à l’architecture existante, la cible est d’activer et tester RLS sur les tables privées avant tout pilote avec des données réelles** ; aucune politique RLS n’est activée aujourd’hui. Si un obstacle technique remet cette cible en cause, un nouvel ADR et une validation explicite seront nécessaires. Les propriétaires de tables et rôles `BYPASSRLS` peuvent contourner RLS selon la [documentation PostgreSQL](https://www.postgresql.org/docs/18/ddl-rowsecurity.html), donc l’activer sans rôle DB approprié ne prouverait pas l’isolation.

`users.email`, nom, memberships, profils, résultats futurs et conversations IA sont des données personnelles. Les données scolaires restent privées à l’école même si la personne possède plusieurs contextes. La rétention, l’accès des enseignants aux conversations, l’effacement d’un compte, les sauvegardes et la provenance d’un éventuel transfert inter-contextes doivent être décidés avant les données réelles. Les statuts évitent `deleted_at` généralisé ; ils ne remplacent pas la politique d’effacement.

## Points d’ancrage futurs, sans tables ajoutées maintenant

- **SRS :** `KnowledgeItem` rattaché à langue et, selon propriété, à source globale/école ; `UserKnowledge` et `Review` rattachés au profil `user_language_profiles.id`, donc à un utilisateur, une langue et un tenant vérifiables. Source course/exercise/IA et version de règle seront ajoutées avec ce module. Les observations des deux parcours du même tenant peuvent alimenter une connaissance validée ; celles d’un autre tenant ne le peuvent pas implicitement.
- **IA :** `Conversation`, `Message`, `AIFeedback`, `Correction` référenceront profil et contexte tenant, puis scénario/source au besoin. Langue et niveau proviennent du profil autorisé ou d’un instantané versionné de la session, jamais d’un paramètre client cru. La visibilité enseignant et la rétention des messages demanderont une décision spécifique.
- **Progression, exercices, fichiers, notifications et analytics :** rattacher états privés au profil/tenant, contenus au cours et à son scope, médias à un propriétaire explicite. Aucun schéma détaillé n’est introduit ici.

## Revue des huit scénarios obligatoires

| Scénario | Résultat prévu et preuve future |
| --- | --- |
| School B demande les données scolaires d’Alice dans A | Refus : contexte B, filtres scoped et FK d’école ; test A/B sur listes, détails et agrégats. |
| Alice est dans A et B avec rôles différents | Deux memberships et deux attributions de rôles ; un seul `users.id`. |
| Alice autonome rejoint A | Son tenant personnel et son profil restent ; un nouveau membership et des profils A sont ajoutés, sans doubler `users`. |
| A offre English/German, Spanish arrive ensuite | Ligne `languages` puis `school_languages` ; aucune nouvelle colonne/table. |
| Bob n’enseigne que Class A1 | Rôle TEACHER + permission + affectation active A1 requis ; autre classe refusée. |
| Cours global utilisé par plusieurs écoles | `courses.scope=GLOBAL` consulté sans copie ; cours scolaire distinct, aucune modification du global par l’école. |
| Conversation IA d’Alice dans A | Futur lien vers profil A et tenant A ; profils B/personnel restent séparés. |
| SRS identifie identité/langue/contexte/notion | Futur `UserKnowledge` lie profil contextualisé et `KnowledgeItem` ; unicité et source à fixer au module SRS. |

## Questions à valider avant les modèles ou avant le module concerné

1. **A03, pont école ↔ personnel (avant toute implémentation de transfert) :** option A, pont entre parcours uniquement dans un même tenant, conserve strictement les données privées ; option B, copie consentie d’acquis sélectionnés vers le personnel, améliore la continuité mais exige provenance, granularité, droits et rétention. **Recommandation A pour le premier modèle ; validation produit requise avant de promettre un pont entre tenants.**
2. **Relation classe/groupe (avant les migrations correspondantes) :** option A, groupe enfant d’une classe, FK fortes et inscriptions simples ; option B, groupe directement sous l’école, peut réunir plusieurs classes mais réclame des règles supplémentaires pour inscriptions et contenus. **Recommandation A pour le pilote ; à confirmer si les écoles utilisent des groupes transversaux.**
3. **Invitation A02/A10 (avant auth/import) :** lien d’activation recommandé ; le CDC mentionne mot de passe temporaire. Les deux sont possibles avec `PENDING`/`INVITED`, mais le parcours de première connexion doit être validé.
4. **Catalogue et publication (avant CMS) :** visibilité des cours globaux par école, copie/version lors de personnalisation, ciblage multi-classes/groupes et largeur réelle A1–C2 (A04). Le `scope` actuel suffit à l’ossature, pas à toutes les règles éditoriales.
5. **Vie privée et exploitation (avant pilote réel) :** rétention, effacement, politiques RLS et rôle DB conformes à la cible existante, accès support/SUPER_ADMIN, accès professeur aux conversations, quotas. Aucune de ces décisions n’est implicitement résolue par le diagramme.

Cette conception s’arrête avant l’étape « définir les rôles, permissions et règles d’accès ». Aucun droit détaillé ou modèle physique n’est livré ici.
