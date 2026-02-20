type DefinitionBlockProps = {
  definition: string;
};

export function DefinitionBlock({ definition }: DefinitionBlockProps) {
  return (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-6 text-[var(--color-muted)] bg-gray-50 dark:bg-gray-800/50 rounded-r">
      {definition}
    </blockquote>
  );
}
