// frontend/src/components/ui/Button.tsx
/**
 * PARK — Design System: Button
 * Mobile-first, 44px minimum tap target with explicit contrast by variant.
 */
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, children, ...props },
    ref
  ) => {
    const variants = {
      primary:
        "bg-sage-600 text-white hover:bg-sage-500 active:bg-sage-700 disabled:bg-stone-700",
      secondary:
        "bg-stone-800 text-stone-200 hover:bg-stone-700 active:bg-stone-900 border border-stone-700",
      danger:
        "bg-red-900/50 text-red-200 hover:bg-red-900 active:bg-red-950 border border-red-800",
      ghost:
        "bg-transparent text-stone-300 hover:text-white hover:bg-stone-800/80",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm min-h-[36px]",
      md: "px-4 py-2.5 text-sm min-h-[44px]",
      lg: "px-6 py-3 text-base min-h-[48px]",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-sage-500/50 focus:ring-offset-2 focus:ring-offset-stone-950",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
