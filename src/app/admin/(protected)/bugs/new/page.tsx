import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import AdminBugForm from "@/components/admin/AdminBugForm";
import { adminHref } from "@/lib/admin-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewAdminBugPage() {
  noStore();
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <Link className="admin-back-link" href={adminHref("/")}>← 返回内容列表</Link>
        <h1>新建内容</h1>
        <p>只需填写标题和 Markdown 正文，ID 自动生成，保存后立即公开。</p>
      </div>
      <AdminBugForm mode="create" initialTitle="" initialMarkdown="" />
    </div>
  );
}
