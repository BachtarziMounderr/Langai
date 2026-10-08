# Diagramme ER du modèle de données proposé

Conception de l’étape 5 ; **aucune table n’existe encore**. Les noms en majuscules correspondent aux tables en minuscules de [data-model.md](data-model.md). Les cardinalités montrent les relations principales ; les clés composites, `CHECK`, index et règles d’accès font autorité dans le catalogue. Le trait `TENANT → SCHOOL` représente une clé primaire partagée : pour un tenant école, `schools.id = tenants.id`.

```mermaid
erDiagram
  USER {
    uuid id PK
    text email UK
    text status
  }
  TENANT {
    uuid id PK
    text kind
    uuid owner_user_id FK
  }
  SCHOOL {
    uuid id PK, FK
    text slug UK
    text status
  }
  SCHOOL_BRANDING {
    uuid school_id PK, FK
    text display_name
  }
  SCHOOL_MEMBERSHIP {
    uuid id PK
    uuid school_id FK
    uuid user_id FK
    text status
  }
  ROLE {
    text code PK
    text scope
  }
  PERMISSION {
    text code PK
    text scope
  }
  ROLE_PERMISSION {
    text role_code PK, FK
    text permission_code PK, FK
  }
  USER_GLOBAL_ROLE {
    uuid user_id PK, FK
    text role_code PK, FK
  }
  SCHOOL_MEMBERSHIP_ROLE {
    uuid school_id PK, FK
    uuid membership_id PK, FK
    text role_code PK, FK
  }
  SCHOOL_MEMBERSHIP_PERMISSION_GRANT {
    uuid school_id PK, FK
    uuid membership_id PK, FK
    text permission_code PK, FK
  }
  CLASS {
    uuid id PK
    uuid school_id FK
    text name
  }
  GROUP {
    uuid id PK
    uuid school_id FK
    uuid class_id FK
  }
  CLASS_ENROLLMENT {
    uuid id PK
    uuid school_id FK
    uuid class_id FK
    uuid student_membership_id FK
  }
  GROUP_ENROLLMENT {
    uuid school_id PK, FK
    uuid class_id PK, FK
    uuid group_id PK, FK
    uuid class_enrollment_id PK, FK
  }
  TEACHER_CLASS_ASSIGNMENT {
    uuid school_id PK, FK
    uuid class_id PK, FK
    uuid teacher_membership_id PK, FK
  }
  LANGUAGE {
    text code PK
    text name
  }
  CEFR_LEVEL {
    text code PK
    int rank UK
  }
  SCHOOL_LANGUAGE {
    uuid school_id PK, FK
    text language_code PK, FK
  }
  USER_LANGUAGE_PROFILE {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    text language_code FK
    text current_cefr_code FK
  }
  COURSE {
    uuid id PK
    text scope
    uuid school_id FK
    uuid class_id FK
    text language_code FK
    text cefr_code FK
  }
  LESSON {
    uuid id PK
    uuid course_id FK
    int position
  }

  USER o|--o| TENANT : owns_personal
  TENANT ||--o| SCHOOL : school_extension
  SCHOOL ||--o| SCHOOL_BRANDING : configures
  USER ||--o{ SCHOOL_MEMBERSHIP : joins
  SCHOOL ||--o{ SCHOOL_MEMBERSHIP : has
  ROLE ||--o{ ROLE_PERMISSION : grants
  PERMISSION ||--o{ ROLE_PERMISSION : belongs_to
  USER ||--o{ USER_GLOBAL_ROLE : holds
  ROLE ||--o{ USER_GLOBAL_ROLE : platform_role
  SCHOOL_MEMBERSHIP ||--o{ SCHOOL_MEMBERSHIP_ROLE : holds
  ROLE ||--o{ SCHOOL_MEMBERSHIP_ROLE : school_role
  SCHOOL_MEMBERSHIP ||--o{ SCHOOL_MEMBERSHIP_PERMISSION_GRANT : receives
  PERMISSION ||--o{ SCHOOL_MEMBERSHIP_PERMISSION_GRANT : grants
  SCHOOL ||--o{ CLASS : organizes
  CLASS ||--o{ GROUP : contains
  CLASS ||--o{ CLASS_ENROLLMENT : enrolls
  SCHOOL_MEMBERSHIP ||--o{ CLASS_ENROLLMENT : student
  GROUP ||--o{ GROUP_ENROLLMENT : has
  CLASS_ENROLLMENT ||--o{ GROUP_ENROLLMENT : participates
  CLASS ||--o{ TEACHER_CLASS_ASSIGNMENT : taught_by
  SCHOOL_MEMBERSHIP ||--o{ TEACHER_CLASS_ASSIGNMENT : teacher
  SCHOOL ||--o{ SCHOOL_LANGUAGE : offers
  LANGUAGE ||--o{ SCHOOL_LANGUAGE : offered_in
  TENANT ||--o{ USER_LANGUAGE_PROFILE : scopes
  USER ||--o{ USER_LANGUAGE_PROFILE : learns
  LANGUAGE ||--o{ USER_LANGUAGE_PROFILE : learned_as
  CEFR_LEVEL o|--o{ USER_LANGUAGE_PROFILE : current_or_initial
  SCHOOL o|--o{ COURSE : owns_private
  CLASS o|--o{ COURSE : targets
  LANGUAGE ||--o{ COURSE : taught_in
  CEFR_LEVEL o|--o{ COURSE : targets_level
  USER o|--o{ COURSE : created_by
  COURSE ||--o{ LESSON : contains
```

Les FK scolaires marquées par plusieurs colonnes dans le diagramme sont **composites** : école + classe, école + membership, puis école + classe + groupe/inscription. Une ligne d’école A ne peut donc pas pointer vers une classe ou un membership de B. Le diagramme n’exprime pas la vérification applicative de statut, rôle, permission, affectation active ou propriété du tenant personnel.

`COURSE.scope` distingue `GLOBAL` (`school_id`/`class_id` nuls), `SCHOOL` (`school_id` seul) et `CLASS` (les deux présents). `LESSON` hérite du scope du cours. `USER_LANGUAGE_PROFILE` est unique par `(tenant_id,user_id,language_code)` ; l’English personnel et l’English scolaire ne sont pas une même ligne. English et German sont des lignes initiales de `LANGUAGE`, non des branches de schéma. Les futurs SRS et IA référenceront un profil contextualisé ; leurs tables ne figurent pas dans ce diagramme de l’étape 5.
