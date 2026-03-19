"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Mark } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { MAX_UPLOAD_IMAGE_MB, uploadImageToServer, uploadRemoteImageToServer } from "@/lib/client-image";

type Props = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
};

type ImageAttrs = {
  src?: string;
  width?: number | null;
  height?: number | null;
  align?: "left" | "center" | "right";
};

type MenuMode = "text" | "image";

function normalizePastedText(text: string) {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function normalizePastedHref(href: string) {
  const value = href.trim();
  if (!value) return "";
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^\/\//.test(value)) return `https:${value}`;
  return "";
}

function extractClipboardSourceUrl(rawHtml: string) {
  const sourceMatch = rawHtml.match(/SourceURL:(https?:\/\/[^\s]+)/i);
  if (sourceMatch?.[1]) return sourceMatch[1];
  const baseMatch = rawHtml.match(/<base[^>]+href=["']([^"']+)["']/i);
  return baseMatch?.[1] ?? "";
}

function normalizePastedImageSrc(src: string, rawHtml: string) {
  const value = src.trim();
  if (!value) return "";
  const baseUrl = extractClipboardSourceUrl(rawHtml);

  try {
    if (/^\/\//.test(value)) {
      return `https:${value}`;
    }
    if (baseUrl) {
      return new URL(value, baseUrl).toString();
    }
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function sanitizePastedHtml(rawHtml: string, imageMap?: Map<string, string>) {
  if (typeof window === "undefined") return rawHtml;

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const cleanChildren = (parent: Node, target: Node) => {
    Array.from(parent.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (!cleaned) return;
      if (Array.isArray(cleaned)) {
        cleaned.forEach((node) => target.appendChild(node));
        return;
      }
      target.appendChild(cleaned);
    });
  };

  const cleanNode = (node: Node): Node | Node[] | null => {
    if (node.nodeType === window.Node.TEXT_NODE) {
      const text = normalizePastedText(node.textContent || "");
      return text ? document.createTextNode(text) : null;
    }

    if (!(node instanceof HTMLElement)) return null;

    const tag = node.tagName.toLowerCase();

    if (["style", "script", "meta", "link", "svg", "iframe", "object", "embed", "form"].includes(tag)) {
      return null;
    }

    if (tag === "img") {
      const nextSrc = imageMap?.get(node.getAttribute("src") || "") ?? "";
      if (nextSrc) {
        const image = document.createElement("img");
        image.setAttribute("src", nextSrc);
        return image;
      }
      return null;
    }

    if (["strong", "b"].includes(tag)) {
      const strong = document.createElement("strong");
      cleanChildren(node, strong);
      return strong.childNodes.length ? strong : null;
    }

    if (["em", "i"].includes(tag)) {
      const em = document.createElement("em");
      cleanChildren(node, em);
      return em.childNodes.length ? em : null;
    }

    if (tag === "u") {
      const u = document.createElement("u");
      cleanChildren(node, u);
      return u.childNodes.length ? u : null;
    }

    if (tag === "br") {
      return document.createElement("br");
    }

    if (tag === "a") {
      const href = normalizePastedHref(node.getAttribute("href") || "");
      const anchor = document.createElement(href ? "a" : "span");
      if (href && anchor instanceof HTMLAnchorElement) {
        anchor.href = href;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer nofollow";
      }
      cleanChildren(node, anchor);
      return anchor.textContent?.trim() ? anchor : null;
    }

    if (["h1", "h2", "h3", "blockquote", "ul", "ol", "li"].includes(tag)) {
      const element = document.createElement(tag);
      cleanChildren(node, element);
      return element.textContent?.trim() || element.querySelector("br") ? element : null;
    }

    if (tag === "p") {
      const paragraph = document.createElement("p");
      cleanChildren(node, paragraph);
      return paragraph.textContent?.trim() || paragraph.querySelector("br") ? paragraph : null;
    }

    if (["div", "section", "article", "header", "footer", "aside"].includes(tag)) {
      const hasBlockChildren = Array.from(node.children).some((child) =>
        ["h1", "h2", "h3", "blockquote", "ul", "ol", "li", "p", "div", "section", "article"].includes(child.tagName.toLowerCase())
      );
      if (hasBlockChildren) {
        return Array.from(node.childNodes)
          .map((child) => cleanNode(child))
          .flatMap((child) => (Array.isArray(child) ? child : child ? [child] : []));
      }
      const paragraph = document.createElement("p");
      cleanChildren(node, paragraph);
      return paragraph.textContent?.trim() || paragraph.querySelector("br") ? paragraph : null;
    }

    if (["table", "tbody", "thead", "tr"].includes(tag)) {
      return Array.from(node.childNodes)
        .map((child) => cleanNode(child))
        .flatMap((child) => (Array.isArray(child) ? child : child ? [child] : []));
    }

    if (["td", "th"].includes(tag)) {
      const paragraph = document.createElement("p");
      cleanChildren(node, paragraph);
      return paragraph.textContent?.trim() ? paragraph : null;
    }

    const fragment = document.createDocumentFragment();
    cleanChildren(node, fragment);
    return fragment.childNodes.length ? Array.from(fragment.childNodes) : null;
  };

  const container = document.createElement("div");
  Array.from(doc.body.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (!cleaned) return;
    if (Array.isArray(cleaned)) {
      cleaned.forEach((node) => container.appendChild(node));
      return;
    }
    container.appendChild(cleaned);
  });

  const html = container.innerHTML
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/(<br\s*\/?>\s*){3,}/g, "<br><br>")
    .trim();

  return html || "<p></p>";
}

