# Student visual design

The Student home, learning pages and sign-in page use the supplied school website screenshots as visual references: navy, gold, editorial serif headings, spacious white sections and a compact dark navigation bar. Reference screenshots are not published as assets.

## Optional photos

Edit `frontend/src/config/learning-visuals.ts`:

- `hero.src`: decorative Student hero background.
- `lesson.src` and `lesson.alt`: next-lesson visual.
- `conversation.src` and `conversation.alt`: Communication Path visual.
- `login.src`: decorative sign-in background.
- `courses`: entries keyed by the existing course ID, such as `"past-experiences": { src: "https://…", alt: "…" }`. Course IDs come from the demo data; language logic remains data driven.
- `scenarios`: optional entries keyed by scenario ID (`restaurant`, `hotel`, `directions`, `small-talk`); shared by situation cards and conversation headers. An absent entry uses the shared conversation image; an explicit empty src keeps the illustration.

Use trusted HTTPS image URLs or local paths under `frontend/public/`. Supply descriptive alt text for meaningful photos. Hero and login backgrounds are decorative and use empty alt text. Empty or failed URLs preserve the illustrated fallback. Photos have stable container ratios, load with a fade, and use lazy loading below the hero. No API keys or credentials belong in these URLs.

Local photos use next/image with fill and slot-specific sizes (the small next-lesson original currently bypasses re-encoding through its configurable unoptimized flag), allowing Next.js to resize and optimize them for the viewport. Remote HTTPS photos remain native images, without opening an unrestricted optimization proxy; compress remote originals appropriately. Container ratios reserve layout space. The illustrated cover fades after decoding; failed photos restore that cover. See the [Next.js Image documentation](https://nextjs.org/docs/app/api-reference/components/image).

## Styling and motion

- Shared visual tokens: `frontend/src/styles/theme/learning.css`. These are presentation tokens; school branding remains a future backend-configured feature.
- Scoped dashboard, shell/navigation, login and photo styles: adjacent CSS modules.
- `StudentWorkspace.module.css` gives course catalogues, course details, lessons, exercises, PDF resources, practice, conversations, reviews and progress the same V2 presentation. `studentClassName` maps readable existing class names to local CSS-module classes, preventing V1 global selectors from leaking into these views.
- `LearningStatus` styles context selection, access denied, no workspace and service unavailable consistently. Its server guards, context validation and cookie handling remain unchanged.
- `StudentPageMotion` keeps initial hero entry separate from one-time section reveals. IntersectionObserver adds the visible class; CSS handles the 900 ms opacity/translate transition. Content stays visible without JavaScript or observer support. Reduced motion disables entry/reveal and photo fades.
- No new dependencies, backend changes, permissions, migrations or business functionality.

Demo language progress and weekly/review previews remain explicitly identified as illustrative. Existing session exercise results, resource links, AI conversation and authentication are preserved.

## Files in this redesign

Changed:

- `frontend/src/app/student/page.tsx`: personalised greeting, including the existing account-name fallback.
- `frontend/src/features/student/components/StudentDashboard.tsx`: Student home composition and real learning links.
- `frontend/src/features/student/components/StudentShell.tsx`: shared shell and footer.
- `frontend/src/features/student/components/StudentNavigation.tsx`: desktop navigation, mobile disclosure and profile/context controls.
- `frontend/src/features/student/components/StudentPageMotion.tsx`: entry and scroll motion.
- `frontend/src/app/(auth)/login/page.tsx`: sign-in presentation and error focus; existing authentication handlers preserved.
- `frontend/src/app/globals.css`: one import for the new theme; no extra dashboard rules appended.

Added:

- `frontend/src/styles/theme/learning.css`
- `frontend/src/config/learning-visuals.ts`
- `frontend/src/components/ui/LearningPhoto.tsx`
- `frontend/src/components/ui/LearningPhoto.module.css`
- `frontend/src/features/student/components/StudentDashboard.module.css`
- `frontend/src/features/student/components/StudentShell.module.css`
- `frontend/src/app/(auth)/login/Login.module.css`
- This document.

## Local verification — 9 October 2026

- ESLint, TypeScript, Next.js production build and all 3 existing routing tests passed.
- Headless Edge screenshots reviewed at 360, 390, 768, 1024 and 1440 px. Dashboard and login have no horizontal overflow at these widths.
- Real local Student authentication: rejected credentials, error focus, password visibility toggle, successful redirect and logout passed.
- Mobile menu, Escape with focus restoration, keyboard skip link and existing learning routes passed.
- PDF response verified as a real PDF with HTTP 200. An exercise was completed, and the dashboard restored its result from the existing session progress store.
- Required password change, session restoration, request progress and signed-in views verified with UI API mocks. No real account password was changed.
- Temporary local photo URLs verified hero priority, login background, lazy loading, stable ratios, reduced motion and broken-photo fallback. Fast/cached images are checked after hydration as well as through load/error handlers. Photo configuration was restored after the temporary checks. The subsequently configured local hero image remains preserved.
- Reduced motion and a long greeting passed; no page errors in the final real-browser run.
- Final review against the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): no open findings in the changed UI. Focus, labels, semantic headings, image dimensions, long content and motion settings checked.

