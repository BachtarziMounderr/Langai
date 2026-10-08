# Diagrammes de l’architecture Lingua AI

Conception du 30 septembre 2026. Les blocs décrivent la cible ; seul le socle Next.js, FastAPI, PostgreSQL et Redis est préparé à l’étape Docker. Voir [l’architecture](architecture.md) pour les responsabilités, le scope et les arbitrages.

## Composants et flux techniques

```mermaid
flowchart TB
  subgraph USERS["Users"]
    ST["Student"]
    TE["Teacher"]
    AD["School Admin"]
    SA["Super Admin"]
  end
  WEB["Next.js / React / TypeScript<br/>Layouts par rôle et design system commun"]
  ST --> WEB
  TE --> WEB
  AD --> WEB
  SA --> WEB
  WEB -->|"HTTPS / API v1"| API
  subgraph MONO["Backend FastAPI - monolithe modulaire"]
    API["FastAPI<br/>Validation, session, tenant et permissions"]
    MODULES["Modules métiers<br/>Identity, Schools, Content, Learning<br/>Assessment, Progress, Knowledge, SRS<br/>AI, Analytics, Notifications, Media"]
    AIO["Orchestration IA<br/>Contexte pédagogique et validation structurée"]
    PORTS["Adaptateurs internes<br/>LLM / TTS / S3 / e-mail"]
    API --> MODULES
    MODULES --> AIO
    MODULES --> PORTS
    AIO --> PORTS
  end
  subgraph DATA["Services de données"]
    PG[("PostgreSQL<br/>Une base et un schéma partagés")]
    REDIS[("Redis<br/>Cache et broker")]
  end
  MODULES --> PG
  MODULES --> REDIS
  WORKER["Celery worker<br/>Même code métier que FastAPI"]
  SCHED["Planificateur unique<br/>Rappels et tâches périodiques"]
  SCHED --> REDIS
  REDIS -->|"Tâches"| WORKER
  WORKER -->|"Services du monolithe"| MODULES
  subgraph EXTERNAL["Fournisseurs externes"]
    LLM["LLM Provider"]
    TTS["TTS Provider"]
    S3[("Object Storage<br/>Compatible S3")]
    EMAIL["E-mail Provider"]
  end
  PORTS --> LLM
  PORTS --> TTS
  PORTS --> S3
  PORTS --> EMAIL
```

PostgreSQL et Redis ne servent pas de relais réseau vers les fournisseurs : les adaptateurs du backend les appellent. Les médias privés peuvent ensuite être lus par le navigateur avec une URL signée autorisée. Les clés fournisseur restent côté serveur. Le worker est un processus du même produit, pas un microservice autonome. Le reverse proxy et la CI/CD sont des choix de déploiement ultérieurs, absents de l’architecture active actuelle.

## Séparation logique des données

```mermaid
flowchart TB
  AUTH["Identité authentifiée<br/>et contexte demandé"]
  GUARD["Membership ou propriété<br/>+ permissions + affectations"]
  AUTH --> GUARD
  subgraph DB["Une base PostgreSQL - un schéma partagé"]
    GLOBAL["Global Data<br/>Langues EN/DE actives, CEFR A1-C2<br/>Bibliothèque publiée et paramètres globaux"]
    ID["Identité globale privée<br/>Users et sessions<br/>Accès dédié, jamais public par défaut"]
    subgraph SCHOOL_A["School A - tenant A"]
      A["School/Tenant Data<br/>Classes, groupes, contenus<br/>Memberships et branding"]
      UA["User Data dans A<br/>Progression, historique, SRS<br/>Conversations et erreurs par langue"]
      A --- UA
    end
    subgraph SCHOOL_B["School B - tenant B"]
      B["School/Tenant Data<br/>Classes, groupes, contenus<br/>Memberships et branding"]
      UB["User Data dans B<br/>Progression, historique, SRS<br/>Conversations et erreurs par langue"]
      B --- UB
    end
    PERSONAL["User Data autonome<br/>Tenant personnel proposé<br/>Accès propriétaire uniquement"]
  end
  AUTH --> ID
  GUARD -->|"Contexte A autorisé"| A
  GUARD -->|"Contexte B autorisé"| B
  GUARD -->|"Propriétaire"| PERSONAL
  GUARD -->|"Lecture publiée ou administration autorisée"| GLOBAL
  UA -.->|"Références publiées"| GLOBAL
  UB -.->|"Références publiées"| GLOBAL
  PERSONAL -.->|"Références publiées"| GLOBAL
```

Ces blocs ne représentent pas des bases séparées. User Data désigne des données personnelles à l’intérieur d’un contexte, pas une quatrième base. Les conversations et résultats de A ne deviennent pas visibles à B parce que l’utilisateur possède deux memberships. L’accès autonome et la fusion éventuelle des progressions sont explicités dans l’arbitrage A03. Les noms d’école et les claims du navigateur n’accordent aucun accès par eux-mêmes.

## Boucle pédagogique et indépendance du SRS

```mermaid
flowchart LR
  P1["Parcours 1<br/>Leçon, exercice, évaluation"]
  P2["Parcours 2<br/>Scénario et conversation IA"]
  VALID["Observations validées<br/>Même tenant, utilisateur et langue"]
  KI["Knowledge Item"]
  UK["User Knowledge State"]
  SRS["SRS Engine<br/>Déterministe et versionné"]
  REVIEW["Review"]
  NEXT["next_review_at"]
  PROGRESS["Progress et Learning History"]
  P1 --> VALID
  P2 --> VALID
  P1 -.->|"Notions à réutiliser"| P2
  VALID --> KI
  KI --> UK
  UK --> SRS
  SRS --> REVIEW
  REVIEW -->|"Résultat de rappel"| UK
  SRS --> NEXT
  VALID --> PROGRESS
  REVIEW --> PROGRESS
```

Le LLM propose des observations ; les services métier valident leur effet. Le SRS fonctionne sans appel LLM pour calculer les échéances. Aucun composant offline, stockage navigateur persistant ou synchronisation n’est prévu. Les notifications restent dans le périmètre fonctionnel, avec un canal à arbitrer séparément.
