import { stripHtml } from "./text";

export type DirtyTextField = {
  label: string;
  value: string | null | undefined;
};

type DirtyTextIssue = "escaped_unicode" | "repeated_question_marks" | "replacement_character";

type DirtyTextHit = {
  field: string;
  issue: DirtyTextIssue;
};

const ESCAPED_UNICODE_RE = /(?:\\u|\\\\u)[0-9a-fA-F]{4}/;
const REPEATED_QUESTION_MARK_RE = /(?:\?{3,}|？{3,})/;
const REPLACEMENT_CHARACTER_RE = /\uFFFD|�/;

function normalizeForInspection(value: string) {
  return stripHtml(value).replace(/\s+/g, " ").trim();
}

function detectDirtyTextIssue(value: string): DirtyTextIssue | null {
  const raw = value.trim();
  const plain = normalizeForInspection(value);

  if (!raw && !plain) return null;
  if (ESCAPED_UNICODE_RE.test(raw)) return "escaped_unicode";
  if (REPLACEMENT_CHARACTER_RE.test(raw) || REPLACEMENT_CHARACTER_RE.test(plain)) return "replacement_character";
  if (REPEATED_QUESTION_MARK_RE.test(raw) || REPEATED_QUESTION_MARK_RE.test(plain)) return "repeated_question_marks";
  return null;
}

export function findDirtyTextFields(fields: DirtyTextField[]): DirtyTextHit[] {
  return fields.flatMap((field) => {
    if (typeof field.value !== "string") return [];
    const issue = detectDirtyTextIssue(field.value);
    return issue ? [{ field: field.label, issue }] : [];
  });
}

export function buildDirtyTextErrorMessage(fields: DirtyTextField[]): string | null {
  const hits = findDirtyTextFields(fields);
  if (hits.length === 0) return null;

  const summary = Array.from(new Set(hits.map((hit) => hit.field))).join("、");
  return `检测到疑似乱码或脏文本，请检查以下字段：${summary}。请不要提交包含连续问号、替换字符或 \\uXXXX 编码字面量的内容。`;
}

export function assertNoDirtyText(fields: DirtyTextField[], context?: string) {
  const message = buildDirtyTextErrorMessage(fields);
  if (!message) return;
  throw new Error(context ? `${context}：${message}` : message);
}
