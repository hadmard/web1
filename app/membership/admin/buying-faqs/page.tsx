"use client";

import { FormEvent, useEffect, useState } from "react";

type BuyingFaqRow = {
  id: string;
  question: string;
  answer: string;
  sort: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

const EMPTY_FORM = {
  question: "",
  answer: "",
  sort: "0",
  visible: true,
};

export default function AdminBuyingFaqsPage() {
  const [items, setItems] = useState<BuyingFaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/buying-faqs", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { items?: BuyingFaqRow[]; error?: string };
    if (!res.ok) {
      setItems([]);
      setMessage(data.error ?? "问答列表加载失败");
      setLoading(false);
      return;
    }

    setItems(Array.isArray(data.items) ? data.items : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/admin/buying-faqs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: form.question,
        answer: form.answer,
        sort: Number.parseInt(form.sort || "0", 10) || 0,
        visible: form.visible,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "新增问答失败");
      setSaving(false);
      return;
    }

    setForm(EMPTY_FORM);
    setMessage("问答已新增。");
    setSaving(false);
    await load();
  }

  async function updateItem(id: string, patch: Partial<BuyingFaqRow>, successText: string) {
    setMessage("");
    const res = await fetch(`/api/admin/buying-faqs/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as BuyingFaqRow & { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "保存失败");
      return;
    }

    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, ...data } : item))
        .sort((a, b) => a.sort - b.sort || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    );
    setMessage(successText);
  }

  async function deleteItem(id: string) {
    const confirmed = window.confirm("确定删除这条问答吗？");
    if (!confirmed) return;

    setMessage("");
    const res = await fetch(`/api/admin/buying-faqs/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "删除失败");
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
    setMessage("问答已删除。");
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Buying FAQ</p>
        <h1 className="mt-3 font-serif text-3xl text-primary">整木选购问答</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          管理 `/brands/buying` 页面的问答内容。管理员只需要新增问答，前台会按排序自动输出并生成 FAQ Schema。
        </p>
        {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      </header>

      <section className="rounded-[24px] border border-[rgba(181,157,121,0.16)] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 lg:grid-cols-[1fr,160px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">问题</label>
              <input
                value={form.question}
                onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                className="h-12 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary"
                placeholder="例如：整木定制预算应该怎么预留？"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">排序</label>
              <input
                value={form.sort}
                onChange={(event) => setForm((prev) => ({ ...prev, sort: event.target.value.replace(/[^0-9-]/g, "") }))}
                className="h-12 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-primary">答案</label>
            <textarea
              value={form.answer}
              onChange={(event) => setForm((prev) => ({ ...prev, answer: event.target.value }))}
              className="min-h-[140px] w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm leading-7 text-primary"
              placeholder="填写前台展示的正文内容。"
            />
          </div>

          <label className="inline-flex items-center gap-3 text-sm text-primary">
            <input
              type="checkbox"
              checked={form.visible}
              onChange={(event) => setForm((prev) => ({ ...prev, visible: event.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            新增后立即前台显示
          </label>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "保存中..." : "新增问答"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-muted">
          当前问答
        </div>

        {loading ? (
          <div className="p-8 text-sm text-muted">加载问答中...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-muted">还没有问答内容，先新增第一条吧。</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <article key={item.id} className="space-y-4 px-5 py-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px_120px]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-primary">问题</label>
                    <input
                      defaultValue={item.question}
                      onBlur={(event) => {
                        const nextValue = event.target.value.trim();
                        if (nextValue && nextValue !== item.question) {
                          void updateItem(item.id, { question: nextValue }, "问题已更新。");
                        } else {
                          event.target.value = item.question;
                        }
                      }}
                      className="h-12 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-primary">排序</label>
                    <input
                      defaultValue={String(item.sort)}
                      onBlur={(event) => {
                        const nextValue = Number.parseInt(event.target.value || "0", 10);
                        if (!Number.isNaN(nextValue) && nextValue !== item.sort) {
                          void updateItem(item.id, { sort: nextValue }, "排序已更新。");
                        } else {
                          event.target.value = String(item.sort);
                        }
                      }}
                      className="h-12 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-primary">前台显示</label>
                    <button
                      type="button"
                      onClick={() => void updateItem(item.id, { visible: !item.visible }, item.visible ? "已隐藏该问答。" : "已显示该问答。")}
                      className={`h-12 w-full rounded-[16px] px-4 text-sm transition ${
                        item.visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.visible ? "显示中" : "已隐藏"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-primary">答案</label>
                  <textarea
                    defaultValue={item.answer}
                    onBlur={(event) => {
                      const nextValue = event.target.value.trim();
                      if (nextValue && nextValue !== item.answer) {
                        void updateItem(item.id, { answer: nextValue }, "答案已更新。");
                      } else {
                        event.target.value = item.answer;
                      }
                    }}
                    className="min-h-[120px] w-full rounded-[16px] border border-border bg-surface px-4 py-3 text-sm leading-7 text-primary"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    更新时间：{new Date(item.updatedAt).toLocaleString("zh-CN")}
                  </p>
                  <button
                    type="button"
                    onClick={() => void deleteItem(item.id)}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
