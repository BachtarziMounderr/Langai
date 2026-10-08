"use client";

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BookOpenText, FileText,
  MessageCircleMore, Mic2, RotateCcw, Sparkles, TrendingUp,
} from "lucide-react";
import { courses, findLanguage, languages, needsAttention, reviews, scenarios, weeklyActivity } from "../demo-data";
import { useDemoProgress } from "./DemoProgress";
import { AnimatedCount } from "./AnimatedCount";
import { ProgressBar, SectionHeading } from "./StudentPrimitives";
import { TeacherResources } from "./TeacherResources";
import { VisualAsset } from "./VisualAsset";

export function StudentDashboard({ firstName }: { firstName?: string }) {
  const { getLanguageProgress, recentResult } = useDemoProgress();
  const course = courses[0];
  const lesson = course.lessons[0];
  const language = findLanguage(course.languageId);
  const progress = getLanguageProgress(course.languageId);
  const scenario = scenarios.find((item) => item.languageId === course.languageId) ?? scenarios[0];
  const maxMinutes = Math.max(...weeklyActivity.map((day) => day.minutes), 1);

  return <div className="student-dashboard space-y-9 pb-12">
    <section data-student-reveal className="student-studio-hero" aria-labelledby="studio-title">
      <div className="student-studio-copy">
        <span className="student-studio-kicker"><Sparkles size={15} aria-hidden="true" /> Your learning studio</span>
        <h1 id="studio-title">{firstName ? `${firstName}, keep` : "Keep"} your learning in motion.</h1>
        <p>Pick up a lesson, then try its ideas in a real conversation.</p>
        <div className="student-studio-actions"><Link href={`/student/learn/${course.id}/${lesson.id}`} className="student-primary-button student-button-sun">Continue lesson <ArrowRight size={17} aria-hidden="true" /></Link><Link href="/student/practice" className="student-hero-link">Explore conversation <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </div>
      <div className="student-studio-next"><VisualAsset kind="academic" imageSrc={course.coverImageSrc} className="student-studio-next-art" /><div className="student-studio-next-caption"><span>Ready when you are</span><strong>{lesson.title}</strong><span>{language?.name} · {language?.level} · {lesson.duration} min</span></div></div>
    </section>

    <section data-student-reveal aria-labelledby="languages-title" className="student-language-section">
      <SectionHeading id="languages-title" title="Your languages" detail="Each language has its own learning journey" />
      <div className="student-language-grid">{languages.map((item) => {
        const itemProgress = getLanguageProgress(item.id);
        const path = courses.find((candidate) => candidate.languageId === item.id);
        return <Link key={item.id} href={path ? `/student/learn/${path.id}` : "/student/learn"} className={`student-language-card student-language-${item.color}`}>
          <span className="student-language-monogram" aria-hidden="true">{item.name.slice(0, 2)}</span>
          <span className="student-language-copy"><strong>{item.name}</strong><small>{path?.title}</small></span>
          <span className="student-language-meter"><strong><AnimatedCount value={itemProgress.percent} suffix="%" /></strong><span>{itemProgress.completed} of {itemProgress.total} lessons · demo progress</span><ProgressBar value={itemProgress.percent} label={`${item.name} illustrative progress`} /></span>
          <ArrowUpRight size={17} className="student-language-arrow" aria-hidden="true" />
        </Link>;
      })}</div>
    </section>

    <section aria-labelledby="paths-title" className="student-path-story">
      <div data-student-reveal className="student-story-heading"><div><h2 id="paths-title">Learn it. Then use it.</h2><p>Two connected ways to build confidence in your language.</p></div><span className="student-story-line" aria-hidden="true" /></div>

      <article data-student-reveal className="student-academic-path" aria-labelledby="academic-path-title">
        <div className="student-path-heading"><span className="student-path-icon"><BookOpenText size={21} aria-hidden="true" /></span><div><h3 id="academic-path-title">Academic Path</h3><p>Structured learning with your school</p></div></div>
        <div className="student-academic-grid">
          <div className="student-academic-current"><p className="student-path-meta">{language?.name} · {language?.level} · Current course</p><h4>{course.title}</h4><p className="student-path-description">Build the language for stories you can tell outside the classroom.</p>
            <div className="student-next-lesson"><span>Featured lesson</span><strong>{lesson.title}</strong><span>{lesson.duration} minutes of focused practice</span></div>
            <div className="student-dark-meter"><div className="flex justify-between text-xs"><span>Language journey · demo</span><strong>{progress.percent}%</strong></div><div className="student-dark-progress"><div key={progress.percent} className="student-progress-fill" style={{ width: `${progress.percent}%` }} /></div></div>
            <div className="student-path-actions"><Link href={`/student/learn/${course.id}/${lesson.id}`} className="student-primary-button student-button-light">Continue lesson <ArrowRight size={16} aria-hidden="true" /></Link><Link href={`/student/learn/${course.id}`} className="student-dark-link">View course <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
          </div>
          <div className="student-academic-aside"><VisualAsset kind="academic" imageSrc={course.coverImageSrc} className="student-path-art" /><div className="student-path-resource"><div className="flex items-center gap-2"><FileText size={17} aria-hidden="true" /><strong>From your teacher</strong></div><TeacherResources courseId={course.id} compact /></div></div>
        </div>
      </article>

      <div data-student-reveal className="student-learning-bridge" aria-label="From lesson to conversation"><div className="student-bridge-end"><span>In the lesson</span><strong>{lesson.title}</strong></div><div className="student-bridge-connector" aria-hidden="true"><span /><ArrowRight size={19} /></div><div className="student-bridge-end"><span>In real life</span><strong>{scenario.title}</strong></div><p>Use the past tense you studied when you talk about a meal you enjoyed.</p></div>

      <article data-student-reveal className="student-communication-path" aria-labelledby="communication-path-title"><div className="student-path-heading"><span className="student-path-icon"><MessageCircleMore size={21} aria-hidden="true" /></span><div><h3 id="communication-path-title">Communication Path</h3><p>Make the next exchange your own</p></div></div>
        <div className="student-communication-grid"><div className="student-communication-current"><p className="student-path-meta">Featured situation · {language?.name} {scenario.level} · {scenario.minutes} min</p><h4>{scenario.title}</h4><p className="student-path-description">{scenario.objective}</p><div className="student-focus-list"><span>Today you can practise</span>{scenario.focus.slice(0, 2).map((focus) => <strong key={focus}>{focus}</strong>)}</div><div className="student-path-actions"><Link href={`/student/practice/${scenario.id}`} className="student-primary-button student-button-ink">Start conversation <ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/student/practice" className="student-warm-link">Browse situations <ArrowRight size={15} aria-hidden="true" /></Link></div></div><div className="student-communication-aside"><VisualAsset kind="conversation" imageSrc={scenario.imageSrc} className="student-path-art" /><div className="student-voice-note"><Mic2 size={19} aria-hidden="true" /><span>Speak or type. Listen to your AI partner answer.</span></div></div></div>
      </article>
    </section>

    <section data-student-reveal className="student-dashboard-lower" aria-label="Your learning at a glance"><div className="student-dashboard-insights"><div className="student-insight-heading"><div><h2>Keep a steady rhythm</h2><p>Sample activity for this demo week</p></div><TrendingUp size={19} aria-hidden="true" /></div><div className="student-week-chart" role="img" aria-label={weeklyActivity.map((day) => `${day.day}: ${day.minutes} minutes`).join(", ")}>{weeklyActivity.map((day, index) => <div key={day.day} className="student-chart-day" title={`${day.day} — ${day.minutes} min`}><div className="student-chart-track"><div className="student-chart-bar" style={{ height: `${day.minutes / maxMinutes * 100}%`, animationDelay: `${index * 55}ms` }} /></div><span>{day.day}</span><span className="student-chart-tooltip" aria-hidden="true">{day.minutes} min</span></div>)}</div></div>
      <div className="student-dashboard-review"><div className="student-insight-heading"><div><h2>Ready to revisit</h2><p>Illustrative review preview</p></div><RotateCcw size={19} aria-hidden="true" /></div><div className="student-review-total"><AnimatedCount value={reviews.due} /><span>items due today</span></div><div className="student-review-mini-list">{reviews.categories.map((category) => <span key={category.label}>{category.label} <strong>{category.count}</strong></span>)}</div><Link href="/student/reviews" className="student-text-link">View reviews <ArrowRight size={15} aria-hidden="true" /></Link></div>
    </section>

    <section data-student-reveal className="student-dashboard-foot"><div><p className="student-foot-label">Your next small step</p><h2>{recentResult ? `You scored ${Math.round(recentResult.score / recentResult.total * 100)}% on your latest exercise.` : "Make room for one more useful sentence."}</h2><p>Try the conversation after your lesson to use the same idea in context.</p><Link href={`/student/practice/${scenario.id}`} className="student-text-link">Practise now <ArrowRight size={15} aria-hidden="true" /></Link></div><div className="student-attention-list"><span>Concepts to revisit · demo</span>{needsAttention.map((item) => <strong key={item}>{item}</strong>)}</div></section>
  </div>;
}
