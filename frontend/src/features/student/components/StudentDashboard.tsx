"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { ArrowRight, BookOpenText, FileText, MessageCircleMore, Mic2, RotateCcw, TrendingUp, PencilLine, Clock3, ArrowDown } from "lucide-react";
import { courses, findLanguage, languages, needsAttention, reviews, scenarios, teacherResources, weeklyActivity } from "../demo-data";
import { useDemoProgress } from "./DemoProgress";
import { LearningPhoto } from "@/components/ui/LearningPhoto";
import { learningVisuals } from "@/config/learning-visuals";
import styles from "./StudentDashboard.module.css";

function scrollToNextChapter(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const section = document.getElementById("next-chapter");
  if (!section) return;
  event.preventDefault();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "start" });
  window.history.replaceState(window.history.state, "", "#next-chapter");
}

export function StudentDashboard({ firstName }: { firstName?: string }) {
  const { getLanguageProgress, recentResult } = useDemoProgress();
  const course = courses[0];
  const lesson = course.lessons[0];
  const language = findLanguage(course.languageId);
  const scenario = scenarios.find((item) => item.languageId === course.languageId) ?? scenarios[0];
  const resource = teacherResources.find((item) => item.courseId === course.id);
  const lessonHref = `/student/learn/${course.id}/${lesson.id}`;
  const maxMinutes = Math.max(...weeklyActivity.map((day) => day.minutes), 1);
  const tools = [
    { icon: BookOpenText, title: "Lessons", detail: "Clear explanations, one idea at a time.", href: "/student/learn" },
    { icon: PencilLine, title: "Exercises", detail: "Check what you learned in a short activity.", href: `${lessonHref}/exercise` },
    ...(resource ? [{ icon: FileText, title: "Teacher resources", detail: "Open your lesson worksheet as a PDF.", href: `/student/learn/resources/${resource.id}` }] : []),
    { icon: Mic2, title: "AI conversation", detail: "Speak or type. Listen to your partner reply.", href: `/student/practice/${scenario.id}` },
    { icon: RotateCcw, title: "Reviews", detail: "Revisit vocabulary and useful expressions.", href: "/student/reviews" },
    { icon: TrendingUp, title: "Progress", detail: "See your learning journey in this demo.", href: "/student/progress" },
  ];

  return <div data-student-home className={styles.dashboard}>
    <section className={styles.hero} aria-labelledby="welcome-title">
      {learningVisuals.hero.src && <LearningPhoto {...learningVisuals.hero} sizes="100vw" priority className={styles.heroPhoto} />}
      <div className={styles.heroInner}>
        <p data-student-enter className={styles.heroLabel}></p>
        <h1 data-student-enter id="welcome-title">{firstName ? `Welcome back, ${firstName}.` : "Welcome back."}<br />A little learning goes a long way.</h1>
        <p data-student-enter className={styles.heroDescription}>Learn something new. Find the words to use it.<br />Your next lesson and conversation are ready.</p>
        <div data-student-enter className={styles.actions}><Link className={styles.primary} href={lessonHref}>Continue lesson <ArrowRight size={17} aria-hidden="true" /></Link><Link className={styles.outline} href={`/student/practice/${scenario.id}`}>Practise with AI</Link></div>
      </div>
      <a href="#next-chapter" onClick={scrollToNextChapter} className={styles.heroScroll}><span>Explore your learning space</span><ArrowDown size={18} aria-hidden="true" /></a>
    </section>

    <div className={styles.languageStrip} aria-label="Languages in this demo">{languages.map((item) => <Link key={item.id} href={courses.find((path) => path.languageId === item.id) ? `/student/learn/${courses.find((path) => path.languageId === item.id)!.id}` : "/student/learn"}><BookOpenText size={17} aria-hidden="true" /><strong>{item.name}</strong><span>{item.level}</span></Link>)}<span className={styles.demoNote}>Learning preview · demo content</span></div>

    <section data-student-scene className={`${styles.section} ${styles.lessonSection}`} id="next-chapter" aria-labelledby="next-lesson-title">
      <div className={styles.lessonCopy}><p className={styles.eyebrow}>Academic Path</p><h2 id="next-lesson-title">Your next chapter starts here.</h2><p className={styles.body}>Build the foundations in a lesson, then take them into a conversation. Keep your teacher&apos;s resources close as you practise.</p><div className={styles.lessonDetails}><span>{language?.name} · {language?.level}</span><h3>{lesson.title}</h3><p>{lesson.objective}</p><span className={styles.duration}><Clock3 size={15} aria-hidden="true" /> {lesson.duration} minutes · {course.title}</span></div><Link className={styles.textLink} href={lessonHref}>Open lesson <ArrowRight size={17} aria-hidden="true" /></Link></div>
      <div className={styles.lessonVisual}><LearningPhoto {...learningVisuals.lesson} sizes="(max-width:600px) 100vw, (max-width:1160px) 45vw, 510px" className={styles.lessonPhoto} />{resource && <Link href={`/student/learn/resources/${resource.id}`} className={styles.resource}><FileText size={25} aria-hidden="true" /><div><span>From your teacher · {resource.format}</span><strong>{resource.title}</strong><small>{resource.pages} pages · {resource.sizeLabel}</small></div><ArrowRight size={18} aria-hidden="true" /></Link>}</div>
    </section>

    <section data-student-scene className={styles.section} aria-labelledby="pathways-title"><div className={styles.centerHeading}><p className={styles.eyebrow}>Your learning pathways</p><h2 id="pathways-title">Knowledge meets conversation.</h2><p>Two connected paths, with space to grow in every language.</p></div><div className={styles.pathGrid}>
      {courses.map((path) => { const item = findLanguage(path.languageId); const photo = learningVisuals.courses[path.id]; return <article key={path.id} className={styles.pathCard}><LearningPhoto {...photo} sizes="(max-width:600px) 100vw, (max-width:1160px) 33vw, 350px" src={photo?.src ?? path.coverImageSrc} alt={photo?.alt ?? path.title} className={styles.pathPhoto} /><div className={styles.pathContent}><span className={styles.cardMeta}>Academic Path · {item?.name} {item?.level}</span><h3>{path.title}</h3><p>{path.subtitle}</p><Link className={styles.cardLink} href={`/student/learn/${path.id}`}>Explore course <ArrowRight size={16} aria-hidden="true" /></Link></div></article>; })}
      <article className={styles.pathCard}><LearningPhoto {...learningVisuals.conversation} sizes="(max-width:600px) 100vw, (max-width:1160px) 33vw, 350px" conversation className={styles.pathPhoto} /><div className={styles.pathContent}><span className={styles.cardMeta}>Communication Path</span><h3>Words for the real world.</h3><p>Try everyday situations with an AI partner. Speak or type at your own pace.</p><Link className={styles.cardLink} href="/student/practice">Explore situations <ArrowRight size={16} aria-hidden="true" /></Link></div></article>
    </div></section>

    <section data-student-scene className={styles.toolsSection} aria-labelledby="tools-title"><div className={styles.toolsInner}><div className={styles.centerHeading}><p className={styles.eyebrow}>Everything in your learning space</p><h2 id="tools-title">Make each session your own.</h2><p>Read, try, speak and revisit. Choose what you need today.</p></div><div className={styles.toolsGrid}>{tools.map(({ icon: Icon, title, detail, href }) => <Link key={title} href={href} className={styles.tool}><span><Icon size={25} strokeWidth={1.4} aria-hidden="true" /></span><h3>{title}</h3><p>{detail}</p></Link>)}</div></div></section>

    <section data-student-scene className={styles.section} aria-labelledby="progress-title"><div className={styles.centerHeading}><p className={styles.eyebrow}>Your learning journey</p><h2 id="progress-title">A steady rhythm, one step at a time.</h2><p>Sample progress and review counts are illustrative. Exercise results reflect your activity in this demo session.</p></div><div className={styles.progressGrid}>
      <div className={styles.languageProgress}><h3>Your languages</h3>{languages.map((item) => { const progress = getLanguageProgress(item.id); return <div key={item.id} className={styles.languageRow}><div><strong>{item.name}</strong><span>{progress.percent}%</span></div><progress max={100} value={progress.percent} aria-label={`${item.name} demo progress`} /><small>{progress.completed} of {progress.total} lessons · demo</small></div>; })}<Link className={styles.textLink} href="/student/progress">View progress <ArrowRight size={16} aria-hidden="true" /></Link></div>
      <div className={styles.week}><h3>This demo week</h3><div className={styles.chart} role="img" aria-label={weeklyActivity.map((day) => `${day.day}: ${day.minutes} minutes`).join(", ")}>{weeklyActivity.map((day) => <div key={day.day}><span>{day.minutes}</span><div className={styles.barTrack}><span style={{ height: `${day.minutes / maxMinutes * 100}%` }} /></div><small>{day.day}</small></div>)}</div><p>Sample activity in minutes</p></div>
      <div className={styles.review}><RotateCcw size={24} aria-hidden="true" /><h3>Ready to revisit</h3><p><strong className={styles.reviewCount}>{reviews.due}</strong> items in the review preview</p><ul>{reviews.categories.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.count}</strong></li>)}</ul><Link className={styles.textLink} href="/student/reviews">Open reviews <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </div></section>

    <section data-student-scene className={`${styles.section} ${styles.cycle}`} aria-labelledby="cycle-title"><div className={styles.centerHeading}><p className={styles.eyebrow}>From lesson to life</p><h2 id="cycle-title">Learn it. Try it. Say it.</h2></div><ol className={styles.steps}><li><span className={styles.stepIcon}><BookOpenText size={24} aria-hidden="true" /></span><h3>Learn an idea</h3><p>{lesson.title}</p><Link href={lessonHref}>Read the lesson</Link></li><li><span className={styles.stepIcon}><PencilLine size={24} aria-hidden="true" /></span><h3>Put it into practice</h3><p>{recentResult ? `Latest exercise: ${Math.round(recentResult.score / recentResult.total * 100)}%.` : "Check your understanding in a short exercise."}</p><Link href={`${lessonHref}/exercise`}>Try the exercise</Link></li><li><span className={styles.stepIcon}><MessageCircleMore size={24} aria-hidden="true" /></span><h3>Use it in conversation</h3><p>{scenario.title}</p><Link href={`/student/practice/${scenario.id}`}>Start speaking</Link></li></ol><p className={styles.concepts}>Concepts to revisit in this demo: {needsAttention.join(", ")}.</p></section>

  </div>;
}
