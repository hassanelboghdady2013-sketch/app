import { forwardRef } from "react";

const variantStyles = {
  primary:
    "bg-brand text-white hover:bg-brand-hover active:bg-brand-hover shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_24px_-12px_rgba(37,99,235,0.6)]",
  secondary:
    "bg-card-hi text-fg hover:bg-card-hi/80 border border-line-strong",
  ghost:
    "bg-transparent text-muted hover:text-fg hover:bg-card-hi",
  outline:
    "bg-transparent text-fg border border-line-strong hover:border-line-strong hover:bg-card",
  danger:
    "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
  brandSoft:
    "bg-brand-soft text-brand hover:bg-brand-soft/80",
};

const sizeStyles = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2 rounded-lg",
  xl: "h-12 px-6 text-base gap-2 rounded-xl",
};

const Button = forwardRef(function Button(
  {
    as: Comp = "button",
    variant = "primary",
    size = "md",
    leftIcon,
    rightIcon,
    loading = false,
    disabled,
    className = "",
    children,
    type,
    ...props
  },
  ref
) {
  const isButton = Comp === "button";
  return (
    <Comp
      ref={ref}
      type={isButton ? type ?? "button" : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && (disabled || loading) ? true : undefined}
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </Comp>
  );
});

export default Button;
