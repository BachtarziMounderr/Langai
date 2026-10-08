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
  return <main className="mx-auto max-w-xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Choose a workspace</h1>
    <p>Signed in as {session.user.email}</p>
    <div className="space-y-3">{session.contexts.map((context) =>
      <form key={context.id} action={chooseContext}>
        <input type="hidden" name="context_id" value={context.id} />
        <button className="w-full rounded border bg-white p-4 text-left hover:bg-slate-50" type="submit">
          <strong>{context.label}</strong><span className="ml-3">{context.role.replaceAll("_", " ")}</span>
        </button>
      </form>)}</div>
  </main>;
}
