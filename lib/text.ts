export function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function previewText(input: string, max = 160): string {
  const plain = stripHtml(input);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}...`;
}
