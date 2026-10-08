# Student visuals

This directory is reserved for artwork supplied for the Student experience. No sample photographs are bundled.

- `academic/`: study and lesson illustrations.
- `courses/`: optional course cover images.
- `scenarios/`: conversation situations such as restaurant or travel.

Set the matching `coverImageSrc` or `imageSrc` field in `frontend/src/features/student/demo-data/index.ts` to a public path such as `/student-visuals/courses/example.webp`. `VisualAsset` renders that image and keeps its graphic fallback when no path is set. Use appropriately licensed, compressed assets and provide meaningful alternative text when an image carries content.
