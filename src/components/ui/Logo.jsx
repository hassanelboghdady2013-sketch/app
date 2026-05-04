export default function Logo({ size = 36, withWordmark = true, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        className="rounded-full ring-1 ring-line-strong"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <span
          className="text-base font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mo<span className="text-brand">tech</span>
        </span>
      )}
    </span>
  );
}
