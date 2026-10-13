# Exercices et statistiques Étudiant — V2 locale

## Ce qui fonctionne

- Exercices courts des quatre leçons existantes, corrigés et enregistrés par FastAPI.
- Bouton « Generate from this lesson » : six QCM nouveaux proposés par Gemini à partir de la leçon. Le PDF partagé Past Simple a été extrait intégralement (8 pages) comme source de cette leçon ; les trois autres utilisent leurs notes et exemples.
- Résultats persistants par utilisateur et tenant : note sur 20, pourcentage, catégories, historique et graphique des derniers résultats. Résumé sur l’accueil et détail dans `/student/progress`, avec filtre de langue.
- Grammaire, conjugaison, vocabulaire et compréhension écrite sont évalués seulement lorsque les questions correspondantes existent. Oral et notes professeur restent non évalués. Aucun résultat fictif n’est injecté.

## Règles de calcul

Une réponse correcte vaut un point. Note = 20 × réponses correctes / questions évaluées. La moyenne globale pondère les questions, plutôt que de faire une moyenne de catégories de tailles différentes. Chaque question a exactement une catégorie. Une catégorie sans question garde `percent=null`, pas 0. Un résultat à 0 % reste une vraie note.

La première soumission d’une série est immuable. Recharger, répéter un POST ou cliquer deux fois renvoie le même résultat et ne gonfle pas les statistiques. Une série initiale et une série générée sont disponibles par leçon/version. La série IA validée est réutilisée ; un clic ne renouvelle pas arbitrairement les questions. Une nouvelle version du contenu permet une nouvelle série. La répétition libre avec une politique pédagogique de notation sera une évolution distincte.

« Leçons pratiquées » compte les leçons avec un résultat. Cela ne signifie ni maîtrise, ni validation au seuil de 70 %, ni changement de CEFR. La validation/déblocage du cours et le SRS restent inchangés.

## Limites explicites

Le CMS et le partage professeur ne sont pas développés ici. `backend/app/modules/learning/lesson_catalog.json` est un instantané publié du catalogue de démonstration existant, incluant le texte de son PDF public. Une modification d’un PDF dans le frontend ne régénère pas automatiquement cet instantané : il faut mettre à jour le contenu publié côté backend. Le futur flux de publication devra extraire, versionner et autoriser les ressources du professeur avant génération. Aucun upload général, lecture d’URL arbitraire ou accès à un contenu scolaire privé n’est ajouté.

Les questions IA sont des exercices d’entraînement, pas des notes attribuées par un enseignant. La validation du JSON ne garantit pas la justesse pédagogique : les questions et corrigés doivent être revus avant une utilisation scolaire officielle. L’oral ne peut pas être déduit d’un QCM ou d’une conversation textuelle. Le futur workflow de notes professeur devra fournir une catégorie, une langue, une échelle, un auteur autorisé et un contexte scolaire ; aucune fausse note professeur n’est créée.

## Architecture et sécurité

Module `learning` du monolithe existant : `router.py → service.py → repository.py`. Le fournisseur est confiné à `app/integrations/lesson_questions.py`, via un contrat injectable. Aucune dépendance nouvelle, aucun microservice, aucun changement du comportement de conversation ou de l’offline.

Le backend relit les contextes actifs et applique la politique SELF de la matrice : rôle STUDENT dans l’école demandée ou propriétaire du tenant personnel. Toutes les requêtes privées filtrent tenant et utilisateur. Les nouveaux exercices utilisent uniquement le catalogue de démonstration global publié ; ils ne donnent aucun accès aux futurs cours CLASS/SCHOOL. Une contrainte composite interdit de rattacher une tentative à une série d’un autre tenant/utilisateur. Un administrateur ou professeur ne reçoit pas d’accès implicite aux notes. Toutes les réponses privées utilisent `Cache-Control: no-store`.

Le navigateur envoie des indices de réponses, jamais une note. Le corrigé est conservé côté backend jusqu’à la soumission. Les anciens résultats stockés dans sessionStorage ne sont pas importés et les statistiques fictives de progression ont été retirées de l’accueil, des cours et de la page Progress. Les compteurs Reviews restent une démonstration distincte.