The Gemini request/audio generation implementation was not changed during this visual pass. Its conversation route renders successfully; provider generation was not part of these UI checks.

The local Docker Next.js cache initially omitted existing dynamic routes. Its development cache was moved aside and the frontend restarted; the existing lesson, exercise, resource and conversation routes then returned HTTP 200. If Docker on Windows does not reflect a newly configured photo URL, run `docker compose restart frontend` from the repository.

No commit, push, deployment or dependency installation was performed. Local services are left running for review at `http://localhost:3000/login`.

## V2 consistency pass ? 9 October 2026

The complete Student journey now shares navy sections, gold actions, serif headings, white reading surfaces, consistent spacing and responsive layouts. The conversation composer, messages and voice controls remain a functional workspace. Success and error colours keep their semantic meaning. Review and activity data remain labelled as demo previews. No additional business functionality is implied.

The original conversation state, request payload, recording lifecycle, audio playback and fallback functions are unchanged. Exercise scoring and session progress storage are unchanged. The context selection server action is unchanged. No backend, provider, package, migration or architectural changes were made. V1 remains in its separate `main` worktree; V2 changes are uncommitted.

### Choosing and adding photography

Place your images under `frontend/public/student-visuals/`, then set their public paths in `frontend/src/config/learning-visuals.ts`. For example:

```ts
// Inside learningVisuals:
courses: {
  "past-experiences": { src: "/student-visuals/travel.webp", alt: "Travellers exploring a city" },
},
scenarios: {
  hotel: { src: "/student-visuals/hotel.webp", alt: "A guest speaking with a receptionist" },
},
```

Prefer horizontal campus/library photos for backgrounds, people learning together for course visuals, and actual restaurant/reception/street scenes for situations. Use similar lighting and colour treatment across the collection. Compress uploads to WebP or AVIF and keep text out of the photograph. Preserve descriptive alt text.

