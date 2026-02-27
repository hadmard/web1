export const GALLERY_CATEGORY_OPTIONS = [
  { value: "style", label: "风格" },
  { value: "space", label: "空间" },
  { value: "craft", label: "工艺" },
  { value: "product", label: "品类" },
  { value: "enterprise", label: "企业案例" },
] as const;

export type GalleryCategoryValue = (typeof GALLERY_CATEGORY_OPTIONS)[number]["value"];

export const GALLERY_CATEGORY_LABEL_MAP: Record<GalleryCategoryValue, string> =
  GALLERY_CATEGORY_OPTIONS.reduce((acc, item) => {
    acc[item.value] = item.label;
    return acc;
  }, {} as Record<GalleryCategoryValue, string>);

export function isValidGalleryCategory(input: string | null | undefined): input is GalleryCategoryValue {
  if (!input) return false;
  return GALLERY_CATEGORY_OPTIONS.some((item) => item.value === input);
}

export function normalizeGalleryCategory(input: string | null | undefined): GalleryCategoryValue | null {
  const value = (input || "").trim();
  return isValidGalleryCategory(value) ? value : null;
}

export function galleryCategoryLabel(input: string | null | undefined): string {
  const value = normalizeGalleryCategory(input);
  if (!value) return "未分类";
  return GALLERY_CATEGORY_LABEL_MAP[value];
}

export const GALLERY_TAG_SUGGESTIONS: Record<GalleryCategoryValue, string[]> = {
  style: ["新中式", "现代简约", "轻奢", "意式", "法式"],
  space: ["客厅", "卧室", "餐厅", "书房", "玄关"],
  craft: ["木皮拼花", "拼框工艺", "无拉手", "隐形门", "同色封边"],
  product: ["木门", "墙板", "柜体", "酒柜", "护墙系统"],
  enterprise: ["实景案例", "交付现场", "样板间", "门店展厅", "项目复盘"],
};
