"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginFormState } from "@/app/admin/actions";

type AdminLoginFormProps = {
  next: string;
  configured: boolean;
  missing: string[];
};

const initialState: LoginFormState = {};

function LoginSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="admin-button admin-button-primary admin-login-submit" type="submit" disabled={disabled || pending}>
      {pending ? "正在验证…" : "登录"}
    </button>
  );
}

export default function AdminLoginForm({ next, configured, missing }: AdminLoginFormProps) {
  const [state, formAction] = useFormState(loginAction, initialState);
  return (
    <form className="admin-login-form" action={formAction}>
      <input type="hidden" name="next" value={next} />
      {!configured && (
        <div className="admin-alert admin-alert-warning" role="alert">
          <strong>后台认证尚未配置完整</strong>
          <span>缺少或格式无效：{missing.join("、")}</span>
        </div>
      )}
      {state.globalError && <div className="admin-alert admin-alert-error" role="alert">{state.globalError}</div>}
      <label className="admin-field">
        <span className="admin-label">账号</span>
        <input
          className="admin-input"
          name="username"
          type="text"
          autoComplete="username"
          defaultValue={state.username || ""}
          maxLength={200}
          required
          autoFocus
        />
      </label>
      <label className="admin-field">
        <span className="admin-label">密码</span>
        <input
          className="admin-input"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
      </label>
      <LoginSubmit disabled={!configured} />
    </form>
  );
}
