"use client";

import {
  DEFAULT_STANDARD_SECTION_TEMPLATES,
  StandardStructuredData,
  normalizeStandardStructuredData,
} from "@/lib/standard-structured";

type StandardStructuredEditorProps = {
  value: StandardStructuredData;
  onChange: (next: StandardStructuredData) => void;
  className?: string;
};

function createSectionId() {
  return `std-sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function StandardStructuredEditor({
  value,
  onChange,
  className,
}: StandardStructuredEditorProps) {
  const data = normalizeStandardStructuredData(value);

  const usedTitles = new Set(
    data.sections.map((x) => x.title.trim()).filter(Boolean)
  );
  const availableTemplates = DEFAULT_STANDARD_SECTION_TEMPLATES.filter(
    (x) => !usedTitles.has(x.title)
  );

  function updateField<K extends keyof StandardStructuredData>(
    key: K,
    nextValue: StandardStructuredData[K]
  ) {
    onChange({ ...data, [key]: nextValue });
  }

  function updateSection(
    id: string,
    patch: Partial<{ title: string; body: string }>
  ) {
    updateField(
      "sections",
      data.sections.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  function removeSection(id: string) {
    updateField(
      "sections",
      data.sections.filter((s) => s.id !== id)
    );
  }

  function addTemplateSection(title: string, body: string) {
    updateField("sections", [
      ...data.sections,
      { id: createSectionId(), title, body },
    ]);
  }

  function addCustomSection() {
    updateField("sections", [
      ...data.sections,
      { id: createSectionId(), title: "新增条款", body: "" },
    ]);
  }

  return (
    <div
      className={[
        "rounded-lg border border-border bg-surface p-3 space-y-3",
        className ?? "",
      ].join(" ")}
    >
      <p className="text-xs text-muted">
        标准结构化录入：先填基础信息，再按条款模块录入内容，便于统一展示与审核。
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">标准编号</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.standardCode}
            onChange={(e) => updateField("standardCode", e.target.value)}
            placeholder="如：T/CNFA 001-2026"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">标准名称</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.standardName}
            onChange={(e) => updateField("standardName", e.target.value)}
            placeholder="如：整木柜类产品技术规范"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">发布机构</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.publishOrg}
            onChange={(e) => updateField("publishOrg", e.target.value)}
            placeholder="如：中国整木产业联盟"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">实施日期</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.effectiveDate}
            onChange={(e) => updateField("effectiveDate", e.target.value)}
            placeholder="如：2026-09-01"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-muted">适用范围</label>
        <textarea
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[88px]"
          value={data.scope}
          onChange={(e) => updateField("scope", e.target.value)}
          placeholder="说明本标准适用于哪些产品、场景、企业或交付环节。"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-muted">规范性引用文件</label>
        <textarea
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[88px]"
          value={data.normativeReferences}
          onChange={(e) => updateField("normativeReferences", e.target.value)}
          placeholder="列出关键引用标准和文件。"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-muted">术语与定义</label>
        <textarea
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[88px]"
          value={data.termsAndDefinitions}
          onChange={(e) => updateField("termsAndDefinitions", e.target.value)}
          placeholder="定义核心术语，避免执行歧义。"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-xs text-muted">检测方法</label>
          <textarea
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[88px]"
            value={data.inspectionMethod}
            onChange={(e) => updateField("inspectionMethod", e.target.value)}
            placeholder="抽样、检测流程、判定方式。"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-muted">验收规则</label>
          <textarea
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated min-h-[88px]"
            value={data.acceptanceRule}
            onChange={(e) => updateField("acceptanceRule", e.target.value)}
            placeholder="出厂、进场、交付验收标准。"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-muted">版本说明</label>
        <input
          className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
          value={data.versionNote}
          onChange={(e) => updateField("versionNote", e.target.value)}
          placeholder="如：2026 版 / 修订版"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">扩展条款模块</p>
          <div className="flex flex-wrap gap-2">
            {availableTemplates.slice(0, 3).map((tpl) => (
              <button
                key={tpl.title}
                type="button"
                onClick={() => addTemplateSection(tpl.title, tpl.body)}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-surface-elevated"
              >
                + {tpl.title}
              </button>
            ))}
            <button
              type="button"
              onClick={addCustomSection}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-surface-elevated"
            >
              + 自定义条款
            </button>
          </div>
        </div>

        {data.sections.map((section, idx) => (
          <div
            key={section.id}
            className="rounded-md border border-border bg-surface-elevated p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">条款 {idx + 1}</p>
              <button
                type="button"
                onClick={() => removeSection(section.id)}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-surface"
              >
                删除条款
              </button>
            </div>
            <input
              className="w-full border border-border rounded px-3 py-2 bg-surface"
              value={section.title}
              onChange={(e) => updateSection(section.id, { title: e.target.value })}
              placeholder="条款标题"
            />
            <textarea
              className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[90px]"
              value={section.body}
              onChange={(e) => updateSection(section.id, { body: e.target.value })}
              placeholder="条款内容"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
