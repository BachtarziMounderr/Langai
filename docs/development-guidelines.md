# Guide de développement

Ce document est le point d’entrée des contributions. Lire aussi les [conventions de code](code-conventions.md), les [conventions API](api-conventions.md), les [règles de sécurité](security-rules.md) et l’[architecture validée](architecture.md). Les documents fonctionnels externes restent **CAHIER DES CHARGES V1.docx** et **Guide_MVP_Plateforme_Langues_Scalable.pdf**. Les décisions de scope plus récentes priment : English et German pour le MVP, ajout d’autres langues par données ; offline/PWA hors scope.

## Principes

- Écrire du code lisible et simple avant de créer une abstraction. Ajouter une dépendance seulement pour un usage actuel et documenter sa raison.
- Garder un frontend Next.js, un backend FastAPI en monolithe modulaire et une base PostgreSQL partagée. Aucun module ne devient un microservice par commodité.
- Respecter la chaîne `route → service → repository → base de données` et les frontières entre modules détaillées dans [code-conventions.md](code-conventions.md). Les composants React et les routes FastAPI ne portent pas les règles métier.
- **Explicit is better than implicit** pour sécurité, contexte tenant, permissions, transactions, appels IA et travaux différés. Une valeur implicite de tenant, de rôle ou de permission est interdite.
- Supprimer les duplications utiles sans créer de couche « générique » avant d’avoir au moins un besoin concret. Une décision majeure qui modifie les frontières de l’[architecture](architecture.md) doit être expliquée et enregistrée dans `docs/decisions/` avant son application.
- Les données scolaires, personnelles et globales suivent les contrôles distincts de l’architecture. Une école pilote, une langue ou un fournisseur ne sont jamais codés en dur dans le métier.

## Chemin d’une contribution

1. Repérer le domaine propriétaire dans [project-structure.md](project-structure.md). Ajouter ses fichiers seulement lorsque la fonctionnalité en a besoin.
2. Définir le contrat d’entrée/sortie et les autorisations côté backend. Identifier le tenant, l’acteur, la transaction et les effets différés avant d’écrire le cas d’usage.
3. Ajouter les tests qui prouvent la règle. Pour toute donnée privée : au moins deux écoles, des identifiants croisés et le cas d’un utilisateur membre de plusieurs écoles. Pour les règles pédagogiques : tests déterministes, sans fournisseur IA réel.
4. Ajouter l’interface à partir du contrat API ; le backend reste l’autorité pour validation, permissions, calculs et persistance. Les langues sont sélectionnées par les données, pas par duplication de composants.
5. Exécuter les contrôles locaux ci-dessous et décrire dans la PR le comportement, les risques sur les données et la validation.

## Qualité locale

Depuis `backend/`, installer les seuls outils de développement Python avec `python -m pip install -e ".[dev]"` dans un environnement virtuel. Les dépendances de production restent dans `project.dependencies` ; Ruff et pre-commit sont uniquement dans `project.optional-dependencies.dev`. Docker continue d’installer le socle de production.

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\ruff.exe check .
.\.venv\Scripts\ruff.exe format --check .
```

Depuis `frontend/`, les commandes existantes restent :

```powershell
pnpm lint
pnpm typecheck
```

Le TypeScript `strict` du `tsconfig.json` est obligatoire. Ruff assure lint et format Python ; ne pas ajouter Black, isort et flake8 en doublon. ESLint avec les règles Next.js couvre le frontend ; pas de Prettier tant qu’un besoin concret n’est pas établi. **mypy** est le vérificateur Python envisagé pour une étape ultérieure, avec des types de domaine et de persistance à contrôler ; il n’est ni installé ni configuré ici.

Le [pre-commit](../.pre-commit-config.yaml) exécute seulement whitespace, fin de fichier, YAML, Ruff lint et Ruff format. Après installation des dépendances de développement, lancer depuis la racine `backend\.venv\Scripts\pre-commit.exe install`. Les commandes manuelles ci-dessus restent valables indépendamment des hooks. Aucun workflow CI n’est activé à cette étape.

## Git et documentation

Utiliser `main` et des branches courtes `feature/...` ou `fix/...` ; les travaux Codex utilisent le préfixe `codex/`. Pas de branche `develop` obligatoire ni de Git Flow. Préférer de petits commits de type Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`). Une PR explique le problème concret, les changements, les vérifications et toute migration ou conséquence sur les données. Pas de commit ou push automatique exigé par ces conventions.

Code et identifiants techniques en anglais, documentation produit initiale en français. Respecter UTF-8, LF et la nouvelle ligne finale de `.editorconfig`. Les commentaires expliquent les contraintes et décisions non évidentes ; éviter de paraphraser le code. Ajouter une docstring aux fonctions/classes publiques importantes et documenter les choix d’architecture dans `docs/decisions/`.

Ne versionner ni `.env`, ni secrets, ni dumps, ni environnement virtuel, ni `node_modules`. Le lockfile pnpm est versionné avec `package.json`. Vérifier `git status` avant chaque commit : `.gitignore` ne retire pas un secret déjà suivi.

## Limites de cette étape

Les conventions n’implémentent ni modèle de données, ni contrôle tenant, ni RBAC, ni auth, ni IA, ni SRS. Les dossiers métier restent vides. Les prochains changements doivent respecter ces règles et les arbitrages encore ouverts dans l’annexe A de l’architecture.
