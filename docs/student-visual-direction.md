# Student visual direction

This pass explored three compositions against the existing Student screens:

1. **Learning journal:** editorial typography and course notes lead the page. It reads clearly but gives conversation too little presence.
2. **Two connected paths (selected):** Academic uses deep teal and study artwork; Communication uses warm sand and dialogue artwork. A lesson-to-real-life bridge connects them on the dashboard. This makes the next action and the relationship between lessons and speaking visible.
3. **Conversation stage:** the voice interaction dominates the entry screen. It helps the conversation page, but would obscure courses and reviews on the dashboard.

The selected direction keeps the existing routes, tenant context and backend calls. `VisualAsset` supplies a replaceable image slot with a local CSS illustration fallback. Color, radius, shadow and motion values are in `frontend/src/styles/theme/tokens.css`; page composition lives in `frontend/src/app/globals.css`. The lobby shows a mission, focus areas, a voice action and text starters before the first message. Illustrative progress and review figures remain labelled as demo data.

Motion uses short CSS and Web Animations API transitions, with `prefers-reduced-motion` support. The current effects do not justify a new Motion dependency. Future artwork can be placed under `frontend/public/student-visuals/` and linked from data. School branding remains a configurable future capability, not a fork of these styles.
