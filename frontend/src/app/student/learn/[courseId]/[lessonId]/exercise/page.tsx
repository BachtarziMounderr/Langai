import { notFound } from "next/navigation";
import { findCourse, findLesson } from "@/features/student/demo-data";
import { StudentExercise } from "@/features/student/components/StudentExercise";

export default async function ExercisePage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const course = findCourse(courseId);
  const lesson = findLesson(courseId, lessonId);
  if (!course || !lesson) notFound();
  return <StudentExercise course={course} lesson={lesson} />;
}
