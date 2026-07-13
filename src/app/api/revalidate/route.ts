 import { revalidatePath } from "next/cache";
 import { NextRequest, NextResponse } from "next/server";
 
 // GitHub webhook 或手动触发：即时刷新站点内容缓存。
 // 若设置了 REVALIDATE_SECRET，则请求需带 ?secret=xxx。
 export const dynamic = "force-dynamic";
 
 async function handle(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (secret) {
  const got = req.nextUrl.searchParams.get("secret");
  if (got !== secret) {
  return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 401 });
  }
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, revalidated: true, now: Date.now() });
 }
 
 export async function POST(req: NextRequest) {
  return handle(req);
 }
 export async function GET(req: NextRequest) {
  return handle(req);
 }
 
