# Frontend

Application Next.js App Router, React et TypeScript directement dans ce dossier. `src/app/page.tsx` est une page de vérification ; elle appelle uniquement `GET /health` et affiche le statut. Tailwind CSS est chargé, sans design system ou écran métier.

Les dossiers `components`, `features`, `hooks`, `lib`, `services`, `styles` et `types` restent réservés. Les segments Student, Teacher, Admin et Super Admin ne contiennent aucune page. Le branding scolaire sera plus tard appliqué par `src/lib/branding` et des variables de thème partagées, sans application par école.

Depuis ce dossier : `pnpm install --frozen-lockfile`, puis `pnpm dev`. L’URL API publique vaut `http://localhost:8000` par défaut et peut être fournie via `NEXT_PUBLIC_API_BASE_URL`. Voir [bootstrap.md](../docs/bootstrap.md).

Contrôles de contribution : `pnpm lint` et `pnpm typecheck` ; le TypeScript strict et la configuration ESLint Next.js existante sont conservés. Lire les [conventions de code](../docs/code-conventions.md) et le [contrat API](../docs/api-conventions.md) avant d’ajouter une feature.
