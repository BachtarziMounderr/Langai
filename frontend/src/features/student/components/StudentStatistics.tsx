"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, CheckCircle2, Mic2 } from "lucide-react";
import { useDemoProgress } from "./DemoProgress";
import { courses } from "../demo-data";
import { learningApi } from "../learning/api";
import type { Statistics } from "../learning/types";
import styles from "./StudentStatistics.module.css";

const percent = (value: number | null) => value === null ? "Not assessed" : `${value}%`;
const grade = (value: number | null) => value === null ? "—" : `${(value / 5).toFixed(1)} / 20`;
const date = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(value));

function ScoreTrend({ trend }: { trend: Statistics["trend"] }) {
  const id = useId();
  const points = trend.map((item, i) => ({ x: trend.length === 1 ? 230 : 36 + i / (trend.length - 1) * 390, y: 134 - item.percent * 1.1, ...item }));
  return <>
    {!points.length ? <p className={styles.empty}>Complete an exercise to start your score history.</p> : <svg className={styles.chart} viewBox="0 0 460 168" role="img" aria-labelledby={id}>
      <title id={id}>Exercise scores in chronological order. {trend.map((p, i) => `${i + 1}: ${p.title}, ${p.percent}%`).join(". ")}</title>
      {[0, 50, 100].map(n => <g key={n}><line x1="36" x2="430" y1={134 - n * 1.1} y2={134 - n * 1.1} className={styles.gridline} /><text x="0" y={138 - n * 1.1}>{n}%</text></g>)}
      {points.length > 1 && <polyline fill="none" points={points.map(p => `${p.x},${p.y}`).join(" ")} className={styles.line} />}
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" className={styles.dot}><title>{date(p.completed_at)} · {p.title}: {p.percent}%</title></circle>)}
      <text x="36" y="161">{date(trend[0].completed_at)}</text>{trend.length > 1 && <text x="430" y="161" textAnchor="end">{date(trend[trend.length - 1].completed_at)}</text>}
    </svg>}
    {points.length === 1 && <p className={styles.note}>Your first score. Another practice set will add the next point.</p>}
  </>;
}

