import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import AdminBugForm from "@/components/admin/AdminBugForm";
import AdminDeleteButton from "@/components/admin/AdminDeleteButton";
import { getAdminBugById } from "@/lib/admin-data";
import { adminHref } from "@/lib/admin-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EditAdminBugPageProps = { params: { id: string } };

function publicBugUrl(id: string): string {
  const fallback = "https://bughub.vip";
  const configured = process.env.PUBLIC_SITE_URL?.trim() || fallback;
  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return `${fallback}/bug/${encodeURIComponent(id)}`;
    return `${parsed.origin}/bug/${encodeURIComponent(id)}`;
  } catch {
    return `${fallback}/bug/${encodeURIComponent(id)}`;
  }
}

export default function EditAdminBugPage({ params }: EditAdminBugPageProps) {
  noStore();
  const id = params.id.toUpperCase();
  const bug = getAdminBugById(id);
  if (!bug) notFound();

  return (
    <div className="admin-page">
      <div className="admin-page-heading admin-page-heading-with-actions">
        <div>
          <Link className="admin-back-link" href={adminHref("/")}>← 返回内容列表</Link>
          <h1>编辑 {bug.id}</h1>
          <p>最后更新：{bug.updatedAt}</p>
        </div>
        <a className="admin-button admin-button-secondary" href={publicBugUrl(bug.id)} target="_blank" rel="noopener noreferrer">预览公开页面 ↗</a>
      </div>
      <AdminBugForm mode="edit" id={bug.id} initialTitle={bug.title} initialMarkdown={bug.bodyMarkdown} expectedUpdatedAt={bug.updatedAt} />
      <section className="admin-danger-zone">
        <div>
          <h2>删除内容</h2>
          <p>删除后无法恢复，公开页面也会立即失效。</p>
        </div>
        <AdminDeleteButton id={bug.id} expectedUpdatedAt={bug.updatedAt} />
      </section>
    </div>
  );
}
