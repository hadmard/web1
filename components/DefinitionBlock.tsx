import { RichContent } from "@/components/RichContent";

type DefinitionBlockProps = {
  definition: string;
};

export function DefinitionBlock({ definition }: DefinitionBlockProps) {
  return (
    <blockquote className="border-l-4 border-border pl-4 py-2 my-6 text-[var(--color-muted)] bg-surface rounded-r">
      <RichContent html={definition} />
    </blockquote>
  );
}
