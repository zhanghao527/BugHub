"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createBugAction, updateBugAction } from "@/app/admin/actions";
import type { AdminSimpleFormState } from "@/lib/admin-data";

const MarkdownEditor = dynamic(() => import("@/components/admin/MarkdownEditor"), {
  ssr: false,
  loading: () => <div className="admin-editor-loading">编辑器加载中…</div>,
});

const MARKDOWN_TEMPLATE = `## 现象

（描述问题的具体表现）

## 原因

（分析根本原因）

## 解决方案

（如何修复或规避）

## 测试要点

- （需要重点验证的点）
`;

type AdminBugFormProps = {
  mode: "create" | "edit";
  id?: string;
  initialTitle: string;
  initialMarkdown: string;
  expectedUpdatedAt?: string;
};

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button className="admin-button admin-button-primary" type="submit" disabled={pending}>
      {pending ? "正在保存…" : mode === "create" ? "创建并发布" : "保存修改"}
    </button>
  );
}

export default function AdminBugForm({ mode, id, initialTitle, initialMarkdown, expectedUpdatedAt }: AdminBugFormProps) {
  const action = mode === "create" ? createBugAction : updateBugAction;
  const initialState: AdminSimpleFormState = { values: { title: initialTitle, bodyMarkdown: initialMarkdown } };
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values || { title: initialTitle, bodyMarkdown: initialMarkdown };
  const errors = state.fieldErrors || {};
  const [title, setTitle] = useState(values.title);
  const [body, setBody] = useState(values.bodyMarkdown);

  function insertTemplate() {
    if (body.trim() && !window.confirm("正文已有内容，确定用模板覆盖吗？")) return;
    setBody(MARKDOWN_TEMPLATE);
  }

  return (
    <form className="admin-editor-form" action={formAction} noValidate>
      {mode === "edit" && (
        <>
          <input type="hidden" name="originalId" value={id || ""} />
          <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt || ""} />
        </>
      )}
      <input type="hidden" name="bodyMarkdown" value={body} />
      {state.globalError && <div className="admin-alert admin-alert-error" role="alert">{state.globalError}</div>}

      <label className="admin-field">
        <span className="admin-label">标题</span>
        <input
          className="admin-input"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="给这条内容起个标题"
          aria-invalid={Boolean(errors.title)}
          required
          autoFocus
        />
        {errors.title && <span className="admin-field-error">{errors.title}</span>}
      </label>

      <section className="admin-markdown-section">
        <div className="admin-section-heading">
          <div>
            <h2>Markdown 正文</h2>
            <p>支持 GFM，工具栏可插入标题、代码、表格等；原始 HTML 会被安全过滤。</p>
          </div>
          <div className="admin-editor-tools">
            <span className="admin-character-count">{body.length.toLocaleString("zh-CN")} 字</span>
            <button type="button" className="admin-button admin-button-secondary" onClick={insertTemplate}>插入模板</button>
          </div>
        </div>
        {errors.bodyMarkdown && <span className="admin-field-error">{errors.bodyMarkdown}</span>}
        <div className="admin-bytemd">
          <MarkdownEditor
            value={body}
            onChange={setBody}
            placeholder="在此输入 Markdown，或点击右上角“插入模板”"
          />
        </div>
      </section>

      <div className="admin-form-actions">
        <SaveButton mode={mode} />
        <span className="admin-form-hint">ID 将自动分配，公开页面按此 Markdown 渲染</span>
      </div>
    </form>
  );
}
