# Aperçu de l’espace étudiant — étape 10

La route `/student` et ses sous-routes `/learn`, `/practice`, `/reviews` et `/progress` montrent une première interface à la cliente. Les cinq pages conservent le garde de session et de contexte du layout Student. Le nom, l’adresse e-mail et le contexte affichés proviennent de `GET /api/v1/auth/session` ; si le profil ne contient pas de prénom, le salut reste neutre.

Les valeurs pédagogiques sont **toutes fictives** et centralisées dans `frontend/src/features/student/mock-data.ts` : English B1, German A2, leçon en cours, révisions, scénarios, indicateurs, activité hebdomadaire et historique. Les identifiants de langue sont des données de la fixture, pas des branches métier. `StudentDashboard` et les sous-pages consomment cette fixture ; elles pourront plus tard recevoir des contrats de lecture de FastAPI sans changer le layout ni les routes.

Les liens « Continue lesson », « Start review » et « Start conversation » mènent pour l’instant aux pages de présentation correspondantes. Les actions non connectées dans ces pages sont visuellement désactivées. Aucun cours, scoring, SRS, conversation IA ou calcul de progression n’est exécuté. Le bouton de déconnexion et le changement de contexte gardent leur comportement réel.

Le thème temporaire est limité à `.student-app` dans `globals.css` : fond neutre, surfaces blanches, texte bleu ardoise et accent pétrole. Il pourra être formalisé à l’étape Design System puis alimenté par le branding de l’école. Le nom d’école actuel vient du contexte de session, sans nom ni couleur d’école codés dans les composants.

Captures de référence après revue dans Edge headless : [desktop](previews/student-desktop.png) et [mobile](previews/student-mobile.png). La tablette et les quatre sous-pages ont également été contrôlées, sans débordement horizontal.

Vérifications utiles depuis `frontend/` : `pnpm lint`, `pnpm typecheck`, `pnpm build`. Depuis la racine : `docker compose up --build -d` puis `docker compose ps`. Les fixtures DEV et `scripts/verify_dev_routing.py` restent le moyen de vérifier les rôles et contextes sans exposer de secret dans le dépôt.
