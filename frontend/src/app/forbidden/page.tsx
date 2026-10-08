import Link from "next/link";
export default function ForbiddenPage() { return <main className="p-8"><h1 className="text-2xl">Access denied</h1><p>This workspace is not available in your active context.</p><Link className="underline" href="/select-context">Choose a workspace</Link></main>; }
