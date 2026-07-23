"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientIp, loginAdmin, logoutAdmin, requireAdmin } from "@/lib/admin-auth";
import { createSimpleBug, deleteAdminBug, updateSimpleBug, type AdminSimpleFormState } from "@/lib/admin-data";
import { adminHref, safeAdminNextPath } from "@/lib/admin-routing";

export type LoginFormState = {
  globalError?: string;
  username?: string;
};

export type DeleteFormState = {
  globalError?: string;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateContent(id: string, slug: string, previousSlug?: string): void {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/bug/${encodeURIComponent(id)}`);
  revalidatePath(`/bug/${encodeURIComponent(slug)}`);
  if (previousSlug && previousSlug !== slug) revalidatePath(`/bug/${encodeURIComponent(previousSlug)}`);
}

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const username = formString(formData, "username").trim().slice(0, 200);
  const password = formString(formData, "password");
  const next = safeAdminNextPath(formString(formData, "next"));
  if (!username || !password || password.length > 1024) {
    return { username, globalError: "账号或密码错误，请重试" };
  }

  const result = await loginAdmin(username, password, getClientIp());
  if (!result.ok) {
    if (result.reason === "not-configured") {
      return { username, globalError: "后台认证配置不完整，请联系管理员" };
    }
    if (result.reason === "rate-limited") {
      return { username, globalError: "登录尝试次数过多，请稍后再试" };
    }
    return { username, globalError: "账号或密码错误，请重试" };
  }
  redirect(adminHref(next));
}

export async function logoutAction(): Promise<never> {
  await requireAdmin();
  logoutAdmin();
  redirect(adminHref("/login?loggedOut=1"));
}

export async function createBugAction(
  _previousState: AdminSimpleFormState,
  formData: FormData,
): Promise<AdminSimpleFormState> {
  await requireAdmin();
  const result = createSimpleBug({
    title: formString(formData, "title"),
    bodyMarkdown: formString(formData, "bodyMarkdown"),
  });
  if (!result.ok) return result.state;
  revalidateContent(result.id, result.slug);
  redirect(adminHref("/?success=created"));
}

export async function updateBugAction(
  _previousState: AdminSimpleFormState,
  formData: FormData,
): Promise<AdminSimpleFormState> {
  await requireAdmin();
  const result = updateSimpleBug(
    formString(formData, "originalId"),
    { title: formString(formData, "title"), bodyMarkdown: formString(formData, "bodyMarkdown") },
    formString(formData, "expectedUpdatedAt"),
  );
  if (!result.ok) return result.state;
  revalidateContent(result.id, result.slug, result.previousSlug);
  redirect(adminHref("/?success=updated"));
}

export async function deleteBugAction(
  _previousState: DeleteFormState,
  formData: FormData,
): Promise<DeleteFormState> {
  await requireAdmin();
  const result = deleteAdminBug(
    formString(formData, "id"),
    formString(formData, "expectedUpdatedAt"),
  );
  if (!result.ok) return { globalError: result.error };
  revalidateContent(result.id, result.slug);
  redirect(adminHref("/?success=deleted"));
}