Génération : données pédagogiques seulement (aucune identité, réponse ou note d’élève), JSON Schema du SDK et validation Pydantic, six questions distinctes, options bornées/distinctes et index valide. Une réservation persistante est validée avant l’appel réseau ; aucune transaction verrouillée pendant Gemini. Réutilisation des séries réussies, délai de 60 secondes entre reprises et limite de cinq essais avant une pause de 24 heures. Une panne ne produit aucun résultat scolaire. Le timeout est de 35 secondes. Les logs contiennent modèle, type d’erreur et code HTTP uniquement.

Références techniques : [sortie structurée du SDK Google](https://github.com/googleapis/python-genai#json-response-schema) et [validation des sorties Gemini](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en). Les limites de fournisseur ne remplacent pas la future revue pédagogique et les quotas d’exploitation par école.

## Démarrage local

Depuis `C:\Users\bacht\Desktop\lingua-ai-platform` :

```powershell
docker compose up -d
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend python -m app.modules.catalog.seed_demo
```

Migration locale : `e19c72bfa610`, deux tables supplémentaires. Le seed de langues est idempotent, issu des données du catalogue et conserve les langues déjà enregistrées. Il ne réactive pas une langue désactivée. Les mutations d’évaluation ne seedent pas de référentiels.

Le `.env` local conserve `POSTGRES_PORT=55433` : le port 55432 est occupé par le PostgreSQL installé sur Windows. Le backend utilise toujours `postgres:5432` dans Docker. Aucune base hébergée n’est modifiée.

Ouvrir `http://localhost:3000/login`, puis la leçon Past Simple → exercices → génération → statistiques. La clé Gemini reste dans le `.env` local existant. Aucun secret n’est ajouté à cette documentation.

## Vérifications

Tests PostgreSQL déterministes : calcul, catégories sans données, double soumission, persistance, absence de corrigé avant soumission, séparation entre deux utilisateurs et deux écoles pour un même utilisateur, perte de membership, refus des rôles non étudiants, réponses invalides et score client falsifié, échec de génération sans fausse note et reprise bornée.

La révision a d’abord été testée localement. La publication demandée ensuite utilise main et v2 ; V1 reste conservée dans son worktree. La migration hébergée et le seed de langues doivent précéder le déploiement des nouvelles pages.

### Vérification réelle et affichage

La génération réelle de six questions depuis le PDF public Past Simple a réussi avec GEMINI_EXERCISE_MODEL=gemini-3.1-flash-lite. Le modèle par défaut des exercices est également gemini-3.1-flash-lite, configurable via GEMINI_EXERCISE_MODEL indépendamment de GEMINI_MODEL. Ce modèle dédié est choisi parmi les modèles accessibles avec la clé existante, après des réponses 503 du modèle de conversation configuré. GEMINI_MODEL et la conversation restent inchangés. La sortie utilise response_json_schema du SDK existant ; aucun package supplémentaire. Les deux séries réalisées dans le compte DEV Étudiant sont de vrais résultats des tests navigateur locaux, pas des notes d’un enseignant.

Le navigateur vérifie la soumission, les filtres English/German, la persistance après rechargement et le résumé de l’accueil. Les captures ont été revues à 360, 390, 768 et 1440 px, sans débordement horizontal. Les données sans évaluation restent vides. Le corrigé initial a été retiré du bundle frontend : seul le nombre de questions y reste.

Validation finale : 31 tests d’intégration PostgreSQL, 12 tests unitaires fournisseur, 3 tests frontend de routing, Ruff, ESLint, TypeScript, build Next.js et alembic check passent. Les quatre services Docker sont healthy. Le navigateur a aussi confirmé la déconnexion tactile normale, le cas de perte de focus sans cible, la révocation du cookie et des tokens, ainsi que la déconnexion desktop. Il s’agit de tests Edge avec émulation tactile, sans affirmation de test sur matériel Safari/iPhone.
