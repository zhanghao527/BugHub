 import Link from "next/link";
 import { notFound } from "next/navigation";
 import ReactMarkdown from "react-markdown";
 import remarkGfm from "remark-gfm";
 import { getBugBySlug, type BugDetail } from "@/lib/data";
 
 export const revalidate = 300;
 
 export default async function BugDetailPage({ params }: { params: { slug: string } }) {
  let bug: BugDetail | null = null;
  try {
  bug = await getBugBySlug(params.slug);
  } catch {
  bug = null;
  }
  if (!bug) notFound();
  const md = `# ${bug.title}\n\n${bug.body}`;
  const category = bug.categoryPath.join(" / ");
  return (
  <div className="mx-auto max-w-3xl px-5 py-8">
  <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">← 返回题库</Link>
  <div className="rounded-xl border border-gray-200 bg-white p-8">
  <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
  {category ? <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-600">{category}</span> : null}
  {bug.severity ? <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-600">{bug.severity}</span> : null}
  {bug.date ? <span className="ml-auto text-gray-400">收录于 {bug.date}</span> : null}
  </div>
  <div className="doc t8">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
  </div>
  {bug.tags.length > 0 ? (
  <div className="mt-8 flex flex-wrap gap-1.5 border-t border-gray-100 pt-5">
  {bug.tags.map((t) => (<span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">#{t}</span>))}
  </div>
  ) : null}
  </div>
  </div>
  );
 }
 
