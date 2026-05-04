import { forwardRef, useId } from "react";

const Textarea = forwardRef(function Textarea(
  { label, hint, error, maxLength, value, className = "", id: idProp, ...props },
  ref
) {
  const reactId = useId();
  const id = idProp || reactId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const showCounter = typeof maxLength === "number";
  const used = typeof value === "string" ? value.length : 0;
  return (
    <div className="space-y-1.5">
      {(label || showCounter) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className="block text-sm text-muted">
              {label}
            </label>
          )}
          {showCounter && (
            <span className="text-xs text-faint" aria-hidden="true">
              {used}/{maxLength}
            </span>
          )}
        </div>
      )}
      <textarea
        ref={ref}
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`w-full px-3.5 py-2.5 rounded-lg bg-input border text-fg text-sm transition-colors resize-none placeholder:text-faint focus:outline-none ${
          error ? "border-danger focus:border-danger" : "border-line focus:border-brand"
        } ${className}`}
        {...props}
      />
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

export default Textarea;
