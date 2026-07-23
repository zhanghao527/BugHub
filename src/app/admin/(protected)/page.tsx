import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { getAdminBugList, type AdminListFilters } from "@/lib/admin-data";
import { adminHref } from "@/lib/admin-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminHomePageProps = {
  searchParams: { q?: string | string[]; page?: string | string[]; success?: string | string[] };
};

function searchValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) || "";
}

function positivePage(value: string): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function listHref(q: string, page: number): string {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (page > 1) query.set("page", String(page));
  const serialized = query.toString();
  return adminHref(serialized ? `/?${serialized}` : "/");
}

function formatUpdatedAt(value: string): string {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

const successMessages: Record<string, string> = { created: "内容已创建", updated: "内容已保存", deleted: "内容已删除" };

export default function AdminHomePage({ searchParams }: AdminHomePageProps) {
  noStore();
  const q = searchValue(searchParams.q).trim().slice(0, 200);
  const filters: AdminListFilters = { q, page: positivePage(searchValue(searchParams.page)) };
  const result = getAdminBugList(filters);
  const success = successMessages[searchValue(searchParams.success)];
  const newHref = adminHref("/bugs/new");

  return (
    <div className="admin-page">
      <div className="admin-page-heading admin-page-heading-with-actions">
        <div>
          <h1>内容管理</h1>
          <p>管理公开知识库的 Markdown 内容。</p>
        </div>
        <Link className="admin-button admin-button-primary" href={newHref}>＋ 新建内容</Link>
      </div>

      {success && <div className="admin-alert admin-alert-success" role="status">{success}</div>}

      <section className="admin-content-panel">
        <form className="admin-filters admin-filters-simple" method="get" action={adminHref("/")}>
          <label className="admin-search-field">
            <span className="admin-visually-hidden">搜索内容</span>
            <input className="admin-input" type="search" name="q" defaultValue={q} maxLength={200} placeholder="搜索标题、ID 或正文" />
          </label>
          <button className="admin-button admin-button-secondary" type="submit">搜索</button>
          {q && <Link className="admin-clear-filter" href={adminHref("/")}>清除</Link>}
        </form>

        <div className="admin-list-summary">
          <span>共 {result.total} 条内容</span>
          {result.total > 0 && <span>第 {result.page} / {result.totalPages} 页</span>}
        </div>

        {result.items.length === 0 ? (
          <div className="admin-empty-state">
            <strong>没有内容</strong>
            <p>{q ? "换个关键词试试。" : "点击“新建内容”开始。"}</p>
            {!q && <Link href={newHref}>新建内容</Link>}
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>ID</th><th>标题</th><th>更新时间</th><th><span className="admin-visually-hidden">操作</span></th></tr></thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.id}>
                      <td><span className="admin-id">{item.id}</span></td>
                      <td><strong className="admin-row-title">{item.title}</strong></td>
                      <td><time dateTime={item.updatedAt}>{formatUpdatedAt(item.updatedAt)}</time></td>
                      <td><Link className="admin-edit-link" href={adminHref(`/bugs/${encodeURIComponent(item.id)}/edit`)}>编辑</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-mobile-list">
              {result.items.map((item) => (
                <article className="admin-mobile-card" key={item.id}>
                  <div className="admin-mobile-card-top">
                    <span className="admin-id">{item.id}</span>
                    <Link className="admin-edit-link" href={adminHref(`/bugs/${encodeURIComponent(item.id)}/edit`)}>编辑</Link>
                  </div>
                  <h2>{item.title}</h2>
                  <div className="admin-mobile-card-meta"><time dateTime={item.updatedAt}>{formatUpdatedAt(item.updatedAt)}</time></div>
                </article>
              ))}
            </div>
          </>
        )}

        {result.totalPages > 1 && (
          <nav className="admin-pagination" aria-label="内容分页">
            {result.page > 1 ? <Link href={listHref(q, result.page - 1)}>← 上一页</Link> : <span className="admin-pagination-disabled">← 上一页</span>}
            <span>{result.page} / {result.totalPages}</span>
            {result.page < result.totalPages ? <Link href={listHref(q, result.page + 1)}>下一页 →</Link> : <span className="admin-pagination-disabled">下一页 →</span>}
          </nav>
        )}
      </section>
    </div>
  );
}
