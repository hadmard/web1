"use client";

import {
  AwardStructuredData,
  createDefaultAwardStructuredData,
  normalizeAwardStructuredData,
} from "@/lib/award-structured";

type Props = { value: AwardStructuredData; onChange: (next: AwardStructuredData) => void };

export function AwardStructuredEditor({ value, onChange }: Props) {
  const data = normalizeAwardStructuredData(value);

  function setField<K extends keyof AwardStructuredData>(k: K, v: AwardStructuredData[K]) {
    onChange({ ...data, [k]: v });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
      <p className="text-xs text-muted">评选栏目强调“规则透明、流程清晰、结果可追溯”。</p>
      <div className="grid md:grid-cols-2 gap-3">
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          placeholder="主办单位"
          value={data.organizer}
          onChange={(e) => setField("organizer", e.target.value)}
        />
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          placeholder="评选年度，如：2026"
          value={data.year}
          onChange={(e) => setField("year", e.target.value)}
        />
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          placeholder="参评对象范围"
          value={data.candidateScope}
          onChange={(e) => setField("candidateScope", e.target.value)}
        />
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          placeholder="申报时间窗口"
          value={data.applyWindow}
          onChange={(e) => setField("applyWindow", e.target.value)}
        />
      </div>
      <textarea
        className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[80px]"
        placeholder="评选标准（尽量条目化）"
        value={data.criteria}
        onChange={(e) => setField("criteria", e.target.value)}
      />
      <div className="grid md:grid-cols-2 gap-3">
        <textarea
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[72px]"
          placeholder="评审机制（评委、投票、权重等）"
          value={data.reviewMechanism}
          onChange={(e) => setField("reviewMechanism", e.target.value)}
        />
        <textarea
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[72px]"
          placeholder="结果发布规则（公示、复核、发布形式）"
          value={data.publishRule}
          onChange={(e) => setField("publishRule", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted">流程步骤</p>
        {data.steps.map((s) => (
          <div key={s.id} className="rounded-md border border-border p-3 bg-surface-elevated">
            <input
              className="w-full border border-border rounded px-3 py-2 bg-surface mb-2"
              value={s.title}
              onChange={(e) =>
                setField("steps", data.steps.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))
              }
              placeholder="步骤标题"
            />
            <textarea
              className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[72px]"
              value={s.body}
              onChange={(e) =>
                setField("steps", data.steps.map((x) => (x.id === s.id ? { ...x, body: e.target.value } : x)))
              }
              placeholder="步骤说明"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setField("steps", [...data.steps, { id: `p-${Date.now()}`, title: "新增步骤", body: "" }])}
          className="text-xs px-3 py-2 rounded border border-border hover:bg-surface"
        >
          添加步骤
        </button>
        <button
          type="button"
          onClick={() => onChange(createDefaultAwardStructuredData())}
          className="text-xs px-3 py-2 rounded border border-border hover:bg-surface ml-2"
        >
          恢复模板
        </button>
      </div>
    </div>
  );
}
