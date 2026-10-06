// frontend/src/components/ui/Select.tsx
/**
 * PARK — Design System: Select
 */
import { forwardRef, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-stone-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full rounded-lg border bg-stone-900 px-3.5 py-2.5 text-sm text-stone-100",
            "focus:border-sage-500/50 focus:outline-none focus:ring-1 focus:ring-sage-500/30",
            "transition-colors duration-150 appearance-none",
            error
              ? "border-red-800 focus:border-red-600"
              : "border-stone-800 hover:border-stone-700",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
