export default function HighlightedMessage({ message }: any) {
  return (
    <div className="border p-4 rounded bg-yellow-50">
      <h3 className="font-semibold mb-2">Message</h3>
      <p>{message}</p>
    </div>
  );
}