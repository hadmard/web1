"use client";

import {
  DataStructuredData,
  createDefaultDataStructuredData,
  normalizeDataStructuredData,
} from "@/lib/data-structured";

type Props = {
  value: DataStructuredData;
  onChange: (next: DataStructuredData) => void;
};

export function DataStructuredEditor({ value, onChange }: Props) {
  const data = normalizeDataStructuredData(value);

  function setField<K extends keyof DataStructuredData>(k: K, v: DataStructuredData[K]) {
    onChange({ ...data, [k]: v });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
      <p className="text-xs text-muted">
        数据栏目建议使用短句与数字，重点写清“口径、样本、方法、指标”。
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          placeholder="统计周期，如：2026Q1"
          value={data.reportPeriod}
          onChange={(e) => setField("reportPeriod", e.target.value)}
        />
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          placeholder="数据来源机构"
          value={data.sourceOrg}
          onChange={(e) => setField("sourceOrg", e.target.value)}
        />
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          placeholder="样本范围，如：320家企业"
          value={data.sampleRange}
          onChange={(e) => setField("sampleRange", e.target.value)}
        />
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          placeholder="更新频率，如：月度"
          value={data.updateCycle}
          onChange={(e) => setField("updateCycle", e.target.value)}
        />
      </div>
      <textarea
        className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[72px]"
        placeholder="统计口径 / 方法说明"
        value={data.methodology}
        onChange={(e) => setField("methodology", e.target.value)}
      />
      <div className="space-y-2">
        <p className="text-xs text-muted">关键指标</p>
        {data.metrics.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_1fr] gap-2">
            <input
              className="border border-border rounded px-3 py-2 bg-surface"
              value={m.name}
              onChange={(e) =>
                setField(
                  "metrics",
                  data.metrics.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x))
                )
              }
              placeholder="指标名"
            />
            <input
              className="border border-border rounded px-3 py-2 bg-surface"
              value={m.value}
              onChange={(e) =>
                setField(
                  "metrics",
                  data.metrics.map((x) => (x.id === m.id ? { ...x, value: e.target.value } : x))
                )
              }
              placeholder="指标值"
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted">分析模块</p>
        {data.sections.map((s) => (
          <div key={s.id} className="rounded-md border border-border p-3 bg-surface-elevated">
            <input
              className="w-full border border-border rounded px-3 py-2 bg-surface mb-2"
              value={s.title}
              onChange={(e) =>
                setField(
                  "sections",
                  data.sections.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x))
                )
              }
              placeholder="模块标题"
            />
            <textarea
              className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[80px]"
              value={s.body}
              onChange={(e) =>
                setField(
                  "sections",
                  data.sections.map((x) => (x.id === s.id ? { ...x, body: e.target.value } : x))
                )
              }
              placeholder="模块内容"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setField("sections", [...data.sections, { id: `s-${Date.now()}`, title: "新增模块", body: "" }])
          }
          className="text-xs px-3 py-2 rounded border border-border hover:bg-surface"
        >
          添加模块
        </button>
        <button
          type="button"
          onClick={() => onChange(createDefaultDataStructuredData())}
          className="text-xs px-3 py-2 rounded border border-border hover:bg-surface ml-2"
        >
          恢复模板
        </button>
      </div>
    </div>
  );
}
