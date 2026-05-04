const variantStyles = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-card-hi text-muted",
  outline: "border border-line-strong text-muted",
};

export default function Badge({ variant = "neutral", className = "", children, ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
