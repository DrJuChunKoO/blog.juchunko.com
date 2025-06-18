export default function LoadingDots() {
  return (
    <span className="inline-flex gap-1 text-gray-500">
      <span className="animate-[loading-dots_1.4s_infinite_0.2s]">·</span>
      <span className="animate-[loading-dots_1.4s_infinite_0.4s]">·</span>
      <span className="animate-[loading-dots_1.4s_infinite_0.6s]">·</span>
    </span>
  );
}
