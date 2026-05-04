import { forwardRef } from "react";

const variantStyles = {
  ghost: "text-muted hover:text-fg hover:bg-card-hi",
  subtle: "text-muted bg-card-hi/50 hover:bg-card-hi hover:text-fg",
  danger: "text-danger hover:bg-danger/10",
  brand: "text-brand hover:bg-brand-soft",
};

const sizeStyles = {
  sm: "w-8 h-8 rounded-md",
  md: "w-9 h-9 rounded-lg",
  lg: "w-10 h-10 rounded-lg",
};

const IconButton = forwardRef(function IconButton(
  { variant = "ghost", size = "md", "aria-label": ariaLabel, className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default IconButton;
