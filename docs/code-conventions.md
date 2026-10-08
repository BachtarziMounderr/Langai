# Conventions de code et frontières des modules

## Python et FastAPI

Utiliser le typage moderne de Python 3.13. Les fonctions publiques ont des annotations complètes pour paramètres et retour ; les fonctions internes sont également typées lorsqu’un type n’est pas évident. Éviter `Any` non justifié et les dictionnaires sans contrat à la frontière HTTP. Pydantic valide les données entrantes et les sorties contractuelles ; les modèles SQLAlchemy, lorsqu’ils existeront, seront réservés à la persistance. Préférer `pathlib.Path` pour les chemins, `datetime` avec fuseau et UTC pour les instants persistés, et des identifiants opaques de type UUID.

| Élément | Convention | Exemple |
| --- | --- | --- |
| Module, fonction, variable | `snake_case` | `list_students` |
| Classe, type | `PascalCase` | `StudentRead` |
| Constante | `UPPER_CASE` | `MAX_PAGE_SIZE` |
| Élément interne | préfixe `_` | `_normalize_level` |

Ruff fixe le format et contrôle les imports, erreurs évidentes, règles de robustesse de base et annotations des fonctions publiques. Éviter `print()` pour le logging applicatif. Les commentaires expliquent sécurité, tenancy ou règles métier non évidentes, pas la syntaxe. Les dépendances (horloge, session, fournisseur, client externe) sont injectables pour tester un service sans serveur HTTP.

## Emplacements backend

| Dossier | Responsabilité |
| --- | --- |
| `app/api/` | Assemblage des routers `/api/v1`, dépendances et adaptation HTTP communes. `/health` reste hors version. |
| `app/core/` | Configuration, erreurs communes, contexte d’accès, sécurité et logging ; aucune règle pédagogique. |
| `app/db/` | Engine, session, base SQLAlchemy et utilitaires techniques communs, lors de l’étape données. |
| `app/modules/<domaine>/` | Propriété des cas d’usage, règles et données du domaine. |
| `app/integrations/` | Adaptateurs LLM, TTS, e-mail et stockage ; détails fournisseur confinés ici. |
| `app/workers/` | Points d’entrée futurs des tâches, qui appellent les mêmes services. |

`app/models/`, `app/schemas/`, `app/services/` et `app/repositories/` à la racine sont des emplacements réservés à de rares contrats ou outils réellement transverses. **Les éléments métier restent dans leur module**, sans seconde arborescence par couche. Ne pas déplacer des modèles de plusieurs domaines vers ces dossiers pour « simplifier » les imports.

## Convention unique d’un module métier

Créer uniquement les fichiers nécessaires à sa première fonctionnalité, avec ces noms stables :

```text
app/modules/<domaine>/
  router.py       # HTTP, validation et conversion vers le service
  schemas.py      # contrats Pydantic Create / Update / Read
  service.py      # cas d’usage, autorisation et transaction
  repository.py   # requêtes scoped, aucune règle métier
  models.py       # modèles SQLAlchemy appartenant au domaine
  public.py       # contrat exposé aux autres modules, si nécessaire
```

Le flux normal est `router → service → repository → DB`. `router.py` n’ouvre pas de transaction et ne calcule pas une règle métier. `service.py` ne dépend pas de `FastAPI.Request` : il reçoit des valeurs, un contexte d’accès vérifié et des dépendances explicites. `repository.py` ne décide pas des permissions ; il applique cependant le scope déjà imposé et ne propose aucune lecture privée sans contexte. Le service définit la frontière transactionnelle ; les repositories partagent sa session et ne font pas de `commit()` isolé. Les modèles SQLAlchemy ne deviennent pas des schémas de réponse API.

Un module n’importe pas librement `models.py`, `repository.py` ou les détails internes d’un autre. Si une collaboration est nécessaire, le propriétaire expose une fonction/service ou un contrat explicite via `public.py` ; une orchestration qui traverse deux domaines choisit un propriétaire et une transaction claire. Interdire les cycles d’import ; ne créer ni bus d’événements ni interface abstraite sans besoin réel. Les dépendances vers `core`, `db` et `integrations` passent par des contrats techniques, sans que le domaine dépende d’un SDK fournisseur.

## Identifiants, temps, transactions et suppression

- Pour les futures entités métier, choisir des UUIDv4 comme identifiants publics opaques : générables avec la bibliothèque Python standard, indépendants du nombre d’écoles et compatibles avec PostgreSQL. Les clés métier et les contraintes d’unicité restent séparées. Aucun UUID n’encode une école ou un rôle. La création des colonnes attend l’étape modèle de données ; UUIDv7 pourra être réévalué si les mesures d’indexation le justifient.
- Persister les instants en UTC avec fuseau (`datetime` aware, `timestamptz` plus tard). Convertir uniquement à l’affichage selon le fuseau utilisateur ; ne pas utiliser `datetime.now()` naïf pour les décisions métier. Les tests contrôlent l’horloge.
- Une opération à plusieurs écritures réussit ou échoue dans une seule transaction. Le futur cas « élève + membership + langue » est atomique. Les appels réseau externes ne sont pas inclus naïvement dans la transaction ; choisir une stratégie de reprise/idempotence et documenter la frontière.
- Pas de `deleted_at` partout. Comptes et écoles pourront être désactivés avec règles de rétention ; contenus publiés pourront être archivés/versionnés ; événements pédagogiques et audit exigent une politique d’historique. Les fichiers temporaires pourront être supprimés réellement après expiration. Les durées de rétention, suppression de données personnelles et restauration restent à décider avant le pilote.

## Frontend React et TypeScript

TypeScript `strict` reste actif. Éviter `any` ; si une entrée externe est inconnue, utiliser `unknown` et la valider. Composants/types/interfaces en `PascalCase`, hooks `useSomething`, fonctions et variables en `camelCase`, constantes de module en `UPPER_CASE`. Les noms de routes et dossiers restent en minuscules, avec tirets au besoin.

| Dossier | Rôle |
| --- | --- |
| `src/app/` | Routes et layouts Next.js ; Server Components par défaut. |
| `src/components/ui/` | Composants génériques réutilisables, sans politique métier. |
| `src/components/layout/` | Cadres et navigation partagés. |
| `src/features/` | Vues et interactions d’un domaine ; ne pas tout placer dans `components/`. |
| `src/lib/` | Outils techniques : API, auth d’affichage, tenancy d’affichage, branding. |
| `src/services/` | Fonctions qui composent les appels du client HTTP commun vers FastAPI. |
| `src/hooks/` | Hooks véritablement partagés. |
| `src/types/` | Types globaux d’interface seulement ; types locaux près de leur feature. |
| `src/styles/theme/` | Tokens communs ; branding d’école appliqué par configuration validée. |

Ajouter `"use client"` uniquement pour état interactif, hooks React, API navigateur ou événements côté client. Un Server Component peut appeler l’API FastAPI avec un contexte autorisé ; il ne lit pas directement PostgreSQL. Ne pas créer un second backend métier dans Next.js. Les appels métier passent par `lib/api` et, si utile, `services` ; TanStack Query sera ajouté avec un besoin réel. Les types de réponse API viendront d’OpenAPI plus tard, sans duplication manuelle durable.

Le moteur SRS futur reste déterministe et indépendant du LLM. L’IA peut proposer une observation structurée ; un service métier la valide avant toute modification d’état. Les paramètres de langue et de branding restent des données configurables, sans fork de composant ou branche par école.
