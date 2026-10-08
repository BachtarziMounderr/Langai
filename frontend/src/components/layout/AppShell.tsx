import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";
import type { BrowserSession, WorkspaceContext } from "@/lib/auth/server";

type Props = {
  title: string;
  navigation: string[];
  session: BrowserSession;
  context: WorkspaceContext;
  children: React.ReactNode;
};

export function AppShell({ title, navigation, session, context, children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="border-b border-slate-200 bg-white p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <strong className="text-lg">Lingua AI</strong>
        <p className="mt-4 text-sm font-medium">{title}</p>
        <nav aria-label={`${title} navigation`} className="mt-5 flex flex-wrap gap-3 text-sm md:flex-col">
          {navigation.map((item, index) => index === 0
            ? <Link key={item} href={context.route} className="font-semibold underline">{item}</Link>
            : <span key={item} className="text-slate-500">{item}</span>)}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-5">
          <div>
            <p className="text-sm text-slate-500">Current workspace</p>
            <p className="font-medium">{context.label} — {context.role.replaceAll("_", " ")}</p>
            {session.contexts.length > 1 && <Link className="text-sm underline" href="/select-context">Switch context</Link>}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>{session.user.email}</span>
            <LogoutButton />
          </div>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
