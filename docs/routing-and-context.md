# Routing et contexte — étape 9

## Workspaces et redirections

| Attribution vérifiée | Contexte | Route |
| --- | --- | --- |
| `STUDENT` | membership d’école actif ou tenant personnel possédé | `/student` |
| `TEACHER` | membership d’école actif | `/teacher` |
| `SCHOOL_ADMIN` | membership d’école actif | `/admin` |
| `SUPER_ADMIN` | rôle global, sans école fictive | `/super-admin` |

`GET /api/v1/auth/session` renvoie `user` (identité minimale, statut et drapeau de changement de mot de passe), `must_change_password`, `global_roles` et `contexts`. Chaque entrée de `contexts` donne `id`, `type`, `label`, `tenant_id`, `school_id`, `role` et `route`. Une entrée correspond à **un rôle dans un seul contexte**. Une personne Teacher dans A et School Admin dans B reçoit deux entrées séparées. Un membership ou une école suspendus sont exclus ; le tenant personnel exige `owner_user_id` égal à l’utilisateur. L’école utilise `schools.id = tenants.id` vérifié côté backend. Le tableau ne contient pas les permissions métier.

Après connexion, `must_change_password=true` maintient l’utilisateur dans le formulaire de changement de mot de passe de `/login` ; une navigation directe vers un workspace le renvoie à `/login?change-password=1`. Le changement révoque les sessions et exige une nouvelle connexion. Sinon une seule entrée mène directement à sa route ; plusieurs entrées mènent à `/select-context`. Le choix est explicite, sans priorité implicite d’un rôle. Zéro entrée mène à `/no-workspace`.

La Server Action du sélecteur compare l’identifiant soumis aux choix relus du backend, puis pose un cookie de navigation `lingua_context` sans secret. Il est effacé à la connexion et à la déconnexion. Les layouts Next.js appellent tous `requireWorkspace` avant rendu. Une session absente mène à `/login`, un choix absent ou périmé à `/select-context`, une route incompatible à `/forbidden`. Une indisponibilité FastAPI mène à `/service-unavailable`. Les items de navigation autres que Dashboard sont des libellés provisoires, sans fonctionnalités. `AppShell` réserve un emplacement au nom de l’école et à son branding futur.

Le contrôle frontend améliore l’UX et évite l’affichage fugitif d’une page interdite. Il n’autorise aucune opération métier. Chaque future API FastAPI doit authentifier, vérifier le contexte demandé, résoudre `school_id` vers `tenant_id`, vérifier rôle/permission et filtrer les ressources. `401` désigne une session invalide ou absente ; `403` un utilisateur authentifié sans droit. Voir [ADR-004](decisions/ADR-004-server-routing-session.md) pour le transport du cookie et [ADR-002](decisions/ADR-002-authorization-model.md) pour l’autorisation métier.

## Données de référence et développement

Après migration, lancer explicitement `python -m app.modules.tenancy.seed_roles`. La commande ajoute les quatre rôles canoniques si absents et vérifie leur scope à chaque exécution. Les 37 permissions et `role_permissions` restent non seedées : aucune route métier de cette étape ne les utilise ; leur introduction suivra leur premier cas d’usage, conformément au modèle d’autorisation.

En environnement `ENVIRONMENT=development` uniquement, `python -m app.modules.identity.dev_fixtures` demande un mot de passe local de 12 caractères minimum et crée deux écoles DEV, un Student, Teacher, School Admin, Super Admin, un utilisateur Teacher A / School Admin B et un apprenant personnel. Les adresses sont imprimées ; aucun secret n’est versionné. La commande s’arrête si ces comptes existent déjà ; `--reset-passwords` met à jour uniquement les six mots de passe DEV si les six comptes existent. Les fixtures ne font pas partie d’Alembic et ne s’exécutent jamais automatiquement. Pour cette instance locale, le mot de passe généré est conservé dans le fichier ignoré `backend/.env.dev-fixtures`. Le script `scripts/verify_dev_routing.py` utilise `DEV_FIXTURE_PASSWORD` pour vérifier les routes HTTP avec les services en marche.
