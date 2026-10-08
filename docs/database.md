# Socle PostgreSQL et migrations

Étape 7. Le schéma initial suit [data-model.md](data-model.md), [ADR-001](decisions/ADR-001-tenant-model.md) et les limites d’accès décrites dans [authorization-model.md](authorization-model.md). Les tables et contraintes existent après `alembic upgrade head` ; **aucun rôle, langue, niveau ou compte n’est seedé**. Les gardes RBAC et RLS ne sont pas implémentés par la migration.

## Choix techniques

- SQLAlchemy **2.0.54** en mode **synchrone** : session et transaction restent explicites pour le monolithe FastAPI. Alembic **1.20.0** et psycopg **3.3.6** avec l’extra `binary` pour le développement et les images Docker. Les versions sont fixées dans `backend/pyproject.toml`.
- `DATABASE_URL` est la seule source de connexion. La forme Docker existante `postgresql://...@postgres:5432/...` est convertie en dialecte `postgresql+psycopg` par `app/db/session.py` ; une URL qui indique déjà ce dialecte est acceptée. Le code ne contient ni hôte, ni utilisateur, ni mot de passe fixe.
- `app/db/base.py` possède la base déclarative, la convention de noms, les UUIDv4 et les timestamps. `app/db/session.py` crée le moteur à la première utilisation, fournit une factory de sessions et une future dépendance `get_session()`. Le service métier futur possède le `commit` ; la dépendance ferme seulement la session. `dispose_engine()` est disponible pour un futur hook d’arrêt.
- Les ORM sont répartis dans `app/modules/{identity,tenancy,schools,catalog,learning,content}/models.py`. `app/db/models.py` les importe afin qu’Alembic voie les 22 tables dans une métadonnée unique. Les quelques relations ORM utilisent `lazy="raise"` : aucun chargement implicite ou cascade ORM de données métier.
- UUID PostgreSQL natif et `uuid.UUID` Python ; `DateTime(timezone=True)` devient `TIMESTAMPTZ`. PostgreSQL fournit `now()` pour l’insertion ; l’ORM met `updated_at` à jour via `onupdate`. Une écriture SQL directe devra mettre cet instant à jour explicitement.
- Types et statuts fermés (`tenant.kind`, `course.scope`, états) : colonnes texte avec `CHECK`, conformément au modèle documentaire. Langues, CEFR, rôles et permissions extensibles : tables de référence, **pas d’ENUM PostgreSQL**. Cette convention évite une migration de type à chaque nouvelle langue ou permission.

## Connexions et commandes

Dans Docker, le backend utilise le service `postgres:5432`. Depuis Windows, utiliser `localhost:55432` avec la base, l’utilisateur et le mot de passe de l’environnement local ; ne jamais copier ces valeurs dans un fichier suivi. Le `DATABASE_URL` du backend est défini par Compose et le `.env` local. La CLI Alembic lit cette même variable via `migrations/env.py` ; `alembic.ini` ne contient aucun secret.

Depuis la racine du dépôt :

```powershell
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
docker compose exec backend alembic history
docker compose ps
```

Cycle de vérification **uniquement sur une base de développement vide ou jetable** :

```powershell
docker compose exec backend alembic downgrade base
docker compose exec backend alembic upgrade head
docker compose exec backend python -m unittest discover -s tests/integration -p 'test_*.py' -v
```

Le downgrade retire les 22 tables de cette migration et détruit leurs données éventuelles ; ne pas le lancer sur une base utile. Il ne supprime pas le volume Docker. Pour une future modification de modèle, changer d’abord le modèle et documenter la décision, puis générer une **candidate** de migration et la relire :

```powershell
docker compose exec backend alembic revision --autogenerate -m "describe_change"
docker compose exec backend alembic check
```

Vérifier manuellement l’ordre de création, les FK composites `(school_id, ...)`, les contraintes `CHECK`, les index, le comportement `ON DELETE` et le `downgrade` avant d’appliquer une candidate. Ne jamais utiliser `Base.metadata.create_all()` sur la base du produit : Alembic contrôle l’évolution du schéma. Une migration appliquée dans un environnement partagé est immuable ; créer une nouvelle révision pour la corriger.

## Intégrité et frontières de sécurité

`schools.id` est la PK/FK vers `tenants.id` ; aucune valeur indépendante n’est générée pour l’école. Les FK composites des inscriptions, groupes et affectations empêchent les relations entre écoles différentes. Les tuples `(code,scope)` lient rôles et permissions au même périmètre `PLATFORM` ou `SCHOOL`. `courses.scope` détermine exactement la nullabilité de `school_id` et `class_id`. Le profil langue est unique par `(tenant_id,user_id,language_code)`. Les index de l’e-mail insensible à la casse, du slug et des accès scolaires figurent dans la migration.

La base ne peut pas, par de simples FK/CHECK, garantir qu’un tenant `SCHOOL` possède sa ligne `schools`, qu’un profil scolaire correspond à un membership actif, que l’offre linguistique est active ou que le rôle d’une personne concorde avec une inscription. Ces invariants requièrent les **services transactionnels futurs**. Aucune requête privée n’est autorisée par la seule possession d’un UUID. L’architecture prévoit RLS avant le pilote avec données réelles ; cette étape crée uniquement le schéma et les contraintes, sans prétendre assurer à elle seule l’autorisation.

## Seed et prochaines limites

Le seed des codes `roles`, `permissions`, `role_permissions`, des langues `en`/`de` et des niveaux CEFR sera conçu et exécuté dans une étape dédiée. Aucun compte Super Admin ou mot de passe de démonstration n’est créé. Les tests d’intégration insèrent leurs propres lignes dans des transactions annulées. La procédure d’activation, le pont entre contextes, la relation classe/groupe à confirmer avec l’école pilote et la rétention restent les décisions ouvertes listées dans les documents précédents.
