import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";

const Select = forwardRef(function Select(
  { label, hint, error, className = "", children, id: idProp, ...props },
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
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full h-10 pl-3.5 pr-9 rounded-lg bg-input border text-fg text-sm transition-colors appearance-none focus:outline-none ${
            error ? "border-danger focus:border-danger" : "border-line focus:border-brand"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
        />
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

export default Select;