Sources to explore: [Unsplash free photo licence](https://unsplash.com/license), [Pexels licence](https://www.pexels.com/license/) and [Adobe Stock](https://stock.adobe.com/) for paid collections. Search terms include `students studying together`, `language classroom`, `university library`, `cafe conversation` and `hotel reception`.

### Local Next.js route watcher

During this pass the existing exercise route intermittently disappeared from the development route types after restarting Docker, although its source was present and the production build included it. This also occurred with a temporary Webpack diagnostic run. The original Docker configuration was restored. Refreshing the unchanged file timestamp after the frontend is ready restores discovery:

```powershell
docker compose exec -T frontend node -e "const fs=require('fs');const p='/app/src/app/student/learn/[courseId]/[lessonId]/exercise/page.tsx';const t=new Date();fs.utimesSync(p,t,t);"
```

This is a local watcher workaround; it changes no file content or database data. If the route returns 404 again after a restart, run this command and reload the page. The production build recognizes the route normally.

### Verification of the consistency pass

- ESLint, TypeScript and the production build pass; the 3 existing routing tests pass.
- All 20 Student route instances return HTTP 200 with real local authentication. All 10 Student page templates were checked at 360, 390, 768, 1024 and 1440 px without horizontal overflow. Final refinements were rechecked on the catalogue, PDF, practice and conversation templates at all five widths.
- The actual PDF responds with HTTP 200 and its PDF signature. The native viewer renders; download/open URLs are preserved. A real exercise saves its correct result and appears on the progress page.
- Mock provider responses verify message submission, payload/context, suggestions and focus, errors, returned audio, autoplay recovery, manual replay and device voice. Mock microphone capture verifies recording/stop controls, audio payload and stream cleanup. Provider generation and real microphone hardware were not exercised during this design pass.
- Long replies fit mobile and desktop. Keyboard skip, mobile menu Escape/focus, reduced motion, real logout and real multi-context form submission pass. No browser page errors in the final runs.
- Review against the Web Interface Guidelines found no open issues in the updated presentation. Above-fold photo slots use priority loading; lower images remain lazy; focus, labels, image sizing and reduced motion are preserved.

## Photo path and live-update fix — 9 October 2026

Local photos in `frontend/public/student-visuals/` must use URLs beginning with `/student-visuals/`, including the exact extension. The previous live-update diagnostic used bgc3.jpg for the hero and bgc1.jpg for the lesson. The current assignments are listed below. The expected `scenarios` configuration field is retained.

A browser test showed that configuration changes were not arriving through the Windows bind mount with the default development bundler. `docker-compose.yml` now runs the frontend with `pnpm dev --webpack --hostname 0.0.0.0`, using the existing `WATCHPACK_POLLING=true`. This changes the local development command only; production builds and dependency versions are unchanged. The [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next) provides this development option.

The four local services were restarted. The hero response is HTTP 200 and matches the local bgc3.jpg bytes; it decodes and displays on mobile and desktop, including after a reload. Switching bgc3 to bgc2 and back updates the open page without restarting services or reloading the browser. Configuration edits made outside the test are preserved. ESLint, TypeScript and Compose validation pass. No commit or push was made.


## Supplied photo assignments — V2

Original JPEG files remain unchanged in frontend/public/student-visuals. CSS cropping and a gentle saturation adjustment bring the collection into the existing navy, gold and white theme.

| File | Original dimensions | Placement |
| --- | --- | --- |
| bgc2.jpg | 3838 × 2513 | Student home hero; the central building remains the focal point on mobile |
| bgc1.jpg | 736 × 1307 | Tall sign-in story panel, hidden on small screens |
| image2.jpg | 678 × 452 | Next lesson, Academic Path hero, past-experiences course |
| bgc3.jpg | 678 × 452 | everyday-situations course |
| image4.jpg | 547 × 365 | Communication Path hero/card and small-talk situation |
| image3.jpg | 408 × 728 | Retained original; currently unused after gallery removal |
| images1.jpg | 480 × 320 | Retained original; currently unused after gallery removal |

Restaurant, hotel and directions retain their illustrated covers until relevant photos are supplied. The shared greeting photo is not forced onto unrelated scenes. Explicit empty scenario src values now prevent that fallback.

Each visual accepts position (CSS object-position) and optional mobilePosition (600 px and below). Hero and login photos have empty alt text as decorative backgrounds; content photos have descriptive alternatives. The decorative gallery and its configuration have been removed at the user's request. Original unused files are retained. No new dependencies, API calls, business features or tenant branding implementation are introduced.

### Verification of the initial photo pass (before gallery removal)

- Seven supplied originals were assigned in that earlier pass across the home, catalogue, course details, practice, small-talk, sign-in and gallery. Original files were preserved; changes are limited to frontend presentation and documentation.
- Browser checks pass on seven Student page variants at 360, 390, 768, 1024 and 1440 px, and sign-in at 390, 768 and 1440 px. All visible photos decode, preserve their frames, use the configured crop and leave no horizontal overflow.
- The desktop hero selected by the browser responds as WebP: 363,300 bytes compared with the 2,197,597-byte original. Below-fold images load lazily. Reduced motion suppresses visible transitions; an HTTP 404 restores the illustrated cover.
- ESLint, TypeScript, the production build and all three existing routing tests pass. Sign-in and conversation implementation before the UI return is unchanged.
- The first hot-reload optimization requests stalled in the local development process. Restarting only the frontend resolved them; subsequent browser runs and image responses pass. The existing route-discovery timestamp workaround was applied after that restart without changing exercise source.
- V1 remains clean. No dependency, backend code, schema, commit or deployment changes were made during this pass.

### Web Interface Guidelines review — photo changes

Review source: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

- frontend/src/components/ui/LearningPhoto.tsx:38 — pass: responsive local photos, remote fallback, alt text, reserved frames, load/error handling.
- frontend/src/components/ui/LearningPhoto.module.css:12 — pass: CSS cropping, opacity transition, reduced motion.
- frontend/src/config/learning-visuals.ts:12 — pass: decorative backgrounds, content descriptions and intentional empty scenario states.
- frontend/src/features/student/components/StudentDashboard.module.css:97 — pass: portrait/landscape composition and mobile grid.
- Photo callers in the catalogue, course, practice, conversation and sign-in pages — pass: consistent metadata and sizes; existing controls, labels and focus behavior preserved.

Final regression checks pass on all 20 Student route instances. The real PDF responds with its PDF signature; a real exercise updates session progress. Mock conversation responses verify suggestions, text submission, device voice replay, provider errors and microphone denial. Mobile keyboard navigation, reduced motion and real multi-context selection pass without browser page errors. External Gemini/TTS generation and microphone hardware were not exercised during this photo pass.

## Immersive home revision

- The hero uses one small viewport height (100svh, with 100vh fallback). The home navigation overlays the photo through a translucent navy background; other pages retain their normal header. Headline, lesson and conversation buttons stay within the first screen. The scroll cue keeps its Academic Path anchor and uses native smooth scrolling through scrollIntoView; reduced motion makes the scroll immediate.
- Academic Path uses the source's 3:2 landscape ratio instead of enlarging a square crop. Its 678 ? 452 JPEG bypasses another compression pass using lesson.unoptimized in learning-visuals.ts. This reduces avoidable degradation; it cannot recover missing detail on high-density displays. Replace it with a landscape photo at least 1600 px wide (around 1600 ? 1067), update lesson.src, and remove unoptimized: true so responsive optimization resumes. Keep original source files unchanged.
- The Inside your learning space gallery, rendering, styles and configuration are removed. Unused supplied originals remain in public/student-visuals.
- Five useful home sections appear once as they enter the viewport, following the Portfolio reference. IntersectionObserver triggers a CSS opacity/translateY transition; the hero remains stable during scrolling. Wheel, touch and keyboard scrolling remain native. Reduced motion disables the reveals and hover transforms.
- Pathway cards lift slightly on hover/focus, photos zoom gently and link arrows move. Tools also receive a small desktop hover lift. Touch devices do not inherit persistent mouse hover effects; keyboard focus remains visible.

The original continuous scroll timelines were replaced by the Portfolio-style revision described below.

### Verification of the earlier immersive revision (before the motion replacement)

Browser checks pass at 360 ? 640, 390 ? 844, 768 ? 1024, 1024 ? 768, 1440 ? 900, 1850 ? 950 and 844 ? 390. The hero matches viewport height, the photo starts behind navigation and both learning actions remain visible. No horizontal overflow; no gallery rendered. The Academic Path source is loaded directly and uses its 3:2 frame. Actual scroll changes parallax; all five sections become fully readable. Hover, focus, reduced motion, anchor clearance, mobile menu Escape/focus and real lesson/conversation navigation pass. The fallback reveal is checked with native timeline detection disabled. No browser page errors. No backend logic, dependency, migration, commit or push changes.

### UI review for this revision

- frontend/src/features/student/components/StudentDashboard.tsx ? pass: semantic sections, functional links and an accessible scroll cue.
- frontend/src/features/student/components/StudentDashboard.module.css ? pass: viewport sizing, reserved photo frame, hover/focus and reduced motion.
- frontend/src/features/student/components/StudentNavigation.tsx ? pass: existing mobile controls and focus behavior preserved.
- frontend/src/features/student/components/StudentPageMotion.tsx ? pass: support detection, observer cleanup and motion preference handling.
- frontend/src/components/ui/LearningPhoto.tsx ? pass: optional original source delivery; existing load/error and alt behavior preserved.


## Portfolio-style motion revision

The supplied Portfolio code and requested timings are the reference for this revision. The figma-implement-motion skill was read for motion separation, reuse and reduced-motion handling; no Figma file/node was supplied, so no Figma motion export is claimed.

- The hero arrow calls scrollIntoView with smooth behavior. The browser animates the page position; the target keeps scroll-margin-top: 100px to clear the sticky header. Its native href remains available without JavaScript and for modified clicks. Reduced motion uses immediate scrolling.
- The existing five home sections and the existing course-catalogue reveal use one observer per mounted route: threshold 0.12, rootMargin 0px 0px -8% 0px. The initial enhanced class sets opacity 0 and translateY(42px) on their existing child blocks. The visible class transitions to opacity 1 and translateY(0) over 900 ms with cubic-bezier(.2,.8,.2,1). The section itself stays stationary so its anchor destination is unaffected by the animated offset. Each target is unobserved after revealing and stays visible when scrolling back.
- Hero loading motion is independent and is never applied to the observed sections. Continuous scroll timelines, hero parallax and scroll-linked text fading are removed. No duplicate Tailwind/keyframe animation runs on the reveal targets.
- Sections stay in normal document flow. No scroll snapping, scroll listeners or animation library is added. Photo loading fades and existing card hovers are preserved.
- Without JavaScript or IntersectionObserver, content remains visible. Keyboard focus reveals a pending section immediately and explicitly stops an in-progress reveal transition. Changing the system setting to reduced motion reveals all pending content and cancels active entry animations. Route cleanup removes observer, listeners and temporary classes.
- Content, routes, school context, lesson/PDF links, conversation behavior and V1 are preserved. No dependency, backend, migration, commit or push changes.

### Verification of this motion revision

- A real local Student session verifies gradual browser scrolling, the fixed-header clearance, the initial 42 px hidden state, intermediate opacity during the 900 ms transition, final readability and observer removal. Leaving and re-entering a revealed section does not replay it.
- All five home sections become readable without horizontal overflow at 360 x 640, 390 x 844, 768 x 1024, 1024 x 768, 1440 x 900, 1850 x 950 and 844 x 390. The full-screen hero, both learning actions, photos and hover effects remain intact; desktop/mobile screenshots were reviewed.
- Free wheel scrolling remains native. Reduced motion passes both on load and when changed live. Keyboard focus exposes pending content and stops an active fade immediately. Content remains visible in separate browser contexts with JavaScript disabled and with IntersectionObserver unavailable.
- Actual lesson and conversation routes and the observed course catalogue pass. No browser page errors. External AI generation is unchanged and was not invoked during these motion checks.
