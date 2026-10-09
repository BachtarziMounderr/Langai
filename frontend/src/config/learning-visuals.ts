// Photography is presentation configuration, independent of languages and tenants.
// Local files: frontend/public/student-visuals -> /student-visuals/filename.jpg.
// Empty src deliberately keeps the illustration. Use trusted HTTPS remote URLs.
export type LearningVisual = {
  src: string;
  alt: string;
  position?: string;
  mobilePosition?: string;
  unoptimized?: boolean;
};

export const learningVisuals = {
  hero: { src: "/student-visuals/bgc2.jpg", alt: "", position: "50% 48%", mobilePosition: "50% 46%" },
  lesson: { src: "/student-visuals/image2.jpg", alt: "Students sharing ideas around a study table", position: "50% 48%", unoptimized: true },
  conversation: { src: "/student-visuals/image4.jpg", alt: "Students beside a display of greetings in different languages", position: "50% 48%" },
  login: { src: "/student-visuals/bgc1.jpg", alt: "", position: "50% 45%" },
  courses: {
    "past-experiences": { src: "/student-visuals/image2.jpg", alt: "Students sharing ideas around a study table", position: "50% 48%" },
    "everyday-situations": { src: "/student-visuals/bgc3.jpg", alt: "A study group working together around a table", position: "50% 50%" },
  } as Record<string, LearningVisual>,
  scenarios: {
    restaurant: { src: "", alt: "" },
    hotel: { src: "", alt: "" },
    directions: { src: "", alt: "" },
    "small-talk": { src: "/student-visuals/image4.jpg", alt: "Students practising greetings in a shared learning space", position: "50% 48%" },
  } as Record<string, LearningVisual>,
};
