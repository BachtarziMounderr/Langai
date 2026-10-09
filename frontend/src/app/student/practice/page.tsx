import { studentClassName } from "@/features/student/components/student-class-name";
import Link from "next/link";
import { ArrowRight, BookOpenText, Clock3, Mic2 } from "lucide-react";
import { courses, findLanguage, scenarios } from "@/features/student/demo-data";
import { LearningPhoto } from "@/components/ui/LearningPhoto";
import { learningVisuals } from "@/config/learning-visuals";

export default function PracticePage() {
  const course = courses[0];
  return <div className={studentClassName("student-practice-page space-y-8 pb-12")}>
    <header className={studentClassName("student-section-hero student-section-hero-communication")}><div><span className={studentClassName("student-section-path")}>Communication Path</span><h1>Find your words in real situations.</h1><p>Choose a scene, speak or type, and keep the exchange going one turn at a time.</p><span className={studentClassName("student-section-hero-note")}><Mic2 size={17} aria-hidden="true" /> Voice and text are both welcome</span></div><LearningPhoto priority conversation {...learningVisuals.conversation} sizes="(max-width:600px) 100vw, 340px" className={studentClassName("student-section-hero-art")} /></header>
    <aside className={studentClassName("student-course-connection")}><span className={studentClassName("student-resource-badge")}><BookOpenText size={19} aria-hidden="true" /></span><div><strong>From lesson to real life</strong><p>The {course.title} sample course pairs well with a story about a meal you enjoyed.</p></div><Link href={`/student/learn/${course.id}`} className={studentClassName("student-text-link")}>See the course <ArrowRight size={15} aria-hidden="true" /></Link></aside>
    <section aria-labelledby="scenario-heading" className={studentClassName("student-section-block")}><div className={studentClassName("student-section-title")}><div><h2 id="scenario-heading">Choose a situation</h2><p>Each conversation begins with a clear mission and room to improvise.</p></div><span>{scenarios.length} sample situations</span></div>
      <div className={studentClassName("student-scenario-grid")}>{scenarios.map((scenario) => <Link key={scenario.id} href={`/student/practice/${scenario.id}`} className={studentClassName("student-scenario-card")}><LearningPhoto conversation {...(learningVisuals.scenarios[scenario.id] ?? learningVisuals.conversation)} sizes="150px" src={learningVisuals.scenarios[scenario.id]?.src ?? scenario.imageSrc ?? learningVisuals.conversation.src} alt={learningVisuals.scenarios[scenario.id]?.alt || scenario.title} className={studentClassName("student-scenario-cover")} /><div className={studentClassName("student-scenario-content")}><div className={studentClassName("student-scenario-topline")}><span>{scenario.category}</span><span><Clock3 size={14} aria-hidden="true" /> {scenario.minutes} min</span></div><h3>{scenario.title}</h3><p>{scenario.description}</p><div className={studentClassName("student-scenario-focus")}><span>{findLanguage(scenario.languageId)?.name} · {scenario.level}</span>{scenario.focus.slice(0, 2).map((item) => <span key={item}>{item}</span>)}</div><span className={studentClassName("student-scenario-cta")}>Enter conversation <ArrowRight size={16} aria-hidden="true" /></span></div></Link>)}</div>
    </section>
  </div>;
}
