export function Mark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-brand-600 text-white"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      🛢️
    </div>
  );
}
