export type Lesson = { id: string; title: string; objective: string; duration: number; notes: string[]; examples: string[]; exerciseCount: number };
export type Course = { id: string; languageId: string; title: string; subtitle: string; coverImageSrc?: string; lessons: Lesson[] };
export type Scenario = { id: string; languageId: string; title: string; category: string; level: string; minutes: number; description: string; objective: string; bridge: string; starter: string; focus: string[]; suggestions: string[]; imageSrc?: string };
export type DemoResource = { id: string; courseId: string; title: string; languageId: string; level: string; kind: "Worksheet"; sharedBy: "Teacher"; format: "PDF"; href: string; pages?: number; sizeLabel?: string };

export const languages = [
  { id: "en", name: "English", locale: "en-US", level: "B1", color: "mint" },
  { id: "de", name: "German", locale: "de-DE", level: "A2", color: "peach" },
] as const;

export const courses: Course[] = [
  { id: "past-experiences", languageId: "en", title: "Past experiences", subtitle: "Tell stories that feel natural and clear.", lessons: [
    { id: "past-simple", title: "Tell it in the past", objective: "Use the past simple to talk about a completed experience.", duration: 8, notes: ["A finished action in the past uses a past verb form.", "Regular verbs often end in -ed; common irregular verbs change form."], examples: ["I visited Berlin last spring.", "We went to a small café yesterday."], exerciseCount: 2 },
    { id: "travel-stories", title: "A travel story", objective: "Put past actions in a clear sequence.", duration: 7, notes: ["Start with when and where the story happened.", "Use then and after that to connect events."], examples: ["Last year, I travelled to Hamburg. Then I visited the harbour.", "We arrived late, but we found a lovely hotel."], exerciseCount: 1 },
  ] },
  { id: "everyday-situations", languageId: "de", title: "Everyday situations", subtitle: "Feel at ease in familiar moments.", lessons: [
    { id: "introductions", title: "First introductions", objective: "Introduce yourself and ask someone where they are from.", duration: 7, notes: ["Ich heiße … means My name is …", "Woher kommst du? asks where someone comes from in an informal conversation."], examples: ["Hallo, ich heiße Mia.", "Ich komme aus Frankreich. Und du?"], exerciseCount: 2 },
    { id: "directions", title: "Finding your way", objective: "Ask politely for directions in town.", duration: 8, notes: ["Entschuldigung is a polite way to get attention.", "Wo ist …? means Where is …?"], examples: ["Entschuldigung, wo ist der Bahnhof?", "Gehen Sie geradeaus und dann links."], exerciseCount: 1 },
  ] },
];

export const scenarios: Scenario[] = [
  { id: "restaurant", languageId: "en", title: "At the restaurant", category: "Everyday life", level: "B1", minutes: 8, description: "Order a meal, ask a question and respond naturally.", objective: "Make a polite request and keep the conversation going.", bridge: "Put your past-simple lesson to work: tell the waiter what you enjoyed last time.", starter: "Hello, I'd like a table for two, please.", focus: ["Polite requests", "Past simple", "Food vocabulary"], suggestions: ["I'd like a table for two.", "What do you recommend?", "I enjoyed the pasta last time."] },
  { id: "hotel", languageId: "en", title: "Hotel check-in", category: "Travel", level: "B1", minutes: 8, description: "Check in and sort out the details of your stay.", objective: "Confirm a booking and ask a follow-up question.", bridge: "Use clear past and present forms to explain your journey.", starter: "Hello, I have a reservation under my name.", focus: ["Reservations", "Polite questions", "Travel details"], suggestions: ["I have a reservation for tonight.", "Could I check in now?", "What time is breakfast?"] },
  { id: "directions", languageId: "de", title: "Asking for directions", category: "Around town", level: "A2", minutes: 6, description: "Find your way to the station in German.", objective: "Ask where a place is and understand a short answer.", bridge: "Practise the Wo ist …? phrase from Finding your way.", starter: "Entschuldigung, wo ist der Bahnhof?", focus: ["Places in town", "Polite questions", "Directions"], suggestions: ["Wo ist der Bahnhof?", "Ist es weit von hier?", "Muss ich links abbiegen?"] },
  { id: "small-talk", languageId: "de", title: "First conversation", category: "Meeting people", level: "A2", minutes: 6, description: "Introduce yourself in a relaxed conversation.", objective: "Say your name, where you are from and ask in return.", bridge: "Revisit introductions from your German course.", starter: "Hallo, ich heiße Alex. Und du?", focus: ["Introductions", "Where you're from", "Follow-up questions"], suggestions: ["Hallo, ich heiße Alex.", "Woher kommst du?", "Ich komme aus Frankreich."] },
];

export const teacherResources: DemoResource[] = [
  {
    id: "past-simple-a1-worksheet",
    courseId: "past-experiences",
    title: "Past Simple — Student Worksheet",
    languageId: "en",
    level: "A1",
    kind: "Worksheet",
    sharedBy: "Teacher",
    format: "PDF",
    href: "/demo-resources/Past-Simple-A1-Students-worksheet.pdf",
    pages: 8,
    sizeLabel: "618 KB",
  },
];

export const reviews = { due: 12, categories: [{ label: "Vocabulary", count: 6 }, { label: "Expressions", count: 4 }, { label: "Grammar", count: 2 }] };
export const needsAttention = ["Irregular verbs", "Hotel vocabulary", "Word order"];

export const findCourse = (id: string) => courses.find((course) => course.id === id);
export const findLesson = (courseId: string, lessonId: string) => findCourse(courseId)?.lessons.find((lesson) => lesson.id === lessonId);
export const findScenario = (id: string) => scenarios.find((scenario) => scenario.id === id);
export const findLanguage = (id: string) => languages.find((language) => language.id === id);
export const findTeacherResource = (id: string) => teacherResources.find((resource) => resource.id === id);
