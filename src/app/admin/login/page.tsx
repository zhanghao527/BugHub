import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getAdminConfigurationStatus, optionalAdminSession } from "@/lib/admin-auth";
import { adminHref, safeAdminNextPath } from "@/lib/admin-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LoginPageProps = {
  searchParams: { next?: string | string[]; loggedOut?: string | string[] };
};

function searchValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  noStore();
  if (await optionalAdminSession()) redirect(adminHref("/"));
  const configuration = getAdminConfigurationStatus();
  const next = safeAdminNextPath(searchValue(searchParams.next));
  const loggedOut = searchValue(searchParams.loggedOut) === "1";

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand" aria-label="BugHub 管理后台">
          <span className="admin-brand-mark">BH</span>
          <div>
            <strong>BugHub</strong>
            <span>内容管理后台</span>
          </div>
        </div>
        <div className="admin-login-copy">
          <h1>管理员登录</h1>
          <p>登录后可创建、编辑和发布 Markdown 内容。</p>
        </div>
        {loggedOut && <div className="admin-alert admin-alert-success">已安全退出</div>}
        <AdminLoginForm next={next} configured={configuration.configured} missing={configuration.missing} />
      </div>
    </main>
  );
}
