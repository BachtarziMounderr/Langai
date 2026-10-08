import { notFound } from "next/navigation";
import { findScenario } from "@/features/student/demo-data";
import { StudentConversation } from "@/features/student/components/StudentConversation";
import { requireWorkspace } from "@/lib/auth/server";

export default async function ScenarioPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const scenario = findScenario(scenarioId);
  if (!scenario) notFound();
  const { context } = await requireWorkspace("/student");
  return <StudentConversation scenario={scenario} contextId={context.id} />;
}
