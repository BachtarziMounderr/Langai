# Tests backend

unit/ : invariants et services métier ; integration/ : API, PostgreSQL, files et adaptateurs ; security/ : permissions, isolation tenant et révocation. Regrouper les tests par domaine au besoin. Aucun test métier artificiel n’est créé pendant l’étape conventions ; ajouter des tests réels avec les premières règles. Les scénarios complets résident dans tests/e2e à la racine. Ruff et pre-commit sont des outils de qualité, sans suite de tests fonctionnels pour le moment.
