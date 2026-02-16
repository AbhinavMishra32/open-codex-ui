export default function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="mr-auto max-w-3xl rounded-xl bg-zinc-100 p-3 text-sm text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100">
      {content}
    </div>
  );
}