async function transferPastedRemoteImages(rawHtml: string) {
  if (typeof window === "undefined") return sanitizePastedHtml(rawHtml);

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const imageMap = new Map<string, string>();

  const sources = Array.from(doc.querySelectorAll("img"))
    .map((img) => img.getAttribute("src") || "")
    .map((src) => ({ original: src, normalized: normalizePastedImageSrc(src, rawHtml) }))
    .filter((item) => item.normalized);

  for (const item of sources) {
    if (imageMap.has(item.original)) continue;
    try {
      const uploadedUrl = await uploadRemoteImageToServer(item.normalized, { folder: "content/editor-inline" });
      imageMap.set(item.original, uploadedUrl);
    } catch {
      imageMap.set(item.original, "");
    }
  }

  return sanitizePastedHtml(rawHtml, imageMap);
}

const SpecialText = Mark.create({
  name: "specialText",
  addAttributes() {
    return {
      variant: {
        default: "highlight",
        parseHTML: (element) => element.getAttribute("data-special-text") || "highlight",
        renderHTML: (attributes) => ({ "data-special-text": attributes.variant }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-special-text]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      align: { default: "center" },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as ImageAttrs & { style?: string };
    const styles: string[] = ["display:block"];

    if (attrs.width) styles.push(`width:${attrs.width}px`);
    if (attrs.height) styles.push(`height:${attrs.height}px`);
    else styles.push("height:auto");
    if (!attrs.width) styles.push("max-width:100%", "width:100%");

    if (attrs.align === "left") styles.push("margin:8px auto 8px 0");
    if (attrs.align === "right") styles.push("margin:8px 0 8px auto");
    if (!attrs.align || attrs.align === "center") styles.push("margin:8px auto");

    return ["img", { ...HTMLAttributes, style: styles.join(";") }];
  },
});

async function getImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 640, height: img.naturalHeight || 360 });
    img.onerror = () => resolve({ width: 640, height: 360 });
    img.src = src;
  });
}

