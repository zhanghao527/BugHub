 import matter from "gray-matter";
 import fs from "fs";
 import path from "path";
 
 // ===== 配置（均可用环境变量覆盖）=====
 const REPO = process.env.BUGHUB_REPO || "zhanghao527/bughub-content";
 const BRANCH = process.env.BUGHUB_BRANCH || "main";
 const CONTENT_PATH = (process.env.BUGHUB_CONTENT_PATH || "content").replace(/\/+$/, "");
 const TOKEN = process.env.GITHUB_TOKEN || process.env.BUGHUB_GITHUB_TOKEN || "";
 const REVALIDATE = 300;
 
 // ===== 类型 =====
 export type CatalogBug = { slug: string; title: string; severity: string; stage: string };
 export type CatalogL2 = { id: string; name: string; bugs: CatalogBug[] };
 export type CatalogL1 = { id: string; name: string; count: number; directBugs: CatalogBug[]; children: CatalogL2[] };
 export type BugDetail = { slug: string; title: string; severity: string; stage: string; date: string; tags: string[]; body: string; categoryPath: string[] };
 type Fm = { title?: string; severity?: string; stage?: string; date?: unknown; tags?: unknown };
 type Row = { l1: string; l2: string | null; slug: string; title: string; severity: string; stage: string };
 
 // ===== 工具 =====
 function stripOrderPrefix(name: string): string {
  return name.replace(/^\d+\s*[-_.]\s*/, "").trim();
 }
 function normalizeDate(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
 }
 function toTags(v: unknown): string[] {
  return Array.isArray(v) ? v.map((t) => String(t)) : [];
 }
 function classify(rel: string): { l1: string; l2: string | null; slug: string } | null {
  const parts = rel.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const file = parts[parts.length - 1];
  if (!file.endsWith(".md")) return null;
  const slug = file.replace(/\.md$/, "");
  return { l1: parts[0], l2: parts.length >= 3 ? parts[1] : null, slug };
 }
 function buildCatalog(rows: Row[]): CatalogL1[] {
  const sorted = [...rows].sort((a, b) => {
  if (a.l1 !== b.l1) return a.l1 < b.l1 ? -1 : 1;
  const a2 = a.l2 || "";
  const b2 = b.l2 || "";
  if (a2 !== b2) return a2 < b2 ? -1 : 1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
  const l1Map = new Map<string, CatalogL1>();
  const l2Map = new Map<string, CatalogL2>();
  const order: string[] = [];
  for (const r of sorted) {
  let l1 = l1Map.get(r.l1);
  if (!l1) {
  l1 = { id: r.l1, name: stripOrderPrefix(r.l1), count: 0, directBugs: [], children: [] };
  l1Map.set(r.l1, l1);
  order.push(r.l1);
  }
  const bug: CatalogBug = { slug: r.slug, title: r.title, severity: r.severity, stage: r.stage };
  if (r.l2) {
  const key = r.l1 + "/" + r.l2;
  let l2 = l2Map.get(key);
  if (!l2) {
  l2 = { id: key, name: stripOrderPrefix(r.l2), bugs: [] };
  l2Map.set(key, l2);
  l1.children.push(l2);
  }
  l2.bugs.push(bug);
  } else {
  l1.directBugs.push(bug);
  }
  l1.count = l1.count + 1;
  }
  return order.map((k) => l1Map.get(k) as CatalogL1);
 }
 
 // ===== GitHub 数据源 =====
 function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "bughub",
  "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) h.Authorization = "Bearer " + TOKEN;
  return h;
 }
 type TreeItem = { path: string; type: string };
 async function ghCommitSha(): Promise<string> {
  const url = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;
  const res = await fetch(url, { headers: ghHeaders(), next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error("github commits " + res.status);
  const data = await res.json();
  return data.sha as string;
 }
 async function ghTree(commitSha: string): Promise<TreeItem[]> {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${commitSha}?recursive=1`;
  const res = await fetch(url, { headers: ghHeaders(), next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error("github tree " + res.status);
  const data = await res.json();
  return (data.tree as TreeItem[]) || [];
 }
 async function ghRaw(commitSha: string, filePath: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${REPO}/${commitSha}/${filePath}`;
  const res = await fetch(url, { headers: { "User-Agent": "bughub" }, cache: "force-cache" });
  if (!res.ok) throw new Error("github raw " + res.status);
  return res.text();
 }
 function mdItemsOf(tree: TreeItem[]): TreeItem[] {
  const prefix = CONTENT_PATH + "/";
  return tree.filter((t) => t.type === "blob" && t.path.startsWith(prefix) && t.path.endsWith(".md"));
 }
 async function githubCatalog(): Promise<CatalogL1[] | null> {
  try {
  const commitSha = await ghCommitSha();
  const tree = await ghTree(commitSha);
  const items = mdItemsOf(tree);
  const rows: Row[] = [];
  await Promise.all(
  items.map(async (it) => {
  const rel = it.path.slice(CONTENT_PATH.length + 1);
  const cls = classify(rel);
  if (!cls) return;
  const raw = await ghRaw(commitSha, it.path);
  const fm = matter(raw).data as Fm;
  rows.push({ l1: cls.l1, l2: cls.l2, slug: cls.slug, title: fm.title || cls.slug, severity: fm.severity || "", stage: fm.stage || "" });
  })
  );
  return buildCatalog(rows);
  } catch {
  return null;
  }
 }
 async function githubBugBySlug(slug: string): Promise<BugDetail | null> {
  try {
  const commitSha = await ghCommitSha();
  const tree = await ghTree(commitSha);
  const item = mdItemsOf(tree).find((t) => t.path.endsWith("/" + slug + ".md"));
  if (!item) return null;
  const rel = item.path.slice(CONTENT_PATH.length + 1);
  const cls = classify(rel);
  if (!cls) return null;
  const raw = await ghRaw(commitSha, item.path);
  const parsed = matter(raw);
  const fm = parsed.data as Fm;
  const l1Name = stripOrderPrefix(cls.l1);
  const l2Name = cls.l2 ? stripOrderPrefix(cls.l2) : null;
  return {
  slug: cls.slug,
  title: fm.title || cls.slug,
  severity: fm.severity || "",
  stage: fm.stage || "",
  date: normalizeDate(fm.date),
  tags: toTags(fm.tags),
  body: parsed.content.trim(),
  categoryPath: l2Name ? [l1Name, l2Name] : [l1Name],
  };
  } catch {
  return null;
  }
 }
 
 // ===== 本地文件兜底 =====
 function localContentDir(): string {
  const env = process.env.BUGHUB_CONTENT_DIR;
  const candidates: string[] = [];
  if (env) candidates.push(path.resolve(env));
  candidates.push(path.join(process.cwd(), "bughub-content", "content"));
  candidates.push(path.join(process.cwd(), "content"));
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[candidates.length - 1];
 }
 function localWalk(): { root: string; files: string[] } {
  const root = localContentDir();
  const files: string[] = [];
  const walk = (dir: string) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  const full = path.join(dir, e.name);
  if (e.isDirectory()) walk(full);
  else if (e.isFile() && e.name.endsWith(".md")) files.push(full);
  }
  };
  walk(root);
  return { root, files };
 }
 function localCatalog(): CatalogL1[] {
  const { root, files } = localWalk();
  const rows: Row[] = [];
  for (const f of files) {
  const rel = path.relative(root, f).split(path.sep).join("/");
  const cls = classify(rel);
  if (!cls) continue;
  const fm = matter(fs.readFileSync(f, "utf8")).data as Fm;
  rows.push({ l1: cls.l1, l2: cls.l2, slug: cls.slug, title: fm.title || cls.slug, severity: fm.severity || "", stage: fm.stage || "" });
  }
  return buildCatalog(rows);
 }
 function localBugBySlug(slug: string): BugDetail | null {
  const { root, files } = localWalk();
  for (const f of files) {
  const rel = path.relative(root, f).split(path.sep).join("/");
  const cls = classify(rel);
  if (!cls || cls.slug !== slug) continue;
  const parsed = matter(fs.readFileSync(f, "utf8"));
  const fm = parsed.data as Fm;
  const l1Name = stripOrderPrefix(cls.l1);
  const l2Name = cls.l2 ? stripOrderPrefix(cls.l2) : null;
  return { slug: cls.slug, title: fm.title || cls.slug, severity: fm.severity || "", stage: fm.stage || "", date: normalizeDate(fm.date), tags: toTags(fm.tags), body: parsed.content.trim(), categoryPath: l2Name ? [l1Name, l2Name] : [l1Name] };
  }
  return null;
 }
 
 // ===== 对外 API：GitHub 优先，失败回退本地 =====
 export async function getCatalog(): Promise<CatalogL1[]> {
  const gh = await githubCatalog();
  return gh && gh.length > 0 ? gh : localCatalog();
 }
 export async function getBugBySlug(slug: string): Promise<BugDetail | null> {
  const gh = await githubBugBySlug(slug);
  if (gh) return gh;
  return localBugBySlug(slug);
 }
 
