import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { getDatabase, type BugRow, type BugSeverity, type BugSource, type BugStatus } from "@/lib/database";

export const ADMIN_PAGE_SIZE = 20;

export type AdminBug = {
  id: string;
  slug: string;
  title: string;
  severity: BugSeverity;
  stage: string;
  date: string;
  status: BugStatus;
  domains: string[];
  patterns: string[];
  impact: string;
  source: BugSource;
  takeaway: string;
  categoryId: string;
  subcategoryId: string;
  sortOrder: number;
  bodyMarkdown: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminBugListItem = { id: string; slug: string; title: string; updatedAt: string };

export type AdminBugListResult = {
  items: AdminBugListItem[];
  total: number;
  page: number;
  totalPages: number;
};

export type AdminListFilters = { q?: string; page?: number };

export type AdminSimpleFormValues = { title: string; bodyMarkdown: string };
export type AdminSimpleFieldErrors = Partial<Record<"title" | "bodyMarkdown", string>>;
export type AdminSimpleFormState = {
  values?: AdminSimpleFormValues;
  fieldErrors?: AdminSimpleFieldErrors;
  globalError?: string;
};
export type AdminSimpleMutationResult =
  | { ok: true; id: string; slug: string; previousSlug?: string }
  | { ok: false; state: AdminSimpleFormState };

export type AdminDeleteResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string };

function parseJsonStrings(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function rowToAdminBug(row: BugRow): AdminBug {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    severity: row.severity,
    stage: row.stage,
    date: row.date,
    status: row.status,
    domains: parseJsonStrings(row.domains_json),
    patterns: parseJsonStrings(row.patterns_json),
    impact: row.impact,
    source: row.source,
    takeaway: row.takeaway,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    sortOrder: row.sort_order,
    bodyMarkdown: row.body_markdown,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAdminBugList(filters: AdminListFilters): AdminBugListResult {
  noStore();
  const clauses: string[] = [];
  const parameters: Array<string | number> = [];
  const q = filters.q?.trim().slice(0, 200) || "";
  if (q) {
    clauses.push("instr(lower(b.id || char(10) || b.title || char(10) || b.slug || char(10) || b.body_markdown), lower(?)) > 0");
    parameters.push(q);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const count = getDatabase().prepare(`SELECT COUNT(*) AS count FROM bugs b ${where}`).get(...parameters) as { count: number };
  const totalPages = Math.max(1, Math.ceil(count.count / ADMIN_PAGE_SIZE));
  const requestedPage = Number.isInteger(filters.page) ? Number(filters.page) : 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (page - 1) * ADMIN_PAGE_SIZE;
  const rows = getDatabase().prepare(`
    SELECT b.id, b.slug, b.title, b.updated_at
    FROM bugs b
    ${where}
    ORDER BY b.updated_at DESC, b.id ASC
    LIMIT ? OFFSET ?
  `).all(...parameters, ADMIN_PAGE_SIZE, offset) as Array<{ id: string; slug: string; title: string; updated_at: string }>;
  return {
    items: rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title, updatedAt: row.updated_at })),
    total: count.count,
    page,
    totalPages,
  };
}

export function getAdminBugById(id: string): AdminBug | null {
  noStore();
  const row = getDatabase().prepare("SELECT * FROM bugs WHERE id = ?").get(id) as BugRow | undefined;
  return row ? rowToAdminBug(row) : null;
}

export function getNextBugId(): string {
  noStore();
  const rows = getDatabase().prepare("SELECT id FROM bugs").all() as Array<{ id: string }>;
  let max = 0;
  for (const row of rows) {
    const match = /^BH-(\d{4})$/.exec(row.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  const next = max + 1;
  if (next > 9999) throw new Error("内容 ID 已用尽");
  return `BH-${String(next).padStart(4, "0")}`;
}

const DEFAULT_CATEGORY_ID = "uncategorized";
const DEFAULT_SUBCATEGORY_ID = "uncategorized-default";

function ensureDefaultCategory(): { categoryId: string; subcategoryId: string } {
  const db = getDatabase();
  const run = db.transaction(() => {
    const category = db.prepare("SELECT id FROM categories WHERE id = ?").get(DEFAULT_CATEGORY_ID) as { id: string } | undefined;
    if (!category) {
      const max = (db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS value FROM categories").get() as { value: number }).value;
      db.prepare("INSERT INTO categories (id, name, description, sort_order) VALUES (?, ?, ?, ?)")
        .run(DEFAULT_CATEGORY_ID, "未分类", "未归类的内容", max + 1);
    }
    const subcategory = db.prepare("SELECT id FROM subcategories WHERE id = ?").get(DEFAULT_SUBCATEGORY_ID) as { id: string } | undefined;
    if (!subcategory) {
      const max = (db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS value FROM subcategories WHERE category_id = ?").get(DEFAULT_CATEGORY_ID) as { value: number }).value;
      db.prepare("INSERT INTO subcategories (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)")
        .run(DEFAULT_SUBCATEGORY_ID, DEFAULT_CATEGORY_ID, "未分类", max + 1);
    }
  });
  run();
  return { categoryId: DEFAULT_CATEGORY_ID, subcategoryId: DEFAULT_SUBCATEGORY_ID };
}

declare global {
  // eslint-disable-next-line no-var
  var __bughubAdminLastTimestampMicros: number | undefined;
}

function preciseUtcNow(): string {
  let micros = Date.now() * 1000 + Number(process.hrtime.bigint() % BigInt(1000));
  if (globalThis.__bughubAdminLastTimestampMicros !== undefined
      && micros <= globalThis.__bughubAdminLastTimestampMicros) {
    micros = globalThis.__bughubAdminLastTimestampMicros + 1;
  }
  globalThis.__bughubAdminLastTimestampMicros = micros;
  const milliseconds = Math.floor(micros / 1000);
  const microRemainder = String(micros % 1000).padStart(3, "0");
  return `${new Date(milliseconds).toISOString().slice(0, -1)}${microRemainder}Z`;
}

function sqliteError(error: unknown): { code: string; message: string } | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; message?: unknown };
  return typeof candidate.code === "string" && typeof candidate.message === "string"
    ? { code: candidate.code, message: candidate.message }
    : null;
}

function validateSimple(input: AdminSimpleFormValues): { ok: true; title: string; bodyMarkdown: string } | { ok: false; state: AdminSimpleFormState } {
  const title = input.title.trim();
  const bodyMarkdown = input.bodyMarkdown.trim();
  const fieldErrors: AdminSimpleFieldErrors = {};
  if (!title) fieldErrors.title = "请输入标题";
  else if (title.length > 200) fieldErrors.title = "标题不能超过 200 个字符";
  if (!bodyMarkdown) fieldErrors.bodyMarkdown = "请输入 Markdown 正文";
  else if (bodyMarkdown.length > 200000) fieldErrors.bodyMarkdown = "Markdown 正文不能超过 200000 个字符";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, state: { values: { title, bodyMarkdown }, fieldErrors, globalError: "请检查标记的字段" } };
  }
  return { ok: true, title, bodyMarkdown };
}

