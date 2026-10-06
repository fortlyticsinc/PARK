// frontend/src/components/ui/Input.tsx
/**
 * PARK — Design System: Input
 * Inline validation support, accessible, dark theme.
 */
import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-stone-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-lg border bg-stone-900 px-3.5 py-2.5 text-sm text-stone-100",
            "placeholder:text-stone-600",
            "focus:border-sage-500/50 focus:outline-none focus:ring-1 focus:ring-sage-500/30",
            "transition-colors duration-150",
            error
              ? "border-red-800 focus:border-red-600 focus:ring-red-600/30"
              : "border-stone-800 hover:border-stone-700",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-1.5 text-xs font-medium text-red-400"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-stone-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
