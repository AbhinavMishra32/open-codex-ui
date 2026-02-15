export default function UserMessage({ content }: { content: string }) {
  return (
    <div className="bg-blue-500 text-white p-3 rounded-xl self-end max-w-md">
      {content}
    </div>
  )
}