export function StudentStatistics({ compact = false }: { compact?: boolean }) {
  const { contextId, statistics, error, refresh } = useDemoProgress();
  const [language, setLanguage] = useState("");
  const [filtered, setFiltered] = useState<{ language: string; data?: Statistics; error?: string } | null>(null);
  useEffect(() => {
    if (!language) return;
    let active = true;
    learningApi.statistics(contextId, language).then(data => { if (active) setFiltered({ language, data }); }).catch(e => { if (active) setFiltered({ language, error: e instanceof Error ? e.message : "Statistics could not be loaded." }); });
    return () => { active = false; };
  }, [contextId, language]);
  const data = language ? filtered?.language === language ? filtered.data : null : statistics;
  const problem = language ? filtered?.language === language ? filtered.error : null : error;
  const course = courses.find(item => !language || item.languageId === language);
  const practiceHref = course ? `/student/learn/${course.id}/${course.lessons[0].id}/exercise` : "/student/learn";
  const retry = () => {
    if (!language) { void refresh(); return; }
    setFiltered(null);
    learningApi.statistics(contextId, language).then(data => setFiltered({ language, data })).catch(e => setFiltered({ language, error: e instanceof Error ? e.message : "Statistics could not be loaded." }));
  };
  return <div className={styles.statistics}>
    {!compact && <div className={styles.filter}><label htmlFor="statistics-language">Learning language</label><select id="statistics-language" value={language} onChange={e => { setLanguage(e.target.value); setFiltered(null); }}><option value="">All languages</option>{statistics?.languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>}
    {problem && <div role="alert" className={styles.error}><p>{problem}</p><button onClick={retry} type="button">Reload statistics</button></div>}
    {!data ? !problem && <p role="status" className={styles.empty}>Loading your learning record…</p> : <>
      <div className={styles.summary}>
        <div className={styles.score}><span>Exercise average</span><strong>{grade(data.percent)}</strong><p>{data.questions ? `${data.correct} correct answers out of ${data.questions} · ${percent(data.percent)}` : "Your first exercise will give you a starting point."}</p></div>
        <div className={styles.total}><strong>{data.attempts}</strong><span>practice sets completed</span><small>First submissions only</small></div>
        <div className={styles.action}><Link href={practiceHref}><BookOpenText size={19} aria-hidden="true" />Practise a lesson<ArrowRight size={17} aria-hidden="true" /></Link><p>Questions follow the content you are learning.</p></div>
      </div>
      <div className={styles.skillHeader}><h2>Where your skills stand</h2><p>Each question measures one skill. An empty category means there is no assessment yet.</p></div>
      <div className={styles.skills}>{data.skills.map(skill => <article key={skill.id} className={`${styles.skill} ${skill.total === 0 ? styles.unassessed : ""}`}>
        <div><h3>{skill.label}</h3>{skill.id === "oral" && <Mic2 size={19} aria-hidden="true" />}</div><strong>{grade(skill.percent)}</strong>
        {skill.percent !== null ? <><progress value={skill.percent} max={100} aria-label={`${skill.label}: ${skill.percent}%`} /><p>{skill.score} / {skill.total} answers correct</p></> : <p>{skill.id === "oral" ? "Waiting for a speaking assessment." : "No questions assessed yet."}</p>}
        <small>Teacher grade: {skill.teacher_percent === null ? "not available yet" : grade(skill.teacher_percent)}</small>
      </article>)}</div>
      {compact ? <Link className={styles.more} href="/student/progress">Open my learning record <ArrowRight size={17} aria-hidden="true" /></Link> : <>
        <div className={styles.detailGrid}>
          <section className={styles.panel} aria-labelledby="score-history-title"><h2 id="score-history-title">Your score history</h2><p className={styles.note}>Last 20 practice sets. Each point is a saved result.</p><ScoreTrend trend={data.trend} /></section>
          <section className={styles.panel} aria-labelledby="language-record-title"><h2 id="language-record-title">Learning by language</h2>{data.languages.filter(l => !language || l.id === language).map(l => <div key={l.id} className={styles.languageRow}><div><strong>{l.name}</strong><span>{grade(l.percent)}</span></div><p>{l.completed} of {l.total} available lessons practised</p><progress max={l.total} value={l.completed} aria-label={`${l.name}: ${l.completed} of ${l.total} lessons practised`} /></div>)}</section>
        </div>
        <section className={styles.history} aria-labelledby="saved-results-title"><div className={styles.skillHeader}><h2 id="saved-results-title">Your recent results</h2><p>Saved to your account in this workspace. Reloading or changing devices keeps your results.</p></div>
          {data.history.length ? <div className={styles.tableWrap}><table><caption className={styles.srOnly}>Most recent 20 exercise results</caption><thead><tr><th scope="col">Lesson</th><th scope="col">Practice</th><th scope="col">Date</th><th scope="col">Result</th></tr></thead><tbody>{data.history.map(item => <tr key={item.id}><th scope="row"><Link href={`/student/learn/${item.course_id}/${item.lesson_id}/exercise`}>{item.title}</Link><small>{statistics?.languages.find(l => l.id === item.language_code)?.name ?? item.language_code}</small></th><td>{item.kind === "generated" ? "AI generated" : "Lesson practice"}</td><td>{date(item.completed_at)}</td><td><span className={styles.result}><CheckCircle2 size={15} aria-hidden="true" />{item.score}/{item.total} · {grade(item.percent)}</span></td></tr>)}</tbody></table></div> : <p className={styles.empty}>No graded exercises yet. Open a lesson and complete its practice to see your results here.</p>}
        </section>
        <p className={styles.method}>How scores work: one point per correct answer, converted to a grade out of 20. Skills use only questions tagged with that skill. Unassessed skills are excluded from the average. AI conversations alone do not measure speaking ability. Teacher grades will appear when that workflow is available.</p>
      </>}
    </>}
  </div>;
}