function ToolButton({
  active,
  label,
  onClick,
  className = "",
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${
        active ? "bg-accent text-white border-accent" : "border-border text-primary hover:bg-surface"
      } ${className}`}
    >
      {label}
    </button>
  );
}

export function RichEditor({ value, onChange, minHeight = 260, placeholder = "请输入正文..." }: Props) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const insertImageRef = useRef<((file: File) => Promise<void>) | null>(null);
  const insertPastedHtmlRef = useRef<((html: string) => Promise<void>) | null>(null);
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; mode: MenuMode }>({
    open: false,
    x: 0,
    y: 0,
    mode: "text",
  });
  const [imgWidth, setImgWidth] = useState("");
  const [imgHeight, setImgHeight] = useState("");
  const [lockRatio, setLockRatio] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [selectedImagePos, setSelectedImagePos] = useState<number | null>(null);

  const DEFAULT_IMAGE_WIDTH = 420;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      SpecialText,
      RichImage,
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content focus:outline-none",
      },
      transformPastedHTML(html) {
        return sanitizePastedHtml(html);
      },
      handlePaste(view, event) {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        const pastedHtml = clipboard.getData("text/html");
        const imageFile =
          Array.from(clipboard.items)
            .find((x) => x.type.startsWith("image/"))
            ?.getAsFile() ?? null;
        if (imageFile) {
          event.preventDefault();
          window.setTimeout(() => {
            void insertImageRef.current?.(imageFile);
          }, 0);
          return true;
        }
        if (pastedHtml && /<img[\s>]/i.test(pastedHtml)) {
          event.preventDefault();
          window.setTimeout(() => {
            void insertPastedHtmlRef.current?.(pastedHtml);
          }, 0);
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const target = event.target as HTMLElement | null;
          const imageEl = target?.closest("img");
          const menuWidth = 190;
          const menuHeight = imageEl ? 250 : 340;
          const x = Math.min(Math.max(8, event.clientX), window.innerWidth - menuWidth - 8);
          const y = Math.min(Math.max(8, event.clientY), window.innerHeight - menuHeight - 8);

          if (imageEl) {
            try {
              const pos = view.posAtDOM(imageEl, 0);
              const safePos = Math.min(Math.max(pos, 0), view.state.doc.content.size);
              const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, safePos));
              view.dispatch(tr);
              view.focus();
            } catch {
              // ignore selection sync errors
            }
            event.preventDefault();
            setMenu({ open: true, x, y, mode: "image" });
            return true;
          }

          const selectedText = window.getSelection()?.toString().trim() ?? "";
          if (!view.state.selection.empty || selectedText) {
            event.preventDefault();
            setMenu({ open: true, x, y, mode: "text" });
            return true;
          }
          return false;
        },
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!menu.open) return;
    const onClose = () => setMenu((m) => ({ ...m, open: false }));
    document.addEventListener("click", onClose);
    document.addEventListener("scroll", onClose, true);
    document.addEventListener("keydown", onClose);
    return () => {
      document.removeEventListener("click", onClose);
      document.removeEventListener("scroll", onClose, true);
      document.removeEventListener("keydown", onClose);
    };
  }, [menu.open]);

  useEffect(() => {
    if (!editor) return;
    const syncImageState = () => {
      if (!editor.isActive("image")) {
        setSelectedImagePos(null);
        return;
      }
      const attrs = editor.getAttributes("image") as ImageAttrs;
      const w = Number(attrs.width || 0);
      const h = Number(attrs.height || 0);
      setSelectedImagePos(editor.state.selection.from);
      setImgWidth(w > 0 ? String(Math.round(w)) : "");
      setImgHeight(h > 0 ? String(Math.round(h)) : "");
      if (w > 0 && h > 0) setRatio(w / h);
    };
    editor.on("selectionUpdate", syncImageState);
    editor.on("update", syncImageState);
    return () => {
      editor.off("selectionUpdate", syncImageState);
      editor.off("update", syncImageState);
    };
  }, [editor]);

  const isImageActive = !!editor?.isActive("image");
  const imageAlign = ((editor?.getAttributes("image") as ImageAttrs | undefined)?.align ?? "center") as NonNullable<ImageAttrs["align"]>;

  const insertImage = useMemo(
    () => async (file: File) => {
      if (!editor) return;
      try {
        const imageUrl = await uploadImageToServer(file, { folder: "content/editor-inline" });
        const size = await getImageSize(imageUrl);
        const maxWidth = 960;
        const width = Math.min(size.width, maxWidth, DEFAULT_IMAGE_WIDTH);
        const height = Math.round(width / (size.width / size.height || 1));
        editor
          .chain()
          .focus()
          .setImage({ src: imageUrl })
          .updateAttributes("image", { width, height, align: "center" })
          .run();
        setImgWidth(String(width));
        setImgHeight(String(height));
        setRatio(width / height);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "图片上传失败";
        window.alert(msg);
      }
    },
    [editor]
  );

  useEffect(() => {
    insertImageRef.current = insertImage;
    return () => {
      insertImageRef.current = null;
    };
  }, [insertImage]);

  useEffect(() => {
    insertPastedHtmlRef.current = async (html: string) => {
      if (!editor) return;
      try {
        const normalizedHtml = await transferPastedRemoteImages(html);
        editor.chain().focus().insertContent(normalizedHtml).run();
      } catch {
        editor.chain().focus().insertContent(sanitizePastedHtml(html)).run();
      }
    };
    return () => {
      insertPastedHtmlRef.current = null;
    };
  }, [editor]);

  const updateSelectedImage = (attrs: Partial<ImageAttrs>) => {
    if (!editor) return false;
    const targetPos = selectedImagePos ?? (editor.isActive("image") ? editor.state.selection.from : null);
    if (targetPos === null) return false;

    return editor
      .chain()
      .focus()
      .setNodeSelection(targetPos)
      .updateAttributes("image", attrs)
      .run();
  };

  const applyImageSize = () => {
    if (!editor) return;
    const nextWidth = Number(imgWidth || 0);
    const nextHeight = Number(imgHeight || 0);

    updateSelectedImage({
      width: nextWidth > 0 ? nextWidth : null,
      height: nextHeight > 0 ? nextHeight : null,
    });
  };

  const onWidthChange = (v: string) => {
    setImgWidth(v);
    if (!lockRatio) return;
    const w = Number(v || 0);
    if (w > 0 && ratio > 0) setImgHeight(String(Math.round(w / ratio)));
  };

  const onHeightChange = (v: string) => {
    setImgHeight(v);
    if (!lockRatio) return;
    const h = Number(v || 0);
    if (h > 0 && ratio > 0) setImgWidth(String(Math.round(h * ratio)));
  };

  if (!editor) return null;

  const setHeadingLevel = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const setParagraphPlain = () => {
    editor.chain().focus().setParagraph().setTextAlign("left").run();
  };

  const toggleBoldMark = () => {
    if (editor.isActive("bold")) {
      editor.chain().focus().unsetBold().run();
      return;
    }
    editor.chain().focus().setBold().run();
  };

  const setOrEditLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("请输入链接（http(s)://）", prev || "https://");
    if (url === null) return;
    const v = url.trim();
    if (!v) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const normalized = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    editor.chain().focus().setLink({ href: normalized, target: "_blank", rel: "noopener noreferrer nofollow" }).run();
  };

  const clearSpecialText = () => {
    editor.chain().focus().unsetMark("specialText").run();
    setMenu((m) => ({ ...m, open: false }));
  };

  const setPresetImageWidth = (nextWidth: number) => {
    if (!editor) return;
    const attrs = editor.getAttributes("image") as ImageAttrs;
    const currentWidth = Number(attrs.width || 0);
    const currentHeight = Number(attrs.height || 0);
    const safeRatio = currentWidth > 0 && currentHeight > 0 ? currentWidth / currentHeight : ratio || 1;
    const width = Math.max(120, Math.round(nextWidth));
    const height = Math.max(80, Math.round(width / safeRatio));
    updateSelectedImage({ width, height });
    setImgWidth(String(width));
    setImgHeight(String(height));
    setRatio(width / height);
  };

  return (
    <div className="relative rounded-xl border border-border bg-surface-elevated">
      <div className="p-3 border-b border-border flex flex-wrap gap-2 sticky top-0 bg-surface-elevated/95 backdrop-blur supports-[backdrop-filter]:bg-surface-elevated/75 z-10">
        <ToolButton label="H1" active={editor.isActive("heading", { level: 1 })} onClick={() => setHeadingLevel(1)} />
        <ToolButton label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => setHeadingLevel(2)} />
        <ToolButton label="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => setHeadingLevel(3)} />
        <ToolButton label="正文" active={editor.isActive("paragraph")} onClick={setParagraphPlain} />
        <ToolButton label="取消标题" onClick={setParagraphPlain} />

        <ToolButton label="加粗" active={editor.isActive("bold")} onClick={toggleBoldMark} />
        <ToolButton label="斜体" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolButton label="下划线" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <ToolButton label="链接" active={editor.isActive("link")} onClick={setOrEditLink} />
        <ToolButton label="取消链接" onClick={() => editor.chain().focus().unsetLink().run()} />
        <ToolButton label="清除格式" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />

        <ToolButton label="左对齐" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
        <ToolButton label="居中" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
        <ToolButton label="右对齐" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} />

        <ToolButton label="无序列表" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolButton label="有序列表" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />

        <ToolButton label="撤销" onClick={() => editor.chain().focus().undo().run()} />
        <ToolButton label="重做" onClick={() => editor.chain().focus().redo().run()} />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void insertImage(file);
            e.target.value = "";
          }}
        />
        <ToolButton label="上传图片" onClick={() => imageInputRef.current?.click()} />
        <span className="self-center text-[11px] text-muted">图片最大 {MAX_UPLOAD_IMAGE_MB}MB（超限可压缩）</span>
        <span className="self-center text-[11px] text-[#8f7b59]">支持粘贴图片，文字会自动整理格式</span>
      </div>

      {isImageActive && (
        <div className="border-b border-[rgba(194,182,154,0.28)] bg-[linear-gradient(180deg,rgba(255,253,250,0.98),rgba(247,242,235,0.95))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="rounded-full border border-[rgba(198,182,150,0.34)] bg-[rgba(255,255,255,0.76)] px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-[#786546] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              已选中图片
            </span>
            <span className="text-[11px] tracking-[0.03em] text-[#938160]">可调整尺寸与版式</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-[#8d7a5a]">尺寸</span>
          <input
            className="w-32 rounded-xl border border-[rgba(194,182,154,0.28)] bg-[rgba(255,255,255,0.9)] px-3 py-1.5 text-[13px] text-[#433527] shadow-[0_6px_16px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition focus:border-[rgba(180,154,107,0.45)] focus:shadow-[0_10px_22px_rgba(180,154,107,0.12),inset_0_1px_0_rgba(255,255,255,0.82)]"
            value={imgWidth}
            inputMode="numeric"
            onChange={(e) => onWidthChange(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyImageSize();
              }
            }}
            placeholder="宽（默认420）"
          />
          <span className="text-[#b39b73]">×</span>
          <input
            className="w-24 rounded-xl border border-[rgba(194,182,154,0.28)] bg-[rgba(255,255,255,0.9)] px-3 py-1.5 text-[13px] text-[#433527] shadow-[0_6px_16px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition focus:border-[rgba(180,154,107,0.45)] focus:shadow-[0_10px_22px_rgba(180,154,107,0.12),inset_0_1px_0_rgba(255,255,255,0.82)]"
            value={imgHeight}
            inputMode="numeric"
            onChange={(e) => onHeightChange(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyImageSize();
              }
            }}
            placeholder="高"
          />
          <label className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[rgba(194,182,154,0.24)] bg-[rgba(255,255,255,0.7)] px-3 text-[#8d7a5a] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <input type="checkbox" checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} className="accent-[#b49a6b]" />
            同比例
          </label>
          <ToolButton
            label="应用尺寸"
            onClick={applyImageSize}
            className="rounded-full border-[rgba(180,154,107,0.28)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,242,233,0.94))] px-3.5 text-[#5f4e34] shadow-[0_10px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.88)] hover:border-[rgba(180,154,107,0.42)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,245,237,0.98))]"
          />
          <div className="inline-flex h-9 items-center rounded-full border border-[rgba(194,182,154,0.24)] bg-[rgba(255,255,255,0.72)] p-1 shadow-[0_10px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.86)]">
            <ToolButton
              label="居左"
              active={imageAlign === "left"}
              onClick={() => void updateSelectedImage({ align: "left" })}
              className={`rounded-full border-0 px-3 py-1.5 ${
                imageAlign === "left"
                  ? "bg-[linear-gradient(180deg,#c7ac7d,#b49464)] text-white shadow-[0_8px_18px_rgba(180,154,107,0.28)]"
                  : "bg-transparent text-[#6c5a3f] hover:bg-[rgba(244,236,221,0.9)]"
              }`}
            />
            <ToolButton
              label="居中"
              active={imageAlign === "center"}
              onClick={() => void updateSelectedImage({ align: "center" })}
              className={`rounded-full border-0 px-3 py-1.5 ${
                imageAlign === "center"
                  ? "bg-[linear-gradient(180deg,#c7ac7d,#b49464)] text-white shadow-[0_8px_18px_rgba(180,154,107,0.28)]"
                  : "bg-transparent text-[#6c5a3f] hover:bg-[rgba(244,236,221,0.9)]"
              }`}
            />
            <ToolButton
              label="居右"
              active={imageAlign === "right"}
              onClick={() => void updateSelectedImage({ align: "right" })}
              className={`rounded-full border-0 px-3 py-1.5 ${
                imageAlign === "right"
                  ? "bg-[linear-gradient(180deg,#c7ac7d,#b49464)] text-white shadow-[0_8px_18px_rgba(180,154,107,0.28)]"
                  : "bg-transparent text-[#6c5a3f] hover:bg-[rgba(244,236,221,0.9)]"
              }`}
            />
          </div>
          </div>
        </div>
      )}

      <div
        className="px-4 py-4 bg-gradient-to-b from-surface to-surface-elevated overflow-y-auto"
        style={{ minHeight, maxHeight: "58vh" }}
      >
        <EditorContent editor={editor} />
        {!value && placeholder ? <p className="text-xs text-muted mt-2">{placeholder}</p> : null}
      </div>
      {menu.open && (
        <div
          className="fixed z-[300] min-w-[170px] max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg p-1"
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.mode === "text" ? (
            <>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  setHeadingLevel(1);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                设为 H1
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  setHeadingLevel(2);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                设为 H2
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  setHeadingLevel(3);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                设为 H3
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  setParagraphPlain();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                设为正文
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  toggleBoldMark();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                粗体
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  editor.chain().focus().toggleItalic().run();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                斜体
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  editor.chain().focus().toggleUnderline().run();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                下划线
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  setOrEditLink();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                添加/编辑链接
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface text-muted"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                取消链接
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface text-muted"
                onClick={() => {
                  clearSpecialText();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                清除特殊格式
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  editor.chain().focus().updateAttributes("image", { align: "left" }).run();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                图片居左
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  editor.chain().focus().updateAttributes("image", { align: "center" }).run();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                图片居中
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  editor.chain().focus().updateAttributes("image", { align: "right" }).run();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                图片居右
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  setPresetImageWidth(320);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                小图（320px）
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  setPresetImageWidth(480);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                中图（480px）
              </button>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface"
                onClick={() => {
                  setPresetImageWidth(720);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                大图（720px）
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface text-red-600"
                onClick={() => {
                  editor.chain().focus().deleteSelection().run();
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                删除图片
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
