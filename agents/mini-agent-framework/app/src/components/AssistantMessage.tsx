export default function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="bg-gray-200 text-black p-3 rounded-xl self-start max-w-md">
      {content}
    </div>
  );
}
