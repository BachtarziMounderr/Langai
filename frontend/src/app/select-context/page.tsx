import { LearningStatus } from "@/components/layout/LearningStatus";
import styles from "@/components/layout/LearningStatus.module.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/server";

async function chooseContext(formData: FormData) {
  "use server";
  const session = await requireSession();
  const id = formData.get("context_id");
  const choice = session.contexts.find((context) => context.id === id);
  if (!choice) redirect("/forbidden");
  (await cookies()).set("lingua_context", choice.id, {
    sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
  });
  redirect(choice.route);
}

export default async function SelectContextPage() {
  const session = await requireSession();
  if (session.contexts.length === 0) redirect("/no-workspace");
  if (session.contexts.length === 1) redirect(session.contexts[0].route);
  return <LearningStatus title="Choose a workspace" description={`Signed in as ${session.user.email}`}>
    <div className="space-y-3">{session.contexts.map((context) =>
      <form key={context.id} action={chooseContext}>
        <input type="hidden" name="context_id" value={context.id} />
        <button className={styles.choice} type="submit">
          <strong>{context.label}</strong><span>{context.role.replaceAll("_", " ")}</span>
        </button>
      </form>)}</div>
  </LearningStatus>;
}
