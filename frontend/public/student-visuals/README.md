# Student visuals — V2

Add photos here, then edit frontend/src/config/learning-visuals.ts.

    hero: {
      src: "/student-visuals/bgc2.jpg",
      alt: "",
      position: "50% 48%",
      mobilePosition: "50% 46%",
    },

Use the exact filename and extension, including case. Start local URLs with /student-visuals/; do not include frontend/public. A bare filename points to the wrong location.

Current selection:

- bgc2.jpg: home hero.
- bgc1.jpg: desktop/tablet sign-in background.
- image2.jpg: lessons and past-experiences course.
- bgc3.jpg: everyday-situations course.
- image4.jpg: communication and small-talk.
- image3.jpg: retained original, currently unused.
- images1.jpg: retained original, currently unused.

hero and login are decorative and use empty alt text. Content photos require descriptive alt text. courses and scenarios use existing IDs, independent of language logic. An absent scenario entry uses the shared image; an explicit src: "" keeps the illustration. Restaurant, hotel and directions await relevant photos.

position sets the crop focal point. mobilePosition optionally adjusts it at 600 px and below. Local photos use the existing Next.js image optimization, while original files stay unchanged. Trusted HTTPS remote URLs are supported as native images. Do not put credentials in URLs.

Docker uses Webpack with polling, so saving the configuration updates the local page. After replacing a photo, prefer a new filename and update src: browsers and optimized-image caches may retain an old file with the same URL.

See docs/student-visual-design.md for dimensions, placement and verification.

The decorative gallery has been removed. Unused original images stay here.

For a sharper Academic Path image, supply a landscape source at least 1600 px wide, ideally 1600 ? 1067 or larger. Update lesson.src to the new filename in learning-visuals.ts and remove unoptimized: true. That flag currently preserves the small 678 ? 452 original without a second compression pass; it cannot add missing detail. Removing it restores responsive Next.js optimization for the new HD photo.
