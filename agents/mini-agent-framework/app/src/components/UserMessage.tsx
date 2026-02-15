export default function UserMessage({ content }: { content: string }) {
  return (
    <div className="ml-auto max-w-md rounded-xl bg-blue-600 p-3 text-sm text-white shadow-sm dark:bg-blue-500">
      {content}
    </div>
  );
}
