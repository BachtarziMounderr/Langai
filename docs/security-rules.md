# Règles de sécurité et d’isolation

Ces règles cadrent les futures implémentations. Aucun contrôle d’authentification, permission, modèle SQL ou politique RLS n’est créé par cette étape. L’[architecture](architecture.md) et ses arbitrages A01–A12 restent la référence.

## MULTI-TENANT SAFETY RULES

L’architecture définit `tenant_id` comme identifiant **technique** d’isolation et `school_id` comme identifiant d’une école. Chaque école possède un tenant ; [ADR-001](decisions/ADR-001-tenant-model.md) fixe une clé primaire partagée, donc `school_id` est le même UUID que le `tenant_id` de l’école. Le backend résout et vérifie ce contexte, sans accepter deux valeurs indépendantes et réputées fiables du navigateur. L’espace autonome relève d’un tenant personnel. Les données scolaires portent `school_id` obligatoire ; les états pédagogiques privés portent `tenant_id` obligatoire. Toute lecture/écriture privée applique le contexte tenant vérifié, même lorsqu’une table le nomme `school_id`.

Une recherche privée par seul identifiant (`student_id`, `course_id`, etc.) est interdite. Le contexte sûr comprend l’acteur authentifié, sa session active, le tenant résolu, la permission, puis au besoin l’affectation ou la propriété. Le repository impose le filtre tenant sur listes, détails, jointures, agrégats et mutations ; le service vérifie l’accès métier. Les contraintes SQL et, avant données réelles, la défense supplémentaire RLS prévue par l’architecture seront spécifiées à l’étape données. Une absence de contexte échoue explicitement, jamais vers une école « par défaut ». Un identifiant, sous-domaine, header ou claim envoyé par le client ne prouve pas l’accès.

Étendre cette isolation aux caches, exports, statistiques, fichiers, URLs signées et futures tâches différées. Les clés de cache privées incluent tenant et utilisateur (et langue quand pertinente) ; changement d’école, de droits ou déconnexion invalide les données. Les tâches portent un contexte minimal vérifié à l’exécution ; aucun worker ne reçoit une permission globale implicite. Tester école A/B, utilisateur multi-écoles et identifiants croisés, même avec une seule école pilote. Aucun raccourci de tenant n’est acceptable pour livrer plus vite.

Les endpoints de plateforme pouvant traverser plusieurs tenants sont **explicitement séparés** et réservés à `SUPER_ADMIN` avec une permission précise et une trace. Le rôle ne donne pas automatiquement accès aux conversations ou données privées de tous les élèves. L’accès support éventuel requiert une décision spécifique et vérifiable.

## Rôles, permissions et frontend

`Role != Permission`. Les rôles prévus sont `SUPER_ADMIN` (plateforme), `SCHOOL_ADMIN`, `TEACHER` et `STUDENT` (contexte). Une personne peut avoir des rôles différents selon ses écoles. La [conception d’autorisation](authorization-model.md), la [matrice](permission-matrix.md) et l’[ADR-002](decisions/ADR-002-authorization-model.md) fixent les codes `domain:resource:action`, les scopes `SELF`/`ASSIGNED_CLASS`/`SCHOOL`/`PLATFORM`, les grants positifs bornés et les contrôles de ressource. L’autorisation effective exige compte actif, contexte valide, capacité ou politique SELF applicable, affectation/propriété et état de la ressource. Refus par défaut et contrôle **dans FastAPI** pour chaque opération. Cacher une action dans l’UI améliore l’expérience, sans constituer une barrière de sécurité. Le RBAC et les tables ne sont pas implémentés par cette documentation.

## Secrets, environnement et journalisation

Jamais de secret dans Git, le navigateur, `NEXT_PUBLIC_*`, une URL publique ou les logs. `DATABASE_URL`, `JWT_SECRET`, `LLM_API_KEY`, clés TTS et secrets S3 restent côté backend. Seules les variables réellement publiques, par exemple l’URL API accessible au navigateur, utilisent `NEXT_PUBLIC_`. Les `.env` locaux sont ignorés par Git ; les valeurs de production viendront d’un gestionnaire de secrets. Ne pas fournir de secret partagé par défaut. Les mots de passe futurs seront hachés, jamais stockés ou logués en clair ; les tokens ne seront pas journalisés.

Utiliser les niveaux `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` avec le module `logging` Python et l’outil frontend approprié. `print()` n’est pas une stratégie de journalisation applicative. Journaliser le minimum utile (identifiant de requête, action, échec, contexte autorisé) et éviter mots de passe, clés, tokens, messages complets de conversation et données de mineurs. La structure JSON, l’audit et le monitoring avancé viendront avec les premières fonctionnalités. Une erreur API n’expose pas les détails internes.

## IA et SRS futurs

Le flux IA est `Next.js → FastAPI → service IA → adaptateur fournisseur`. Le domaine dépend d’un contrat interne, jamais directement d’un SDK OpenAI, Anthropic ou autre. Limiter les données envoyées au fournisseur, imposer des sorties structurées pour les réponses qui influencent la progression et valider celles-ci côté métier avant toute écriture. Définir plus tard quotas, délais, reprise et journalisation des coûts par tenant ; aucun fournisseur ni SDK n’est installé maintenant.

Le moteur SRS reste déterministe, versionné et testable avec horloge contrôlée, sans appel LLM. Une observation proposée par l’IA n’est pas une décision SRS. Les écritures sensibles à plusieurs étapes sont transactionnelles et, pour les tâches différées, idempotentes. Les détails algorithmiques restent ouverts en A06.

## Avant d’introduire des données réelles

Prouver les permissions et l’isolation sur deux écoles, y compris cache et média ; définir auth/session/CSRF, RLS, rétention, suppression, accès enseignants et administrateurs, chiffrement et sauvegardes. Ces décisions et tests appartiennent aux étapes de conception et d’implémentation suivantes. L’offline/PWA reste hors scope actuel.
