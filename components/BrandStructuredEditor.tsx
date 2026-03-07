"use client";

import { ChangeEvent } from "react";
import {
  BrandStructuredData,
  DEFAULT_BRAND_MODULE_TEMPLATES,
  normalizeBrandStructuredData,
} from "@/lib/brand-structured";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer } from "@/lib/client-image";

type BrandStructuredEditorProps = {
  value: BrandStructuredData;
  onChange: (next: BrandStructuredData) => void;
  className?: string;
};

function createModuleId() {
  return `brand-module-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function BrandStructuredEditor({ value, onChange, className }: BrandStructuredEditorProps) {
  const data = normalizeBrandStructuredData(value);

  const usedTitles = new Set(data.modules.map((x) => x.title.trim()).filter(Boolean));
  const availableTemplates = DEFAULT_BRAND_MODULE_TEMPLATES.filter((x) => !usedTitles.has(x.title));

  function updateField<K extends keyof BrandStructuredData>(key: K, nextValue: BrandStructuredData[K]) {
    onChange({ ...data, [key]: nextValue });
  }

  function updateModule(id: string, patch: { title?: string; body?: string }) {
    updateField(
      "modules",
      data.modules.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }

  function removeModule(id: string) {
    updateField(
      "modules",
      data.modules.filter((m) => m.id !== id)
    );
  }

  function addTemplateModule(title: string, body: string) {
    updateField("modules", [...data.modules, { id: createModuleId(), title, body }]);
  }

  function addCustomModule() {
    updateField("modules", [...data.modules, { id: createModuleId(), title: "自定义模块", body: "" }]);
  }

  async function onLogoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await uploadImageToServer(file, { folder: "content/brand-logos" });
      updateField("logoUrl", imageUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "图片上传失败";
      window.alert(msg);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className={["rounded-lg border border-border bg-surface p-3 space-y-3", className ?? ""].join(" ")}>
      <p className="text-xs text-muted">
        结构化品牌录入：支持 Logo URL 或本地上传；无法填写的模块可删除，系统按已填信息自动生成品牌详情展示。
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">品牌 Logo（URL 或本地上传）</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.logoUrl}
            onChange={(e) => updateField("logoUrl", e.target.value)}
            placeholder="https://..."
          />
          <div className="mt-2 flex items-center gap-2">
            <input type="file" accept="image/*" onChange={onLogoFileChange} className="block w-full text-xs text-muted" />
            <span className="text-[11px] text-muted shrink-0">最大 {MAX_UPLOAD_IMAGE_MB}MB</span>
            {data.logoUrl && (
              <button
                type="button"
                className="shrink-0 text-xs px-2 py-1 rounded border border-border hover:bg-surface"
                onClick={() => updateField("logoUrl", "")}
              >
                清除
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">品牌主张</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.slogan}
            onChange={(e) => updateField("slogan", e.target.value)}
            placeholder="一句话品牌定位"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">成立时间</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.foundedYear}
            onChange={(e) => updateField("foundedYear", e.target.value)}
            placeholder="如：2012"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">总部地区</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.headquarters}
            onChange={(e) => updateField("headquarters", e.target.value)}
            placeholder="如：广东佛山"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">官网地址</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">联系电话</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.contactPhone}
            onChange={(e) => updateField("contactPhone", e.target.value)}
            placeholder="如：400-xxx-xxxx"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">服务区域</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.serviceAreas}
            onChange={(e) => updateField("serviceAreas", e.target.value)}
            placeholder="如：华东、华南、全国"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">主营品类</label>
          <input
            className="w-full border border-border rounded px-3 py-2 bg-surface-elevated"
            value={data.mainProducts}
            onChange={(e) => updateField("mainProducts", e.target.value)}
            placeholder="如：木门、墙板、柜类"
          />
        </div>
      </div>

      {data.logoUrl && (
        <div className="rounded-md border border-border bg-surface-elevated p-3">
          <p className="text-xs text-muted mb-2">Logo 预览</p>
          <img src={data.logoUrl} alt="品牌 Logo 预览" className="max-h-24 w-auto object-contain rounded" />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">详情模块（可删除）</p>
          <div className="flex flex-wrap gap-2">
            {availableTemplates.slice(0, 3).map((tpl) => (
              <button
                key={tpl.title}
                type="button"
                onClick={() => addTemplateModule(tpl.title, tpl.body)}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-surface-elevated"
              >
                + {tpl.title}
              </button>
            ))}
            <button
              type="button"
              onClick={addCustomModule}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-surface-elevated"
            >
              + 自定义模块
            </button>
          </div>
        </div>

        {data.modules.length === 0 ? (
          <p className="text-xs text-muted">暂无模块，你可以点击上方按钮添加。</p>
        ) : (
          data.modules.map((module, idx) => (
            <div key={module.id} className="rounded-md border border-border bg-surface-elevated p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">模块 {idx + 1}</p>
                <button
                  type="button"
                  onClick={() => removeModule(module.id)}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-surface"
                >
                  删除模块
                </button>
              </div>
              <input
                className="w-full border border-border rounded px-3 py-2 bg-surface"
                value={module.title}
                onChange={(e) => updateModule(module.id, { title: e.target.value })}
                placeholder="模块标题"
              />
              <textarea
                className="w-full border border-border rounded px-3 py-2 bg-surface min-h-[96px]"
                value={module.body}
                onChange={(e) => updateModule(module.id, { body: e.target.value })}
                placeholder="模块正文说明"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
