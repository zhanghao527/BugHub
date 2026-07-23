"use client";

import type { FormEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { deleteBugAction, type DeleteFormState } from "@/app/admin/actions";

type AdminDeleteButtonProps = {
  id: string;
  expectedUpdatedAt: string;
};

const initialState: DeleteFormState = {};

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button className="admin-button admin-button-danger" type="submit" disabled={pending}>
      {pending ? "正在删除…" : "删除内容"}
    </button>
  );
}

export default function AdminDeleteButton({ id, expectedUpdatedAt }: AdminDeleteButtonProps) {
  const [state, formAction] = useFormState(deleteBugAction, initialState);
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`确定要永久删除 ${id} 吗？此操作不可恢复。`)) event.preventDefault();
  }

  return (
    <form className="admin-delete-form" action={formAction} onSubmit={confirmDelete}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
      {state.globalError && <p className="admin-field-error" role="alert">{state.globalError}</p>}
      <DeleteSubmit />
    </form>
  );
}
