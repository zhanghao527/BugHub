 import { getCatalog } from "@/lib/data";
 import Catalog from "@/components/Catalog";
 
 export const revalidate = 300;
 
 async function load() {
  try {
  return await getCatalog();
  } catch {
  return [];
  }
 }
 
 export default async function HomePage() {
  const catalog = await load();
  const total = catalog.reduce((s, c) => s + c.count, 0);
  return (
  <div className="mx-auto max-w-3xl px-5 py-8">
  <h1 className="text-2xl font-bold text-gray-900">BUG 库</h1>
  <p className="mt-1.5 text-sm text-gray-600">
  记录真实的线上缺陷：现象、根因、复现，以及当初到底该怎么测。
  {total > 0 ? `已收录 ${total} 个，覆盖 ${catalog.length} 个方向。` : ""}
  </p>
  <p className="mb-8 mt-1 text-xs text-gray-500">点击分类展开，点击题目查看详情。</p>
  <Catalog data={catalog} />
  </div>
  );
 }
 
