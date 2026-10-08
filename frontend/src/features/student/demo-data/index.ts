export type Exercise = { id: string; prompt: string; options: string[]; answer: string; explanation: string };
export type Lesson = { id: string; title: string; objective: string; duration: number; notes: string[]; examples: string[]; exercises: Exercise[] };
export type Course = { id: string; languageId: string; title: string; subtitle: string; coverImageSrc?: string; lessons: Lesson[] };
export type Scenario = { id: string; languageId: string; title: string; category: string; level: string; minutes: number; description: string; objective: string; bridge: string; starter: string; focus: string[]; suggestions: string[]; imageSrc?: string };
export type DemoResource = { id: string; courseId: string; title: string; languageId: string; level: string; kind: "Worksheet"; sharedBy: "Teacher"; format: "PDF"; href: string; pages?: number; sizeLabel?: string };

export const languages = [
  { id: "en", name: "English", locale: "en-US", level: "B1", baseProgress: 58, baseLessons: 12, totalLessons: 21, averageScore: 82, reviewConsistency: 82, masteredConcepts: 24, color: "mint" },
  { id: "de", name: "German", locale: "de-DE", level: "A2", baseProgress: 32, baseLessons: 6, totalLessons: 20, averageScore: 76, reviewConsistency: 68, masteredConcepts: 11, color: "peach" },
] as const;

export const courses: Course[] = [
  { id: "past-experiences", languageId: "en", title: "Past experiences", subtitle: "Tell stories that feel natural and clear.", lessons: [
    { id: "past-simple", title: "Tell it in the past", objective: "Use the past simple to talk about a completed experience.", duration: 8, notes: ["A finished action in the past uses a past verb form.", "Regular verbs often end in -ed; common irregular verbs change form."], examples: ["I visited Berlin last spring.", "We went to a small café yesterday."], exercises: [
      { id: "en-1", prompt: "Yesterday, I ___ a new city.", options: ["explore", "explored", "exploring"], answer: "explored", explanation: "Yesterday tells us the action is finished, so use explored." },
      { id: "en-2", prompt: "Last weekend, we ___ to the coast.", options: ["go", "went", "going"], answer: "went", explanation: "Went is the past form of go." },
    ] },
    { id: "travel-stories", title: "A travel story", objective: "Put past actions in a clear sequence.", duration: 7, notes: ["Start with when and where the story happened.", "Use then and after that to connect events."], examples: ["Last year, I travelled to Hamburg. Then I visited the harbour.", "We arrived late, but we found a lovely hotel."], exercises: [
      { id: "en-3", prompt: "Choose the natural next sentence: We arrived at noon. ___", options: ["Then we had lunch.", "Tomorrow we had lunch.", "Now we had lunch."], answer: "Then we had lunch.", explanation: "Then connects the next completed event in a story." },
    ] },
  ] },
  { id: "everyday-situations", languageId: "de", title: "Everyday situations", subtitle: "Feel at ease in familiar moments.", lessons: [
    { id: "introductions", title: "First introductions", objective: "Introduce yourself and ask someone where they are from.", duration: 7, notes: ["Ich heiße … means My name is …", "Woher kommst du? asks where someone comes from in an informal conversation."], examples: ["Hallo, ich heiße Mia.", "Ich komme aus Frankreich. Und du?"], exercises: [
      { id: "de-1", prompt: "Complete the introduction: Ich ___ Lina.", options: ["heiße", "bist", "kommt"], answer: "heiße", explanation: "Ich heiße means My name is." },
      { id: "de-2", prompt: "How do you ask informally, Where are you from?", options: ["Woher kommst du?", "Wie alt bist du?", "Was machst du?"], answer: "Woher kommst du?", explanation: "Woher asks about origin; kommst du means do you come." },
    ] },
    { id: "directions", title: "Finding your way", objective: "Ask politely for directions in town.", duration: 8, notes: ["Entschuldigung is a polite way to get attention.", "Wo ist …? means Where is …?"], examples: ["Entschuldigung, wo ist der Bahnhof?", "Gehen Sie geradeaus und dann links."], exercises: [
      { id: "de-3", prompt: "Choose the polite question for the station.", options: ["Wo ist der Bahnhof?", "Ich bin Bahnhof.", "Der Bahnhof ist du?"], answer: "Wo ist der Bahnhof?", explanation: "Wo ist …? asks where a place is." },
    ] },
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
export const weeklyActivity = [{ day: "Mon", minutes: 18 }, { day: "Tue", minutes: 32 }, { day: "Wed", minutes: 24 }, { day: "Thu", minutes: 40 }, { day: "Fri", minutes: 28 }, { day: "Sat", minutes: 12 }, { day: "Sun", minutes: 0 }];
export const needsAttention = ["Irregular verbs", "Hotel vocabulary", "Word order"];

export const findCourse = (id: string) => courses.find((course) => course.id === id);
export const findLesson = (courseId: string, lessonId: string) => findCourse(courseId)?.lessons.find((lesson) => lesson.id === lessonId);
export const findScenario = (id: string) => scenarios.find((scenario) => scenario.id === id);
export const findLanguage = (id: string) => languages.find((language) => language.id === id);
export const findTeacherResource = (id: string) => teacherResources.find((resource) => resource.id === id);