function simpleMutationError(error: unknown, values: AdminSimpleFormValues): AdminSimpleMutationResult {
  const details = sqliteError(error);
  if (details?.code.startsWith("SQLITE_CONSTRAINT")) {
    if (details.message.includes("bugs.title")) {
      return { ok: false, state: { values, fieldErrors: { title: "该标题已存在，请换一个" }, globalError: "保存失败，请修正标记的字段" } };
    }
    return { ok: false, state: { values, globalError: "保存失败，数据不符合约束" } };
  }
  return { ok: false, state: { values, globalError: "保存失败，请稍后重试" } };
}

export function createSimpleBug(input: AdminSimpleFormValues): AdminSimpleMutationResult {
  noStore();
  const validation = validateSimple(input);
  if (!validation.ok) return validation;
  const { categoryId, subcategoryId } = ensureDefaultCategory();
  const id = getNextBugId();
  const slug = id;
  const timestamp = preciseUtcNow();
  const date = new Date().toISOString().slice(0, 10);
  try {
    getDatabase().prepare(`
      INSERT INTO bugs (
        id, slug, title, severity, stage, date, status, domains_json, patterns_json, impact, source,
        takeaway, body_markdown, category_id, subcategory_id, sort_order, created_at, updated_at
      ) VALUES (
        @id, @slug, @title, 'P2', '', @date, 'published', '[]', '[]', '', 'scenario-reconstruction',
        '', @bodyMarkdown, @categoryId, @subcategoryId, 0, @timestamp, @timestamp
      )
    `).run({ id, slug, title: validation.title, date, bodyMarkdown: validation.bodyMarkdown, categoryId, subcategoryId, timestamp });
    return { ok: true, id, slug };
  } catch (error) {
    return simpleMutationError(error, { title: validation.title, bodyMarkdown: validation.bodyMarkdown });
  }
}

export function updateSimpleBug(originalId: string, input: AdminSimpleFormValues, expectedUpdatedAt: string): AdminSimpleMutationResult {
  noStore();
  const validation = validateSimple(input);
  if (!validation.ok) return validation;
  const values: AdminSimpleFormValues = { title: validation.title, bodyMarkdown: validation.bodyMarkdown };
  const existing = getAdminBugById(originalId);
  if (!existing) return { ok: false, state: { values, globalError: "内容不存在或已被删除" } };
  if (!expectedUpdatedAt || existing.updatedAt !== expectedUpdatedAt) {
    return { ok: false, state: { values, globalError: "内容已被其他操作更新，请刷新后重试" } };
  }
  const timestamp = preciseUtcNow();
  try {
    const result = getDatabase().prepare(`
      UPDATE bugs SET title = @title, body_markdown = @bodyMarkdown, updated_at = @timestamp
      WHERE id = @id AND updated_at = @expectedUpdatedAt
    `).run({ id: originalId, title: validation.title, bodyMarkdown: validation.bodyMarkdown, timestamp, expectedUpdatedAt });
    if (result.changes !== 1) return { ok: false, state: { values, globalError: "内容已被其他操作更新，请刷新后重试" } };
    return { ok: true, id: originalId, slug: existing.slug, previousSlug: existing.slug };
  } catch (error) {
    return simpleMutationError(error, values);
  }
}

export function deleteAdminBug(id: string, expectedUpdatedAt: string): AdminDeleteResult {
  noStore();
  if (!/^BH-\d{4}$/.test(id) || !expectedUpdatedAt) return { ok: false, error: "删除参数无效" };
  const existing = getAdminBugById(id);
  if (!existing) return { ok: false, error: "内容不存在或已被删除" };
  if (existing.updatedAt !== expectedUpdatedAt) {
    return { ok: false, error: "内容已被其他操作更新，请刷新后重试" };
  }
  try {
    const result = getDatabase().prepare("DELETE FROM bugs WHERE id = ? AND updated_at = ?").run(id, expectedUpdatedAt);
    if (result.changes !== 1) return { ok: false, error: "内容已被其他操作更新，请刷新后重试" };
    return { ok: true, id, slug: existing.slug };
  } catch {
    return { ok: false, error: "删除失败，请稍后重试" };
  }
}
