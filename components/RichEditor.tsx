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
import { MAX_UPLOAD_IMAGE_MB, readImageWithLimit } from "@/lib/client-image";

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

async function getImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 640, height: img.naturalHeight || 360 });
    img.onerror = () => resolve({ width: 640, height: 360 });
    img.src = dataUrl;
  });
}

function ToolButton({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded text-xs border ${
        active ? "bg-accent text-white border-accent" : "border-border text-primary hover:bg-surface"
      }`}
    >
      {label}
    </button>
  );
}

export function RichEditor({ value, onChange, minHeight = 260, placeholder = "请输入正文..." }: Props) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
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

  const DEFAULT_IMAGE_WIDTH = 420;

  const editor = useEditor({
    extensions: [
      StarterKit,
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
      handlePaste(view, event) {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        const hasImage = Array.from(clipboard.items).some((x) => x.type.startsWith("image/"));
        if (hasImage) {
          // Let React onPaste handle image insertion once, and block ProseMirror default paste.
          event.preventDefault();
          return true;
        }
        // Keep default ProseMirror paste behavior for text to preserve paragraphs and line breaks.
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
      if (!editor.isActive("image")) return;
      const attrs = editor.getAttributes("image") as ImageAttrs;
      const w = Number(attrs.width || 0);
      const h = Number(attrs.height || 0);
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

  const insertImage = useMemo(
    () => async (file: File) => {
      if (!editor) return;
      try {
        const dataUrl = await readImageWithLimit(file);
        const size = await getImageSize(dataUrl);
        const maxWidth = 960;
        const width = Math.min(size.width, maxWidth, DEFAULT_IMAGE_WIDTH);
        const height = Math.round(width / (size.width / size.height || 1));
        editor
          .chain()
          .focus()
          .setImage({ src: dataUrl })
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

  const onPaste = async (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.items)
      .find((x) => x.type.startsWith("image/"))
      ?.getAsFile();
    if (!file) return;
    e.preventDefault();
    await insertImage(file);
  };

  const applyImageSize = () => {
    if (!editor || !isImageActive) return;
    const nextWidth = Number(imgWidth || 0);
    const nextHeight = Number(imgHeight || 0);
    editor
      .chain()
      .focus()
      .updateAttributes("image", {
        width: nextWidth > 0 ? nextWidth : null,
        height: nextHeight > 0 ? nextHeight : null,
      })
      .run();
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
    if (!editor || !editor.isActive("image")) return;
    const attrs = editor.getAttributes("image") as ImageAttrs;
    const currentWidth = Number(attrs.width || 0);
    const currentHeight = Number(attrs.height || 0);
    const safeRatio = currentWidth > 0 && currentHeight > 0 ? currentWidth / currentHeight : ratio || 1;
    const width = Math.max(120, Math.round(nextWidth));
    const height = Math.max(80, Math.round(width / safeRatio));
    editor.chain().focus().updateAttributes("image", { width, height }).run();
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
      </div>

      {isImageActive && (
        <div className="px-3 py-2 border-b border-border flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">图片尺寸</span>
          <input className="w-36 border border-border rounded px-2 py-1 bg-surface" value={imgWidth} onChange={(e) => onWidthChange(e.target.value)} placeholder="宽（默认420）" />
          <input className="w-28 border border-border rounded px-2 py-1 bg-surface" value={imgHeight} onChange={(e) => onHeightChange(e.target.value)} placeholder="高" />
          <label className="inline-flex items-center gap-1 text-muted">
            <input type="checkbox" checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} />
            同比例
          </label>
          <ToolButton label="应用尺寸" onClick={applyImageSize} />
          <ToolButton label="图片居左" onClick={() => editor.chain().focus().updateAttributes("image", { align: "left" }).run()} />
          <ToolButton label="图片居中" onClick={() => editor.chain().focus().updateAttributes("image", { align: "center" }).run()} />
          <ToolButton label="图片居右" onClick={() => editor.chain().focus().updateAttributes("image", { align: "right" }).run()} />
        </div>
      )}

      <div
        className="px-4 py-4 bg-gradient-to-b from-surface to-surface-elevated overflow-y-auto"
        style={{ minHeight, maxHeight: "58vh" }}
        onPaste={onPaste}
      >
        <EditorContent editor={editor} />
        {!value && <p className="text-xs text-muted mt-2">{placeholder}</p>}
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
