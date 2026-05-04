import { forwardRef, useId } from "react";

const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    leftIcon,
    rightSlot,
    className = "",
    id: idProp,
    ...props
  },
  ref
) {
  const reactId = useId();
  const id = idProp || reactId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full h-10 ${leftIcon ? "pl-9" : "pl-3.5"} ${rightSlot ? "pr-10" : "pr-3.5"} rounded-lg bg-input border text-fg text-sm transition-colors placeholder:text-faint focus:outline-none focus-visible:outline-none ${
            error
              ? "border-danger focus:border-danger"
              : "border-line focus:border-brand"
          } ${className}`}
          {...props}
        />
        {rightSlot && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {rightSlot}
          </span>
        )}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
